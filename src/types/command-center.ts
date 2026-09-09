export type CommitteeHealthStatus = 'healthy' | 'needs_attention' | 'critical';

export interface CommitteeLeaderInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  position?: string | null;
  attendanceRate: number; // 0-100%
  totalEventsAttended?: number;
}

export interface CommitteeHealthScorecard {
  departmentId: string;
  code: string;
  name: string;
  branch: 'tech' | 'non_tech';
  description?: string | null;

  // Leadership
  head: CommitteeLeaderInfo | null;
  coHead: CommitteeLeaderInfo | null;

  // Member metrics
  activeMembersCount: number;
  avgMemberAttendanceRate: number; // 0-100%

  // Task metrics
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
  taskCompletionRate: number; // 0-100%
  deadlineAdherenceRate: number; // 0-100%

  // Head Attendance
  headAttendanceRate: number | null; // 0-100%

  // Overall Health
  overallHealthScore: number; // 0-100%
  healthStatus: CommitteeHealthStatus; // 'healthy' | 'needs_attention' | 'critical'

  // Specific alerts
  alerts: string[];
}

export interface CommitteeHealthSummary {
  totalCommittees: number;
  healthyCount: number;
  needsAttentionCount: number;
  criticalCount: number;
  avgHealthScore: number;
  scorecards: CommitteeHealthScorecard[];
}

export type AttentionItemCategory =
  | 'overdue_task'
  | 'stalled_approval'
  | 'pr_follow_up'
  | 'inactive_member'
  | 'event_over_budget';

export type AttentionItemSeverity = 'urgent' | 'warning' | 'info';

export interface NeedsAttentionItem {
  id: string;
  category: AttentionItemCategory;
  severity: AttentionItemSeverity;
  title: string;
  subtitle: string;
  departmentName?: string | null;
  departmentCode?: string | null;
  actionUrl: string;
  actionLabel: string;
  timestamp?: string | null;
  diffDays?: number | null;
  metadata?: {
    assigneeName?: string | null;
    avatarUrl?: string | null;
    dueDate?: string | null;
    daysOverdue?: number;
    hoursStalled?: number;
    varianceAmount?: number;
    estimatedCost?: number;
    actualCost?: number;
    contactName?: string | null;
    organization?: string | null;
    stage?: string | null;
    lastActiveDays?: number;
    taskTitle?: string | null;
    eventTitle?: string | null;
  };
}

export interface NeedsAttentionFeedSummary {
  totalIssuesCount: number;
  urgentCount: number;
  overdueTasksCount: number;
  stalledApprovalsCount: number;
  prFollowUpsCount: number;
  inactiveMembersCount: number;
  eventsOverBudgetCount: number;
  items: NeedsAttentionItem[];
}

export type UpcomingItemType = 'event' | 'task_deadline';

export interface UpcomingFeedItem {
  id: string;
  type: UpcomingItemType;
  title: string;
  departmentName?: string | null;
  departmentCode?: string | null;
  scheduledDate: string; // ISO or date string
  formattedTime?: string | null;
  locationOrVenue?: string | null;
  timeGroup: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'later';
  daysUntil: number;
  actionUrl: string;
  googleCalendarUrl: string;
  metadata?: {
    assigneeName?: string | null;
    avatarUrl?: string | null;
    priority?: string | null;
    capacity?: number | null;
    registrationsCount?: number;
    gcalEventId?: string | null;
    taskTitle?: string | null;
    [key: string]: any;
  };
}

export interface UpcomingFeedSummary {
  totalUpcomingCount: number;
  eventsCount: number;
  deadlinesCount: number;
  sharedCalendarLink?: string | null;
  sharedCalendarName?: string | null;
  items: UpcomingFeedItem[];
}

// ==========================================
// 16.4 Weekly 5-Question Head Reviews Types
// ==========================================

export interface WeeklyHeadReview {
  id: string;
  headId: string;
  departmentId: string;
  weekStartDate: string;
  q1Achievements: string;
  q2Blockers: string;
  q3NextWeekPlan: string;
  q4SupportNeeded?: string | null;
  q5MoraleRating: number; // 1 - 5
  presidentFeedback?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated metadata
  headName?: string;
  headEmail?: string;
  headAvatar?: string | null;
  departmentName?: string;
  departmentCode?: string;
}

export interface WeeklyReviewsSummary {
  weekStartDate: string;
  totalSubmissions: number;
  expectedCommitteesCount: number;
  averageMorale: number;
  pendingFeedbackCount: number;
  reviews: WeeklyHeadReview[];
  userCurrentReview?: WeeklyHeadReview | null;
  userDepartmentId?: string | null;
  isHeadOrCoHead: boolean;
  isPresidentOrCo: boolean;
}

export interface SubmitWeeklyReviewInput {
  departmentId: string;
  weekStartDate: string;
  q1Achievements: string;
  q2Blockers: string;
  q3NextWeekPlan: string;
  q4SupportNeeded?: string;
  q5MoraleRating: number;
}

// ==========================================
// 16.5 Unified Pending-Approvals Queue Types
// ==========================================

export type UnifiedApprovalType = 'account' | 'task' | 'event';
export type UnifiedApprovalAction = 'approve' | 'reject' | 'changes_requested';

export interface UnifiedApprovalItem {
  id: string; // e.g. "account-{id}", "task-{id}", "event-{id}"
  type: UnifiedApprovalType;
  entityId: string;
  title: string;
  subtitle: string;
  submitterName: string;
  submitterEmail?: string | null;
  submitterAvatar?: string | null;
  submitterRole?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  submittedAt: string;
  urgency: 'urgent' | 'normal' | 'low';
  hoursPending: number;
  actionUrl: string;
  details: {
    // Account details
    position?: string | null;
    faculty?: string | null;
    universityId?: string | null;
    phone?: string | null;
    // Task details
    taskPriority?: string | null;
    taskDeadline?: string | null;
    taskDescription?: string | null;
    completionNotes?: string | null;
    // Event details
    eventDate?: string | null;
    eventVenue?: string | null;
    eventCapacity?: number | null;
    eventDescription?: string | null;
    [key: string]: any;
  };
  approvalInstanceId?: string | null;
  currentStepOrder?: number | null;
}

export interface UnifiedApprovalsSummary {
  totalPending: number;
  accountsCount: number;
  tasksCount: number;
  eventsCount: number;
  urgentCount: number; // pending > 48 hours
  items: UnifiedApprovalItem[];
}

export interface ActOnUnifiedApprovalInput {
  type: UnifiedApprovalType;
  entityId: string;
  action: UnifiedApprovalAction;
  notes?: string;
  assignedDepartmentId?: string;
  assignedRole?: string;
}

