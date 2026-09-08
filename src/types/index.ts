/**
 * GDGoC HNU OS - Core TypeScript Type Definitions
 * Based on GDGoC_HNU_OS_SPEC.md v2
 */

export type UserRole =
  | 'president'
  | 'co_president'
  | 'branch_head'
  | 'committee_head'
  | 'committee_co_head'
  | 'member';

export type DepartmentBranch = 'tech' | 'non_tech';

export type ProfileStatus =
  | 'incomplete'
  | 'pending_review'
  | 'changes_requested'
  | 'active'
  | 'rejected'
  | 'suspended'
  | 'alumni';

export interface FacultyOption {
  id: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  full_name_ar?: string | null;
  full_name_en?: string | null;
  email: string;
  avatar_url: string | null;
  national_id?: string | null;
  phone: string | null;
  whatsapp_number?: string | null;
  faculty: string | null;
  department_major?: string | null;
  academic_year: number | null; // 1 to 5
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  university_id?: string | null; // Legacy v1
  role: UserRole;
  department_id: string | null;
  position: string | null;
  skills?: string[];
  portfolio_url?: string | null;
  motivation: string | null;
  how_heard: string | null;
  availability_hours: number | null;
  status: ProfileStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  join_date: string;
  left_at?: string | null;
  leave_reason?: string | null;
  overall_score: number;
  attendance_rate: number;
  leaderboard_opt_in: boolean;
  custom_fields: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}


export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'delegated'
  | 'done'
  | 'rejected';

export type TaskAssignmentMode = 'single' | 'broadcast';

export type TaskAssigneeStatus = 'todo' | 'in_progress' | 'submitted';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  department_id: string;
  assignee_id: string | null;
  created_by: string | null;
  delegated_by_id: string | null;
  parent_task_id: string | null;
  assignment_mode: TaskAssignmentMode;
  event_id: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  evidence_url: string | null;
  approval_instance_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  profile_id: string;
  status: TaskAssigneeStatus;
  evidence_url: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EventStatus =
  | 'draft'
  | 'submitted_for_review'
  | 'branch_review'
  | 'pending_final_approval'
  | 'approved'
  | 'published'
  | 'closed'
  | 'completed'
  | 'rejected';

export interface EventRegistrationField {
  id: string;
  label: string;
  field_type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  required: boolean;
  placeholder?: string;
}

export interface EventOwner {
  profile_id: string;
  committee_role: string;
  full_name?: string;
  email?: string;
  avatar_url?: string | null;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  venue: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  department_id: string;
  status: EventStatus;
  registration_fields: EventRegistrationField[];
  owners: EventOwner[];
  checkin_access_profile_ids?: string[];
  approval_instance_id: string | null;
  qr_secret: string | null;
  gcal_event_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
}

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled';

export interface EventRegistration {
  id: string;
  event_id: string;
  profile_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  custom_answers: Record<string, any>;
  qr_code: string;
  status: RegistrationStatus;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}


export type ApprovalWorkflowType =
  | 'task_completion'
  | 'event_publish'
  | 'account_approval';

export type ApprovalStepStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type ApproverRule =
  | 'committee_head'
  | 'branch_head'
  | 'president_or_co_president';

export type ApprovalInstanceStatus =
  | 'in_progress'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface OnboardingChecklistTemplate {
  id: string;
  department_id: string | null;
  item: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
}

