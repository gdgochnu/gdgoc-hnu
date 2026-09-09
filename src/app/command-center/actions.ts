'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  CommitteeHealthScorecard,
  CommitteeHealthSummary,
  CommitteeLeaderInfo,
  CommitteeHealthStatus,
  NeedsAttentionItem,
  NeedsAttentionFeedSummary,
  AttentionItemCategory,
  AttentionItemSeverity,
  UpcomingFeedItem,
  UpcomingFeedSummary,
  UpcomingItemType,
  WeeklyHeadReview,
  WeeklyReviewsSummary,
  SubmitWeeklyReviewInput,
  UnifiedApprovalItem,
  UnifiedApprovalsSummary,
  ActOnUnifiedApprovalInput,
} from '@/types/command-center';
import {
  generatePersonalCalendarUrl,
  getSharedCalendarInfo,
} from '@/lib/calendar/calendar-client';
import { revalidatePath } from 'next/cache';

/**
 * Access check for President Command Center (Spec §1.1, §1.3, §4.10, §5.1):
 * - President & Co-President: Full access to all committees & leadership tools
 * - Branch Head: Scoped access to committees under their branch (tech / non_tech)
 * - Committee Head / Co-Head: Scoped access to their own committee
 */
export async function canAccessCommandCenter(): Promise<{
  hasAccess: boolean;
  role?: string;
  isPresidential: boolean;
  isBranchHead: boolean;
  isCommitteeHead: boolean;
  branch?: 'tech' | 'non_tech' | null;
  departmentId?: string | null;
  profileId?: string;
}> {
  const context = await getUserContext();
  if (!context.user || !context.profile || context.profile.status !== 'active') {
    return {
      hasAccess: false,
      isPresidential: false,
      isBranchHead: false,
      isCommitteeHead: false,
    };
  }

  const role = context.profile.role;
  const isPresidential = role === 'president' || role === 'co_president';
  const isBranchHead = role === 'branch_head';
  const isCommitteeHead = role === 'committee_head' || role === 'committee_co_head';

  const branch = (context.profile.department as any)?.branch || null;
  const departmentId = context.profile.department_id || null;

  return {
    hasAccess: isPresidential || isBranchHead || isCommitteeHead,
    role,
    isPresidential,
    isBranchHead,
    isCommitteeHead,
    branch,
    departmentId,
    profileId: context.profile.id,
  };
}

/**
 * Step 16.1: Committee Health Scorecards
 * Computes:
 * - Task completion %
 * - Deadline adherence %
 * - Member attendance %
 * - Head & Co-Head attendance %
 * - Weighted overall health score + status badge (Healthy / Needs Attention / Critical)
 */
