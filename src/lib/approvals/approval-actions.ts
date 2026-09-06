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

    // Spec §4.2 Part B #6 & #7: Upward Auto-submit & Chain Closure
    if (action === 'approved' && isFinal) {
      const { data: currentTask } = await admin
        .from('tasks')
        .select('id, title, evidence_url, parent_task_id')
        .eq('id', instance.entity_id)
        .maybeSingle();

      if (currentTask) {
        if (currentTask.parent_task_id) {
          await propagateDelegationUpwardOnSubmit({
            childTaskId: currentTask.id,
            childTitle: currentTask.title,
            childEvidenceUrl: currentTask.evidence_url,
            parentTaskId: currentTask.parent_task_id,
            actorId: caller.id,
            actorName: caller.full_name,
          });
        }
        await closeDelegationChain(currentTask.id, caller.id, caller.full_name);
      }
    }
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

/**
 * Propagate deliverable upward to parent task when a child task is submitted/finished
 * (Spec §4.2 Part B #6, Step 6.5)
 */
export async function propagateDelegationUpwardOnSubmit(params: {
  childTaskId: string;
  childTitle: string;
  childEvidenceUrl?: string | null;
  parentTaskId: string;
  actorId: string;
  actorName?: string;
}) {
  const admin = createAdminClient();
  const { childTaskId, childTitle, childEvidenceUrl, parentTaskId, actorId, actorName } = params;

  const { data: parentTask } = await admin
    .from('tasks')
    .select('id, title, status, evidence_url, delegated_by_id, assignee_id, created_by, parent_task_id')
    .eq('id', parentTaskId)
    .maybeSingle();

  if (!parentTask || parentTask.status === 'done') return null;

  // Flip parent status to review if it was delegated or in_progress/todo
  const updatePayload: any = {
    status: 'review',
    updated_at: new Date().toISOString(),
  };

  if (!parentTask.evidence_url && childEvidenceUrl) {
    updatePayload.evidence_url = childEvidenceUrl;
  }

  const { data: updatedParent } = await admin
    .from('tasks')
    .update(updatePayload)
    .eq('id', parentTaskId)
    .select('*')
    .single();

  let recipientId = parentTask.delegated_by_id;
  if (!recipientId || recipientId === actorId) {
    recipientId = parentTask.assignee_id && parentTask.assignee_id !== actorId ? parentTask.assignee_id : parentTask.created_by;
  }

  if (recipientId && recipientId !== actorId) {
    await admin.from('notifications').insert({
      profile_id: recipientId,
      type: 'task_review',
      title: 'Delegated Task Submitted for Review 📥',
      message: `Deliverable for child task "${childTitle}" has been submitted. Parent task "${parentTask.title}" has moved to Review for your sign-off.`,
      related_entity_type: 'task',
      related_entity_id: parentTaskId,
    });
  }

  await admin.from('task_comments').insert({
    task_id: parentTaskId,
    author_id: actorId,
    body: `📥 **Delegated Deliverable Submitted for Review**\n\n` +
      `Child task [${childTitle}](/tasks/${childTaskId}) deliverable was submitted by ${actorName || 'assignee'}.\n\n` +
      `This parent task has automatically advanced from **${parentTask.status}** to **Review** for your evaluation and sign-off.\n\n` +
      (childEvidenceUrl ? `📎 **Deliverable Link:** ${childEvidenceUrl}` : ''),
  });

  await admin.from('audit_logs').insert({
    actor_id: actorId,
    action: 'task_upward_auto_submitted',
    entity_type: 'task',
    entity_id: parentTaskId,
    metadata: {
      parent_task_id: parentTaskId,
      child_task_id: childTaskId,
      child_title: childTitle,
      evidence_url: childEvidenceUrl,
      recipient_id: recipientId,
    },
  });

  return updatedParent;
}

/**
 * Recursively closes all child tasks in the delegation chain as 'done'
 * when an upstream root/parent task receives final executive sign-off (Spec §4.2 Part B #7)
 */
export async function closeDelegationChain(taskId: string, actorId: string, actorName?: string) {
  const admin = createAdminClient();

  const { data: childTasks } = await admin
    .from('tasks')
    .select('id, title, status')
    .eq('parent_task_id', taskId);

  if (!childTasks || childTasks.length === 0) return;

  for (const child of childTasks) {
    if (child.status !== 'done') {
      await admin
        .from('tasks')
        .update({ status: 'done', updated_at: new Date().toISOString() })
        .eq('id', child.id);

      await admin.from('task_comments').insert({
        task_id: child.id,
        author_id: actorId,
        body: `✅ **Delegation Chain Final Sign-Off**\n\nThe upstream parent deliverable has received final approval from ${actorName || 'leadership'}. This task is officially completed and closed as **Done**.`,
      });

      await admin.from('audit_logs').insert({
        actor_id: actorId,
        action: 'task_delegation_chain_closed',
        entity_type: 'task',
        entity_id: child.id,
        metadata: { parent_task_id: taskId, root_actor_id: actorId },
      });
    }

    // Recursively close any child tasks below this child (even if this child was already marked done previously)
    await closeDelegationChain(child.id, actorId, actorName);
  }
}

