'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import {
  matchAttendanceSheetWithGemini,
  GeminiAttendanceAnalysisResult,
  GeminiSessionCandidate,
  GeminiStudentCandidate,
} from '@/lib/ai/gemini-attendance';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';

export interface CourseOptionItem {
  id: string;
  title: string;
  department_name?: string | null;
  sessions_count: number;
  students_count: number;
  sessions: GeminiSessionCandidate[];
}

export interface AiImportInitialData {
  success: boolean;
  error?: string;
  canManage: boolean;
  officerName: string;
  courses: CourseOptionItem[];
  allStudents: GeminiStudentCandidate[];
  preselectedCourseId?: string;
}

/**
 * 1. Load initial courses & their sessions for the AI Import interface
 */
export async function getAiImportInitialData(courseId?: string): Promise<AiImportInitialData> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        error: 'Authentication required to access AI Attendance Assistant.',
        canManage: false,
        officerName: '',
        courses: [],
        allStudents: [],
      };
    }

    const profile = context.profile;
    const role = profile.role as string;
    const isLeadership =
      role === 'president' ||
      role === 'co_president' ||
      role === 'branch_head' ||
      role === 'vice_president' ||
      role === 'lead';

    if (!isLeadership) {
      return {
        success: false,
        error: 'Unauthorized: Leadership permission required.',
        canManage: false,
        officerName: profile.full_name || 'Officer',
        courses: [],
        allStudents: [],
      };
    }

    // Fetch all courses
    const { data: coursesData, error: coursesError } = await admin
      .from('courses')
      .select(`
        id,
        title,
        status,
        department:departments(name),
        course_sessions(id, session_number, title, session_date, status)
      `)
      .order('created_at', { ascending: false });

    if (coursesError) throw coursesError;

    // Fetch enrollment counts
    const { data: enrollmentsData } = await admin
      .from('course_enrollments')
      .select('course_id')
      .in('status', ['confirmed', 'completed']);

    const enrollCountMap = new Map<string, number>();
    (enrollmentsData || []).forEach((e) => {
      enrollCountMap.set(e.course_id, (enrollCountMap.get(e.course_id) || 0) + 1);
    });

    const courses: CourseOptionItem[] = (coursesData || []).map((c: any) => {
      const sessList: GeminiSessionCandidate[] = (c.course_sessions || [])
        .sort((a: any, b: any) => a.session_number - b.session_number)
        .map((s: any) => ({
          id: s.id,
          session_number: s.session_number,
          title: s.title,
          session_date: s.session_date,
        }));

      return {
        id: c.id,
        title: c.title,
        department_name: c.department?.name || null,
        sessions_count: sessList.length,
        students_count: enrollCountMap.get(c.id) || 0,
        sessions: sessList,
      };
    });

    // Fetch all portal students for manual picker & matching
    const { data: allProfilesData } = await admin
      .from('student_profiles')
      .select('id, full_name_en, full_name_ar, email, faculty, academic_year')
      .order('full_name_en', { ascending: true })
      .limit(3000);

    const allStudents: GeminiStudentCandidate[] = (allProfilesData || []).map((s: any) => ({
      id: s.id,
      full_name_ar: s.full_name_ar || null,
      full_name_en: s.full_name_en || 'Member',
      email: s.email || '',
      faculty: s.faculty || null,
      academic_year: s.academic_year || null,
    }));

    return {
      success: true,
      canManage: true,
      officerName: profile.full_name || 'Officer',
      courses,
      allStudents,
      preselectedCourseId: courseId,
    };
  } catch (err: any) {
    console.error('getAiImportInitialData error:', err);
    return {
      success: false,
      error: err.message || 'Failed to load courses data for AI import.',
      canManage: false,
      officerName: '',
      courses: [],
      allStudents: [],
    };
  }
}

export interface ParsedSheetPreview {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  sampleRows: Record<string, any>[];
  totalRows: number;
}

/**
 * 2. Parses uploaded Excel/CSV file and extracts structure & preview rows
 */