export async function getCommitteeHealthScorecards(options?: {
  branchFilter?: 'tech' | 'non_tech' | 'all';
  departmentId?: string;
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: CommitteeHealthSummary;
  error?: string;
}> {
  try {
    const isBypass = options?.bypassAuthForAdminTest === true;
    const access = isBypass
      ? {
          hasAccess: true,
          isPresidential: true,
          isBranchHead: false,
          isCommitteeHead: false,
          branch: null,
          departmentId: null,
        }
      : await canAccessCommandCenter();

    if (!access.hasAccess) {
      return {
        success: false,
        summary: {
          totalCommittees: 0,
          healthyCount: 0,
          needsAttentionCount: 0,
          criticalCount: 0,
          avgHealthScore: 0,
          scorecards: [],
        },
        error: 'Unauthorized. Command Center is reserved for Leadership.',
      };
    }

    const admin = createAdminClient();

    // 1. Fetch departments
    let deptQuery = admin
      .from('departments')
      .select('id, code, name, branch, description, head_id, co_head_id')
      .order('branch', { ascending: true })
      .order('name', { ascending: true });

    // Scoping by user role
    if (!access.isPresidential) {
      if (access.isBranchHead && access.branch) {
        deptQuery = deptQuery.eq('branch', access.branch);
      } else if (access.isCommitteeHead && access.departmentId) {
        deptQuery = deptQuery.eq('id', access.departmentId);
      }
    }

    // Optional user filters
    if (options?.branchFilter && options.branchFilter !== 'all') {
      deptQuery = deptQuery.eq('branch', options.branchFilter);
    }
    if (options?.departmentId) {
      deptQuery = deptQuery.eq('id', options.departmentId);
    }

    const { data: departments, error: deptError } = await deptQuery;
    if (deptError || !departments) {
      console.error('Error fetching departments for scorecards:', deptError);
      return {
        success: false,
        summary: {
          totalCommittees: 0,
          healthyCount: 0,
          needsAttentionCount: 0,
          criticalCount: 0,
          avgHealthScore: 0,
          scorecards: [],
        },
        error: deptError?.message || 'Failed to fetch departments',
      };
    }

    const deptIds = departments.map((d) => d.id);
    if (deptIds.length === 0) {
      return {
        success: true,
        summary: {
          totalCommittees: 0,
          healthyCount: 0,
          needsAttentionCount: 0,
          criticalCount: 0,
          avgHealthScore: 0,
          scorecards: [],
        },
      };
    }

    // 2. Fetch profiles, tasks, and past events in parallel
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const [profilesRes, tasksRes, eventsRes] = await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, email, avatar_url, role, position, department_id, status, attendance_rate')
        .in('department_id', deptIds),
      admin
        .from('tasks')
        .select('id, title, department_id, status, deadline, updated_at, created_at')
        .in('department_id', deptIds),
      admin
        .from('events')
        .select('id, event_date, status')
        .lte('event_date', todayStr),
    ]);

    const allProfiles = profilesRes.data || [];
    const allTasks = tasksRes.data || [];
    const pastEvents = eventsRes.data || [];
    const pastEventIds = pastEvents.map((e) => e.id);

    // 3. Fetch attendance records for leadership profiles across past events
    const leaderProfileIdsSet = new Set<string>();
    departments.forEach((dept) => {
      if (dept.head_id) leaderProfileIdsSet.add(dept.head_id);
      if (dept.co_head_id) leaderProfileIdsSet.add(dept.co_head_id);
    });
    allProfiles.forEach((p) => {
      if (p.role === 'committee_head' || p.role === 'committee_co_head') {
        leaderProfileIdsSet.add(p.id);
      }
    });

    const leaderProfileIds = Array.from(leaderProfileIdsSet);
    let leaderAttendanceMap: Record<string, number> = {};

    if (leaderProfileIds.length > 0 && pastEventIds.length > 0) {
      const { data: attendanceRecords } = await admin
        .from('attendance')
        .select('profile_id, event_id')
        .in('profile_id', leaderProfileIds)
        .in('event_id', pastEventIds);

      if (attendanceRecords) {
        attendanceRecords.forEach((rec) => {
          if (rec.profile_id) {
            leaderAttendanceMap[rec.profile_id] = (leaderAttendanceMap[rec.profile_id] || 0) + 1;
          }
        });
      }
    }

    // 4. Compute scorecard per department
    const scorecards: CommitteeHealthScorecard[] = departments.map((dept) => {
      // Members of this department
      const deptProfiles = allProfiles.filter((p) => p.department_id === dept.id);
      const activeMembers = deptProfiles.filter((p) => p.status === 'active');
      const regularMembers = activeMembers.filter(
        (p) => p.role !== 'committee_head' && p.role !== 'committee_co_head'
      );

      // Average Member Attendance Rate
      const memberCountToAverage = regularMembers.length > 0 ? regularMembers : activeMembers;
      const avgMemberAttendanceRate =
        memberCountToAverage.length > 0
          ? Math.round(
              memberCountToAverage.reduce((acc, m) => acc + (Number(m.attendance_rate) || 0), 0) /
                memberCountToAverage.length
            )
          : 100;

      // Identify Head & Co-Head
      let headProfile = dept.head_id
        ? deptProfiles.find((p) => p.id === dept.head_id) || null
        : deptProfiles.find((p) => p.role === 'committee_head') || null;

      let coHeadProfile = dept.co_head_id
        ? deptProfiles.find((p) => p.id === dept.co_head_id) || null
        : deptProfiles.find((p) => p.role === 'committee_co_head') || null;

      // Calculate Leader Attendance
      const calcLeaderAttendance = (p: typeof headProfile): CommitteeLeaderInfo | null => {
        if (!p) return null;
        const eventsAttended = leaderAttendanceMap[p.id] || 0;
        let rate = Number(p.attendance_rate) || 0;
        if (pastEventIds.length > 0) {
          rate = Math.round((eventsAttended / pastEventIds.length) * 100);
        }
        return {
          id: p.id,
          fullName: p.full_name || 'Unnamed',
          avatarUrl: p.avatar_url,
          role: p.role,
          position: p.position,
          attendanceRate: Math.min(100, Math.max(0, rate)),
          totalEventsAttended: eventsAttended,
        };
      };

      const headLeaderInfo = calcLeaderAttendance(headProfile);
      const coHeadLeaderInfo = calcLeaderAttendance(coHeadProfile);

      let headAttendanceRate: number | null = null;
      if (headLeaderInfo && coHeadLeaderInfo) {
        headAttendanceRate = Math.round(
          (headLeaderInfo.attendanceRate + coHeadLeaderInfo.attendanceRate) / 2
        );
      } else if (headLeaderInfo) {
        headAttendanceRate = headLeaderInfo.attendanceRate;
      } else if (coHeadLeaderInfo) {
        headAttendanceRate = coHeadLeaderInfo.attendanceRate;
      }

      // Department Tasks
      const deptTasks = allTasks.filter((t) => t.department_id === dept.id);
      const totalTasks = deptTasks.length;
      const completedTasks = deptTasks.filter((t) => t.status === 'done').length;
      const inProgressTasks = deptTasks.filter((t) =>
        ['todo', 'in_progress', 'review', 'delegated'].includes(t.status)
      ).length;

      const overdueTasks = deptTasks.filter((t) => {
        if (!t.deadline || t.status === 'done') return false;
        return new Date(t.deadline).getTime() < now.getTime();
      }).length;

      const taskCompletionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      // Deadline adherence: on-time completed vs overdue
      const tasksWithDeadline = deptTasks.filter((t) => !!t.deadline);
      const onTimeCompleted = tasksWithDeadline.filter((t) => t.status === 'done').length;
      const evaluatedDeadlines = onTimeCompleted + overdueTasks;
      const deadlineAdherenceRate =
        evaluatedDeadlines > 0
          ? Math.round((onTimeCompleted / evaluatedDeadlines) * 100)
          : 100;

      // Overall Health Score Calculation
      let overallHealthScore: number;
      if (headAttendanceRate !== null) {
        overallHealthScore = Math.round(
          taskCompletionRate * 0.35 +
            deadlineAdherenceRate * 0.25 +
            avgMemberAttendanceRate * 0.2 +
            headAttendanceRate * 0.2
        );
      } else {
        overallHealthScore = Math.round(
          taskCompletionRate * 0.45 +
            deadlineAdherenceRate * 0.3 +
            avgMemberAttendanceRate * 0.25
        );
      }
      overallHealthScore = Math.min(100, Math.max(0, overallHealthScore));

      // Health Status
      let healthStatus: CommitteeHealthStatus = 'healthy';
      if (overallHealthScore < 60) {
        healthStatus = 'critical';
      } else if (overallHealthScore < 80) {
        healthStatus = 'needs_attention';
      }

      // Executive Alerts
      const alerts: string[] = [];
      if (overdueTasks > 0) {
        alerts.push(`${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`);
      }
      if (avgMemberAttendanceRate < 60) {
        alerts.push(`Low member attendance (${avgMemberAttendanceRate}%)`);
      }
      if (headAttendanceRate !== null && headAttendanceRate < 65) {
        alerts.push(`Low leadership attendance (${headAttendanceRate}%)`);
      }
      if (!headLeaderInfo && !coHeadLeaderInfo) {
        alerts.push('No Committee Head assigned');
      }
      if (totalTasks === 0) {
        alerts.push('No active tasks logged');
      }

      return {
        departmentId: dept.id,
        code: dept.code,
        name: dept.name,
        branch: dept.branch,
        description: dept.description,
        head: headLeaderInfo,
        coHead: coHeadLeaderInfo,
        activeMembersCount: activeMembers.length,
        avgMemberAttendanceRate,
        totalTasks,
        completedTasks,
        overdueTasks,
        inProgressTasks,
        taskCompletionRate,
        deadlineAdherenceRate,
        headAttendanceRate,
        overallHealthScore,
        healthStatus,
        alerts,
      };
    });

    // Summary calculation
    const totalCommittees = scorecards.length;
    const healthyCount = scorecards.filter((s) => s.healthStatus === 'healthy').length;
    const needsAttentionCount = scorecards.filter((s) => s.healthStatus === 'needs_attention').length;
    const criticalCount = scorecards.filter((s) => s.healthStatus === 'critical').length;
    const avgHealthScore =
      totalCommittees > 0
        ? Math.round(
            scorecards.reduce((acc, s) => acc + s.overallHealthScore, 0) / totalCommittees
          )
        : 100;

    return {
      success: true,
      summary: {
        totalCommittees,
        healthyCount,
        needsAttentionCount,
        criticalCount,
        avgHealthScore,
        scorecards,
      },
    };
  } catch (err: any) {
    console.error('Error in getCommitteeHealthScorecards:', err);
    return {
      success: false,
      summary: {
        totalCommittees: 0,
        healthyCount: 0,
        needsAttentionCount: 0,
        criticalCount: 0,
        avgHealthScore: 0,
        scorecards: [],
      },
      error: err.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Step 16.2: "Needs Attention" Feed
 * Aggregates critical leadership issues across 5 domains:
 * 1. Overdue tasks (due_date < NOW() and incomplete)
 * 2. Stalled approvals / delegations (pending > 48h without action)
 * 3. PR urgent follow-ups (next follow-up date due or overdue)
 * 4. Inactive members (0 tasks or attendance activity in 30 days)
 * 5. Events over budget (totalActual > totalEstimated)
 */
export async function getNeedsAttentionFeed(options?: {
  branchFilter?: 'tech' | 'non_tech' | 'all';
  departmentId?: string;
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: NeedsAttentionFeedSummary;
  error?: string;
}> {
  try {
    const isBypass = options?.bypassAuthForAdminTest === true;
    const access = isBypass
      ? {
          hasAccess: true,
          isPresidential: true,
          isBranchHead: false,
          isCommitteeHead: false,
          branch: null,
          departmentId: null,
        }
      : await canAccessCommandCenter();

    if (!access.hasAccess) {
      return {
        success: false,
        summary: {
          totalIssuesCount: 0,
          urgentCount: 0,
          overdueTasksCount: 0,
          stalledApprovalsCount: 0,
          prFollowUpsCount: 0,
          inactiveMembersCount: 0,
          eventsOverBudgetCount: 0,
          items: [],
        },
        error: 'Unauthorized. Needs Attention feed is reserved for Leadership.',
      };
    }

    const admin = createAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const twentyFourHoursAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch departments for scoping & labeling
    let deptQuery = admin.from('departments').select('id, code, name, branch');
    if (!access.isPresidential) {
      if (access.isBranchHead && access.branch) deptQuery = deptQuery.eq('branch', access.branch);
      else if (access.isCommitteeHead && access.departmentId) deptQuery = deptQuery.eq('id', access.departmentId);
    }
    if (options?.branchFilter && options.branchFilter !== 'all') {
      deptQuery = deptQuery.eq('branch', options.branchFilter);
    }
    if (options?.departmentId) {
      deptQuery = deptQuery.eq('id', options.departmentId);
    }

    const { data: departments } = await deptQuery;
    const deptMap = new Map((departments || []).map((d) => [d.id, d]));
    const scopedDeptIds = (departments || []).map((d) => d.id);

    // 2. Fetch the 5 streams in parallel
    const [
      overdueTasksRes,
      stalledTasksRes,
      stalledApprovalsRes,
      prInteractionsRes,
      activeMembersRes,
      budgetItemsRes,
      eventsRes,
      profilesRes,
    ] = await Promise.all([
      // 1. Overdue tasks
      admin
        .from('tasks')
        .select('id, title, department_id, assignee_id, priority, deadline, status, updated_at, created_at')
        .neq('status', 'done')
        .not('deadline', 'is', null)
        .lt('deadline', nowIso)
        .order('deadline', { ascending: true })
        .limit(50),

      // 2a. Stalled review/delegated tasks (>48h)
      admin
        .from('tasks')
        .select('id, title, department_id, assignee_id, priority, status, updated_at, created_at')
        .in('status', ['review', 'delegated'])
        .lt('updated_at', fortyEightHoursAgo)
        .order('updated_at', { ascending: true })
        .limit(30),

      // 2b. Stalled approval instances (>48h)
      admin
        .from('approval_instances')
        .select('id, workflow_type, entity_id, current_step, status, created_at')
        .eq('status', 'in_progress')
        .lt('created_at', fortyEightHoursAgo)
        .order('created_at', { ascending: true })
        .limit(30),

      // 3. PR Interactions with follow-up due or overdue
      admin
        .from('pr_interactions')
        .select('id, contact_id, interaction_type, summary, next_follow_up, created_at')
        .not('next_follow_up', 'is', null)
        .lte('next_follow_up', twentyFourHoursAhead)
        .order('next_follow_up', { ascending: true })
        .limit(30),

      // 4. Active team members
      admin
        .from('profiles')
        .select('id, full_name, avatar_url, role, department_id, join_date, status, attendance_rate')
        .eq('status', 'active')
        .limit(100),

      // 5. Budget items
      admin
        .from('event_budget_items')
        .select('id, event_id, estimated_cost, actual_cost'),

      // Events for budget & task references
      admin
        .from('events')
        .select('id, title, slug, event_date, department_id'),

      // Profiles lookup for names & avatars
      admin
        .from('profiles')
        .select('id, full_name, avatar_url, email'),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const eventMap = new Map((eventsRes.data || []).map((e) => [e.id, e]));

    const items: NeedsAttentionItem[] = [];

    // ==========================================
    // STREAM 1: Overdue Tasks
    // ==========================================
    const overdueTasks = overdueTasksRes.data || [];
    overdueTasks.forEach((task) => {
      // Check scoping
      if (scopedDeptIds.length > 0 && !scopedDeptIds.includes(task.department_id)) return;

      const dept = deptMap.get(task.department_id);
      const assignee = task.assignee_id ? profileMap.get(task.assignee_id) : null;
      const deadlineDate = new Date(task.deadline);
      const diffMs = now.getTime() - deadlineDate.getTime();
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      const isUrgent = diffDays >= 3 || task.priority === 'high';

      items.push({
        id: `overdue-task-${task.id}`,
        category: 'overdue_task',
        severity: isUrgent ? 'urgent' : 'warning',
        title: task.title,
        subtitle: `Assigned to ${assignee?.full_name || 'Unassigned'} • Due ${deadlineDate.toLocaleDateString()}`,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        actionUrl: `/tasks?departmentId=${task.department_id}`,
        actionLabel: 'Review Task',
        timestamp: task.deadline,
        diffDays,
        metadata: {
          assigneeName: assignee?.full_name || null,
          avatarUrl: assignee?.avatar_url || null,
          dueDate: task.deadline,
          daysOverdue: diffDays,
          taskTitle: task.title,
        },
      });
    });

    // ==========================================
    // STREAM 2: Stalled Approvals & Delegations (>48h)
    // ==========================================
    const stalledTasks = stalledTasksRes.data || [];
    stalledTasks.forEach((task) => {
      if (scopedDeptIds.length > 0 && !scopedDeptIds.includes(task.department_id)) return;

      const dept = deptMap.get(task.department_id);
      const assignee = task.assignee_id ? profileMap.get(task.assignee_id) : null;
      const updatedDate = new Date(task.updated_at);
      const hoursStalled = Math.round((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60));
      const isUrgent = hoursStalled >= 72;

      const typeLabel = task.status === 'delegated' ? 'Delegated Task' : 'Task Submission';

      items.push({
        id: `stalled-task-${task.id}`,
        category: 'stalled_approval',
        severity: isUrgent ? 'urgent' : 'warning',
        title: `${typeLabel}: ${task.title}`,
        subtitle: `Awaiting action for ${hoursStalled} hours (${Math.round(hoursStalled / 24)} days) • ${assignee?.full_name || 'Team member'}`,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        actionUrl: '/approvals',
        actionLabel: 'Action Approval',
        timestamp: task.updated_at,
        metadata: {
          hoursStalled,
          assigneeName: assignee?.full_name || null,
          avatarUrl: assignee?.avatar_url || null,
          taskTitle: task.title,
        },
      });
    });

    // ==========================================
    // STREAM 3: PR Follow-ups
    // ==========================================
    const prInteractions = prInteractionsRes.data || [];
    if (prInteractions.length > 0) {
      const contactIds = Array.from(new Set(prInteractions.map((i) => i.contact_id)));
      const { data: contactsData } = await admin
        .from('pr_contacts')
        .select('id, name, organization, type, pipeline_stage, assigned_to')
        .in('id', contactIds);

      const contactMap = new Map((contactsData || []).map((c) => [c.id, c]));

      prInteractions.forEach((interaction) => {
        const contact = contactMap.get(interaction.contact_id);
        if (!contact) return;

        const followUpDate = new Date(interaction.next_follow_up);
        const isOverdue = followUpDate.getTime() < now.getTime();
        const diffMs = Math.abs(now.getTime() - followUpDate.getTime());
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const assignee = contact.assigned_to ? profileMap.get(contact.assigned_to) : null;

        items.push({
          id: `pr-followup-${interaction.id}`,
          category: 'pr_follow_up',
          severity: isOverdue ? 'urgent' : 'warning',
          title: `PR Follow-up: ${contact.name}`,
          subtitle: `${contact.organization || 'External Partner'} • ${contact.type} (${contact.pipeline_stage}) • ${interaction.summary}`,
          departmentName: 'Public Relations',
          departmentCode: 'PR',
          actionUrl: '/pr',
          actionLabel: 'Open CRM',
          timestamp: interaction.next_follow_up,
          diffDays: isOverdue ? diffDays : -diffDays,
          metadata: {
            contactName: contact.name,
            organization: contact.organization,
            stage: contact.pipeline_stage,
            assigneeName: assignee?.full_name || null,
            avatarUrl: assignee?.avatar_url || null,
          },
        });
      });
    }

    // ==========================================
    // STREAM 4: Inactive Members (Joined >21 days ago, 0 recent activity)
    // ==========================================
    const activeMembers = activeMembersRes.data || [];
    if (activeMembers.length > 0) {
      // Find members with tasks completed
      const memberIds = activeMembers.map((m) => m.id);
      const { data: memberTasks } = await admin
        .from('tasks')
        .select('assignee_id, status, updated_at')
        .in('assignee_id', memberIds)
        .gte('updated_at', thirtyDaysAgo);

      const activeAssigneeIds = new Set(
        (memberTasks || []).filter((t) => t.assignee_id).map((t) => t.assignee_id)
      );

      activeMembers.forEach((member) => {
        if (member.role !== 'member') return; // Only flag regular members
        if (scopedDeptIds.length > 0 && member.department_id && !scopedDeptIds.includes(member.department_id)) {
          return;
        }

        const joinDate = member.join_date ? new Date(member.join_date) : new Date();
        const daysSinceJoin = Math.round((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));

        // If member joined more than 21 days ago and had 0 task activity in the last 30 days
        if (daysSinceJoin > 21 && !activeAssigneeIds.has(member.id)) {
          const dept = member.department_id ? deptMap.get(member.department_id) : null;

          items.push({
            id: `inactive-member-${member.id}`,
            category: 'inactive_member',
            severity: 'warning',
            title: `Inactive Member: ${member.full_name}`,
            subtitle: `No tasks or activity logged in the past 30 days (Joined ${daysSinceJoin} days ago)`,
            departmentName: dept?.name || null,
            departmentCode: dept?.code || null,
            actionUrl: `/members/${member.id}`,
            actionLabel: 'View Member',
            timestamp: member.join_date,
            metadata: {
              assigneeName: member.full_name,
              avatarUrl: member.avatar_url,
              lastActiveDays: daysSinceJoin,
            },
          });
        }
      });
    }

    // ==========================================
    // STREAM 5: Events Over Budget
    // ==========================================
    const budgetItems = budgetItemsRes.data || [];
    if (budgetItems.length > 0) {
      const eventBudgetTotals = new Map<string, { estimated: number; actual: number }>();
      budgetItems.forEach((b) => {
        const current = eventBudgetTotals.get(b.event_id) || { estimated: 0, actual: 0 };
        current.estimated += Number(b.estimated_cost) || 0;
        if (b.actual_cost !== null && b.actual_cost !== undefined) {
          current.actual += Number(b.actual_cost) || 0;
        }
        eventBudgetTotals.set(b.event_id, current);
      });

      eventBudgetTotals.forEach((totals, eventId) => {
        if (totals.actual > totals.estimated && totals.estimated > 0) {
          const event = eventMap.get(eventId);
          if (!event) return;
          if (scopedDeptIds.length > 0 && event.department_id && !scopedDeptIds.includes(event.department_id)) {
            return;
          }

          const dept = event.department_id ? deptMap.get(event.department_id) : null;
          const variance = totals.actual - totals.estimated;

          items.push({
            id: `budget-over-${eventId}`,
            category: 'event_over_budget',
            severity: 'urgent',
            title: `Budget Overrun: ${event.title}`,
            subtitle: `Actual expenses exceed estimated budget by $${variance.toFixed(2)} (Estimated: $${totals.estimated.toFixed(2)}, Actual: $${totals.actual.toFixed(2)})`,
            departmentName: dept?.name || 'Operations',
            departmentCode: dept?.code || 'OPS',
            actionUrl: `/events/${event.slug || event.id}#event-budget-tracker-section`,
            actionLabel: 'Inspect Budget',
            timestamp: event.event_date,
            metadata: {
              eventTitle: event.title,
              varianceAmount: variance,
              estimatedCost: totals.estimated,
              actualCost: totals.actual,
            },
          });
        }
      });
    }

    // Sort items: urgent first, then by timestamp/diffDays
    items.sort((a, b) => {
      if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
      if (b.severity === 'urgent' && a.severity !== 'urgent') return 1;
      return (b.diffDays || 0) - (a.diffDays || 0);
    });

    const overdueTasksCount = items.filter((i) => i.category === 'overdue_task').length;
    const stalledApprovalsCount = items.filter((i) => i.category === 'stalled_approval').length;
    const prFollowUpsCount = items.filter((i) => i.category === 'pr_follow_up').length;
    const inactiveMembersCount = items.filter((i) => i.category === 'inactive_member').length;
    const eventsOverBudgetCount = items.filter((i) => i.category === 'event_over_budget').length;
    const urgentCount = items.filter((i) => i.severity === 'urgent').length;

    return {
      success: true,
      summary: {
        totalIssuesCount: items.length,
        urgentCount,
        overdueTasksCount,
        stalledApprovalsCount,
        prFollowUpsCount,
        inactiveMembersCount,
        eventsOverBudgetCount,
        items,
      },
    };
  } catch (err: any) {
    console.error('Error in getNeedsAttentionFeed:', err);
    return {
      success: false,
      summary: {
        totalIssuesCount: 0,
        urgentCount: 0,
        overdueTasksCount: 0,
        stalledApprovalsCount: 0,
        prFollowUpsCount: 0,
        inactiveMembersCount: 0,
        eventsOverBudgetCount: 0,
        items: [],
      },
      error: err.message || 'Failed to fetch Needs Attention feed',
    };
  }
}

/**
 * Step 16.3: "Upcoming" Feed (Synced with Google Calendar)
 * Feeds scheduled chapter events and task milestones over the next 30 days.
 * Provides:
 * - One-click "Add to Google Calendar" URLs
 * - Shared Chapter Calendar info & subscribe link
 * - Time categorization: Today, Tomorrow, This Week, Next Week, Later
 */
export async function getUpcomingLeadershipFeed(options?: {
  branchFilter?: 'tech' | 'non_tech' | 'all';
  departmentId?: string;
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: UpcomingFeedSummary;
  error?: string;
}> {
  try {
    const isBypass = options?.bypassAuthForAdminTest === true;
    const access = isBypass
      ? {
          hasAccess: true,
          isPresidential: true,
          isBranchHead: false,
          isCommitteeHead: false,
          branch: null,
          departmentId: null,
        }
      : await canAccessCommandCenter();

    if (!access.hasAccess) {
      return {
        success: false,
        summary: {
          totalUpcomingCount: 0,
          eventsCount: 0,
          deadlinesCount: 0,
          sharedCalendarLink: null,
          sharedCalendarName: null,
          items: [],
        },
        error: 'Unauthorized. Upcoming feed is reserved for Leadership.',
      };
    }

    const admin = createAdminClient();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAheadStr = thirtyDaysAhead.toISOString().split('T')[0];
    const thirtyDaysAheadIso = thirtyDaysAhead.toISOString();

    // 1. Fetch departments
    let deptQuery = admin.from('departments').select('id, code, name, branch');
    if (!access.isPresidential) {
      if (access.isBranchHead && access.branch) deptQuery = deptQuery.eq('branch', access.branch);
      else if (access.isCommitteeHead && access.departmentId) deptQuery = deptQuery.eq('id', access.departmentId);
    }
    if (options?.branchFilter && options.branchFilter !== 'all') {
      deptQuery = deptQuery.eq('branch', options.branchFilter);
    }
    if (options?.departmentId) {
      deptQuery = deptQuery.eq('id', options.departmentId);
    }

    const { data: departments } = await deptQuery;
    const deptMap = new Map((departments || []).map((d) => [d.id, d]));
    const scopedDeptIds = (departments || []).map((d) => d.id);

    // 2. Fetch upcoming events, task deadlines, shared calendar info, and profiles in parallel
    const [eventsRes, tasksRes, calInfoRes, profilesRes] = await Promise.all([
      admin
        .from('events')
        .select('id, title, slug, description, venue, event_date, start_time, end_time, capacity, department_id, status, gcal_event_id')
        .gte('event_date', todayStr)
        .lte('event_date', thirtyDaysAheadStr)
        .neq('status', 'rejected')
        .order('event_date', { ascending: true })
        .limit(30),

      admin
        .from('tasks')
        .select('id, title, description, deadline, priority, department_id, assignee_id, status')
        .neq('status', 'done')
        .not('deadline', 'is', null)
        .gte('deadline', now.toISOString())
        .lte('deadline', thirtyDaysAheadIso)
        .order('deadline', { ascending: true })
        .limit(30),

      getSharedCalendarInfo().catch(() => ({ success: false } as any)),

      admin
        .from('profiles')
        .select('id, full_name, avatar_url'),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p) => [p.id, p]));
    const sharedCal = calInfoRes?.success ? calInfoRes : null;

    const items: UpcomingFeedItem[] = [];

    // Helper: calculate time grouping and days until
    const getTimeCategory = (targetDate: Date): { timeGroup: UpcomingFeedItem['timeGroup']; daysUntil: number } => {
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const diffMs = targetOnly.getTime() - todayDate.getTime();
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let timeGroup: UpcomingFeedItem['timeGroup'] = 'later';
      if (daysUntil <= 0) timeGroup = 'today';
      else if (daysUntil === 1) timeGroup = 'tomorrow';
      else if (daysUntil <= 7) timeGroup = 'this_week';
      else if (daysUntil <= 14) timeGroup = 'next_week';

      return { timeGroup, daysUntil };
    };

    // Helper: format time string nicely
    const formatTimeLabel = (timeStr?: string | null): string | null => {
      if (!timeStr) return null;
      try {
        const parts = timeStr.split(':');
        let hours = parseInt(parts[0], 10);
        const mins = parts[1] || '00';
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${mins} ${ampm}`;
      } catch {
        return timeStr;
      }
    };

    // ==========================================
    // 1. Process Upcoming Events
    // ==========================================
    const events = eventsRes.data || [];
    for (const evt of events) {
      if (scopedDeptIds.length > 0 && !scopedDeptIds.includes(evt.department_id)) continue;

      const dept = deptMap.get(evt.department_id);
      const evtDate = new Date(evt.event_date);
      const { timeGroup, daysUntil } = getTimeCategory(evtDate);

      const startTimeStr = evt.start_time ? formatTimeLabel(evt.start_time) : null;
      const endTimeStr = evt.end_time ? formatTimeLabel(evt.end_time) : null;
      const timeDisplay = startTimeStr
        ? `${startTimeStr}${endTimeStr ? ` – ${endTimeStr}` : ''}`
        : 'All Day Event';

      // One-click Add to Google Calendar URL
      let startDateTime = evt.start_time
        ? `${evt.event_date}T${evt.start_time}`
        : `${evt.event_date}T10:00:00`;
      let endDateTime = evt.end_time
        ? `${evt.event_date}T${evt.end_time}`
        : `${evt.event_date}T12:00:00`;

      const gcalUrl = generatePersonalCalendarUrl({
        title: `GDGoC: ${evt.title}`,
        description: `${evt.description || 'GDGoC Chapter Event'}\n\nOrganized by ${dept?.name || 'GDGoC HNU'}`,
        location: evt.venue || 'Helwan National University',
        startDate: startDateTime,
        endDate: endDateTime,
        isAllDay: !evt.start_time,
      });

      items.push({
        id: `upcoming-event-${evt.id}`,
        type: 'event',
        title: evt.title,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        scheduledDate: evt.event_date,
        formattedTime: timeDisplay,
        locationOrVenue: evt.venue || 'Campus Venue / Online',
        timeGroup,
        daysUntil,
        actionUrl: `/events/${evt.slug || evt.id}`,
        googleCalendarUrl: gcalUrl,
        metadata: {
          capacity: evt.capacity || null,
          gcalEventId: evt.gcal_event_id || null,
        },
      });
    }

    // ==========================================
    // 2. Process Upcoming Task Milestones & Deadlines
    // ==========================================
    const tasks = tasksRes.data || [];
    for (const t of tasks) {
      if (scopedDeptIds.length > 0 && !scopedDeptIds.includes(t.department_id)) continue;

      const dept = deptMap.get(t.department_id);
      const assignee = t.assignee_id ? profileMap.get(t.assignee_id) : null;
      const deadlineDate = new Date(t.deadline);
      const { timeGroup, daysUntil } = getTimeCategory(deadlineDate);

      const timeDisplay = deadlineDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });

      const gcalUrl = generatePersonalCalendarUrl({
        title: `[Deadline] ${t.title} (${dept?.code || 'Task'})`,
        description: `Task Milestone Deadline\nAssigned to: ${assignee?.full_name || 'Team Member'}\nCommittee: ${dept?.name || ''}\nPriority: ${t.priority || 'medium'}`,
        startDate: t.deadline,
      });

      items.push({
        id: `upcoming-task-${t.id}`,
        type: 'task_deadline',
        title: t.title,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        scheduledDate: t.deadline,
        formattedTime: `Due by ${timeDisplay}`,
        locationOrVenue: `Committee: ${dept?.name || 'General'}`,
        timeGroup,
        daysUntil,
        actionUrl: `/tasks?departmentId=${t.department_id}&taskId=${t.id}`,
        googleCalendarUrl: gcalUrl,
        metadata: {
          assigneeName: assignee?.full_name || null,
          avatarUrl: assignee?.avatar_url || null,
          priority: t.priority || 'medium',
          taskTitle: t.title,
        },
      });
    }

    // Sort items chronologically by scheduledDate
    items.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const eventsCount = items.filter((i) => i.type === 'event').length;
    const deadlinesCount = items.filter((i) => i.type === 'task_deadline').length;

    return {
      success: true,
      summary: {
        totalUpcomingCount: items.length,
        eventsCount,
        deadlinesCount,
        sharedCalendarLink: sharedCal?.subscribableLink || null,
        sharedCalendarName: sharedCal?.calendarName || 'GDGoC HNU',
        items,
      },
    };
  } catch (err: any) {
    console.error('Error in getUpcomingLeadershipFeed:', err);
    return {
      success: false,
      summary: {
        totalUpcomingCount: 0,
        eventsCount: 0,
        deadlinesCount: 0,
        sharedCalendarLink: null,
        sharedCalendarName: null,
        items: [],
      },
      error: err.message || 'Failed to fetch Upcoming feed',
    };
  }
}

// ==========================================
// 16.4 Weekly 5-Question Head Reviews Actions
// ==========================================

export async function getCurrentWeekStartDate(date = new Date()): Promise<string> {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

export async function getWeeklyReviewsFeed(options?: {
  weekStartDate?: string;
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: WeeklyReviewsSummary;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let isPresidentOrCo = false;
    let isHeadOrCoHead = false;
    let userDepartmentId: string | null = null;
    let currentUserId: string | null = null;

    const defaultWeekStart = await getCurrentWeekStartDate();
    const weekStartDate = options?.weekStartDate || defaultWeekStart;

    if (options?.bypassAuthForAdminTest) {
      isPresidentOrCo = true;
    } else {
      const context = await getUserContext();
      if (!context.user || !context.profile || context.profile.status !== 'active') {
        return {
          success: false,
          summary: {
            weekStartDate,
            totalSubmissions: 0,
            expectedCommitteesCount: 0,
            averageMorale: 0,
            pendingFeedbackCount: 0,
            reviews: [],
            userCurrentReview: null,
            userDepartmentId: null,
            isHeadOrCoHead: false,
            isPresidentOrCo: false,
          },
          error: 'Unauthorized',
        };
      }

      currentUserId = context.user.id;
      const role = context.profile.role;
      isPresidentOrCo = role === 'president' || role === 'co_president';
      isHeadOrCoHead = role === 'committee_head' || role === 'committee_co_head';
      userDepartmentId = context.profile.department_id || null;
    }

    // 1. Fetch active departments (excluding general) to count expected committees
    const { data: deptsData } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .neq('code', 'GENERAL')
      .order('name', { ascending: true });

    const departments = deptsData || [];
    const deptMap = new Map(departments.map((d) => [d.id, d]));
    const expectedCommitteesCount = departments.length;

    // 2. Fetch weekly reviews for this week
    let reviews: WeeklyHeadReview[] = [];
    const { data: dbReviews, error: reviewsErr } = await admin
      .from('weekly_head_reviews')
      .select('*')
      .eq('week_start_date', weekStartDate)
      .order('created_at', { ascending: false });

    if (reviewsErr) {
      console.warn('[getWeeklyReviewsFeed] DB query notice:', reviewsErr.message);
    } else if (dbReviews && dbReviews.length > 0) {
      // Gather profile IDs for heads & reviewers
      const profileIds = new Set<string>();
      dbReviews.forEach((r) => {
        if (r.head_id) profileIds.add(r.head_id);
        if (r.reviewed_by) profileIds.add(r.reviewed_by);
      });

      const { data: profilesData } = await admin
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', Array.from(profileIds));

      const profileMap = new Map((profilesData || []).map((p) => [p.id, p]));

      reviews = dbReviews.map((r) => {
        const head = profileMap.get(r.head_id);
        const dept = deptMap.get(r.department_id);
        return {
          id: r.id,
          headId: r.head_id,
          departmentId: r.department_id,
          weekStartDate: r.week_start_date,
          q1Achievements: r.q1_achievements,
          q2Blockers: r.q2_blockers,
          q3NextWeekPlan: r.q3_next_week_plan,
          q4SupportNeeded: r.q4_support_needed,
          q5MoraleRating: r.q5_morale_rating,
          presidentFeedback: r.president_feedback,
          reviewedBy: r.reviewed_by,
          reviewedAt: r.reviewed_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          headName: head?.full_name || 'Committee Head',
          headEmail: head?.email,
          headAvatar: head?.avatar_url || null,
          departmentName: dept?.name || 'Department',
          departmentCode: dept?.code || 'DEPT',
        };
      });
    }

    // Identify user's department review
    let userCurrentReview: WeeklyHeadReview | null = null;
    if (userDepartmentId) {
      userCurrentReview = reviews.find((r) => r.departmentId === userDepartmentId) || null;
    } else if (currentUserId) {
      userCurrentReview = reviews.find((r) => r.headId === currentUserId) || null;
    }

    const totalSubmissions = reviews.length;
    const moraleSum = reviews.reduce((sum, r) => sum + r.q5MoraleRating, 0);
    const averageMorale = totalSubmissions > 0 ? Number((moraleSum / totalSubmissions).toFixed(1)) : 0;
    const pendingFeedbackCount = reviews.filter((r) => !r.presidentFeedback || r.presidentFeedback.trim() === '').length;

    return {
      success: true,
      summary: {
        weekStartDate,
        totalSubmissions,
        expectedCommitteesCount,
        averageMorale,
        pendingFeedbackCount,
        reviews,
        userCurrentReview,
        userDepartmentId,
        isHeadOrCoHead,
        isPresidentOrCo,
      },
    };
  } catch (err: any) {
    console.error('Error in getWeeklyReviewsFeed:', err);
    return {
      success: false,
      summary: {
        weekStartDate: options?.weekStartDate || (await getCurrentWeekStartDate()),
        totalSubmissions: 0,
        expectedCommitteesCount: 0,
        averageMorale: 0,
        pendingFeedbackCount: 0,
        reviews: [],
        userCurrentReview: null,
        userDepartmentId: null,
        isHeadOrCoHead: false,
        isPresidentOrCo: false,
      },
      error: err.message || 'Failed to fetch weekly reviews',
    };
  }
}

export async function submitWeeklyHeadReview(input: SubmitWeeklyReviewInput): Promise<{
  success: boolean;
  review?: WeeklyHeadReview;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized' };
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
      return { success: false, error: 'Only Committee Heads and Core Leadership can submit weekly reviews.' };
    }

    // Validation
    if (!input.departmentId) return { success: false, error: 'Department ID is required' };
    if (!input.weekStartDate) return { success: false, error: 'Week start date is required' };
    if (!input.q1Achievements?.trim()) return { success: false, error: 'Achievements (Q1) cannot be empty' };
    if (!input.q2Blockers?.trim()) return { success: false, error: 'Blockers (Q2) cannot be empty' };
    if (!input.q3NextWeekPlan?.trim()) return { success: false, error: 'Next week plan (Q3) cannot be empty' };
    if (!input.q5MoraleRating || input.q5MoraleRating < 1 || input.q5MoraleRating > 5) {
      return { success: false, error: 'Morale rating (Q5) must be between 1 and 5' };
    }

    const admin = createAdminClient();

    const payload = {
      head_id: context.user.id,
      department_id: input.departmentId,
      week_start_date: input.weekStartDate,
      q1_achievements: input.q1Achievements.trim(),
      q2_blockers: input.q2Blockers.trim(),
      q3_next_week_plan: input.q3NextWeekPlan.trim(),
      q4_support_needed: input.q4SupportNeeded?.trim() || null,
      q5_morale_rating: Math.round(input.q5MoraleRating),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from('weekly_head_reviews')
      .upsert(payload, { onConflict: 'department_id,week_start_date' })
      .select('*')
      .single();

    if (error) {
      console.error('[submitWeeklyHeadReview] DB error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      review: {
        id: data.id,
        headId: data.head_id,
        departmentId: data.department_id,
        weekStartDate: data.week_start_date,
        q1Achievements: data.q1_achievements,
        q2Blockers: data.q2_blockers,
        q3NextWeekPlan: data.q3_next_week_plan,
        q4SupportNeeded: data.q4_support_needed,
        q5MoraleRating: data.q5_morale_rating,
        presidentFeedback: data.president_feedback,
        reviewedBy: data.reviewed_by,
        reviewedAt: data.reviewed_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    console.error('Error in submitWeeklyHeadReview:', err);
    return { success: false, error: err.message || 'Failed to submit review' };
  }
}

export async function submitPresidentReviewFeedback(
  reviewId: string,
  feedback: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized' };
    }

    const role = context.profile.role;
    const isPresidential = role === 'president' || role === 'co_president';

    if (!isPresidential) {
      return { success: false, error: 'Only President or Co-President can submit executive feedback.' };
    }

    if (!reviewId) return { success: false, error: 'Review ID is required' };
    if (!feedback?.trim()) return { success: false, error: 'Feedback cannot be empty' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('weekly_head_reviews')
      .update({
        president_feedback: feedback.trim(),
        reviewed_by: context.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (error) {
      console.error('[submitPresidentReviewFeedback] DB error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error in submitPresidentReviewFeedback:', err);
    return { success: false, error: err.message || 'Failed to save feedback' };
  }
}

// ==========================================
// 16.5 Unified Pending-Approvals Queue Actions
// ==========================================

export async function getUnifiedApprovalsQueue(options?: {
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: UnifiedApprovalsSummary;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let isPresidential = false;
    let isBranchHead = false;
    let isCommitteeHead = false;
    let userDeptId: string | null = null;
    let branch: 'tech' | 'non_tech' | null = null;

    if (options?.bypassAuthForAdminTest) {
      isPresidential = true;
    } else {
      const context = await getUserContext();
      if (!context.user || !context.profile || context.profile.status !== 'active') {
        return {
          success: false,
          summary: {
            totalPending: 0,
            accountsCount: 0,
            tasksCount: 0,
            eventsCount: 0,
            urgentCount: 0,
            items: [],
          },
          error: 'Unauthorized',
        };
      }

      const role = context.profile.role;
      isPresidential = role === 'president' || role === 'co_president';
      isBranchHead = role === 'branch_head';
      isCommitteeHead = role === 'committee_head' || role === 'committee_co_head';
      userDeptId = context.profile.department_id || null;
    }

    // 1. Fetch departments
    const { data: deptsData } = await admin
      .from('departments')
      .select('id, name, code, branch');
    const departments = deptsData || [];
    const deptMap = new Map(departments.map((d) => [d.id, d]));

    // Determine scoped department IDs
    let scopedDeptIds: string[] = [];
    if (!isPresidential) {
      if (isCommitteeHead && userDeptId) {
        scopedDeptIds = [userDeptId];
      } else if (isBranchHead && branch) {
        scopedDeptIds = departments.filter((d) => d.branch === branch).map((d) => d.id);
      }
    }

    // 2. Fetch Pending Accounts (profiles with status = 'pending_review')
    let accountsQuery = admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, position, department_id, faculty, university_id, phone, created_at, role')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (scopedDeptIds.length > 0) {
      accountsQuery = accountsQuery.in('department_id', scopedDeptIds);
    }

    // 3. Fetch Tasks in Review (tasks with status = 'review')
    let tasksQuery = admin
      .from('tasks')
      .select('id, title, description, priority, deadline, department_id, creator_id, assignee_id, updated_at, created_at, approval_instance_id')
      .eq('status', 'review')
      .order('updated_at', { ascending: true });

    if (scopedDeptIds.length > 0) {
      tasksQuery = tasksQuery.in('department_id', scopedDeptIds);
    }

    // 4. Fetch Events Pending Review
    let eventsQuery = admin
      .from('events')
      .select('id, title, description, event_date, venue, capacity, department_id, created_by, status, created_at, updated_at, approval_instance_id')
      .in('status', ['submitted_for_review', 'branch_review', 'pending_final_approval'])
      .order('created_at', { ascending: true });

    if (scopedDeptIds.length > 0) {
      eventsQuery = eventsQuery.in('department_id', scopedDeptIds);
    }

    const [accountsRes, tasksRes, eventsRes] = await Promise.all([
      accountsQuery,
      tasksQuery,
      eventsQuery,
    ]);

    const accounts = accountsRes.data || [];
    const tasks = tasksRes.data || [];
    const events = eventsRes.data || [];

    // Gather profile IDs for submitters/creators to populate names & avatars
    const profileIds = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee_id) profileIds.add(t.assignee_id);
      if (t.creator_id) profileIds.add(t.creator_id);
    });
    events.forEach((e) => {
      if (e.created_by) profileIds.add(e.created_by);
    });

    let profileMap = new Map<string, any>();
    if (profileIds.size > 0) {
      const { data: profilesData } = await admin
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .in('id', Array.from(profileIds));
      if (profilesData) {
        profileMap = new Map(profilesData.map((p) => [p.id, p]));
      }
    }

    const now = new Date();
    const items: UnifiedApprovalItem[] = [];

    // Map Accounts
    accounts.forEach((acc) => {
      const dept = acc.department_id ? deptMap.get(acc.department_id) : null;
      const submittedDate = new Date(acc.created_at);
      const hoursPending = Math.max(0, Math.round((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60)));
      const urgency: 'urgent' | 'normal' | 'low' = hoursPending >= 48 ? 'urgent' : 'normal';

      items.push({
        id: `account-${acc.id}`,
        type: 'account',
        entityId: acc.id,
        title: `Member Registration: ${acc.full_name}`,
        subtitle: `Applied for ${dept?.name || 'General Chapter'} • ${acc.position || 'Member'}`,
        submitterName: acc.full_name,
        submitterEmail: acc.email,
        submitterAvatar: acc.avatar_url,
        submitterRole: acc.role || 'applicant',
        departmentId: acc.department_id,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        submittedAt: acc.created_at,
        urgency,
        hoursPending,
        actionUrl: '/approvals',
        details: {
          position: acc.position,
          faculty: acc.faculty,
          universityId: acc.university_id,
          phone: acc.phone,
        },
      });
    });

    // Map Tasks
    tasks.forEach((task) => {
      const dept = deptMap.get(task.department_id);
      const assignee = task.assignee_id ? profileMap.get(task.assignee_id) : null;
      const creator = task.creator_id ? profileMap.get(task.creator_id) : null;
      const submittedDate = new Date(task.updated_at || task.created_at);
      const hoursPending = Math.max(0, Math.round((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60)));
      const urgency: 'urgent' | 'normal' | 'low' = hoursPending >= 48 ? 'urgent' : 'normal';

      items.push({
        id: `task-${task.id}`,
        type: 'task',
        entityId: task.id,
        title: `Task Review: ${task.title}`,
        subtitle: `Priority: ${task.priority?.toUpperCase() || 'MEDIUM'} • Assigned to: ${assignee?.full_name || 'Member'}`,
        submitterName: assignee?.full_name || creator?.full_name || 'Team Member',
        submitterEmail: assignee?.email || creator?.email,
        submitterAvatar: assignee?.avatar_url || creator?.avatar_url,
        submitterRole: assignee?.role || creator?.role || 'member',
        departmentId: task.department_id,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        submittedAt: task.updated_at || task.created_at,
        urgency,
        hoursPending,
        actionUrl: `/tasks?departmentId=${task.department_id}&taskId=${task.id}`,
        details: {
          taskPriority: task.priority,
          taskDeadline: task.deadline,
          taskDescription: task.description,
        },
        approvalInstanceId: task.approval_instance_id,
      });
    });

    // Map Events
    events.forEach((event) => {
      const dept = deptMap.get(event.department_id);
      const creator = event.created_by ? profileMap.get(event.created_by) : null;
      const submittedDate = new Date(event.updated_at || event.created_at);
      const hoursPending = Math.max(0, Math.round((now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60)));
      const urgency: 'urgent' | 'normal' | 'low' = hoursPending >= 48 ? 'urgent' : 'normal';

      items.push({
        id: `event-${event.id}`,
        type: 'event',
        entityId: event.id,
        title: `Event Publishing: ${event.title}`,
        subtitle: `Date: ${new Date(event.event_date).toLocaleDateString()} • Venue: ${event.venue || 'TBD'} • Status: ${event.status.replace(/_/g, ' ')}`,
        submitterName: creator?.full_name || 'Event Lead',
        submitterEmail: creator?.email,
        submitterAvatar: creator?.avatar_url,
        submitterRole: creator?.role || 'committee_head',
        departmentId: event.department_id,
        departmentName: dept?.name || null,
        departmentCode: dept?.code || null,
        submittedAt: event.updated_at || event.created_at,
        urgency,
        hoursPending,
        actionUrl: `/events/${event.id}/review`,
        details: {
          eventDate: event.event_date,
          eventVenue: event.venue,
          eventCapacity: event.capacity,
          eventDescription: event.description,
        },
        approvalInstanceId: event.approval_instance_id,
      });
    });

    // Sort: Urgent first, then longest waiting
    items.sort((a, b) => {
      if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1;
      if (b.urgency === 'urgent' && a.urgency !== 'urgent') return 1;
      return b.hoursPending - a.hoursPending;
    });

    const accountsCount = items.filter((i) => i.type === 'account').length;
    const tasksCount = items.filter((i) => i.type === 'task').length;
    const eventsCount = items.filter((i) => i.type === 'event').length;
    const urgentCount = items.filter((i) => i.urgency === 'urgent').length;

    return {
      success: true,
      summary: {
        totalPending: items.length,
        accountsCount,
        tasksCount,
        eventsCount,
        urgentCount,
        items,
      },
    };
  } catch (err: any) {
    console.error('Error in getUnifiedApprovalsQueue:', err);
    return {
      success: false,
      summary: {
        totalPending: 0,
        accountsCount: 0,
        tasksCount: 0,
        eventsCount: 0,
        urgentCount: 0,
        items: [],
      },
      error: err.message || 'Failed to fetch unified approvals queue',
    };
  }
}

export async function actOnUnifiedApproval(input: ActOnUnifiedApprovalInput): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile || context.profile.status !== 'active') {
      return { success: false, error: 'Unauthorized' };
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
      return { success: false, error: 'Unauthorized to act on approvals.' };
    }

    const admin = createAdminClient();

    if (input.type === 'account') {
      if (input.action === 'approve') {
        const updatePayload: any = {
          status: 'active',
          updated_at: new Date().toISOString(),
        };
        if (input.assignedRole) updatePayload.role = input.assignedRole;
        if (input.assignedDepartmentId) updatePayload.department_id = input.assignedDepartmentId;

        const { error } = await admin
          .from('profiles')
          .update(updatePayload)
          .eq('id', input.entityId);

        if (error) throw error;
      } else {
        const { error } = await admin
          .from('profiles')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      }
    } else if (input.type === 'task') {
      if (input.action === 'approve') {
        const { error } = await admin
          .from('tasks')
          .update({
            status: 'done',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      } else if (input.action === 'changes_requested') {
        const { error } = await admin
          .from('tasks')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      } else {
        const { error } = await admin
          .from('tasks')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      }
    } else if (input.type === 'event') {
      if (input.action === 'approve') {
        const { error } = await admin
          .from('events')
          .update({
            status: 'published',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      } else if (input.action === 'changes_requested') {
        const { error } = await admin
          .from('events')
          .update({
            status: 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      } else {
        const { error } = await admin
          .from('events')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.entityId);

        if (error) throw error;
      }
    }

    revalidatePath('/command-center');
    revalidatePath('/approvals');
    revalidatePath('/tasks');
    revalidatePath('/events');

    return { success: true };
  } catch (err: any) {
    console.error('Error in actOnUnifiedApproval:', err);
    return { success: false, error: err.message || 'Failed to process approval action' };
  }
}




