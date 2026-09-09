import { createAdminClient } from '@/lib/supabase/admin';
import { 
  UserRole, 
  ApproverRule, 
  ApprovalWorkflowType, 
  ApprovalInstanceStatus,
  ApprovalStepStatus 
} from '@/types';
import { 
  notifyTaskReviewStage, 
  notifyEventReviewStage 
} from '@/lib/notifications/triggers';

export interface GenerateApprovalStepsParams {
  workflowType: ApprovalWorkflowType;
  submitterRole: UserRole;
  submitterId: string;
  departmentId?: string | null;
  departmentBranch?: 'tech' | 'non_tech' | null;
  committeeHeadId?: string | null;
  committeeCoHeadId?: string | null;
  branchHeadId?: string | null;
  presidentId?: string | null;
  coPresidentId?: string | null;
}

export interface ComputedApprovalStep {
  stepOrder: number;
  approverRule: ApproverRule;
  candidateApproverIds: string[];
  resolvedApproverId: string | null;
  description: string;
}

export interface StepGenerationResult {
  steps: ComputedApprovalStep[];
  isAutoApproved: boolean;
  totalSteps: number;
  summary: string;
}

/**
 * Pure dynamic step generation algorithm according to GDGoC HNU OS Spec §4.2 & §4.3
 * Computes escalation steps dynamically from the submitter's position in the hierarchy,
 * skipping any stage the submitter already outranks or is.
 */
export function computeApprovalSteps(params: GenerateApprovalStepsParams): StepGenerationResult {
  const {
    workflowType,
    submitterRole,
    submitterId,
    committeeHeadId,
    committeeCoHeadId,
    branchHeadId,
    presidentId,
    coPresidentId,
  } = params;

  // 1. Auto-approval check: President or Co-President self-approves all submissions
  if (submitterRole === 'president' || submitterRole === 'co_president') {
    return {
      steps: [],
      isAutoApproved: true,
      totalSteps: 0,
      summary: `Auto-approved by ${submitterRole.replace('_', ' ')} authority (Spec §4.2 / §4.3).`,
    };
  }

  const steps: ComputedApprovalStep[] = [];
  let currentStepOrder = 1;

  // 2. Stage 1: Committee Head (Only for task_completion workflows)
  // Skipped for event_publish (where Committee Head is the creator, Spec §4.3)
  // Skipped if submitter IS the Head or Co-Head, or outranks them (Branch Head)
  const isCommitteeLeadership = submitterRole === 'committee_head' || submitterRole === 'committee_co_head';
  const isBranchHeadOrAbove = submitterRole === 'branch_head';

  if (workflowType === 'task_completion') {
    if (!isCommitteeLeadership && !isBranchHeadOrAbove) {
      const candidates: string[] = [];
      if (committeeHeadId && committeeHeadId !== submitterId) candidates.push(committeeHeadId);
      if (committeeCoHeadId && committeeCoHeadId !== submitterId && !candidates.includes(committeeCoHeadId)) {
        candidates.push(committeeCoHeadId);
      }

      steps.push({
        stepOrder: currentStepOrder++,
        approverRule: 'committee_head',
        candidateApproverIds: candidates,
        resolvedApproverId: null,
        description: 'Committee Head / Co-Head Review & Endorsement',
      });
    }
  }

  // 3. Stage 2: Branch Head (Tech Head or Non-Tech Head)
  // Applicable for tasks and events.
  // Skipped if submitter IS the Branch Head (or outranks)
  if (submitterRole !== 'branch_head') {
    const candidates: string[] = [];
    if (branchHeadId && branchHeadId !== submitterId) {
      candidates.push(branchHeadId);
    }

    steps.push({
      stepOrder: currentStepOrder++,
      approverRule: 'branch_head',
      candidateApproverIds: candidates,
      resolvedApproverId: null,
      description: 'Branch Head (Tech / Non-Tech) Cross-Committee Review',
    });
  }

  // 4. Stage 3: President or Co-President (Final stage)
  // Always required unless submitter is President/Co-President (already checked)
  const presCandidates: string[] = [];
  if (presidentId && presidentId !== submitterId) presCandidates.push(presidentId);
  if (coPresidentId && coPresidentId !== submitterId && !presCandidates.includes(coPresidentId)) {
    presCandidates.push(coPresidentId);
  }

  steps.push({
    stepOrder: currentStepOrder++,
    approverRule: 'president_or_co_president',
    candidateApproverIds: presCandidates,
    resolvedApproverId: null,
    description: 'Executive Chapter Sign-off (President / Co-President)',
  });

  return {
    steps,
    isAutoApproved: false,
    totalSteps: steps.length,
    summary: `Dynamic escalation generated: ${steps.map((s) => s.approverRule).join(' → ')} (${steps.length} stages).`,
  };
}