export async function parseUploadedExcel(
  formData: FormData
): Promise<{ success: boolean; data?: ParsedSheetPreview; error?: string }> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'No file uploaded.' };
    }

    const targetSheet = (formData.get('sheetName') as string) || '';

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'The uploaded Excel file contains no valid worksheets.' };
    }

    const activeSheetName =
      targetSheet && workbook.SheetNames.includes(targetSheet)
        ? targetSheet
        : workbook.SheetNames[0];

    const worksheet = workbook.Sheets[activeSheetName];
    if (!worksheet) {
      return { success: false, error: `Worksheet "${activeSheetName}" could not be read.` };
    }

    // Convert to JSON with header rows
    const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawAoA || rawAoA.length === 0) {
      return { success: false, error: 'The selected worksheet is completely empty.' };
    }

    // Find actual header row (first row with at least 2 non-empty string headers)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawAoA.length, 5); i++) {
      const nonEmpties = rawAoA[i].filter((cell) => String(cell).trim().length > 0);
      if (nonEmpties.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const rawHeaders = rawAoA[headerRowIdx].map((h, i) =>
      String(h).trim() || `Column_${i + 1}`
    );

    // De-duplicate empty or repeated column headers
    const headerCounts = new Map<string, number>();
    const headers: string[] = rawHeaders.map((h) => {
      const count = headerCounts.get(h) || 0;
      headerCounts.set(h, count + 1);
      return count === 0 ? h : `${h}_${count + 1}`;
    });

    const dataRows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < rawAoA.length; r++) {
      const row = rawAoA[r];
      // Skip completely empty rows
      const hasContent = row.some((c) => String(c).trim().length > 0);
      if (!hasContent) continue;

      const obj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        obj[h] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      });
      dataRows.push(obj);
    }

    return {
      success: true,
      data: {
        sheetNames: workbook.SheetNames,
        activeSheet: activeSheetName,
        headers,
        sampleRows: dataRows.slice(0, 150),
        totalRows: dataRows.length,
      },
    };
  } catch (err: any) {
    console.error('parseUploadedExcel error:', err);
    return { success: false, error: err.message || 'Failed to parse Excel file.' };
  }
}

/**
 * 3. Triggers Gemini AI to analyze sheet and match against enrolled students & sessions
 */
export async function runAiAttendanceAnalysis(input: {
  courseId: string;
  sheetHeaders: string[];
  sheetRows: Record<string, any>[];
}): Promise<GeminiAttendanceAnalysisResult> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        error: 'Authentication required.',
        sheetSummary: {
          totalRows: 0,
          nameColumn: '',
          detectedSessionColumns: [],
          matchedStudentsCount: 0,
          needsReviewCount: 0,
          unmatchedCount: 0,
        },
        sessionMappings: [],
        studentMatches: [],
      };
    }

    // 1. Fetch sessions for this course
    const { data: sessionsData, error: sessErr } = await admin
      .from('course_sessions')
      .select('id, session_number, title, session_date')
      .eq('course_id', input.courseId)
      .order('session_number', { ascending: true });

    if (sessErr) throw sessErr;

    const availableSessions: GeminiSessionCandidate[] = (sessionsData || []).map((s) => ({
      id: s.id,
      session_number: s.session_number,
      title: s.title,
      session_date: s.session_date,
    }));

    if (availableSessions.length === 0) {
      return {
        success: false,
        error: 'This course has no created sessions yet. Please create sessions first.',
        sheetSummary: {
          totalRows: 0,
          nameColumn: '',
          detectedSessionColumns: [],
          matchedStudentsCount: 0,
          needsReviewCount: 0,
          unmatchedCount: 0,
        },
        sessionMappings: [],
        studentMatches: [],
      };
    }

    // 2. Fetch enrolled students for this course
    const { data: enrollmentsData, error: enrollErr } = await admin
      .from('course_enrollments')
      .select(`
        student_id,
        status,
        student:student_profiles(id, full_name_en, full_name_ar, email, faculty, academic_year)
      `)
      .eq('course_id', input.courseId);

    if (enrollErr) throw enrollErr;

    const enrolledStudents: GeminiStudentCandidate[] = [];
    const seenStudentIds = new Set<string>();

    (enrollmentsData || []).forEach((e: any) => {
      const s = Array.isArray(e.student) ? e.student[0] : e.student;
      if (s && !seenStudentIds.has(s.id)) {
        seenStudentIds.add(s.id);
        enrolledStudents.push({
          id: s.id,
          full_name_ar: s.full_name_ar || null,
          full_name_en: s.full_name_en || 'Member',
          email: s.email || '',
          faculty: s.faculty || null,
          academic_year: s.academic_year || null,
        });
      }
    });

    // 3. Augment with all registered student profiles for maximum matching accuracy
    const { data: allProfiles } = await admin
      .from('student_profiles')
      .select('id, full_name_en, full_name_ar, email, faculty, academic_year')
      .limit(3000);

    (allProfiles || []).forEach((s: any) => {
      if (!seenStudentIds.has(s.id)) {
        seenStudentIds.add(s.id);
        enrolledStudents.push({
          id: s.id,
          full_name_ar: s.full_name_ar || null,
          full_name_en: s.full_name_en || 'Member',
          email: s.email || '',
          faculty: s.faculty || null,
          academic_year: s.academic_year || null,
        });
      }
    });

    // 4. Delegate to Gemini Analysis Engine
    const result = await matchAttendanceSheetWithGemini({
      sheetHeaders: input.sheetHeaders,
      sheetRows: input.sheetRows,
      availableSessions,
      enrolledStudents,
    });

    return result;
  } catch (err: any) {
    console.error('runAiAttendanceAnalysis error:', err);
    return {
      success: false,
      error: err.message || 'AI analysis failed.',
      sheetSummary: {
        totalRows: 0,
        nameColumn: '',
        detectedSessionColumns: [],
        matchedStudentsCount: 0,
        needsReviewCount: 0,
        unmatchedCount: 0,
      },
      sessionMappings: [],
      studentMatches: [],
    };
  }
}

