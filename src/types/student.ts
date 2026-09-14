/**
 * GDGoC HNU OS — Student Portal Types
 * Spec reference: §4.S.1, §4.S.2, §4.S.10
 */

export type StudentStatus = 'incomplete' | 'active' | 'suspended';

export interface StudentProfile {
  id: string; // matches auth.users.id
  team_profile_id: string | null; // links team members who are also students
  full_name_ar: string | null;
  full_name_en: string | null;
  email: string;
  avatar_url: string | null;
  national_id: string | null;
  university: string;
  faculty: string | null;
  department_major: string | null;
  academic_year: number | null; // 1 to 5
  phone: string | null;
  whatsapp_number: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  qr_code: string; // Permanent QR code identifier e.g. STU-XXXXXXXX
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentOnboardingInput {
  full_name_ar: string;
  full_name_en: string;
  national_id: string;
  university?: string;
  faculty: string;
  department_major?: string;
  academic_year: number;
  phone: string;
  whatsapp_number: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

export interface StudentDashboardData {
  student: StudentProfile;
  teamProfile: {
    id: string;
    role: string;
    department?: {
      name: string;
      code: string;
      branch?: string;
    } | null;
  } | null;
  stats: {
    enrolledCoursesCount: number;
    workshopsCount: number;
    attendanceRate: number;
    totalSessionsAttended: number;
    pendingTasksCount: number;
    certificatesCount: number;
  };
  courses: Array<{
    id: string;
    title: string;
    description?: string;
    committee_name?: string;
    sessions_total: number;
    sessions_attended: number;
    next_session?: {
      title: string;
      date: string;
      type: 'online' | 'offline';
      venue?: string;
      youtube_url?: string;
    } | null;
  }>;
  workshops: Array<{
    id: string;
    title: string;
    date: string;
    sessions_count: number;
    sessions_attended: number;
    status: 'upcoming' | 'completed';
    venue?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    course_title: string;
    deadline: string;
    status: 'pending' | 'submitted' | 'graded';
    score?: number | null;
    max_score?: number;
    feedback?: string | null;
  }>;
  quizzes: Array<{
    id: string;
    title: string;
    course_title: string;
    status: 'available' | 'completed';
    score?: number | null;
    total_questions?: number;
  }>;
  attendance: Array<{
    id: string;
    event_title: string;
    type: 'course' | 'workshop';
    session_title: string;
    date: string;
    scanned_at: string;
  }>;
  certificates: Array<{
    id: string;
    title: string;
    certificate_number: string;
    verification_code: string;
    issue_date: string;
    pdf_drive_url?: string | null;
  }>;
}

// ==============================================================================
// Course & Session Types (Spec §4.S.3, §4.S.4, §4.S.10)
// ==============================================================================

export type CourseStatus = 'draft' | 'published' | 'archived';
export type EnrollmentType = 'open' | 'gated';
export type CourseInstructorRole = 'instructor' | 'mentor';
export type SessionType = 'offline' | 'online';
export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'pending' | 'confirmed' | 'rejected' | 'withdrawn' | 'waitlisted';

export interface Course {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  department_id: string | null;
  capacity: number | null;
  enrollment_type: EnrollmentType;
  syllabus: string | null;
  status: CourseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
  instructors?: CourseInstructor[];
  sessions_count?: number;
  enrollments_count?: number;
}

export interface CourseInstructor {
  id: string;
  course_id: string;
  profile_id: string;
  role: CourseInstructorRole;
  assigned_at: string;
  assigned_by: string | null;
  profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    department?: {
      name: string;
      code: string;
    } | null;
  } | null;
}

export interface CourseSession {
  id: string;
  course_id: string;
  session_number: number;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  type: SessionType;
  venue: string | null;
  youtube_url: string | null;
  materials: string[];
  qr_secret: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  student_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  student?: StudentProfile;
}