/**
 * Creates and initializes an approval instance in Supabase for a Task, Event, or Account.
 */
export async function createApprovalInstance(params: {
  workflowType: ApprovalWorkflowType;
  entityId: string;
  submitterId: string;
  departmentId?: string | null;
}) {
  const admin = createAdminClient();
  const { workflowType, entityId, submitterId, departmentId } = params;

  // 1. Fetch submitter details
  const { data: submitter, error: submitterErr } = await admin
    .from('profiles')
    .select('id, full_name, role, department_id')
    .eq('id', submitterId)
    .single();

  if (submitterErr || !submitter) {
    throw new Error(`Submitter profile not found: ${submitterErr?.message || submitterId}`);
  }

  const targetDeptId = departmentId || submitter.department_id;

  // 2. Fetch department details (head, co-head, branch) and leadership profiles in parallel
  const [deptRes, branchHeadsRes, presRes] = await Promise.all([
    targetDeptId
      ? admin.from('departments').select('id, name, branch, head_id, co_head_id').eq('id', targetDeptId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    admin.from('profiles').select('id, role, department_id').eq('role', 'branch_head').eq('status', 'active'),
    admin.from('profiles').select('id, role').in('role', ['president', 'co_president']).eq('status', 'active'),
  ]);

  const dept = deptRes.data;
  const branchHeads = branchHeadsRes.data || [];
  const presidents = presRes.data || [];

  // Match branch head to department branch (tech or non_tech)
  let branchHeadId: string | null = null;
  if (dept) {
    const matchingHead = branchHeads.find((bh) => bh.department_id === dept.id) || branchHeads[0];
    branchHeadId = matchingHead ? matchingHead.id : null;
  } else if (branchHeads.length > 0) {
    branchHeadId = branchHeads[0].id;
  }

  const presidentUser = presidents.find((p) => p.role === 'president');
  const coPresidentUser = presidents.find((p) => p.role === 'co_president');

  // 3. Compute dynamic steps
  const computation = computeApprovalSteps({
    workflowType,
    submitterRole: submitter.role as UserRole,
    submitterId: submitter.id,
    departmentId: targetDeptId,
    departmentBranch: dept?.branch as 'tech' | 'non_tech' | null,
    committeeHeadId: dept?.head_id,
    committeeCoHeadId: dept?.co_head_id,
    branchHeadId,
    presidentId: presidentUser?.id,
    coPresidentId: coPresidentUser?.id,
  });

  const now = new Date().toISOString();

  // 4. Create approval_instances row
  const instanceStatus: ApprovalInstanceStatus = computation.isAutoApproved ? 'approved' : 'in_progress';
  const { data: instance, error: instanceErr } = await admin
    .from('approval_instances')
    .insert({
      workflow_type: workflowType,
      entity_id: entityId,
      current_step: 1,
      status: instanceStatus,
      resolved_at: computation.isAutoApproved ? now : null,
    })
    .select('*')
    .single();

  if (instanceErr || !instance) {
    throw new Error(`Failed to create approval instance: ${instanceErr?.message}`);
  }

  // 5. Insert approval steps if not auto-approved
  if (!computation.isAutoApproved && computation.steps.length > 0) {
    const stepsPayload = computation.steps.map((s) => ({
      instance_id: instance.id,
      step_order: s.stepOrder,
      approver_rule: s.approverRule,
      status: 'pending' as ApprovalStepStatus,
    }));

    const { error: stepsErr } = await admin
      .from('approval_instance_steps')
      .insert(stepsPayload);

    if (stepsErr) {
      throw new Error(`Failed to insert approval instance steps: ${stepsErr.message}`);
    }
  }

  // 6. Update underlying entity (task or event)
  if (workflowType === 'task_completion') {
    await admin
      .from('tasks')
      .update({
        approval_instance_id: instance.id,
        status: computation.isAutoApproved ? 'done' : 'review',
      })
      .eq('id', entityId);
  } else if (workflowType === 'event_publish') {
    await admin
      .from('events')
      .update({
        approval_instance_id: instance.id,
        status: computation.isAutoApproved ? 'approved' : 'submitted_for_review',
      })
      .eq('id', entityId);
  }

  // 7. Record in audit_logs
  await admin.from('audit_logs').insert({
    actor_id: submitter.id,
    action: computation.isAutoApproved ? `${workflowType}_auto_approved` : `${workflowType}_submitted`,
    entity_type: workflowType,
    entity_id: entityId,
    metadata: {
      instance_id: instance.id,
      total_steps: computation.totalSteps,
      steps: computation.steps.map((s) => ({ order: s.stepOrder, rule: s.approverRule })),
      is_auto_approved: computation.isAutoApproved,
    },
  });

  // 8. In-App Notification to Stage 1 Approvers (Spec §4.11)
  if (!computation.isAutoApproved && computation.steps.length > 0) {
    const step1 = computation.steps[0];
    if (step1.candidateApproverIds && step1.candidateApproverIds.length > 0) {
      if (workflowType === 'task_completion') {
        const { data: task } = await admin
          .from('tasks')
          .select('title')
          .eq('id', entityId)
          .maybeSingle();

        await notifyTaskReviewStage({
          taskId: entityId,
          taskTitle: task?.title || 'Task',
          submitterName: submitter.full_name || 'Team member',
          stageOrder: step1.stepOrder,
          approverIds: step1.candidateApproverIds,
        }).catch((err) => console.warn('Stage 1 task notification warning:', err));
      } else if (workflowType === 'event_publish') {
        const { data: event } = await admin
          .from('events')
          .select('title')
          .eq('id', entityId)
          .maybeSingle();

        await notifyEventReviewStage({
          eventId: entityId,
          eventTitle: event?.title || 'Event',
          submitterName: submitter.full_name || 'Host Committee',
          stageOrder: step1.stepOrder,
          approverIds: step1.candidateApproverIds,
        }).catch((err) => console.warn('Stage 1 event notification warning:', err));
      }
    }
  }

  return {
    instance,
    computation,
  };
}

/**
 * Checks if a given user can approve/reject the current step of an approval instance.
 */
export function canUserApproveCurrentStep(params: {
  userRole: UserRole;
  userId: string;
  stepRule: ApproverRule;
  departmentHeadId?: string | null;
  departmentCoHeadId?: string | null;
  branchHeadId?: string | null;
}): boolean {
  const { userRole, userId, stepRule, departmentHeadId, departmentCoHeadId, branchHeadId } = params;

  // President and Co-President have executive override authority across all steps
  if (userRole === 'president' || userRole === 'co_president') {
    return true;
  }

  switch (stepRule) {
    case 'committee_head':
      return (
        userId === departmentHeadId ||
        userId === departmentCoHeadId ||
        userRole === 'committee_head' ||
        userRole === 'committee_co_head'
      );
    case 'branch_head':
      return userId === branchHeadId || userRole === 'branch_head';
    case 'president_or_co_president':
      return false; // Non-presidents cannot approve president_or_co_president step
    default:
      return false;
  }
}
