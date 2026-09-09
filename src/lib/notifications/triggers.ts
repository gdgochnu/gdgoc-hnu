import { createAdminClient } from '@/lib/supabase/admin';
import {
  sendTaskDelegatedEmail,
  sendTaskReviewRequestEmail,
  sendEventReviewRequestEmail,
  sendCheckinDutyAssignedEmail,
  sendEventApprovedEmail,
  sendBudgetAlertEmail,
  sendSpeakerConfirmedEmail,
  sendAlumniTransitionEmail,
} from '@/lib/email/service';

async function fetchProfilesByIds(
  ids: string[]
): Promise<Array<{ id: string; email: string; full_name: string }>> {
  if (!ids || ids.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ids)
    .not('email', 'is', null);
  return data || [];
}

/**
 * Spec §4.11 Notification Triggers Module
 * Provides typed, fail-safe helpers to create notification records across the entire system.
 */

interface SafeNotificationPayload {
  profileId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

/**
 * Batch insert notifications safely without interrupting the calling transaction.
 */
export async function dispatchNotificationsSafely(
  payloads: SafeNotificationPayload[]
): Promise<number> {
  if (!payloads || payloads.length === 0) return 0;

  try {
    const admin = createAdminClient();
    const rows = payloads
      .filter((p) => Boolean(p.profileId))
      .map((p) => ({
        profile_id: p.profileId,
        type: p.type,
        title: p.title,
        message: p.message,
        related_entity_type: p.relatedEntityType || null,
        related_entity_id: p.relatedEntityId || null,
        is_read: false,
      }));

    if (rows.length === 0) return 0;

    const { error } = await admin.from('notifications').insert(rows);
    if (error) {
      console.warn('[dispatchNotificationsSafely] insert error:', error.message);
      return 0;
    }

    return rows.length;
  } catch (err) {
    console.warn('[dispatchNotificationsSafely] unexpected error:', err);
    return 0;
  }
}

/**
 * 1. New account pending review
 * Spec: Notify President + Co-President (+ recommending Head)
 */
export async function notifyNewAccountPending(params: {
  applicantId: string;
  applicantName: string;
  departmentId?: string | null;
  position?: string | null;
}) {
  const admin = createAdminClient();
  const targetProfileIds: string[] = [];

  // Fetch Presidents & Co-Presidents
  const { data: leadership } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['president', 'co_president'])
    .eq('status', 'active');

  if (leadership) {
    leadership.forEach((l) => targetProfileIds.push(l.id));
  }

  // Fetch Department Head / Co-Head if specified
  if (params.departmentId) {
    const { data: dept } = await admin
      .from('departments')
      .select('head_id, co_head_id')
      .eq('id', params.departmentId)
      .maybeSingle();

    if (dept?.head_id && !targetProfileIds.includes(dept.head_id)) {
      targetProfileIds.push(dept.head_id);
    }
    if (dept?.co_head_id && !targetProfileIds.includes(dept.co_head_id)) {
      targetProfileIds.push(dept.co_head_id);
    }
  }

  const payloads: SafeNotificationPayload[] = targetProfileIds.map((pid) => ({
    profileId: pid,
    type: 'account_approval',
    title: 'New Member Application Pending 👤',
    message: `${params.applicantName} applied for ${params.position || 'Member'} and is awaiting review.`,
    relatedEntityType: 'profile',
    relatedEntityId: params.applicantId,
  }));

  return dispatchNotificationsSafely(payloads);
}

/**
 * 2. Task delegated to you
 * Spec: Recipient (single or every broadcast member) -> Accept & work on it
 */
