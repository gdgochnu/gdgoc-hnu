import { createAdminClient } from '@/lib/supabase/admin';
import { canUserApproveCurrentStep } from '@/lib/approvals/approval-engine';
import { UserRole, ApprovalStepStatus, ApprovalInstanceStatus } from '@/types';

export interface ActOnApprovalStepParams {
  instanceId: string;
  stepOrder: number;
  action: 'approved' | 'rejected' | 'changes_requested';
  notes?: string;
  callerId: string;
}

export async function actOnApprovalStep(params: ActOnApprovalStepParams) {
  const admin = createAdminClient();
  const { instanceId, stepOrder, action, notes, callerId } = params;

  // 1. Fetch instance
  const { data: instance, error: instanceErr } = await admin
    .from('approval_instances')
    .select('*')
    .eq('id', instanceId)
    .single();

  if (instanceErr || !instance) {
    throw new Error(`Approval instance not found: ${instanceErr?.message || instanceId}`);
  }

  if (instance.status !== 'in_progress') {
    throw new Error(`This approval instance has already been resolved with status: ${instance.status}`);
  }

  if (instance.current_step !== stepOrder) {
    throw new Error(`Cannot act on step ${stepOrder}; the active step is step ${instance.current_step}`);
  }

  // 2. Fetch steps for this instance
  const { data: steps, error: stepsErr } = await admin
    .from('approval_instance_steps')
    .select('*')
    .eq('instance_id', instanceId)
    .order('step_order');

  if (stepsErr || !steps || steps.length === 0) {
    throw new Error(`No steps found for approval instance: ${instanceId}`);
  }

  const currentStep = steps.find((s) => s.step_order === stepOrder);
  if (!currentStep) {
    throw new Error(`Step order ${stepOrder} not found in instance steps.`);
  }

  // 3. Fetch caller profile
  const { data: caller, error: callerErr } = await admin
    .from('profiles')
    .select('id, full_name, role, department_id, email')
    .eq('id', callerId)
    .single();

  if (callerErr || !caller) {
    throw new Error(`Caller profile not found: ${callerId}`);
  }

  // 4. Fetch department info if applicable
  let deptHeadId: string | null = null;
  let deptCoHeadId: string | null = null;
  let branchHeadId: string | null = null;

  if (caller.department_id) {
    const { data: dept } = await admin
      .from('departments')
      .select('id, head_id, co_head_id, branch')
      .eq('id', caller.department_id)
      .maybeSingle();

    if (dept) {
      deptHeadId = dept.head_id;
      deptCoHeadId = dept.co_head_id;
    }
  }

  // 5. Verify caller authorization
  const isAuthorized = canUserApproveCurrentStep({
    userRole: caller.role as UserRole,
    userId: caller.id,
    stepRule: currentStep.approver_rule,
    departmentHeadId: deptHeadId,
    departmentCoHeadId: deptCoHeadId,
    branchHeadId,
  });

  if (!isAuthorized) {
    throw new Error(`User ${caller.full_name} (${caller.role}) is not authorized to act on rule '${currentStep.approver_rule}'`);
  }

  const now = new Date().toISOString();

  // 6. Update current step
  const { error: updateStepErr } = await admin
    .from('approval_instance_steps')
    .update({
      status: action as ApprovalStepStatus,
      notes: notes || null,
      resolved_approver_id: caller.id,
      acted_at: now,
    })
    .eq('id', currentStep.id);

  if (updateStepErr) {
    throw new Error(`Failed to update step: ${updateStepErr.message}`);
  }

  // 7. Handle progression based on action
  const isLastStep = stepOrder === steps.length;
  let newInstanceStatus: ApprovalInstanceStatus = 'in_progress';
  let nextStepOrder = instance.current_step;
  let isFinal = false;

  if (action === 'approved') {
    if (isLastStep) {
      newInstanceStatus = 'approved';
      isFinal = true;
    } else {
      nextStepOrder = stepOrder + 1;
    }
  } else if (action === 'changes_requested') {
    newInstanceStatus = 'changes_requested';
    isFinal = true;
  } else if (action === 'rejected') {
    newInstanceStatus = 'rejected';
    isFinal = true;
  }

  // Update approval_instances
  const { data: updatedInstance, error: updateInstanceErr } = await admin
    .from('approval_instances')
    .update({
      current_step: nextStepOrder,
      status: newInstanceStatus,
      resolved_at: isFinal ? now : null,
    })
    .eq('id', instanceId)
    .select('*')
    .single();

  if (updateInstanceErr || !updatedInstance) {
    throw new Error(`Failed to update approval instance: ${updateInstanceErr?.message}`);
  }

  // 8. Update underlying entity (task or event)
  if (instance.workflow_type === 'task_completion') {
    let newTaskStatus = 'review';
    if (action === 'approved' && isFinal) newTaskStatus = 'done';
    else if (action === 'changes_requested') newTaskStatus = 'in_progress';
    else if (action === 'rejected') newTaskStatus = 'rejected';

    await admin
      .from('tasks')
      .update({ status: newTaskStatus, updated_at: now })
      .eq('id', instance.entity_id);
  } else if (instance.workflow_type === 'event_publish') {
    let newEventStatus = 'submitted_for_review';
    if (action === 'approved' && isFinal) newEventStatus = 'approved';
    else if (action === 'changes_requested') newEventStatus = 'draft';
    else if (action === 'rejected') newEventStatus = 'rejected';

    await admin
      .from('events')
      .update({ status: newEventStatus, updated_at: now })
      .eq('id', instance.entity_id);
  }

  // 9. Write audit log (Step 4.3 requirement)
  const auditAction = `${instance.workflow_type}_${action}_stage${stepOrder}`;
  await admin.from('audit_logs').insert({
    actor_id: caller.id,
    action: auditAction,
    entity_type: instance.workflow_type,
    entity_id: instance.entity_id,
    metadata: {
      instance_id: instance.id,
      step_id: currentStep.id,
      step_order: stepOrder,
      approver_rule: currentStep.approver_rule,
      action,
      notes: notes || null,
      is_final: isFinal,
      new_status: newInstanceStatus,
    },
  });

  return {
    instance: updatedInstance,
    step: {
      ...currentStep,
      status: action,
      notes,
      resolved_approver_id: caller.id,
      acted_at: now,
    },
    isFinal,
  };
}