export interface OnboardingChecklistItem {
  id: string;
  profile_id: string;
  template_id: string | null;
  label: string;
  is_done: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventFeedback {
  id: string;
  event_id: string;
  profile_id?: string | null;
  registration_id?: string | null;
  rating: number; // 1-5
  comment?: string | null;
  is_anonymous: boolean;
  created_at: string;
  // Optional expanded relations
  profile?: {
    id: string;
    full_name: string;
    full_name_ar?: string | null;
    full_name_en?: string | null;
    avatar_url?: string | null;
  } | null;
  registration?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface EventFeedbackSummary {
  eventId: string;
  totalCount: number;
  averageRating: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  commentsCount: number;
  anonymousCount: number;
  feedback: EventFeedback[];
}

export type EventBudgetCategory = 'venue' | 'catering' | 'printing' | 'transport' | 'other';

export interface EventBudgetItem {
  id: string;
  event_id: string;
  category: EventBudgetCategory;
  description: string;
  estimated_cost: number;
  actual_cost: number | null;
  paid_by: string | null;
  receipt_drive_file_id: string | null;
  receipt_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

export interface EventBudgetSummary {
  eventId: string;
  totalEstimated: number;
  totalActual: number;
  variance: number; // estimated - actual (negative means over budget)
  isOverBudget: boolean;
  overBudgetAmount: number;
  categoryBreakdown: Record<EventBudgetCategory, { estimated: number; actual: number; count: number }>;
  items: EventBudgetItem[];
}

export interface HrDashboardKpis {
  totalRegistrations: number;
  totalCheckedIn: number;
  attendanceRate: number; // percentage (0-100)
  activeMembers: number;
  eventsCount: number;
}

export interface EventAttendanceRecord {
  registrationId: string;
  profileId: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  registrationStatus: 'registered' | 'waitlisted' | 'cancelled';
  isAttended: boolean;
  checkInTime: string | null;
  method: 'qr' | 'manual' | null;
  checkedInBy: string | null;
}

export interface EventAttendanceSummary {
  event: {
    id: string;
    title: string;
    slug: string;
    event_date: string;
    status: string;
    venue: string | null;
    capacity: number | null;
  } | null;
  eventsList: Array<{
    id: string;
    title: string;
    slug: string;
    event_date: string;
    status: string;
  }>;
  totalRegistered: number;
  totalAttended: number;
  totalAbsent: number;
  attendanceRate: number;
  attendees: EventAttendanceRecord[];
  duplicateScans: Array<{
    id: string;
    attendeeName: string;
    attendeeEmail: string;
    attemptedAt: string;
  }>;
}

export interface AttendanceLeaderboardEntry {
  profileId: string;
  fullName: string;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  avatarUrl?: string | null;
  email: string;
  role: UserRole;
  position?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  branch?: DepartmentBranch | null;
  attendanceRate: number; // percentage (0-100)
  eventsAttended: number;
  eventsEligible: number;
  rank: number;
  leaderboardOptIn: boolean;
  status: ProfileStatus;
}

export interface AttendanceLeaderboardSummary {
  entries: AttendanceLeaderboardEntry[];
  totalProfiles: number;
  averageAttendanceRate: number;
  topAttender?: AttendanceLeaderboardEntry | null;
  departments: Array<{ id: string; name: string; code: string; branch: DepartmentBranch }>;
}

export type HrNoteType = 'low_engagement' | 'attendance_follow_up' | 'performance' | 'general';
export type HrNoteStatus = 'open' | 'in_progress' | 'resolved';

export interface HrMemberNote {
  id: string;
  profileId: string;
  authorId?: string | null;
  authorName?: string | null;
  noteType: HrNoteType;
  note: string;
  actionTaken?: string | null;
  status: HrNoteStatus;
  missedEventsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LowEngagementAlert {
  profileId: string;
  fullName: string;
  fullNameAr?: string | null;
  fullNameEn?: string | null;
  avatarUrl?: string | null;
  email: string;
  role: UserRole;
  departmentId?: string | null;
  departmentName?: string | null;
  branch?: DepartmentBranch | null;
  position?: string | null;
  missedEventsCount: number;
  totalEligibleEvents: number;
  attendanceRate: number;
  notes: HrMemberNote[];
  hasOpenFollowUp: boolean;
  lastFollowUpDate?: string | null;
}

export interface LowEngagementSummary {
  alerts: LowEngagementAlert[];
  totalAlerts: number;
  openFollowUpsCount: number;
  resolvedFollowUpsCount: number;
  recentNotes: HrMemberNote[];
}

export interface PerformanceReview {
  id: string;
  profile_id: string;
  period_month: string; // e.g. '2026-09'
  task_completion_pct: number;
  deadline_adherence_pct: number;
  attendance_pct: number;
  team_contribution_pct: number;
  overall_score: number;
  reviewer_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceComputationResult {
  periodMonth: string;
  totalProfilesEvaluated: number;
  reviewsCreatedOrUpdated: number;
  averageOverallScore: number;
  topPerformers: Array<{
    profileId: string;
    fullName: string;
    overallScore: number;
    attendancePct: number;
    taskCompletionPct: number;
  }>;
}

export interface Certificate {
  id: string;
  template_id?: string | null;
  recipient_profile_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  event_id?: string | null;
  title: string;
  issue_date: string;
  certificate_number: string;
  verification_code: string;
  pdf_drive_file_id?: string | null;
  pdf_drive_url?: string | null;
  issued_by?: string | null;
  created_at: string;
  event?: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export type PrContactType = 'speaker' | 'partner' | 'sponsor' | 'venue' | 'other';
export type PrPipelineStage = 'new' | 'contacted' | 'negotiating' | 'confirmed';
export type PrInteractionType = 'email' | 'call' | 'meeting' | 'message';

export interface PRContact {
  id: string;
  name: string;
  organization?: string | null;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  type: PrContactType;
  pipeline_stage: PrPipelineStage;
  notes?: string | null;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee?: {
    id: string;
    full_name_en?: string | null;
    full_name_ar?: string | null;
    avatar_url?: string | null;
    role?: UserRole;
  } | null;
  creator?: {
    id: string;
    full_name_en?: string | null;
    full_name_ar?: string | null;
  } | null;
  interactions_count?: number;
  latest_interaction?: PRInteraction | null;
}

export interface PRInteraction {
  id: string;
  contact_id: string;
  profile_id: string;
  interaction_type: PrInteractionType;
  summary: string;
  next_follow_up?: string | null;
  created_at: string;
  author?: {
    id: string;
    full_name_en?: string | null;
    full_name_ar?: string | null;
    avatar_url?: string | null;
  } | null;
}