export async function notifyTaskDelegated(params: {
  taskId: string;
  taskTitle: string;
  delegatorName: string;
  recipientProfileIds: string[];
  isBroadcast?: boolean;
}) {
  const { taskId, taskTitle, delegatorName, recipientProfileIds, isBroadcast } = params;

  const payloads: SafeNotificationPayload[] = recipientProfileIds.map((pid) => ({
    profileId: pid,
    type: 'task_delegated',
    title: isBroadcast ? 'Broadcast Task Assigned 📢' : 'New Task Delegated 🔀',
    message: isBroadcast
      ? `${delegatorName} broadcasted "${taskTitle}" to your committee. Accept & start working!`
      : `${delegatorName} delegated "${taskTitle}" to you. Accept & start working!`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(recipientProfileIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendTaskDelegatedEmail({
            to: p.email,
            recipientName: p.full_name || 'Member',
            taskTitle,
            delegatorName,
            taskId,
            isBroadcast,
          }).catch((err) => console.warn('Task delegated email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 3. Task submitted back up a delegation level
 * Spec: The delegator (whoever pushed it down to this person) -> Review / Reject / Request changes
 */
export async function notifyTaskSubmittedUpward(params: {
  taskId: string;
  taskTitle: string;
  submitterName: string;
  delegatorId: string;
}) {
  return dispatchNotificationsSafely([
    {
      profileId: params.delegatorId,
      type: 'task_review',
      title: 'Delegation Deliverable Submitted 📥',
      message: `${params.submitterName} submitted the deliverable for delegated task "${params.taskTitle}". Ready for your review.`,
      relatedEntityType: 'task',
      relatedEntityId: params.taskId,
    },
  ]);
}

/**
 * 4, 5, 6. Task submitted for review / advanced across stages
 * Spec:
 * - Stage 1: Committee Head
 * - Stage 2: Branch Head
 * - Stage 3: President + Co-President
 */
export async function notifyTaskReviewStage(params: {
  taskId: string;
  taskTitle: string;
  submitterName: string;
  stageOrder: number;
  approverIds: string[];
}) {
  const stageLabels: Record<number, string> = {
    1: 'Stage 1 (Committee Head Review)',
    2: 'Stage 2 (Branch Head Review)',
    3: 'Stage 3 (Final Presidential Approval)',
  };

  const stageName = stageLabels[params.stageOrder] || `Stage ${params.stageOrder}`;

  const payloads: SafeNotificationPayload[] = params.approverIds.map((pid) => ({
    profileId: pid,
    type: 'task_review',
    title: `Task Review Required (${stageName}) ⏳`,
    message: `${params.submitterName} submitted "${params.taskTitle}" for review. Action required: Approve / Reject / Request changes.`,
    relatedEntityType: 'task',
    relatedEntityId: params.taskId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(params.approverIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendTaskReviewRequestEmail({
            to: p.email,
            reviewerName: p.full_name || 'Reviewer',
            taskTitle: params.taskTitle,
            submitterName: params.submitterName,
            stageName,
            taskId: params.taskId,
          }).catch((err) => console.warn('Task review email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 7. Task rejected or revisions requested at any stage/level
 * Spec: Original assignee/recipient -> Revise & resubmit
 */
export async function notifyTaskRejectedOrChanges(params: {
  taskId: string;
  taskTitle: string;
  recipientId: string;
  reviewerName: string;
  action: 'rejected' | 'changes_requested';
  notes?: string | null;
}) {
  const isRejected = params.action === 'rejected';
  const title = isRejected ? 'Task Rejected ❌' : 'Task Revisions Requested ⚠️';
  const message = isRejected
    ? `${params.reviewerName} rejected "${params.taskTitle}". Please review notes and revise.`
    : `${params.reviewerName} requested changes on "${params.taskTitle}". Notes: ${params.notes || 'Please revise deliverable.'}`;

  return dispatchNotificationsSafely([
    {
      profileId: params.recipientId,
      type: 'task_review',
      title,
      message,
      relatedEntityType: 'task',
      relatedEntityId: params.taskId,
    },
  ]);
}

/**
 * 8. Task approved (final sign-off)
 * Spec: Recipient -> Task completed
 */
export async function notifyTaskApproved(params: {
  taskId: string;
  taskTitle: string;
  recipientId: string;
  approverName: string;
}) {
  return dispatchNotificationsSafely([
    {
      profileId: params.recipientId,
      type: 'task_completed',
      title: 'Task Approved & Completed! 🎉',
      message: `Congratulations! "${params.taskTitle}" was officially approved by ${params.approverName} and marked as Done.`,
      relatedEntityType: 'task',
      relatedEntityId: params.taskId,
    },
  ]);
}

/**
 * 9 & 10. Event submitted for review / advanced to final approval
 * Spec:
 * - Stage 1 (review): Branch Head
 * - Stage 2 (final): President + Co-President
 */
export async function notifyEventReviewStage(params: {
  eventId: string;
  eventTitle: string;
  submitterName: string;
  stageOrder: number;
  approverIds: string[];
}) {
  const stageName = params.stageOrder === 1 ? 'Branch Review' : 'Final Presidential Approval';

  const payloads: SafeNotificationPayload[] = params.approverIds.map((pid) => ({
    profileId: pid,
    type: 'event_review',
    title: `Event Review Required (${stageName}) 📅`,
    message: `${params.submitterName} submitted event "${params.eventTitle}" for review. Action required: Approve / Reject / Request changes.`,
    relatedEntityType: 'event',
    relatedEntityId: params.eventId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(params.approverIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendEventReviewRequestEmail({
            to: p.email,
            reviewerName: p.full_name || 'Reviewer',
            eventTitle: params.eventTitle,
            submitterName: params.submitterName,
            stageName,
            eventId: params.eventId,
          }).catch((err) => console.warn('Event review email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 11. Event approved
 * Spec: Creating Head -> Publish
 */
export async function notifyEventApproved(params: {
  eventId: string;
  eventTitle: string;
  creatorId: string;
  approverName: string;
}) {
  const dispatched = await dispatchNotificationsSafely([
    {
      profileId: params.creatorId,
      type: 'event_approved',
      title: 'Event Approved! 🚀',
      message: `Event "${params.eventTitle}" was approved by ${params.approverName}. You can now publish it to the community!`,
      relatedEntityType: 'event',
      relatedEntityId: params.eventId,
    },
  ]);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds([params.creatorId])
    .then(([creator]) => {
      if (creator?.email) {
        sendEventApprovedEmail({
          to: creator.email,
          creatorName: creator.full_name || 'Creator',
          eventTitle: params.eventTitle,
          approverName: params.approverName,
          eventId: params.eventId,
        }).catch((err) => console.warn('Event approved email warning:', err));
      }
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 12. Event nears capacity (>= 90%)
 * Spec: PR + Operations owners -> Close registration
 */
export async function notifyEventNearingCapacity(params: {
  eventId: string;
  eventTitle: string;
  currentRegistrations: number;
  capacity: number;
}) {
  const admin = createAdminClient();
  const targetIds: string[] = [];

  // Fetch PR & Operations committee leadership
  const { data: depts } = await admin
    .from('departments')
    .select('id, code, head_id, co_head_id')
    .in('code', ['PR', 'PUBLIC_RELATIONS', 'OPERATIONS', 'OPS']);

  if (depts) {
    depts.forEach((d) => {
      if (d.head_id && !targetIds.includes(d.head_id)) targetIds.push(d.head_id);
      if (d.co_head_id && !targetIds.includes(d.co_head_id)) targetIds.push(d.co_head_id);
    });
  }

  // Also include event creators / owners
  const { data: event } = await admin
    .from('events')
    .select('created_by, department_id')
    .eq('id', params.eventId)
    .maybeSingle();

  if (event?.created_by && !targetIds.includes(event.created_by)) {
    targetIds.push(event.created_by);
  }

  const payloads: SafeNotificationPayload[] = targetIds.map((pid) => ({
    profileId: pid,
    type: 'event_nearing_capacity',
    title: 'Event Nearing Capacity Alert 🎟️',
    message: `Event "${params.eventTitle}" has reached ${params.currentRegistrations} / ${params.capacity} registrations (≥90%). Consider closing registration.`,
    relatedEntityType: 'event',
    relatedEntityId: params.eventId,
  }));

  return dispatchNotificationsSafely(payloads);
}

/**
 * 13. Assigned check-in duty for an event
 * Spec: Assigned profile(s) -> View event + open check-in screen
 */
export async function notifyCheckinDutyAssigned(params: {
  eventId: string;
  eventTitle: string;
  assignedProfileIds: string[];
}) {
  const payloads: SafeNotificationPayload[] = params.assignedProfileIds.map((pid) => ({
    profileId: pid,
    type: 'assigned_checkin_duty',
    title: 'Assigned Attendance Check-in Duty 📋',
    message: `You were assigned check-in desk duty for event "${params.eventTitle}". Tap to view details and open the scanner.`,
    relatedEntityType: 'event',
    relatedEntityId: params.eventId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(params.assignedProfileIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendCheckinDutyAssignedEmail({
            to: p.email,
            recipientName: p.full_name || 'Member',
            eventTitle: params.eventTitle,
            eventId: params.eventId,
          }).catch((err) => console.warn('Checkin duty email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 14. Member missed 3+ events
 * Spec: HR -> Follow up
 */
export async function notifyMemberMissedEvents(params: {
  memberId: string;
  memberName: string;
  missedEventsCount: number;
}) {
  const admin = createAdminClient();
  const targetIds: string[] = [];

  // Fetch HR Department members and leadership
  const { data: hrDept } = await admin
    .from('departments')
    .select('id, head_id, co_head_id')
    .in('code', ['HR', 'HUMAN_RESOURCES'])
    .maybeSingle();

  if (hrDept?.head_id) targetIds.push(hrDept.head_id);
  if (hrDept?.co_head_id) targetIds.push(hrDept.co_head_id);

  if (hrDept?.id) {
    const { data: hrMembers } = await admin
      .from('profiles')
      .select('id')
      .eq('department_id', hrDept.id)
      .eq('status', 'active');

    if (hrMembers) {
      hrMembers.forEach((m) => {
        if (!targetIds.includes(m.id)) targetIds.push(m.id);
      });
    }
  }

  const payloads: SafeNotificationPayload[] = targetIds.map((pid) => ({
    profileId: pid,
    type: 'member_low_engagement',
    title: 'Low Engagement Alert (3+ Missed Events) ⚠️',
    message: `${params.memberName} has missed ${params.missedEventsCount} events. Open HR dashboard to log follow-up notes.`,
    relatedEntityType: 'profile',
    relatedEntityId: params.memberId,
  }));

  return dispatchNotificationsSafely(payloads);
}

/**
 * 15. Speaker confirmed
 * Spec: President + PR -> Finalize logistics
 */
export async function notifySpeakerConfirmed(params: {
  contactId: string;
  speakerName: string;
  organization?: string | null;
}) {
  const admin = createAdminClient();
  const targetIds: string[] = [];

  // Presidents
  const { data: presidents } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['president', 'co_president'])
    .eq('status', 'active');

  if (presidents) presidents.forEach((p) => targetIds.push(p.id));

  // PR Leadership
  const { data: prDept } = await admin
    .from('departments')
    .select('head_id, co_head_id')
    .in('code', ['PR', 'PUBLIC_RELATIONS'])
    .maybeSingle();

  if (prDept?.head_id && !targetIds.includes(prDept.head_id)) targetIds.push(prDept.head_id);
  if (prDept?.co_head_id && !targetIds.includes(prDept.co_head_id)) targetIds.push(prDept.co_head_id);

  const orgText = params.organization ? ` (${params.organization})` : '';

  const payloads: SafeNotificationPayload[] = targetIds.map((pid) => ({
    profileId: pid,
    type: 'speaker_confirmed',
    title: 'Speaker Confirmed 🎙️',
    message: `Speaker ${params.speakerName}${orgText} has confirmed participation! Please finalize event logistics.`,
    relatedEntityType: 'pr_contact',
    relatedEntityId: params.contactId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(targetIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendSpeakerConfirmedEmail({
            to: p.email,
            recipientName: p.full_name || 'Leadership',
            speakerName: params.speakerName,
            organization: params.organization,
            contactId: params.contactId,
          }).catch((err) => console.warn('Speaker confirmed email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 16. Task/Event stuck past SLA
 * Spec: Current approver + President -> Escalate reminder
 */
export async function notifySlaEscalation(params: {
  entityType: 'task' | 'event' | 'approval';
  entityId: string;
  title: string;
  currentApproverId?: string | null;
  hoursPastSla: number;
}) {
  const admin = createAdminClient();
  const targetIds: string[] = [];

  if (params.currentApproverId) targetIds.push(params.currentApproverId);

  const { data: presidents } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['president', 'co_president'])
    .eq('status', 'active');

  if (presidents) {
    presidents.forEach((p) => {
      if (!targetIds.includes(p.id)) targetIds.push(p.id);
    });
  }

  const payloads: SafeNotificationPayload[] = targetIds.map((pid) => ({
    profileId: pid,
    type: 'sla_escalation',
    title: `SLA Escalation Warning (${params.hoursPastSla}h Overdue) 🚨`,
    message: `${params.entityType.toUpperCase()} "${params.title}" has exceeded SLA deadline. Immediate action required.`,
    relatedEntityType: params.entityType,
    relatedEntityId: params.entityId,
  }));

  return dispatchNotificationsSafely(payloads);
}

/**
 * 17. New member's onboarding checklist ready
 * Spec: New member (+ their Head) -> Complete checklist items
 */
export async function notifyOnboardingChecklistReady(params: {
  memberId: string;
  memberName: string;
  departmentId?: string | null;
}) {
  const admin = createAdminClient();
  const payloads: SafeNotificationPayload[] = [];

  // 1. Notify member
  payloads.push({
    profileId: params.memberId,
    type: 'onboarding_checklist',
    title: 'Welcome! Your Onboarding Checklist is Ready 📋',
    message: 'Your personalized onboarding steps have been assigned. Start completing them to unlock your Onboarded badge!',
    relatedEntityType: 'profile',
    relatedEntityId: params.memberId,
  });

  // 2. Notify committee head
  if (params.departmentId) {
    const { data: dept } = await admin
      .from('departments')
      .select('head_id, co_head_id, name')
      .eq('id', params.departmentId)
      .maybeSingle();

    if (dept?.head_id) {
      payloads.push({
        profileId: dept.head_id,
        type: 'onboarding_checklist',
        title: 'New Member Onboarding Started 👥',
        message: `${params.memberName} joined ${dept.name || 'your committee'} and started their onboarding checklist.`,
        relatedEntityType: 'profile',
        relatedEntityId: params.memberId,
      });
    }
  }

  return dispatchNotificationsSafely(payloads);
}

/**
 * 18. Event actual spend exceeds estimate
 * Spec: Event owners + President -> Review budget
 */
export async function notifyEventBudgetExceeded(params: {
  eventId: string;
  eventTitle: string;
  estimatedCost: number;
  actualCost: number;
}) {
  const admin = createAdminClient();
  const targetIds: string[] = [];

  // Presidents
  const { data: presidents } = await admin
    .from('profiles')
    .select('id')
    .in('role', ['president', 'co_president'])
    .eq('status', 'active');

  if (presidents) presidents.forEach((p) => targetIds.push(p.id));

  // Event Creator & Owners
  const { data: event } = await admin
    .from('events')
    .select('created_by, department_id')
    .eq('id', params.eventId)
    .maybeSingle();

  if (event?.created_by && !targetIds.includes(event.created_by)) {
    targetIds.push(event.created_by);
  }

  // Also Department Head of host committee
  if (event?.department_id) {
    const { data: dept } = await admin
      .from('departments')
      .select('head_id')
      .eq('id', event.department_id)
      .maybeSingle();

    if (dept?.head_id && !targetIds.includes(dept.head_id)) {
      targetIds.push(dept.head_id);
    }
  }

  const payloads: SafeNotificationPayload[] = targetIds.map((pid) => ({
    profileId: pid,
    type: 'event_budget_alert',
    title: 'Event Budget Over-Spend Alert ⚠️',
    message: `Event "${params.eventTitle}" actual spend ($${params.actualCost}) has exceeded estimated budget ($${params.estimatedCost}). Please review budget line items.`,
    relatedEntityType: 'event',
    relatedEntityId: params.eventId,
  }));

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds(targetIds)
    .then((profiles) => {
      profiles.forEach((p) => {
        if (p.email) {
          sendBudgetAlertEmail({
            to: p.email,
            recipientName: p.full_name || 'Leadership',
            eventTitle: params.eventTitle,
            estimatedCost: params.estimatedCost,
            actualCost: params.actualCost,
            eventId: params.eventId,
          }).catch((err) => console.warn('Budget alert email warning:', err));
        }
      });
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 19. Member archived to alumni
 * Spec: The member (+ their former Head) -> View alumni status
 */
export async function notifyMemberArchivedToAlumni(params: {
  memberId: string;
  memberName: string;
  departmentId?: string | null;
  leaveReason?: string | null;
}) {
  const admin = createAdminClient();
  const payloads: SafeNotificationPayload[] = [];

  // 1. Notify member
  payloads.push({
    profileId: params.memberId,
    type: 'alumni_transition',
    title: 'Chapter Alumni Status 🎓',
    message: `Your GDGoC HNU membership has transitioned to Alumni status. Thank you for your service and dedication! Reason: ${params.leaveReason || 'Term concluded'}.`,
    relatedEntityType: 'profile',
    relatedEntityId: params.memberId,
  });

  // 2. Notify former Head
  if (params.departmentId) {
    const { data: dept } = await admin
      .from('departments')
      .select('head_id, name')
      .eq('id', params.departmentId)
      .maybeSingle();

    if (dept?.head_id) {
      payloads.push({
        profileId: dept.head_id,
        type: 'alumni_transition',
        title: 'Member Transitioned to Alumni 🎓',
        message: `${params.memberName} from ${dept.name || 'your committee'} has transitioned to Alumni status.`,
        relatedEntityType: 'profile',
        relatedEntityId: params.memberId,
      });
    }
  }

  const dispatched = await dispatchNotificationsSafely(payloads);

  // Email delivery (Spec §4.11 / Step 17.3)
  fetchProfilesByIds([params.memberId])
    .then(([member]) => {
      if (member?.email) {
        sendAlumniTransitionEmail({
          to: member.email,
          recipientName: member.full_name || params.memberName,
          reason: params.leaveReason,
        }).catch((err) => console.warn('Alumni transition email warning:', err));
      }
    })
    .catch(() => null);

  return dispatched;
}

/**
 * 20. Certificate issued
 * Spec: Recipient -> View/download
 */
export async function notifyCertificateIssued(params: {
  certificateId: string;
  certificateTitle: string;
  recipientId: string;
}) {
  return dispatchNotificationsSafely([
    {
      profileId: params.recipientId,
      type: 'certificate_issued',
      title: 'Certificate of Achievement Issued! 📜',
      message: `Congratulations! Your certificate for "${params.certificateTitle}" has been issued and is available on your profile.`,
      relatedEntityType: 'certificate',
      relatedEntityId: params.certificateId,
    },
  ]);
}

/**
 * 21. Points or Badge awarded
 * Spec: Recipient -> View in Gamification hub
 */
export async function notifyGamificationAward(params: {
  recipientId: string;
  awardTitle: string;
  awardType: 'badge' | 'points' | 'tier';
  points?: number;
}) {
  const isBadge = params.awardType === 'badge';
  const title = isBadge ? 'New Badge Unlocked! 🏅' : 'Points Earned! ⭐';
  const message = isBadge
    ? `You unlocked the "${params.awardTitle}" badge! View your achievement in the Gamification Hub.`
    : `You earned ${params.points || 0} points for "${params.awardTitle}". Check your position on the leaderboard!`;

  return dispatchNotificationsSafely([
    {
      profileId: params.recipientId,
      type: 'gamification_award',
      title,
      message,
      relatedEntityType: 'gamification',
      relatedEntityId: params.recipientId,
    },
  ]);
}
