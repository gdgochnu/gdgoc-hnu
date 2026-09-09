'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  ReportPeriod,
  ReportPeriodConfig,
  CommitteeReport,
  GenerateReportInput,
  GenerateReportResult,
  TaskReportMetrics,
  AttendanceReportMetrics,
  MemberActivityMetrics,
  EventReportSummary,
  // 18.2 event analytics
  GenerateEventAnalyticsInput,
  GenerateEventAnalyticsResult,
  EventPerformanceReport,
  EventBudgetBreakdown,
} from '@/types/reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPeriodConfig(period: ReportPeriod, referenceDate?: string): ReportPeriodConfig {
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  if (period === 'weekly') {
    // Monday → Sunday
    const dayOfWeek = ref.getDay(); // 0=Sun, 1=Mon...
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      period: 'weekly',
      startDate: monday.toISOString(),
      endDate: sunday.toISOString(),
      label: `Week of ${fmt(monday)} – ${fmt(sunday)}`,
    };
  } else {
    // Monthly: first → last day of month
    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);

    return {
      period: 'monthly',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  }
}

function computeHealthScore(tasks: TaskReportMetrics, attendance: AttendanceReportMetrics): number {
  const taskWeight = 0.4;
  const adherenceWeight = 0.25;
  const attendanceWeight = 0.35;
  return Math.round(
    tasks.completionRate * taskWeight +
    tasks.deadlineAdherenceRate * adherenceWeight +
    attendance.avgAttendanceRate * attendanceWeight
  );
}

function healthStatus(score: number): 'healthy' | 'needs_attention' | 'critical' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'needs_attention';
  return 'critical';
}

// ─── Auth check ───────────────────────────────────────────────────────────────

export async function canAccessReports(): Promise<{
  hasAccess: boolean;
  isPresidential: boolean;
  isBranchHead: boolean;
  isCommitteeHead: boolean;
  departmentId?: string | null;
}> {
  const context = await getUserContext();
  if (!context.user || !context.profile || context.profile.status !== 'active') {
    return { hasAccess: false, isPresidential: false, isBranchHead: false, isCommitteeHead: false };
  }
  const role = context.profile.role;
  const isPresidential = role === 'president' || role === 'co_president';
  const isBranchHead = role === 'branch_head';
  const isCommitteeHead = role === 'committee_head' || role === 'committee_co_head';
  return {
    hasAccess: isPresidential || isBranchHead || isCommitteeHead,
    isPresidential,
    isBranchHead,
    isCommitteeHead,
    departmentId: context.profile.department_id,
  };
}

// ─── Fetch departments ────────────────────────────────────────────────────────

export async function getAccessibleDepartments(): Promise<{
  success: boolean;
  departments: { id: string; name: string; code: string; branch: string }[];
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.profile) return { success: false, departments: [], error: 'Unauthorized' };

    const supabase = createAdminClient();
    const role = context.profile.role;

    let query = supabase
      .from('departments')
      .select('id, name, code, branch')
      .order('name');

    // Committee heads only see their own committee
    if (role === 'committee_head' || role === 'committee_co_head') {
      if (!context.profile.department_id) return { success: true, departments: [] };
      query = query.eq('id', context.profile.department_id);
    }
    // Branch heads see their branch only — we'd need the branch, skip for now and return all
    // They'll filter client-side

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, departments: data || [] };
  } catch (err: any) {
    return { success: false, departments: [], error: err.message };
  }
}

// ─── Core report generator ────────────────────────────────────────────────────

