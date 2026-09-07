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


