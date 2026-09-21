'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { sendWorkshopRegistrationEmail } from '@/lib/email/service';
import { dispatchStudentNotification } from '@/app/student/notifications/actions';
import {
  Workshop,
  WorkshopSession,
  WorkshopInstructor,
  WorkshopRegistration,
  SessionType,
  SessionStatus,
  CourseInstructorRole,
} from '@/types/student';

export interface StudentWorkshopCardItem {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  department_id: string | null;
  department_name?: string;
  department_code?: string;
  capacity: number | null;
  status: string;
  registration_open: boolean;
  registration_deadline: string | null;
  sessions_count: number;
  total_duration_minutes: number;
  offline_sessions_count: number;
  online_sessions_count: number;
  next_session_date: string | null;
  registration_count: number;
  is_full: boolean;
  my_registration_status: 'registered' | 'waitlisted' | 'cancelled' | null;
  my_qr_code?: string | null;
  instructors: Array<{
    id: string;
    profile_id: string;
    full_name: string;
    avatar_url: string | null;
    role: CourseInstructorRole;
  }>;
}

export interface WorkshopSessionDetail extends WorkshopSession {
  is_attended?: boolean;
  is_meeting?: boolean;
  meeting_type?: 'google_meet' | 'zoom' | 'teams' | 'youtube' | 'link';
}

export interface WorkshopDetailResult {
  workshop: Workshop & {
    department_name?: string;
    department_code?: string;
    registration_count: number;
    is_full: boolean;
    total_duration_minutes: number;
    offline_sessions_count: number;
    online_sessions_count: number;
  };
  instructors: Array<{
    id: string;
    profile_id: string;
    full_name: string;
    avatar_url: string | null;
    role: CourseInstructorRole;
    committee_role: string;
    department_name?: string;
  }>;
  sessions: WorkshopSessionDetail[];
  myRegistration: {
    id: string;
    status: 'registered' | 'waitlisted' | 'cancelled';
    qr_code: string;
    registered_at: string;
  } | null;
  canRegister: boolean;
  needsOnboarding: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  adminManageUrl?: string;
}

/**
 * 1. Fetch published workshops for the student catalog (/student/workshops)
 */