export async function generateCommitteeReport(
  input: GenerateReportInput
): Promise<GenerateReportResult> {
  try {
    if (!input.bypassAuth) {
      const access = await canAccessReports();
      if (!access.hasAccess) {
        return { success: false, reports: [], error: 'Access denied.' };
      }
    }

    const supabase = createAdminClient();
    const periodConfig = buildPeriodConfig(input.period, input.referenceDate);
    const { startDate, endDate } = periodConfig;

    // ── 1. Fetch department(s) ──────────────────────────────────────────────
    let deptQuery = supabase.from('departments').select('id, name, code, branch');
    if (input.departmentId !== 'all') {
      deptQuery = deptQuery.eq('id', input.departmentId);
    }
    const { data: departments, error: deptErr } = await deptQuery;
    if (deptErr) throw deptErr;
    if (!departments || departments.length === 0) {
      return { success: true, reports: [] };
    }

    const reports: CommitteeReport[] = [];

    for (const dept of departments) {
      // ── 2. Members of this committee ────────────────────────────────────
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, created_at')
        .eq('department_id', dept.id)
        .eq('status', 'active');

      const memberIds = (members || []).map((m) => m.id);

      // ── 3. Task metrics ─────────────────────────────────────────────────
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('id, status, due_date, completed_at, created_at, delegated_by_id')
        .eq('department_id', dept.id)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const { data: taskAssignees } = await supabase
        .from('task_assignees')
        .select('task_id, profile_id, status, completed_at, profiles!inner(full_name, avatar_url)')
        .in('profile_id', memberIds.length > 0 ? memberIds : ['none'])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const tasks = allTasks || [];
      const totalCreated = tasks.length;
      const completed = tasks.filter((t) => t.status === 'done').length;
      const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
      const delegated = tasks.filter((t) => t.status === 'delegated').length;
      const now = new Date();
      const overdue = tasks.filter(
        (t) =>
          t.due_date &&
          t.status !== 'done' &&
          new Date(t.due_date) < now
      ).length;

      const completionRate = totalCreated > 0 ? Math.round((completed / totalCreated) * 100) : 0;

      const tasksWithDueDates = tasks.filter((t) => t.due_date && t.status === 'done');
      const onTime = tasksWithDueDates.filter(
        (t) => t.completed_at && new Date(t.completed_at) <= new Date(t.due_date!)
      ).length;
      const deadlineAdherenceRate =
        tasksWithDueDates.length > 0
          ? Math.round((onTime / tasksWithDueDates.length) * 100)
          : 100;

      // avg completion days for done tasks
      const doneTasks = tasks.filter((t) => t.status === 'done' && t.completed_at && t.created_at);
      const avgCompletionDays =
        doneTasks.length > 0
          ? Math.round(
              doneTasks.reduce((sum, t) => {
                const diffMs =
                  new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime();
                return sum + diffMs / (1000 * 60 * 60 * 24);
              }, 0) / doneTasks.length
            )
          : 0;

      // Top contributors (by completed broadcast tasks)
      const contributorMap: Record<string, { name: string; avatarUrl: string | null; count: number }> = {};
      for (const ta of taskAssignees || []) {
        if (ta.status === 'done') {
          const profile = ta.profiles as any;
          if (!contributorMap[ta.profile_id]) {
            contributorMap[ta.profile_id] = {
              name: profile?.full_name || 'Unknown',
              avatarUrl: profile?.avatar_url || null,
              count: 0,
            };
          }
          contributorMap[ta.profile_id].count++;
        }
      }
      const topContributors = Object.entries(contributorMap)
        .map(([profileId, v]) => ({ profileId, name: v.name, avatarUrl: v.avatarUrl, completedCount: v.count }))
        .sort((a, b) => b.completedCount - a.completedCount)
        .slice(0, 5);

      const taskMetrics: TaskReportMetrics = {
        totalCreated,
        completed,
        inProgress,
        overdue,
        delegated,
        completionRate,
        deadlineAdherenceRate,
        avgCompletionDays,
        topContributors,
      };

      // ── 4. Events & Attendance metrics ──────────────────────────────────
      const { data: events } = await supabase
        .from('events')
        .select(`
          id, title, event_date, status, capacity,
          event_registrations(count),
          attendance(count),
          event_budget_items(amount, type),
          event_feedback(rating)
        `)
        .eq('department_id', dept.id)
        .gte('event_date', startDate.split('T')[0])
        .lte('event_date', endDate.split('T')[0]);

      const eventSummaries: EventReportSummary[] = (events || []).map((ev: any) => {
        const regCount = Array.isArray(ev.event_registrations)
          ? ev.event_registrations.length
          : (ev.event_registrations?.[0]?.count ?? 0);
        const attCount = Array.isArray(ev.attendance)
          ? ev.attendance.length
          : (ev.attendance?.[0]?.count ?? 0);

        const budgetItems: { amount: number; type: string }[] = ev.event_budget_items || [];
        const totalBudget = budgetItems.filter((b) => b.type === 'budget').reduce((s, b) => s + b.amount, 0);
        const totalExpense = budgetItems.filter((b) => b.type === 'expense').reduce((s, b) => s + b.amount, 0);
        const isOverBudget = totalBudget > 0 && totalExpense > totalBudget;

        const feedbackItems: { rating: number }[] = ev.event_feedback || [];
        const avgFeedback =
          feedbackItems.length > 0
            ? Math.round((feedbackItems.reduce((s, f) => s + f.rating, 0) / feedbackItems.length) * 10) / 10
            : null;

        return {
          eventId: ev.id,
          title: ev.title,
          date: ev.event_date,
          status: ev.status,
          registrationCount: typeof regCount === 'number' ? regCount : 0,
          attendanceCount: typeof attCount === 'number' ? attCount : 0,
          attendanceRate:
            regCount > 0 ? Math.round((attCount / regCount) * 100) : 0,
          avgFeedbackScore: avgFeedback,
          isOverBudget,
        };
      });

      const avgAttendanceRate =
        eventSummaries.length > 0
          ? Math.round(
              eventSummaries.reduce((s, e) => s + e.attendanceRate, 0) / eventSummaries.length
            )
          : 0;

      const eventsWithPerfect = eventSummaries.filter((e) => e.attendanceRate >= 100).length;

      // Member-level attendance summary
      const { data: memberAttRows } = await supabase
        .from('attendance')
        .select('profile_id, event_id')
        .in('profile_id', memberIds.length > 0 ? memberIds : ['none'])
        .in(
          'event_id',
          eventSummaries.length > 0 ? eventSummaries.map((e) => e.eventId) : ['none']
        );

      const memberAttendedMap: Record<string, Set<string>> = {};
      for (const row of memberAttRows || []) {
        if (!memberAttendedMap[row.profile_id]) memberAttendedMap[row.profile_id] = new Set();
        memberAttendedMap[row.profile_id].add(row.event_id);
      }

      const memberAttendanceSummary = (members || []).map((m) => {
        const attended = (memberAttendedMap[m.id] || new Set()).size;
        const total = eventSummaries.length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        return {
          profileId: m.id,
          name: m.full_name,
          avatarUrl: m.avatar_url,
          attended,
          total,
          rate,
        };
      });

      const attendanceMetrics: AttendanceReportMetrics = {
        totalEvents: eventSummaries.length,
        avgAttendanceRate,
        eventsWithPerfectAttendance: eventsWithPerfect,
        memberAttendanceSummary: memberAttendanceSummary
          .sort((a, b) => b.rate - a.rate)
          .slice(0, 10),
      };

      // ── 5. Member activity ──────────────────────────────────────────────
      const totalActiveMembers = (members || []).length;
      const newMembers = (members || []).filter(
        (m) => m.created_at >= startDate && m.created_at <= endDate
      ).length;

      // Inactive = no tasks + no attendance in period
      const activeInPeriodIds = new Set<string>([
        ...tasks
          .filter((t) => {
            // tasks assigned to this member (via task_assignees)
            return true;
          })
          .map(() => ''),
        ...(memberAttRows || []).map((r) => r.profile_id),
      ]);
      // Simpler: use attendance to determine "active"
      const activeViaAttendance = new Set((memberAttRows || []).map((r) => r.profile_id));
      const inactiveMembers = (members || []).filter(
        (m) => !activeViaAttendance.has(m.id)
      ).length;

      const memberActivityMetrics: MemberActivityMetrics = {
        totalActiveMembers,
        newMembers,
        inactiveMembers,
        avgEngagementScore: Math.max(0, Math.min(100, completionRate * 0.5 + avgAttendanceRate * 0.5)),
      };

      // ── 6. Weekly review answers ────────────────────────────────────────
      const { data: reviewRows } = await supabase
        .from('weekly_head_reviews')
        .select('week_start_date, submitted_by, q1, q2, q3, q4, q5, profiles!inner(full_name)')
        .eq('department_id', dept.id)
        .gte('week_start_date', startDate.split('T')[0])
        .lte('week_start_date', endDate.split('T')[0]);

      const weeklyReviewAnswers = (reviewRows || []).map((r: any) => ({
        weekOf: r.week_start_date,
        submittedBy: r.submitted_by,
        submitterName: r.profiles?.full_name || 'Unknown',
        questions: [
          'What did the committee accomplish this week?',
          'What blockers or challenges were faced?',
          'What tasks are in progress for next week?',
          'Any member recognition or shoutouts?',
          'Overall committee morale (1–5) & comments?',
        ],
        answers: [r.q1 || '', r.q2 || '', r.q3 || '', r.q4 || '', r.q5 || ''],
      }));

      // ── 7. Health & highlights ──────────────────────────────────────────
      const overallHealth = computeHealthScore(taskMetrics, attendanceMetrics);
      const status = healthStatus(overallHealth);

      const highlights: string[] = [];
      const alerts: string[] = [];

      if (taskMetrics.completionRate >= 80) highlights.push(`Strong task completion: ${taskMetrics.completionRate}%`);
      if (attendanceMetrics.avgAttendanceRate >= 80) highlights.push(`High attendance rate: ${attendanceMetrics.avgAttendanceRate}%`);
      if (taskMetrics.topContributors.length > 0)
        highlights.push(`Top contributor: ${taskMetrics.topContributors[0].name} (${taskMetrics.topContributors[0].completedCount} tasks)`);
      if (eventSummaries.length > 0) highlights.push(`${eventSummaries.length} event(s) held this period`);

      if (taskMetrics.overdue > 0) alerts.push(`${taskMetrics.overdue} overdue task(s)`);
      if (taskMetrics.completionRate < 50) alerts.push(`Low task completion rate (${taskMetrics.completionRate}%)`);
      if (attendanceMetrics.avgAttendanceRate < 50) alerts.push(`Below-average attendance (${attendanceMetrics.avgAttendanceRate}%)`);
      if (memberActivityMetrics.inactiveMembers > 0) alerts.push(`${memberActivityMetrics.inactiveMembers} member(s) with no activity this period`);
      if (eventSummaries.some((e) => e.isOverBudget)) alerts.push('One or more events exceeded budget');

      reports.push({
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        branch: dept.branch as 'tech' | 'non_tech',
        period: periodConfig,
        generatedAt: new Date().toISOString(),
        overallHealthScore: overallHealth,
        healthStatus: status,
        healthTrend: 'no_data', // trend calc requires historical data — future enhancement
        tasks: taskMetrics,
        attendance: attendanceMetrics,
        members: memberActivityMetrics,
        events: eventSummaries,
        weeklyReviewAnswers,
        highlights,
        alerts,
      });
    }

    return { success: true, reports };
  } catch (err: any) {
    console.error('[generateCommitteeReport]', err);
    return { success: false, reports: [], error: err.message };
  }
}