export interface CommitAttendanceInput {
  courseId: string;
  records: Array<{
    studentId: string;
    sessionId: string;
    status: 'present' | 'absent' | 'excused';
    rawToken?: string;
  }>;
  notifyStudents?: boolean;
}

export interface CommitAttendanceResult {
  success: boolean;
  error?: string;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  totalProcessed: number;
}

/**
 * 4. Batch commit reviewed AI attendance records into Supabase database
 */
export async function commitAiAttendanceRecords(
  input: CommitAttendanceInput
): Promise<CommitAttendanceResult> {
  const admin = createAdminClient();

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.', totalPresent: 0, totalAbsent: 0, totalExcused: 0, totalProcessed: 0 };
    }

    const profile = context.profile;
    const now = new Date().toISOString();

    const presentOrExcusedRows: any[] = [];
    const absentPairs: { studentId: string; sessionId: string }[] = [];

    let countPresent = 0;
    let countAbsent = 0;
    let countExcused = 0;

    for (const item of input.records) {
      if (!item.studentId || !item.sessionId) continue;

      if (item.status === 'present' || item.status === 'excused') {
        if (item.status === 'present') countPresent++;
        if (item.status === 'excused') countExcused++;

        presentOrExcusedRows.push({
          student_id: item.studentId,
          session_id: item.sessionId,
          workshop_session_id: null,
          checked_in_by: profile.id,
          method: 'manual',
          notes: item.status === 'excused' ? 'AI Excel Import (Excused / بعذر)' : 'AI Excel Attendance Assistant',
          check_in_time: now,
        });
      } else {
        countAbsent++;
        absentPairs.push({ studentId: item.studentId, sessionId: item.sessionId });
      }
    }

    // 1. Bulk Upsert Present/Excused Rows
    if (presentOrExcusedRows.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < presentOrExcusedRows.length; i += chunkSize) {
        const chunk = presentOrExcusedRows.slice(i, i + chunkSize);
        const { error: upsertErr } = await admin
          .from('student_attendance')
          .upsert(chunk, {
            onConflict: 'session_id,student_id',
            ignoreDuplicates: false,
          });

        if (upsertErr) throw upsertErr;
      }
    }

    // 2. Clear Absent Rows (delete attendance record if student was previously logged present)
    if (absentPairs.length > 0) {
      // Group by sessionId for fast batch delete
      const sessionGroupMap = new Map<string, string[]>();
      for (const pair of absentPairs) {
        const list = sessionGroupMap.get(pair.sessionId) || [];
        list.push(pair.studentId);
        sessionGroupMap.set(pair.sessionId, list);
      }

      for (const [sessId, sids] of sessionGroupMap.entries()) {
        const { error: delErr } = await admin
          .from('student_attendance')
          .delete()
          .eq('session_id', sessId)
          .in('student_id', sids);

        if (delErr) {
          console.warn(`[AI Import] Notice during absent clearing for session ${sessId}:`, delErr.message);
        }
      }
    }

    // 3. Revalidate affected paths
    revalidatePath(`/student-portal/admin/courses/${input.courseId}/sessions`);
    revalidatePath(`/student-portal/admin/attendance/scan`);
    revalidatePath(`/student-portal/admin/students`);
    revalidatePath('/student-portal/admin/certificates');

    // 4. Optionally dispatch notifications to present students
    if (input.notifyStudents && countPresent > 0) {
      const distinctPresentStudents = Array.from(new Set(presentOrExcusedRows.map((r) => r.student_id)));
      // Send notifications concurrently in background
      Promise.allSettled(
        distinctPresentStudents.slice(0, 50).map((sid) =>
          dispatchStudentNotification({
            studentId: sid,
            type: 'session',
            title: 'Attendance Confirmed',
            message: `Your session attendance was recorded and verified on the chapter ledger by ${profile.full_name}.`,
            linkUrl: '/student/dashboard?tab=attendance',
            relatedEntityType: 'course_session',
            relatedEntityId: input.courseId,
          })
        )
      ).catch((err) => console.warn('Background notification warning:', err));
    }

    return {
      success: true,
      totalPresent: countPresent,
      totalAbsent: countAbsent,
      totalExcused: countExcused,
      totalProcessed: input.records.length,
    };
  } catch (err: any) {
    console.error('commitAiAttendanceRecords error:', err);
    return {
      success: false,
      error: err.message || 'Failed to commit attendance records.',
      totalPresent: 0,
      totalAbsent: 0,
      totalExcused: 0,
      totalProcessed: 0,
    };
  }
}
