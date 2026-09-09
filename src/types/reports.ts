/**
 * GDGoC HNU OS — Reports & Analytics Types (§4.12)
 */

export type ReportPeriod = 'weekly' | 'monthly';

export interface ReportPeriodConfig {
  period: ReportPeriod;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  label: string;     // e.g. "Week of Sep 1 – 7" or "September 2026"
}

// ─── Task Metrics ────────────────────────────────────────────────────────────
export interface TaskReportMetrics {
  totalCreated: number;
  completed: number;
  inProgress: number;
  overdue: number;
  delegated: number;
  completionRate: number;       // 0–100 %
  deadlineAdherenceRate: number; // 0–100 %
  avgCompletionDays: number;
  topContributors: {
    profileId: string;
    name: string;
    avatarUrl: string | null;
    completedCount: number;
  }[];
}

// ─── Attendance Metrics ───────────────────────────────────────────────────────
export interface AttendanceReportMetrics {
  totalEvents: number;
  avgAttendanceRate: number; // 0–100 %
  eventsWithPerfectAttendance: number;
  memberAttendanceSummary: {
    profileId: string;
    name: string;
    avatarUrl: string | null;
    attended: number;
    total: number;
    rate: number;
  }[];
}

// ─── Member Activity ──────────────────────────────────────────────────────────
export interface MemberActivityMetrics {
  totalActiveMembers: number;
  newMembers: number;          // joined this period
  inactiveMembers: number;     // no tasks or events in period
  avgEngagementScore: number;  // composite 0–100
}

// ─── Events in Period ─────────────────────────────────────────────────────────
export interface EventReportSummary {
  eventId: string;
  title: string;
  date: string;
  status: string;
  registrationCount: number;
  attendanceCount: number;
  attendanceRate: number;
  avgFeedbackScore: number | null;
  isOverBudget: boolean;
}

// ─── Full Committee Report ────────────────────────────────────────────────────
export interface CommitteeReport {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  branch: 'tech' | 'non_tech';
  period: ReportPeriodConfig;
  generatedAt: string; // ISO timestamp

  // Overall health score
  overallHealthScore: number;
  healthStatus: 'healthy' | 'needs_attention' | 'critical';
  healthTrend: 'improving' | 'stable' | 'declining' | 'no_data';

  // Sub-sections
  tasks: TaskReportMetrics;
  attendance: AttendanceReportMetrics;
  members: MemberActivityMetrics;
  events: EventReportSummary[];

  // Head weekly review answers (if any in this period)
  weeklyReviewAnswers: {
    weekOf: string;
    submittedBy: string;
    submitterName: string;
    questions: string[];
    answers: string[];
  }[];

  // Highlights & alerts
  highlights: string[];   // positive achievements
  alerts: string[];       // items needing attention
}

// ─── Report Generation Input ──────────────────────────────────────────────────
export interface GenerateReportInput {
  departmentId: string | 'all';
  period: ReportPeriod;
  referenceDate?: string; // ISO date, defaults to today — determines which week/month
  bypassAuth?: boolean;
}

export interface GenerateReportResult {
  success: boolean;
  reports: CommitteeReport[];
  error?: string;
}

// ─── Event Performance Report (§4.12 — 18.2) ─────────────────────────────────

export type EventBudgetCategory = 'venue' | 'catering' | 'printing' | 'transport' | 'other';

export interface EventBudgetBreakdown {
  category: EventBudgetCategory;
  estimated: number;
  actual: number;
  count: number;
  isOverBudget: boolean;
}

export interface EventPerformanceReport {
  eventId: string;
  title: string;
  slug: string;
  date: string;        // YYYY-MM-DD
  status: string;
  venue: string | null;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  capacity: number | null;

  // Attendance
  totalRegistered: number;
  totalAttended: number;
  totalAbsent: number;
  attendanceRate: number; // 0–100 %
  checkInMethods: { qr: number; manual: number };

  // Feedback (§4.18)
  feedbackCount: number;
  avgFeedbackScore: number | null;   // 1–5 or null if no feedback
  feedbackDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  topComments: { comment: string; rating: number; isAnonymous: boolean }[];

  // Budget (§4.20)
  totalEstimated: number;
  totalActual: number;
  budgetVariance: number;    // estimated - actual (negative = over budget)
  isOverBudget: boolean;
  overBudgetAmount: number;
  categoryBreakdown: EventBudgetBreakdown[];

  // Derived scores
  performanceScore: number; // 0–100 composite (attendance + feedback + budget)
  performanceTier: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface EventAnalyticsSummary {
  generatedAt: string;
  filters: {
    departmentId: string | 'all';
    dateFrom: string;
    dateTo: string;
  };

  // Org-level rollups
  totalEvents: number;
  totalRegistrations: number;
  totalAttendees: number;
  overallAttendanceRate: number;
  avgFeedbackScore: number | null;
  eventsOverBudget: number;
  totalBudgetVariance: number;

  // Distribution
  byStatus: Record<string, number>;
  byDepartment: {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    eventCount: number;
    avgAttendanceRate: number;
    avgFeedbackScore: number | null;
  }[];

  // Ranked lists
  topByAttendance: EventPerformanceReport[];
  topByFeedback: EventPerformanceReport[];
  overBudgetEvents: EventPerformanceReport[];

  // All event reports (for table view)
  events: EventPerformanceReport[];
}

export interface GenerateEventAnalyticsInput {
  departmentId: string | 'all';
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  bypassAuth?: boolean;
}

export interface GenerateEventAnalyticsResult {
  success: boolean;
  summary: EventAnalyticsSummary | null;
  error?: string;
}