export async function getPublishedWorkshops(): Promise<{
  success: boolean;
  workshops: StudentWorkshopCardItem[];
  categories: string[];
  departments: Array<{ id: string; name: string; code: string }>;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();
    const userId = context.user?.id || null;

    let studentProfileId: string | null = null;
    let needsOnboarding = false;

    if (userId) {
      const { data: stu } = await admin
        .from('student_profiles')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      if (stu) {
        studentProfileId = stu.id;
        if (stu.status === 'incomplete') {
          needsOnboarding = true;
        }
      } else {
        needsOnboarding = true;
      }
    }

    // Query published workshops with relations
    const { data: workshopsData, error: wsErr } = await admin
      .from('workshops')
      .select(`
        id,
        title,
        description,
        cover_image_url,
        category,
        department_id,
        capacity,
        registration_deadline,
        registration_open,
        status,
        created_at,
        department:departments(id, name, code),
        instructors:workshop_instructors(
          id,
          role,
          profile:profiles!workshop_instructors_profile_id_fkey(id, full_name, avatar_url, role)
        ),
        sessions:workshop_sessions(
          id,
          session_number,
          session_date,
          start_time,
          duration_minutes,
          type,
          status
        ),
        registrations:workshop_registrations(id, status, student_id, qr_code)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (wsErr) {
      console.error('getPublishedWorkshops error:', wsErr);
      return {
        success: false,
        workshops: [],
        categories: [],
        departments: [],
        isAuthenticated: Boolean(userId),
        needsOnboarding,
        error: wsErr.message,
      };
    }

    // Fetch distinct departments for filter bar
    const { data: deptsData } = await admin
      .from('departments')
      .select('id, name, code')
      .order('name', { ascending: true });

    const departments = (deptsData || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
    }));

    const categoriesSet = new Set<string>();

    const workshops: StudentWorkshopCardItem[] = (workshopsData || []).map((w: any) => {
      const dept = Array.isArray(w.department) ? w.department[0] : w.department;
      if (w.category) {
        categoriesSet.add(w.category);
      }

      // Map instructors
      const instList = (w.instructors || []).map((ins: any) => {
        const prof = Array.isArray(ins.profile) ? ins.profile[0] : ins.profile;
        return {
          id: ins.id,
          profile_id: prof?.id || '',
          full_name: prof?.full_name || 'Instructor',
          avatar_url: prof?.avatar_url || null,
          role: (ins.role as CourseInstructorRole) || 'instructor',
        };
      });

      // Calculate sessions metrics
      const sessions = (w.sessions || []) as Array<{
        id: string;
        session_number: number;
        session_date: string;
        start_time: string;
        duration_minutes: number | null;
        type: 'offline' | 'online';
        status: string;
      }>;

      sessions.sort((a, b) => a.session_number - b.session_number);

      const sessionsCount = sessions.length;
      let totalDuration = 0;
      let offlineCount = 0;
      let onlineCount = 0;

      for (const s of sessions) {
        totalDuration += s.duration_minutes ? Number(s.duration_minutes) : 120;
        if (s.type === 'offline') offlineCount++;
        if (s.type === 'online') onlineCount++;
      }

      // Next session date
      const today = new Date().toISOString().split('T')[0];
      const upcoming = sessions.find((s) => s.session_date >= today && s.status !== 'cancelled');
      const nextSessionDate = upcoming ? upcoming.session_date : (sessions[0]?.session_date || null);

      // Registrations and personal status
      const registrations = w.registrations || [];
      const confirmedCount = registrations.filter((r: any) => r.status === 'registered').length;
      const isFull = Boolean(w.capacity && confirmedCount >= w.capacity);

      let myRegistrationStatus: 'registered' | 'waitlisted' | 'cancelled' | null = null;
      let myQrCode: string | null = null;

      if (studentProfileId) {
        const myRecord = registrations.find((r: any) => r.student_id === studentProfileId);
        if (myRecord) {
          myRegistrationStatus = myRecord.status;
          myQrCode = myRecord.qr_code || null;
        }
      }

      return {
        id: w.id,
        title: w.title,
        description: w.description,
        cover_image_url: w.cover_image_url,
        category: w.category,
        department_id: w.department_id,
        department_name: dept?.name,
        department_code: dept?.code,
        capacity: w.capacity,
        status: w.status,
        registration_open: Boolean(w.registration_open),
        registration_deadline: w.registration_deadline,
        sessions_count: sessionsCount,
        total_duration_minutes: totalDuration,
        offline_sessions_count: offlineCount,
        online_sessions_count: onlineCount,
        next_session_date: nextSessionDate,
        registration_count: confirmedCount,
        is_full: isFull,
        my_registration_status: myRegistrationStatus,
        my_qr_code: myQrCode,
        instructors: instList,
      };
    });

    return {
      success: true,
      workshops,
      categories: Array.from(categoriesSet).sort(),
      departments,
      isAuthenticated: Boolean(userId),
      needsOnboarding,
    };
  } catch (err: any) {
    console.error('getPublishedWorkshops exception:', err);
    return {
      success: false,
      workshops: [],
      categories: [],
      departments: [],
      isAuthenticated: false,
      needsOnboarding: false,
      error: err.message || 'Failed to load workshops catalog.',
    };
  }
}

/**
 * 2. Fetch full workshop details for student view (/student/workshops/[id])
 */
export async function getWorkshopDetail(workshopId: string): Promise<{
  success: boolean;
  data?: WorkshopDetailResult;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();
    const userId = context.user?.id || null;
    const teamProfile = context.profile;

    let studentProfileId: string | null = null;
    let needsOnboarding = false;

    if (userId) {
      const { data: stu } = await admin
        .from('student_profiles')
        .select('id, status')
        .eq('id', userId)
        .maybeSingle();

      if (stu) {
        studentProfileId = stu.id;
        if (stu.status === 'incomplete') {
          needsOnboarding = true;
        }
      } else {
        needsOnboarding = true;
      }
    }

    // 1. Fetch workshop details
    const { data: wsData, error: wsErr } = await admin
      .from('workshops')
      .select(`
        *,
        department:departments(id, name, code, branch),
        instructors:workshop_instructors(
          id,
          role,
          profile_id,
          profile:profiles!workshop_instructors_profile_id_fkey(
            id,
            full_name,
            avatar_url,
            role,
            department:departments!profiles_department_id_fkey(name, code)
          )
        ),
        registrations:workshop_registrations(id, status, student_id, qr_code, registered_at)
      `)
      .eq('id', workshopId)
      .single();

    if (wsErr || !wsData) {
      return { success: false, error: 'Workshop not found or inaccessible.' };
    }

    // Staff permission check
    const isPresident =
      teamProfile?.role === 'president' ||
      teamProfile?.role === 'co_president' ||
      teamProfile?.role === 'branch_head';
    const isDeptHead =
      (teamProfile?.role === 'committee_head' || teamProfile?.role === 'committee_co_head') &&
      teamProfile?.department_id === wsData.department_id;
    const isInstructor = (wsData.instructors || []).some(
      (ins: any) => ins.profile_id === teamProfile?.id
    );
    const isStaff = Boolean(isPresident || isDeptHead || isInstructor);

    // If not published and not staff, deny access
    if (wsData.status !== 'published' && !isStaff) {
      return { success: false, error: 'This workshop is not published yet.' };
    }

    // 2. Fetch sessions
    const { data: sessionsData, error: sessionsErr } = await admin
      .from('workshop_sessions')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('session_number', { ascending: true });

    if (sessionsErr) {
      console.error('getWorkshopDetail sessionsErr:', sessionsErr);
    }

    const dept = Array.isArray(wsData.department) ? wsData.department[0] : wsData.department;
    const registrations = wsData.registrations || [];
    const confirmedCount = registrations.filter((r: any) => r.status === 'registered').length;
    const isFull = Boolean(wsData.capacity && confirmedCount >= wsData.capacity);

    // Compute session stats
    const sessionsList = (sessionsData || []) as WorkshopSession[];
    let totalDuration = 0;
    let offlineCount = 0;
    let onlineCount = 0;

    for (const s of sessionsList) {
      totalDuration += s.duration_minutes ? Number(s.duration_minutes) : 120;
      if (s.type === 'offline') offlineCount++;
      if (s.type === 'online') onlineCount++;
    }

    // Teaching staff
    const instructorsList = (wsData.instructors || []).map((ins: any) => {
      const prof = Array.isArray(ins.profile) ? ins.profile[0] : ins.profile;
      const pDept = Array.isArray(prof?.department) ? prof?.department[0] : prof?.department;
      return {
        id: ins.id,
        profile_id: ins.profile_id,
        full_name: prof?.full_name || 'Team Instructor',
        avatar_url: prof?.avatar_url || null,
        role: (ins.role as CourseInstructorRole) || 'instructor',
        committee_role: prof?.role || 'member',
        department_name: pDept?.name,
      };
    });

    // Check student's personal registration
    let myRegistration: {
      id: string;
      status: 'registered' | 'waitlisted' | 'cancelled';
      qr_code: string;
      registered_at: string;
    } | null = null;

    if (studentProfileId) {
      const found = registrations.find((r: any) => r.student_id === studentProfileId);
      if (found) {
        myRegistration = {
          id: found.id,
          status: found.status,
          qr_code: found.qr_code,
          registered_at: found.registered_at,
        };
      }
    }

    // Check attendance for sessions if student is registered
    let studentAttendedSessionIds = new Set<string>();
    if (studentProfileId) {
      const { data: attData } = await admin
        .from('student_attendance')
        .select('session_id')
        .eq('student_id', studentProfileId)
        .eq('event_type', 'workshop');

      if (attData) {
        studentAttendedSessionIds = new Set(attData.map((a: any) => a.session_id));
      }
    }

    // Format sessions
    const formattedSessions: WorkshopSessionDetail[] = sessionsList.map((s) => {
      const meetingUrl = s.online_meeting_url || '';
      let isMeeting = false;
      let meetingType: WorkshopSessionDetail['meeting_type'] = undefined;

      if (s.type === 'online') {
        if (meetingUrl.includes('meet.google.com')) {
          isMeeting = true;
          meetingType = 'google_meet';
        } else if (meetingUrl.includes('zoom.us')) {
          isMeeting = true;
          meetingType = 'zoom';
        } else if (meetingUrl.includes('teams.microsoft.com')) {
          isMeeting = true;
          meetingType = 'teams';
        } else if (s.youtube_url) {
          isMeeting = false;
          meetingType = 'youtube';
        } else if (meetingUrl) {
          isMeeting = true;
          meetingType = 'link';
        }
      }

      return {
        ...s,
        is_attended: studentAttendedSessionIds.has(s.id),
        is_meeting: isMeeting,
        meeting_type: meetingType,
      };
    });

    // Determine canRegister
    let canRegister = false;
    if (!myRegistration || myRegistration.status === 'cancelled') {
      if (wsData.registration_open && wsData.status === 'published') {
        canRegister = true;
      }
    }

    const adminManageUrl = isStaff ? `/student-portal/admin/workshops/${workshopId}/sessions` : undefined;

    return {
      success: true,
      data: {
        workshop: {
          ...wsData,
          department_name: dept?.name,
          department_code: dept?.code,
          registration_count: confirmedCount,
          is_full: isFull,
          total_duration_minutes: totalDuration,
          offline_sessions_count: offlineCount,
          online_sessions_count: onlineCount,
        },
        instructors: instructorsList,
        sessions: formattedSessions,
        myRegistration,
        canRegister,
        needsOnboarding,
        isAuthenticated: Boolean(userId),
        isStaff,
        adminManageUrl,
      },
    };
  } catch (err: any) {
    console.error('getWorkshopDetail exception:', err);
    return { success: false, error: err.message || 'Failed to fetch workshop details.' };
  }
}

/**
 * 3. Register student for a workshop
 */
export async function registerForWorkshop(workshopId: string): Promise<{
  success: boolean;
  registration?: {
    id: string;
    qr_code: string;
    status: 'registered' | 'waitlisted';
  };
  error?: string;
  redirectTo?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    if (!context.user) {
      return {
        success: false,
        error: 'Please sign in to register for this workshop.',
        redirectTo: `/student?signin=true&returnUrl=/student/workshops/${workshopId}`,
      };
    }

    // Verify student profile
    const { data: stu, error: stuErr } = await admin
      .from('student_profiles')
      .select('id, full_name_en, email, status, phone')
      .eq('id', context.user.id)
      .maybeSingle();

    if (stuErr) {
      console.error('registerForWorkshop stuErr:', stuErr);
    }

    if (stuErr || !stu) {
      return {
        success: false,
        error: 'Student profile not found. Please complete your registration onboarding first.',
        redirectTo: '/student/onboarding',
      };
    }

    if (stu.status === 'incomplete') {
      return {
        success: false,
        error: 'Your student profile is incomplete. Please complete onboarding first.',
        redirectTo: '/student/onboarding',
      };
    }

    // Verify workshop status & registration open
    const { data: ws, error: wsErr } = await admin
      .from('workshops')
      .select('id, title, capacity, registration_open, status, registration_deadline')
      .eq('id', workshopId)
      .single();

    if (wsErr || !ws) {
      return { success: false, error: 'Workshop not found.' };
    }

    if (ws.status !== 'published') {
      return { success: false, error: 'This workshop is not accepting registrations.' };
    }

    if (!ws.registration_open) {
      return { success: false, error: 'Registrations for this workshop are currently closed.' };
    }

    // Check registration deadline if present
    if (ws.registration_deadline && new Date(ws.registration_deadline) < new Date()) {
      return { success: false, error: 'The registration deadline for this workshop has passed.' };
    }

    // Check existing registration
    const { data: existingReg } = await admin
      .from('workshop_registrations')
      .select('id, status, qr_code')
      .eq('workshop_id', workshopId)
      .eq('student_id', stu.id)
      .maybeSingle();

    if (existingReg && existingReg.status === 'registered') {
      return {
        success: true,
        registration: {
          id: existingReg.id,
          qr_code: existingReg.qr_code,
          status: 'registered',
        },
      };
    }

    // Check capacity
    const { count: currentCount } = await admin
      .from('workshop_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('workshop_id', workshopId)
      .eq('status', 'registered');

    const confirmedCount = currentCount || 0;
    const isFull = Boolean(ws.capacity && confirmedCount >= ws.capacity);

    const initialStatus: 'registered' | 'waitlisted' = isFull ? 'waitlisted' : 'registered';

    // Generate unique QR code for this workshop pass
    const qrCode = `WS-REG-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    if (existingReg && existingReg.status === 'cancelled') {
      // Re-activate cancelled registration
      const { data: updatedReg, error: upErr } = await admin
        .from('workshop_registrations')
        .update({
          status: initialStatus,
          qr_code: qrCode,
          registered_at: new Date().toISOString(),
        })
        .eq('id', existingReg.id)
        .select('id, qr_code, status')
        .single();

      if (upErr || !updatedReg) {
        console.error('reactivate workshop registration error:', upErr);
        return { success: false, error: 'Failed to complete registration.' };
      }

      const finalQrCode = updatedReg.qr_code;
      // Dispatch confirmation email in background
      (async () => {
        try {
          const { data: sessData } = await admin
            .from('workshop_sessions')
            .select('session_number, title, session_date, start_time, end_time, type, venue')
            .eq('workshop_id', workshopId)
            .order('session_number', { ascending: true });

          await sendWorkshopRegistrationEmail({
            to: stu.email,
            recipientName: stu.full_name_en,
            workshopTitle: ws.title,
            workshopId,
            qrCode: finalQrCode,
            sessions: sessData || [],
          });
        } catch (mailErr) {
          console.warn('sendWorkshopRegistrationEmail background error:', mailErr);
        }
      })();

      revalidatePath('/student/workshops');
      revalidatePath(`/student/workshops/${workshopId}`);
      revalidatePath(`/student/workshops/${workshopId}/confirmation`);
      revalidatePath('/student/dashboard');

      return {
        success: true,
        registration: {
          id: updatedReg.id,
          qr_code: updatedReg.qr_code,
          status: updatedReg.status as 'registered' | 'waitlisted',
        },
      };
    }

    // Insert new registration row
    const { data: newReg, error: insErr } = await admin
      .from('workshop_registrations')
      .insert({
        workshop_id: workshopId,
        student_id: stu.id,
        status: initialStatus,
        qr_code: qrCode,
      })
      .select('id, qr_code, status')
      .single();

    if (insErr) {
      console.error('insert workshop registration error:', insErr);
      return { success: false, error: insErr.message || 'Failed to complete registration.' };
    }

    // Dispatch confirmation email in background
    (async () => {
      try {
        const { data: sessData } = await admin
          .from('workshop_sessions')
          .select('session_number, title, session_date, start_time, end_time, type, venue')
          .eq('workshop_id', workshopId)
          .order('session_number', { ascending: true });

        await sendWorkshopRegistrationEmail({
          to: stu.email,
          recipientName: stu.full_name_en,
          workshopTitle: ws.title,
          workshopId,
          qrCode,
          sessions: sessData || [],
        });
      } catch (mailErr) {
        console.warn('sendWorkshopRegistrationEmail background error:', mailErr);
      }
    })();

    // Dispatch in-app notification
    dispatchStudentNotification({
      studentId: stu.id,
      type: 'workshop',
      title: initialStatus === 'waitlisted' ? 'Added to Workshop Waitlist' : 'Workshop Registration Confirmed!',
      message: initialStatus === 'waitlisted'
        ? `You have been added to the waitlist for "${ws.title}". We will notify you if an enrollment spot becomes available.`
        : `Your registration for "${ws.title}" is confirmed! Check your attendance QR pass and upcoming session schedule.`,
      linkUrl: `/student/workshops/${workshopId}`,
      relatedEntityType: 'workshop',
      relatedEntityId: workshopId,
    }).catch((notifErr) => console.warn('dispatchStudentNotification workshop warning:', notifErr));

    revalidatePath('/student/workshops');
    revalidatePath(`/student/workshops/${workshopId}`);
    revalidatePath(`/student/workshops/${workshopId}/confirmation`);
    revalidatePath('/student/dashboard');

    return {
      success: true,
      registration: {
        id: newReg.id,
        qr_code: newReg.qr_code,
        status: newReg.status as 'registered' | 'waitlisted',
      },
    };
  } catch (err: any) {
    console.error('registerForWorkshop exception:', err);
    return { success: false, error: err.message || 'Registration failed.' };
  }
}

