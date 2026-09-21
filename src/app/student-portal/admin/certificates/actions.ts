'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { renderCertificatePDFBuffer } from '@/lib/certificates/issue-engine';
import { uploadFileToDrive } from '@/lib/drive/drive-client';
import { notifyCertificateIssued } from '@/lib/notifications/triggers';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';
import { sendStudentCertificateEmail } from '@/lib/email/service';
import { getAppBaseUrl } from '@/lib/utils';
import { DEFAULT_FIELD_LAYOUT, CertificateTemplate } from '@/types/certificates';
import type {
  StudentCertificate,
  StudentCertificateEligibility,
} from '@/types/student';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// 1. Get Programs List (Courses & Workshops) for Certificate Issuance
// ---------------------------------------------------------------------------
export async function getCertificatePrograms(): Promise<{
  success: boolean;
  courses: Array<{ id: string; title: string; category?: string | null; enrollmentsCount: number; sessionsCount: number }>;
  workshops: Array<{ id: string; title: string; category?: string | null; registrationsCount: number; sessionsCount: number }>;
  templates: CertificateTemplate[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, courses: [], workshops: [], templates: [], error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // Fetch courses with enrollments and sessions
    const { data: coursesData } = await admin
      .from('courses')
      .select(`
        id,
        title,
        category,
        enrollments:course_enrollments(count),
        sessions:course_sessions(count)
      `)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    // Fetch workshops with registrations and sessions
    const { data: workshopsData } = await admin
      .from('workshops')
      .select(`
        id,
        title,
        category,
        registrations:workshop_registrations(count),
        sessions:workshop_sessions(count)
      `)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    // Fetch certificate templates (all fields for visual template builder & preview)
    const { data: templatesData, error: templatesErr } = await admin
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (templatesErr) {
      console.error('Error fetching certificate_templates in getCertificatePrograms:', templatesErr);
    }

    let templates = (templatesData || []) as CertificateTemplate[];

    // If no templates exist in the database, automatically create an official default template
    if (templates.length === 0) {
      try {
        const { data: createdTmpl } = await admin
          .from('certificate_templates')
          .insert({
            name: 'Official GDGoC Completion Certificate',
            background_image_drive_file_id: null,
            field_layout: DEFAULT_FIELD_LAYOUT,
          })
          .select('*')
          .single();

        if (createdTmpl) {
          templates = [createdTmpl as CertificateTemplate];
        }
      } catch (seedErr) {
        console.warn('Could not auto-seed default certificate template:', seedErr);
      }
    }

    const courses = (coursesData || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      enrollmentsCount: c.enrollments?.[0]?.count || 0,
      sessionsCount: c.sessions?.[0]?.count || 0,
    }));

    const workshops = (workshopsData || []).map((w: any) => ({
      id: w.id,
      title: w.title,
      category: w.category,
      registrationsCount: w.registrations?.[0]?.count || 0,
      sessionsCount: w.sessions?.[0]?.count || 0,
    }));

    return {
      success: true,
      courses,
      workshops,
      templates,
    };
  } catch (err: any) {
    console.error('getCertificatePrograms error:', err);
    return { success: false, courses: [], workshops: [], templates: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 2. Compute Certificate Eligibility Engine (Spec §4.S.8, §4.S.10)
// ---------------------------------------------------------------------------
export async function getCertificateEligibility(params: {
  programType: 'course' | 'workshop';
  programId: string;
  minAttendance?: number;
  minTaskAvg?: number;
  minQuizAvg?: number;
}): Promise<{
  success: boolean;
  programTitle: string;
  thresholds: { minAttendance: number; minTaskAvg: number; minQuizAvg: number };
  students: StudentCertificateEligibility[];
  eligibleCount: number;
  alreadyIssuedCount: number;
  totalStudents: number;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return {
        success: false,
        programTitle: '',
        thresholds: { minAttendance: 75, minTaskAvg: 70, minQuizAvg: 70 },
        students: [],
        eligibleCount: 0,
        alreadyIssuedCount: 0,
        totalStudents: 0,
        error: 'Unauthorized',
      };
    }

    const admin = createAdminClient();
    const minAttendance = params.minAttendance ?? 75;
    const minTaskAvg = params.minTaskAvg ?? 70;
    const minQuizAvg = params.minQuizAvg ?? 70;

    let programTitle = '';
    let sessionsTotal = 0;
    let enrolledStudents: any[] = [];
    let sessionIds: string[] = [];

    if (params.programType === 'course') {
      const { data: course } = await admin
        .from('courses')
        .select('id, title, sessions:course_sessions(id)')
        .eq('id', params.programId)
        .single();

      if (!course) throw new Error('Course not found');
      programTitle = course.title;
      sessionIds = (course.sessions || []).map((s: any) => s.id);
      sessionsTotal = sessionIds.length;

      const { data: enrollments } = await admin
        .from('course_enrollments')
        .select(`
          student:student_profiles(
            id,
            full_name_en,
            full_name_ar,
            email,
            avatar_url,
            university,
            faculty,
            academic_year
          )
        `)
        .eq('course_id', params.programId)
        .eq('status', 'confirmed');

      enrolledStudents = (enrollments || []).map((e: any) => e.student).filter(Boolean);
    } else {
      const { data: workshop } = await admin
        .from('workshops')
        .select('id, title, sessions:workshop_sessions(id)')
        .eq('id', params.programId)
        .single();

      if (!workshop) throw new Error('Workshop not found');
      programTitle = workshop.title;
      sessionIds = (workshop.sessions || []).map((s: any) => s.id);
      sessionsTotal = sessionIds.length;

      const { data: registrations } = await admin
        .from('workshop_registrations')
        .select(`
          student:student_profiles(
            id,
            full_name_en,
            full_name_ar,
            email,
            avatar_url,
            university,
            faculty,
            academic_year
          )
        `)
        .eq('workshop_id', params.programId)
        .eq('status', 'registered');

      enrolledStudents = (registrations || []).map((r: any) => r.student).filter(Boolean);
    }

    if (enrolledStudents.length === 0) {
      return {
        success: true,
        programTitle,
        thresholds: { minAttendance, minTaskAvg, minQuizAvg },
        students: [],
        eligibleCount: 0,
        alreadyIssuedCount: 0,
        totalStudents: 0,
      };
    }

    const studentIds = enrolledStudents.map((s) => s.id);

    // Fetch existing issued certificates
    let certQuery = admin
      .from('student_certificates')
      .select('*')
      .in('student_id', studentIds);

    if (params.programType === 'course') {
      certQuery = certQuery.eq('course_id', params.programId);
    } else {
      certQuery = certQuery.eq('workshop_id', params.programId);
    }

    const { data: existingCerts } = await certQuery;
    const certMap = new Map<string, any>((existingCerts || []).map((c: any) => [c.student_id, c]));

    // Fetch Attendance records
    let attendanceMap = new Map<string, number>();
    if (sessionIds.length > 0) {
      let attQuery = admin
        .from('student_attendance')
        .select('student_id')
        .in('student_id', studentIds);

      if (params.programType === 'course') {
        attQuery = attQuery.in('session_id', sessionIds);
      } else {
        attQuery = attQuery.in('workshop_session_id', sessionIds);
      }

      const { data: attRows } = await attQuery;
      if (attRows) {
        for (const row of attRows) {
          attendanceMap.set(row.student_id, (attendanceMap.get(row.student_id) || 0) + 1);
        }
      }
    }

    // Fetch Tasks & Submissions
    let taskQuery = admin
      .from('student_tasks')
      .select('id, max_score')
      .neq('status', 'draft');

    if (params.programType === 'course') {
      taskQuery = taskQuery.eq('course_id', params.programId);
    } else {
      taskQuery = taskQuery.eq('workshop_id', params.programId);
    }

    const { data: tasks } = await taskQuery;
    const taskIds = (tasks || []).map((t) => t.id);
    const tasksTotal = taskIds.length;
    const taskMaxScoreMap = new Map<string, number>((tasks || []).map((t) => [t.id, t.max_score || 10]));

    let submissionsMap = new Map<string, Array<{ score: number; maxScore: number }>>();
    if (taskIds.length > 0) {
      const { data: subs } = await admin
        .from('student_task_submissions')
        .select('student_id, task_id, score, status')
        .in('student_id', studentIds)
        .in('task_id', taskIds);

      if (subs) {
        for (const s of subs) {
          if (s.score !== null && s.score !== undefined) {
            const list = submissionsMap.get(s.student_id) || [];
            list.push({ score: Number(s.score), maxScore: taskMaxScoreMap.get(s.task_id) || 10 });
            submissionsMap.set(s.student_id, list);
          }
        }
      }
    }

    // Fetch Quizzes & Attempts
    let quizQuery = admin
      .from('quizzes')
      .select('id, passing_score_percentage')
      .eq('status', 'published');

    if (params.programType === 'course') {
      quizQuery = quizQuery.eq('course_id', params.programId);
    } else {
      quizQuery = quizQuery.eq('workshop_id', params.programId);
    }

    const { data: quizzes } = await quizQuery;
    const quizIds = (quizzes || []).map((q) => q.id);
    const quizzesTotal = quizIds.length;

    let attemptsMap = new Map<string, Array<{ score: number; passed: boolean }>>();
    if (quizIds.length > 0) {
      const { data: atts } = await admin
        .from('quiz_attempts')
        .select('student_id, quiz_id, total_score, passed')
        .in('student_id', studentIds)
        .in('quiz_id', quizIds);

      if (atts) {
        for (const a of atts) {
          if (a.total_score !== null && a.total_score !== undefined) {
            const list = attemptsMap.get(a.student_id) || [];
            list.push({ score: Number(a.total_score), passed: Boolean(a.passed) });
            attemptsMap.set(a.student_id, list);
          }
        }
      }
    }

    // Compute student stats
    let eligibleCount = 0;
    let alreadyIssuedCount = 0;

    const students: StudentCertificateEligibility[] = enrolledStudents.map((s) => {
      const attended = attendanceMap.get(s.id) || 0;
      const attRate = sessionsTotal > 0 ? Math.round((attended / sessionsTotal) * 100) : 100;

      // Task avg %
      const mySubs = submissionsMap.get(s.id) || [];
      const tasksSubmitted = mySubs.length;
      let tasksAverageScore: number | null = null;
      if (mySubs.length > 0) {
        const totalPct = mySubs.reduce((acc, cur) => acc + (cur.score / (cur.maxScore || 10)) * 100, 0);
        tasksAverageScore = Math.round(totalPct / mySubs.length);
      }

      // Quiz avg %
      const myAtts = attemptsMap.get(s.id) || [];
      const quizzesPassed = myAtts.filter((a) => a.passed).length;
      let quizzesAverageScore: number | null = null;
      if (myAtts.length > 0) {
        const totalQuizPct = myAtts.reduce((acc, cur) => acc + cur.score, 0);
        quizzesAverageScore = Math.round(totalQuizPct / myAtts.length);
      }

      // Determine Eligibility:
      // Attendance must meet threshold
      // Tasks: If tasks exist, task avg must meet threshold (or if no tasks assigned, pass)
      // Quizzes: If quizzes exist, quiz avg must meet threshold (or if no quizzes, pass)
      const meetsAttendance = attRate >= minAttendance;
      const meetsTasks = tasksTotal === 0 || (tasksAverageScore !== null && tasksAverageScore >= minTaskAvg);
      const meetsQuizzes = quizzesTotal === 0 || (quizzesAverageScore !== null && quizzesAverageScore >= minQuizAvg);

      const isEligible = meetsAttendance && meetsTasks && meetsQuizzes;
      const existingCert = certMap.get(s.id) || null;
      const alreadyIssued = Boolean(existingCert);

      if (alreadyIssued) alreadyIssuedCount++;
      if (isEligible && !alreadyIssued) eligibleCount++;

      return {
        student_id: s.id,
        full_name_en: s.full_name_en,
        full_name_ar: s.full_name_ar,
        email: s.email,
        avatar_url: s.avatar_url,
        university: s.university,
        faculty: s.faculty,
        academic_year: s.academic_year,
        course_id: params.programType === 'course' ? params.programId : null,
        workshop_id: params.programType === 'workshop' ? params.programId : null,
        program_title: programTitle,
        program_type: params.programType,
        attendanceRate: attRate,
        sessionsAttended: attended,
        sessionsTotal,
        tasksAverageScore,
        tasksSubmitted,
        tasksTotal,
        quizzesAverageScore,
        quizzesPassed,
        quizzesTotal,
        isEligible,
        alreadyIssued,
        certificate: existingCert,
      };
    });

    // Sort: Eligible & not issued first, then already issued, then ineligible
    students.sort((a, b) => {
      if (a.isEligible && !a.alreadyIssued && (!b.isEligible || b.alreadyIssued)) return -1;
      if (b.isEligible && !b.alreadyIssued && (!a.isEligible || a.alreadyIssued)) return 1;
      if (a.alreadyIssued && !b.alreadyIssued) return -1;
      if (b.alreadyIssued && !a.alreadyIssued) return 1;
      return b.attendanceRate - a.attendanceRate;
    });

    return {
      success: true,
      programTitle,
      thresholds: { minAttendance, minTaskAvg, minQuizAvg },
      students,
      eligibleCount,
      alreadyIssuedCount,
      totalStudents: students.length,
    };
  } catch (err: any) {
    console.error('getCertificateEligibility error:', err);
    return {
      success: false,
      programTitle: '',
      thresholds: { minAttendance: 75, minTaskAvg: 70, minQuizAvg: 70 },
      students: [],
      eligibleCount: 0,
      alreadyIssuedCount: 0,
      totalStudents: 0,
      error: err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. President Bulk Issue Student Certificates (Spec §4.S.8, §4.S.10)
// ---------------------------------------------------------------------------
export async function issueStudentCertificatesBatch(input: {
  programType: 'course' | 'workshop';
  programId: string;
  templateId?: string;
  studentIds: string[];
  thresholds?: { minAttendance: number; minTaskAvg: number; minQuizAvg: number };
}): Promise<{
  success: boolean;
  issuedCount: number;
  certificates: Array<{ studentId: string; certificateNumber: string; verifyUrl: string }>;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const issuedCertificates: Array<{ studentId: string; certificateNumber: string; verifyUrl: string }> = [];

  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, issuedCount: 0, certificates: [], errors: ['Unauthorized: Authentication required.'] };
    }

    const profile = context.profile;
    const isPresident = profile.role === 'president' || profile.role === 'co_president';

    if (!isPresident) {
      return {
        success: false,
        issuedCount: 0,
        certificates: [],
        errors: ['Permission denied: Only the President or Co-President may issue official student certificates.'],
      };
    }

    if (!input.studentIds || input.studentIds.length === 0) {
      return { success: false, issuedCount: 0, certificates: [], errors: ['No students selected for certificate issuance.'] };
    }

    // 1. Fetch template
    let templateId = input.templateId;
    let template: any = null;

    if (templateId) {
      const { data: tmpl } = await admin
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .maybeSingle();
      template = tmpl;
    }

    if (!template) {
      const { data: latestTmpl } = await admin
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      template = latestTmpl;
      templateId = latestTmpl?.id;
    }

    const fieldLayout = template?.field_layout || DEFAULT_FIELD_LAYOUT;
    const backgroundUrl = template?.background_image_drive_file_id || null;

    // 2. Fetch program title
    let programTitle = 'Technical Track Curriculum';
    if (input.programType === 'course') {
      const { data: c } = await admin.from('courses').select('title').eq('id', input.programId).single();
      if (c) programTitle = c.title;
    } else {
      const { data: w } = await admin.from('workshops').select('title').eq('id', input.programId).single();
      if (w) programTitle = w.title;
    }

    // 3. Compute eligibility for selected students to snapshot stats
    const eligibilityRes = await getCertificateEligibility({
      programType: input.programType,
      programId: input.programId,
      minAttendance: input.thresholds?.minAttendance,
      minTaskAvg: input.thresholds?.minTaskAvg,
      minQuizAvg: input.thresholds?.minQuizAvg,
    });

    const eligibilityMap = new Map<string, StudentCertificateEligibility>(
      eligibilityRes.students.map((s) => [s.student_id, s])
    );

    const currentYear = new Date().getFullYear();
    const issueDateStr = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    for (const studentId of input.studentIds) {
      try {
        const studentInfo = eligibilityMap.get(studentId);
        if (!studentInfo) {
          errors.push(`Student ${studentId} not found in program enrollment.`);
          continue;
        }

        // Check if certificate already exists
        const { data: existing } = await admin
          .from('student_certificates')
          .select('id, certificate_number')
          .eq('student_id', studentId)
          .eq(input.programType === 'course' ? 'course_id' : 'workshop_id', input.programId)
          .maybeSingle();

        if (existing) {
          errors.push(`Certificate already issued for ${studentInfo.full_name_en || studentInfo.email} (${existing.certificate_number}).`);
          continue;
        }

        const verificationCode = crypto.randomUUID();
        // Distinctive student serial format: GDGOC-STU-YYYY-XXXXXX
        const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const digits = '23456789';
        const allChars = letters + digits;
        const part = [
          letters.charAt(Math.floor(Math.random() * letters.length)),
          letters.charAt(Math.floor(Math.random() * letters.length)),
          digits.charAt(Math.floor(Math.random() * digits.length)),
          digits.charAt(Math.floor(Math.random() * digits.length)),
          allChars.charAt(Math.floor(Math.random() * allChars.length)),
          allChars.charAt(Math.floor(Math.random() * allChars.length)),
        ];
        for (let sIdx = part.length - 1; sIdx > 0; sIdx--) {
          const rIdx = Math.floor(Math.random() * (sIdx + 1));
          [part[sIdx], part[rIdx]] = [part[rIdx], part[sIdx]];
        }
        const certificateNumber = `GDGOC-STU-${currentYear}-${part.join('')}`;
        const recipientDisplayName = studentInfo.full_name_en || studentInfo.full_name_ar || 'Student';

        // 4. Render PDF buffer
        const { buffer, verifyUrl } = await renderCertificatePDFBuffer({
          recipientName: recipientDisplayName,
          recipientEmail: studentInfo.email,
          title: programTitle,
          issueDate: issueDateStr,
          certificateNumber,
          verificationCode,
          fieldLayout,
          backgroundImageUrl: backgroundUrl,
        });

        // 5. Upload to Drive
        let driveFileId: string | null = null;
        let driveUrl: string | null = null;
        try {
          const driveRes = await uploadFileToDrive({
            fileName: `${certificateNumber}_${recipientDisplayName.replace(/\s+/g, '_')}.pdf`,
            mimeType: 'application/pdf',
            base64Data: buffer.toString('base64'),
            makePublic: true,
          });
          if (driveRes.success && driveRes.data) {
            driveFileId = driveRes.data.fileId;
            driveUrl = driveRes.data.fileUrl || driveRes.data.downloadUrl || null;
          }
        } catch (driveErr) {
          console.warn('Drive upload fallback for student cert:', driveErr);
        }

        // 6. Insert student_certificates row
        const completionStats = {
          attendance_percentage: studentInfo.attendanceRate,
          task_average_score: studentInfo.tasksAverageScore,
          quiz_average_score: studentInfo.quizzesAverageScore,
          total_sessions_attended: studentInfo.sessionsAttended,
          total_sessions: studentInfo.sessionsTotal,
        };

        const { data: insertedCert, error: insertErr } = await admin
          .from('student_certificates')
          .insert({
            template_id: templateId || null,
            student_id: studentId,
            course_id: input.programType === 'course' ? input.programId : null,
            workshop_id: input.programType === 'workshop' ? input.programId : null,
            title: programTitle,
            issue_date: new Date().toISOString().split('T')[0],
            certificate_number: certificateNumber,
            verification_code: verificationCode,
            pdf_drive_file_id: driveFileId,
            pdf_drive_url: driveUrl,
            completion_stats: completionStats,
            issued_by: profile.id,
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Insert student_certificates error:', insertErr);
          errors.push(`Failed to save certificate for ${recipientDisplayName}: ${insertErr.message}`);
          continue;
        }

        // 7. Dispatch student in-app notification
        try {
          await dispatchStudentNotification({
            studentId,
            type: 'certificate',
            title: 'Official Certificate Issued!',
            message: `Congratulations! Your certificate for "${programTitle}" (${certificateNumber}) is ready for download and verification.`,
            linkUrl: '/student/certificates',
            relatedEntityType: 'certificate',
            relatedEntityId: insertedCert.id,
          });
        } catch (notifErr) {
          console.warn('Student certificate notification warning:', notifErr);
        }

        // 8. Dispatch Email to student with PDF download link and verify URL (Checklist S.F.3 & S.F.6)
        try {
          if (studentInfo.email) {
            const baseUrl = getAppBaseUrl();
            const downloadUrl = driveUrl || `${baseUrl}/api/certificates/${insertedCert.id}/download`;
            await sendStudentCertificateEmail({
              to: studentInfo.email,
              recipientName: recipientDisplayName,
              programTitle,
              certificateNumber,
              verificationCode,
              downloadUrl,
              verifyUrl,
            });
          }
        } catch (emailErr) {
          console.warn('Student certificate email warning:', emailErr);
        }

        issuedCertificates.push({
          studentId,
          certificateNumber,
          verifyUrl,
        });
      } catch (studentErr: any) {
        console.error(`Error processing student ${studentId}:`, studentErr);
        errors.push(`Error for student ${studentId}: ${studentErr.message}`);
      }
    }

    revalidatePath('/student-portal/admin/certificates');
    revalidatePath('/student/certificates');
    revalidatePath('/student/dashboard');

    return {
      success: issuedCertificates.length > 0,
      issuedCount: issuedCertificates.length,
      certificates: issuedCertificates,
      errors,
    };
  } catch (err: any) {
    console.error('issueStudentCertificatesBatch exception:', err);
    return {
      success: false,
      issuedCount: 0,
      certificates: [],
      errors: [err.message],
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Student Certificate Gallery Query (Spec §4.S.8)
// ---------------------------------------------------------------------------
export async function getStudentCertificatesList(): Promise<{
  success: boolean;
  certificates: StudentCertificate[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, certificates: [], error: 'Unauthorized' };
    }

    const admin = createAdminClient();

    // Student ID can be auth.uid() or student_profiles.id
    const { data: student } = await admin
      .from('student_profiles')
      .select('id')
      .eq('id', context.user.id)
      .maybeSingle();

    const targetStudentId = student?.id || context.user.id;

    const { data: certRows, error: certErr } = await admin
      .from('student_certificates')
      .select(`
        *,
        course:courses(id, title, category),
        workshop:workshops(id, title, category),
        issuer:profiles!student_certificates_issued_by_fkey(full_name, role)
      `)
      .eq('student_id', targetStudentId)
      .order('issue_date', { ascending: false });

    if (certErr) {
      console.error('getStudentCertificatesList error:', certErr);
      return { success: false, certificates: [], error: certErr.message };
    }

    const certs: StudentCertificate[] = (certRows || []).map((c: any) => ({
      ...c,
      course: Array.isArray(c.course) ? c.course[0] : c.course,
      workshop: Array.isArray(c.workshop) ? c.workshop[0] : c.workshop,
      issuer: Array.isArray(c.issuer) ? c.issuer[0] : c.issuer,
    }));

    return {
      success: true,
      certificates: certs,
    };
  } catch (err: any) {
    console.error('getStudentCertificatesList exception:', err);
    return { success: false, certificates: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 5. All Issued Student Certificates Registry (Leadership Ledger)
// ---------------------------------------------------------------------------
export async function getAllIssuedStudentCertificates(): Promise<{
  success: boolean;
  certificates: any[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, certificates: [], error: 'Unauthorized' };
    }

    const role = context.profile.role;
    const isLeadership = [
      'president',
      'co_president',
      'branch_head',
      'committee_head',
      'committee_co_head',
    ].includes(role);

    if (!isLeadership) {
      return { success: false, certificates: [], error: 'Unauthorized: Leadership access required.' };
    }

    const admin = createAdminClient();

    const { data: certRows, error: certErr } = await admin
      .from('student_certificates')
      .select(`
        id,
        title,
        certificate_number,
        verification_code,
        issue_date,
        pdf_drive_file_id,
        pdf_drive_url,
        completion_stats,
        created_at,
        student_id,
        course_id,
        workshop_id,
        template_id,
        student:student_profiles(id, full_name_ar, full_name_en, email, phone, faculty, academic_year, department_major),
        course:courses(id, title, category),
        workshop:workshops(id, title, category),
        template:certificate_templates(id, name),
        issuer:profiles!student_certificates_issued_by_fkey(full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (certErr) {
      console.error('getAllIssuedStudentCertificates error:', certErr);
      return { success: false, certificates: [], error: certErr.message };
    }

    const certificates = (certRows || []).map((c: any) => ({
      ...c,
      student: Array.isArray(c.student) ? c.student[0] : c.student,
      course: Array.isArray(c.course) ? c.course[0] : c.course,
      workshop: Array.isArray(c.workshop) ? c.workshop[0] : c.workshop,
      template: Array.isArray(c.template) ? c.template[0] : c.template,
      issuer: Array.isArray(c.issuer) ? c.issuer[0] : c.issuer,
    }));

    return { success: true, certificates };
  } catch (err: any) {
    console.error('getAllIssuedStudentCertificates exception:', err);
    return { success: false, certificates: [], error: err.message };
  }
}

// ---------------------------------------------------------------------------
// 6. Delete / Revoke Issued Student Certificate Action (President Gated)
// ---------------------------------------------------------------------------
export async function deleteStudentCertificateAction(certId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized: Authentication required.' };
    }

    const role = context.profile.role;
    const isPresident = role === 'president' || role === 'co_president';
    if (!isPresident) {
      return {
        success: false,
        error: 'Permission denied: Only the Chapter President or Co-President can revoke or delete student certificates.',
      };
    }

    const admin = createAdminClient();
    const { error: delErr } = await admin
      .from('student_certificates')
      .delete()
      .eq('id', certId);

    if (delErr) {
      console.error('deleteStudentCertificateAction error:', delErr);
      return { success: false, error: delErr.message };
    }

    revalidatePath('/student-portal/admin/certificates');
    revalidatePath('/student/certificates');
    revalidatePath('/student/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('deleteStudentCertificateAction exception:', err);
    return { success: false, error: err.message };
  }
}