// ─── Event Performance & Attendance Analytics (§4.12 — step 18.2) ─────────────

function computePerformanceScore(
  attendanceRate: number,
  avgFeedback: number | null,
  isOverBudget: boolean
): number {
  // attendance 50%, feedback 35%, budget 15%
  const feedbackScore = avgFeedback !== null ? ((avgFeedback - 1) / 4) * 100 : 50;
  const budgetScore = isOverBudget ? 0 : 100;
  return Math.round(attendanceRate * 0.5 + feedbackScore * 0.35 + budgetScore * 0.15);
}

function performanceTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

export async function generateEventAnalyticsReport(
  input: GenerateEventAnalyticsInput
): Promise<GenerateEventAnalyticsResult> {
  try {
    if (!input.bypassAuth) {
      const access = await canAccessReports();
      if (!access.hasAccess) {
        return { success: false, summary: null, error: 'Access denied.' };
      }
    }

    const supabase = createAdminClient();

    // ── 1. Fetch events in the date range ──────────────────────────────────
    let eventsQuery = supabase
      .from('events')
      .select(`
        id, title, slug, event_date, status, venue, capacity, department_id,
        departments!inner(name, code, branch)
      `)
      .gte('event_date', input.dateFrom)
      .lte('event_date', input.dateTo)
      .order('event_date', { ascending: false });

    if (input.departmentId !== 'all') {
      eventsQuery = eventsQuery.eq('department_id', input.departmentId);
    }

    const { data: events, error: evErr } = await eventsQuery;
    if (evErr) throw evErr;
    if (!events || events.length === 0) {
      return {
        success: true,
        summary: {
          generatedAt: new Date().toISOString(),
          filters: input,
          totalEvents: 0,
          totalRegistrations: 0,
          totalAttendees: 0,
          overallAttendanceRate: 0,
          avgFeedbackScore: null,
          eventsOverBudget: 0,
          totalBudgetVariance: 0,
          byStatus: {},
          byDepartment: [],
          topByAttendance: [],
          topByFeedback: [],
          overBudgetEvents: [],
          events: [],
        },
      };
    }

    const eventIds = events.map((e) => e.id);

    // ── 2. Fetch all attendance, feedback, budget for these events ──────────
    const [regResult, attResult, feedbackResult, budgetResult] = await Promise.all([
      supabase
        .from('event_registrations')
        .select('id, event_id, status')
        .in('event_id', eventIds),
      supabase
        .from('attendance')
        .select('id, event_id, profile_id, check_in_time, method')
        .in('event_id', eventIds),
      supabase
        .from('event_feedback')
        .select('id, event_id, rating, comment, is_anonymous, profile_id')
        .in('event_id', eventIds),
      supabase
        .from('event_budget_items')
        .select('id, event_id, category, estimated_cost, actual_cost')
        .in('event_id', eventIds),
    ]);

    const registrations = regResult.data || [];
    const attendanceRows = attResult.data || [];
    const feedbackRows = feedbackResult.data || [];
    const budgetItems = budgetResult.data || [];

    // Index by event_id
    const regByEvent: Record<string, typeof registrations> = {};
    for (const r of registrations) {
      if (!regByEvent[r.event_id]) regByEvent[r.event_id] = [];
      regByEvent[r.event_id].push(r);
    }

    const attByEvent: Record<string, typeof attendanceRows> = {};
    for (const a of attendanceRows) {
      if (!attByEvent[a.event_id]) attByEvent[a.event_id] = [];
      attByEvent[a.event_id].push(a);
    }

    const feedByEvent: Record<string, typeof feedbackRows> = {};
    for (const f of feedbackRows) {
      if (!feedByEvent[f.event_id]) feedByEvent[f.event_id] = [];
      feedByEvent[f.event_id].push(f);
    }

    const budgetByEvent: Record<string, typeof budgetItems> = {};
    for (const b of budgetItems) {
      if (!budgetByEvent[b.event_id]) budgetByEvent[b.event_id] = [];
      budgetByEvent[b.event_id].push(b);
    }

    // ── 3. Build per-event reports ──────────────────────────────────────────
    const eventReports: EventPerformanceReport[] = events.map((ev: any) => {
      const dept = ev.departments as { name: string; code: string; branch: string };
      const regs = regByEvent[ev.id] || [];
      const atts = attByEvent[ev.id] || [];
      const feeds = feedByEvent[ev.id] || [];
      const budget = budgetByEvent[ev.id] || [];

      const totalRegistered = regs.filter((r) => r.status !== 'cancelled').length;
      const totalAttended = atts.length;
      const totalAbsent = Math.max(0, totalRegistered - totalAttended);
      const attendanceRate =
        totalRegistered > 0 ? Math.round((totalAttended / totalRegistered) * 100) : 0;

      const qrCount = atts.filter((a) => a.method === 'qr').length;
      const manualCount = atts.filter((a) => a.method === 'manual').length;

      // Feedback
      const feedbackDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as {
        1: number; 2: number; 3: number; 4: number; 5: number;
      };
      let feedbackSum = 0;
      for (const f of feeds) {
        feedbackDist[f.rating as 1 | 2 | 3 | 4 | 5]++;
        feedbackSum += f.rating;
      }
      const avgFeedback =
        feeds.length > 0
          ? Math.round((feedbackSum / feeds.length) * 10) / 10
          : null;

      const topComments = feeds
        .filter((f) => f.comment && f.comment.trim().length > 0)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5)
        .map((f) => ({
          comment: f.comment!,
          rating: f.rating,
          isAnonymous: f.is_anonymous,
        }));

      // Budget
      const budgetCategories: Record<string, { estimated: number; actual: number; count: number }> = {};
      let totalEstimated = 0;
      let totalActual = 0;
      for (const b of budget) {
        if (!budgetCategories[b.category]) {
          budgetCategories[b.category] = { estimated: 0, actual: 0, count: 0 };
        }
        budgetCategories[b.category].estimated += b.estimated_cost || 0;
        budgetCategories[b.category].actual += b.actual_cost || 0;
        budgetCategories[b.category].count++;
        totalEstimated += b.estimated_cost || 0;
        totalActual += b.actual_cost || 0;
      }

      const budgetVariance = totalEstimated - totalActual;
      const isOverBudget = totalEstimated > 0 && totalActual > totalEstimated;
      const overBudgetAmount = isOverBudget ? totalActual - totalEstimated : 0;

      const categoryBreakdown: EventBudgetBreakdown[] = Object.entries(budgetCategories).map(
        ([cat, vals]) => ({
          category: cat as any,
          estimated: vals.estimated,
          actual: vals.actual,
          count: vals.count,
          isOverBudget: vals.actual > vals.estimated,
        })
      );

      const perfScore = computePerformanceScore(attendanceRate, avgFeedback, isOverBudget);

      return {
        eventId: ev.id,
        title: ev.title,
        slug: ev.slug || ev.id,
        date: ev.event_date,
        status: ev.status,
        venue: ev.venue || null,
        departmentId: ev.department_id,
        departmentName: dept?.name || '',
        departmentCode: dept?.code || '',
        capacity: ev.capacity || null,
        totalRegistered,
        totalAttended,
        totalAbsent,
        attendanceRate,
        checkInMethods: { qr: qrCount, manual: manualCount },
        feedbackCount: feeds.length,
        avgFeedbackScore: avgFeedback,
        feedbackDistribution: feedbackDist,
        topComments,
        totalEstimated,
        totalActual,
        budgetVariance,
        isOverBudget,
        overBudgetAmount,
        categoryBreakdown,
        performanceScore: perfScore,
        performanceTier: performanceTier(perfScore),
      };
    });

    // ── 4. Org-level rollups ────────────────────────────────────────────────
    const totalRegistrations = eventReports.reduce((s, e) => s + e.totalRegistered, 0);
    const totalAttendees = eventReports.reduce((s, e) => s + e.totalAttended, 0);
    const overallAttendanceRate =
      totalRegistrations > 0 ? Math.round((totalAttendees / totalRegistrations) * 100) : 0;

    const eventsWithFeedback = eventReports.filter((e) => e.avgFeedbackScore !== null);
    const orgAvgFeedback =
      eventsWithFeedback.length > 0
        ? Math.round(
            (eventsWithFeedback.reduce((s, e) => s + e.avgFeedbackScore!, 0) /
              eventsWithFeedback.length) *
              10
          ) / 10
        : null;

    const eventsOverBudget = eventReports.filter((e) => e.isOverBudget).length;
    const totalBudgetVariance = eventReports.reduce((s, e) => s + e.budgetVariance, 0);

    // byStatus
    const byStatus: Record<string, number> = {};
    for (const e of eventReports) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
    }

    // byDepartment
    const deptMap: Record<
      string,
      { name: string; code: string; count: number; totalAtt: number; feedbackScores: number[] }
    > = {};
    for (const e of eventReports) {
      if (!deptMap[e.departmentId]) {
        deptMap[e.departmentId] = {
          name: e.departmentName,
          code: e.departmentCode,
          count: 0,
          totalAtt: 0,
          feedbackScores: [],
        };
      }
      deptMap[e.departmentId].count++;
      deptMap[e.departmentId].totalAtt += e.attendanceRate;
      if (e.avgFeedbackScore !== null) {
        deptMap[e.departmentId].feedbackScores.push(e.avgFeedbackScore);
      }
    }
    const byDepartment = Object.entries(deptMap).map(([dId, v]) => ({
      departmentId: dId,
      departmentName: v.name,
      departmentCode: v.code,
      eventCount: v.count,
      avgAttendanceRate: Math.round(v.totalAtt / v.count),
      avgFeedbackScore:
        v.feedbackScores.length > 0
          ? Math.round(
              (v.feedbackScores.reduce((s, f) => s + f, 0) / v.feedbackScores.length) * 10
            ) / 10
          : null,
    }));

    return {
      success: true,
      summary: {
        generatedAt: new Date().toISOString(),
        filters: input,
        totalEvents: eventReports.length,
        totalRegistrations,
        totalAttendees,
        overallAttendanceRate,
        avgFeedbackScore: orgAvgFeedback,
        eventsOverBudget,
        totalBudgetVariance,
        byStatus,
        byDepartment,
        topByAttendance: [...eventReports]
          .sort((a, b) => b.attendanceRate - a.attendanceRate)
          .slice(0, 5),
        topByFeedback: [...eventReports]
          .filter((e) => e.avgFeedbackScore !== null)
          .sort((a, b) => b.avgFeedbackScore! - a.avgFeedbackScore!)
          .slice(0, 5),
        overBudgetEvents: eventReports.filter((e) => e.isOverBudget),
        events: eventReports,
      },
    };
  } catch (err: any) {
    console.error('[generateEventAnalyticsReport]', err);
    return { success: false, summary: null, error: err.message };
  }
}