/**
 * 4. Fetch Registration Confirmation details for /student/workshops/[id]/confirmation
 */
export async function getWorkshopRegistrationConfirmation(workshopId: string): Promise<{
  success: boolean;
  workshop?: Workshop & { department_name?: string; department_code?: string };
  registration?: {
    id: string;
    qr_code: string;
    status: 'registered' | 'waitlisted' | 'cancelled';
    registered_at: string;
  };
  student?: {
    id: string;
    full_name_en: string;
    full_name_ar?: string | null;
    email: string;
    university?: string | null;
    faculty?: string | null;
    national_id?: string | null;
    qr_code?: string;
  };
  sessions: WorkshopSessionDetail[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    if (!context.user) {
      return { success: false, sessions: [], error: 'Authentication required.' };
    }

    // 1. Student profile
    const { data: stu, error: stuErr } = await admin
      .from('student_profiles')
      .select('id, full_name_en, full_name_ar, email, university, faculty, national_id, qr_code')
      .eq('id', context.user.id)
      .maybeSingle();

    if (stuErr || !stu) {
      return { success: false, sessions: [], error: 'Student profile not found.' };
    }

    // 2. Registration record
    const { data: reg, error: regErr } = await admin
      .from('workshop_registrations')
      .select('id, qr_code, status, registered_at')
      .eq('workshop_id', workshopId)
      .eq('student_id', stu.id)
      .maybeSingle();

    if (regErr || !reg) {
      return {
        success: false,
        sessions: [],
        error: 'No active workshop registration found for your account.',
      };
    }

    // 3. Workshop details
    const { data: wsData, error: wsErr } = await admin
      .from('workshops')
      .select(`
        *,
        department:departments(id, name, code)
      `)
      .eq('id', workshopId)
      .single();

    if (wsErr || !wsData) {
      return { success: false, sessions: [], error: 'Workshop not found.' };
    }

    const dept = Array.isArray(wsData.department) ? wsData.department[0] : wsData.department;

    // 4. Workshop sessions
    const { data: sessionsData, error: sessErr } = await admin
      .from('workshop_sessions')
      .select('*')
      .eq('workshop_id', workshopId)
      .order('session_number', { ascending: true });

    if (sessErr) {
      console.warn('getWorkshopRegistrationConfirmation sessions error:', sessErr);
    }

    return {
      success: true,
      workshop: {
        ...wsData,
        department_name: dept?.name,
        department_code: dept?.code,
      },
      registration: {
        id: reg.id,
        qr_code: reg.qr_code,
        status: reg.status,
        registered_at: reg.registered_at,
      },
      student: {
        id: stu.id,
        full_name_en: stu.full_name_en,
        full_name_ar: stu.full_name_ar,
        email: stu.email,
        university: stu.university,
        faculty: stu.faculty,
        national_id: stu.national_id,
        qr_code: stu.qr_code,
      },
      sessions: (sessionsData as WorkshopSessionDetail[]) || [],
    };
  } catch (err: any) {
    console.error('getWorkshopRegistrationConfirmation exception:', err);
    return { success: false, sessions: [], error: err.message || 'Failed to load confirmation.' };
  }
}
