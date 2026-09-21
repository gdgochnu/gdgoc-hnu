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
    totalSessionsExpected?: number;
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
      start_time?: string;
      end_time?: string;
      type: 'online' | 'offline';
      venue?: string;
      youtube_url?: string;
      duration_minutes?: number | null;
      deadline?: string | null;
    } | null;
  }>;
  workshops: Array<{
    id: string;
    registration_id?: string;
    qr_code?: string;
    title: string;
    description?: string;
    committee_name?: string;
    category?: string;
    date: string;
    sessions_count: number;
    sessions_attended: number;
    status: 'upcoming' | 'completed' | 'in_progress';
    venue?: string;
    next_session?: {
      id: string;
      session_number: number;
      title: string;
      date: string;
      start_time?: string;
      end_time?: string;
      type: 'online' | 'offline';
      venue?: string;
    } | null;
    sessions?: Array<{
      id: string;
      session_number: number;
      title: string;
      date: string;
      start_time: string;
      end_time: string;
      type: 'online' | 'offline';
      venue?: string | null;
      status: string;
      is_attended: boolean;
    }>;
  }>;
  tasks: Array<{
    id: string;
    course_id?: string | null;
    workshop_id?: string | null;
    title: string;
    course_title: string;
    deadline: string;
    due_date?: string | null;
    is_due_soon?: boolean;
    is_overdue?: boolean;
    submission_type?: 'link' | 'file';
    status: 'pending' | 'submitted' | 'graded' | 'needs_revision';
    score?: number | null;
    max_score?: number | null;
    feedback?: string | null;
  }>;
  quizzes: Array<{
    id: string;
    course_id?: string | null;
    workshop_id?: string | null;
    title: string;
    course_title: string;
    time_limit_minutes?: number | null;
    passing_score_percentage?: number;
    status: 'available' | 'completed' | 'in_progress';
    score?: number | null;
    passed?: boolean | null;
    total_questions?: number;
  }>;
  recent_feedback?: Array<{
    id: string;
    task_id: string;
    task_title: string;
    course_id?: string | null;
    course_title: string;
    score: number | null;
    max_score: number | null;
    status: 'graded' | 'needs_revision';
    feedback_comment: string | null;
    graded_at: string | null;
    mentor_name?: string | null;
  }>;
  attendance: Array<{
    id: string;
    event_title: string;
    type: 'course' | 'workshop';
    session_title: string;
    session_number?: number;
    date: string;
    scanned_at: string;
    method?: 'qr' | 'manual';
    checked_in_by_name?: string;
    venue?: string | null;
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
  duration_minutes?: number | null;
  deadline?: string | null;
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

// ==============================================================================
// Workshop & Multi-Session Types (Spec §4.S.3, §4.S.4, §4.S.10)
// ==============================================================================

export type WorkshopStatus = 'draft' | 'published' | 'archived' | 'completed';
export type WorkshopRegistrationStatus = 'registered' | 'waitlisted' | 'cancelled';

export interface Workshop {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  department_id: string | null;
  capacity: number | null;
  registration_deadline: string | null;
  status: WorkshopStatus;
  registration_open: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
  instructors?: WorkshopInstructor[];
  sessions_count?: number;
  registrations_count?: number;
}

export interface WorkshopInstructor {
  id: string;
  workshop_id: string;
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

export interface WorkshopSession {
  id: string;
  workshop_id: string;
  session_number: number;
  title: string;
  description: string | null;
  session_date: string;
  start_time: string;
  end_time: string;
  type: SessionType;
  venue: string | null;
  youtube_url: string | null;
  online_meeting_url?: string | null;
  duration_minutes?: number | null;
  materials: string[];
  qr_secret: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkshopRegistration {
  id: string;
  workshop_id: string;
  student_id: string;
  qr_code: string;
  status: WorkshopRegistrationStatus;
  registered_at: string;
  created_at: string;
  updated_at: string;
  workshop?: Workshop;
  student?: StudentProfile;
}

export interface StudentAttendance {
  id: string;
  session_id: string | null;
  workshop_session_id: string | null;
  student_id: string;
  check_in_time: string;
  checked_in_by: string;
  method: 'qr' | 'manual';
  notes?: string | null;
  created_at: string;
  student?: StudentProfile;
  course_session?: CourseSession;
  workshop_session?: WorkshopSession;
}

// ==============================================================================
// Lessons, Tasks, Quizzes & Mentorship Types (Spec §4.S.6, §4.S.10)
// ==============================================================================

export interface CourseLesson {
  id: string;
  course_id: string;
  session_id?: string | null;
  lesson_number: number;
  title: string;
  content: string;
  youtube_url?: string | null;
  materials?: string[];
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  session?: CourseSession | null;
}

export type TaskSubmissionType = 'link' | 'file' | 'both';
export type TaskAssignedScope = 'all_enrolled' | 'specific';
export type TaskStatus = 'active' | 'closed' | 'draft';

export interface StudentTask {
  id: string;
  course_id?: string | null;
  workshop_id?: string | null;
  lesson_id?: string | null;
  title: string;
  description: string;
  due_date?: string | null;
  submission_type: TaskSubmissionType;
  max_score: number;
  assigned_to: TaskAssignedScope;
  specific_student_ids?: string[];
  status: TaskStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  workshop?: Workshop;
  lesson?: CourseLesson | null;
}

export type TaskSubmissionStatus = 'pending' | 'submitted' | 'graded' | 'needs_revision' | 'final';

export interface StudentTaskSubmission {
  id: string;
  task_id: string;
  student_id: string;
  submission_link?: string | null;
  submission_file_drive_id?: string | null;
  score?: number | null;
  feedback_comment?: string | null;
  status: TaskSubmissionStatus;
  submitted_at: string;
  graded_at?: string | null;
  graded_by?: string | null;
  created_at: string;
  updated_at: string;
  task?: StudentTask;
  student?: StudentProfile;
  grader?: {
    id: string;
    full_name_en: string;
    avatar_url?: string | null;
  };
}

export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  question_text: string;
  options?: string[] | QuizQuestionOption[];
  correct_answer?: string | number;
  points: number;
  explanation?: string;
}

export type QuizStatus = 'draft' | 'published' | 'archived';

export interface Quiz {
  id: string;
  course_id?: string | null;
  workshop_id?: string | null;
  lesson_id?: string | null;
  title: string;
  description: string;
  time_limit_minutes?: number | null;
  passing_score_percentage: number;
  questions: QuizQuestion[];
  allow_retakes: boolean;
  max_attempts: number;
  status: QuizStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  workshop?: Workshop;
  lesson?: CourseLesson | null;
}

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'graded';

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  answers: Record<string, any> | any[];
  auto_graded_score?: number | null;
  manual_graded_score?: number | null;
  total_score?: number | null;
  passed?: boolean | null;
  feedback?: string | null;
  status: QuizAttemptStatus;
  started_at: string;
  submitted_at?: string | null;
  graded_at?: string | null;
  graded_by?: string | null;
  created_at: string;
  updated_at: string;
  quiz?: Quiz;
  student?: StudentProfile;
}

// ==============================================================================
// Student Certificates & Eligibility (Spec §4.S.8, §4.S.10, §4.S.11)
// ==============================================================================

export interface StudentCertificate {
  id: string;
  template_id: string | null;
  student_id: string;
  course_id: string | null;
  workshop_id: string | null;
  title: string;
  issue_date: string;
  certificate_number: string;
  verification_code: string;
  pdf_drive_file_id: string | null;
  pdf_drive_url: string | null;
  completion_stats: {
    attendance_percentage: number;
    task_average_score: number | null;
    quiz_average_score: number | null;
    total_sessions_attended?: number;
    total_sessions?: number;
  };
  issued_by: string | null;
  created_at: string;
  updated_at: string;
  student?: StudentProfile;
  course?: Course;
  workshop?: Workshop;
  issuer?: {
    full_name: string;
    role: string;
  } | null;
}

export interface StudentCertificateEligibility {
  student_id: string;
  full_name_en: string | null;
  full_name_ar: string | null;
  email: string;
  avatar_url: string | null;
  university: string | null;
  faculty: string | null;
  academic_year: number | null;
  course_id?: string | null;
  workshop_id?: string | null;
  program_title: string;
  program_type: 'course' | 'workshop';
  attendanceRate: number;
  sessionsAttended: number;
  sessionsTotal: number;
  tasksAverageScore: number | null;
  tasksSubmitted: number;
  tasksTotal: number;
  quizzesAverageScore: number | null;
  quizzesPassed: number;
  quizzesTotal: number;
  isEligible: boolean;
  alreadyIssued: boolean;
  certificate?: StudentCertificate | null;
}

export interface MentorNote {
  id: string;
  mentor_id: string;
  student_id: string;
  course_id?: string | null;
  workshop_id?: string | null;
  note: string;
  flagged_at_risk: boolean;
  created_at: string;
  updated_at: string;
  mentor?: {
    id: string;
    full_name_en: string;
    avatar_url?: string | null;
  };
  student?: StudentProfile;
}

export type StudentNotificationType =
  | 'course'
  | 'workshop'
  | 'session'
  | 'certificate'
  | 'task'
  | 'quiz'
  | 'system'
  | 'announcement'
  | 'general';

export interface StudentNotification {
  id: string;
  student_id: string;
  type: StudentNotificationType;
  title: string;
  message: string;
  link_url: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface StudentNotificationCenterSummary {
  unreadCount: number;
  totalCount: number;
  notifications: StudentNotification[];
}
