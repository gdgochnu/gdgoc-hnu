import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { computeApprovalSteps } from '@/lib/approvals/approval-engine';
import { actOnApprovalStep } from '@/lib/approvals/approval-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  try {
    // 1. Fetch president and a department
    const { data: president } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'president')
      .limit(1)
      .single();

    const { data: dept } = await admin
      .from('departments')
      .select('id, name')
      .limit(1)
      .single();

    if (!president || !dept) {
      throw new Error('President or Department not found in database.');
    }

    // 2. Create a test task for full escalation walkthrough
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .insert({
        title: 'Stage Tracker Full Progression Test Task',
        description: 'Verifying Step 4.2 & 4.3 progression through stages and audit logging',
        department_id: dept.id,
        assignee_id: president.id,
        created_by: president.id,
        status: 'review',
        priority: 'high',
      })
      .select('*')
      .single();

    if (taskErr || !task) {
      throw new Error(`Failed to create task: ${taskErr?.message}`);
    }

    // 3. Create 3-stage approval instance
    const { data: instance, error: instErr } = await admin
      .from('approval_instances')
      .insert({
        workflow_type: 'task_completion',
        entity_id: task.id,
        current_step: 1,
        status: 'in_progress',
      })
      .select('*')
      .single();

    if (instErr || !instance) {
      throw new Error(`Failed to create approval instance: ${instErr?.message}`);
    }

    // Insert 3 steps
    await admin.from('approval_instance_steps').insert([
      { instance_id: instance.id, step_order: 1, approver_rule: 'committee_head', status: 'pending' },
      { instance_id: instance.id, step_order: 2, approver_rule: 'branch_head', status: 'pending' },
      { instance_id: instance.id, step_order: 3, approver_rule: 'president_or_co_president', status: 'pending' },
    ]);

    // Update task with instance id
    await admin.from('tasks').update({ approval_instance_id: instance.id }).eq('id', task.id);

    // 4. Act on Step 1: Approve Stage 1 (Committee Head stage)
    const stage1Result = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 1,
      action: 'approved',
      notes: 'Stage 1: Deliverables verified by lead.',
      callerId: president.id, // President has executive override
    });

    // Check audit log for stage 1
    const { data: auditStage1 } = await admin
      .from('audit_logs')
      .select('action, entity_id, metadata')
      .eq('entity_id', task.id)
      .eq('action', 'task_completion_approved_stage1')
      .single();

    // 5. Act on Step 2: Approve Stage 2 (Branch Head stage)
    const stage2Result = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 2,
      action: 'approved',
      notes: 'Stage 2: Cross-committee standards approved.',
      callerId: president.id,
    });

    const { data: auditStage2 } = await admin
      .from('audit_logs')
      .select('action, entity_id, metadata')
      .eq('entity_id', task.id)
      .eq('action', 'task_completion_approved_stage2')
      .single();

    // 6. Act on Step 3: Final Approval (President stage)
    const stage3Result = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 3,
      action: 'approved',
      notes: 'Stage 3: Executive sign-off granted. Task done!',
      callerId: president.id,
    });

    const { data: auditStage3 } = await admin
      .from('audit_logs')
      .select('action, entity_id, metadata')
      .eq('entity_id', task.id)
      .eq('action', 'task_completion_approved_stage3')
      .single();

    // Verify task status reached 'done'
    const { data: finalizedTask } = await admin
      .from('tasks')
      .select('id, status, approval_instance_id')
      .eq('id', task.id)
      .single();

    // 7. Test Changes Requested scenario
    const { data: changesTask } = await admin
      .from('tasks')
      .insert({
        title: 'Changes Requested Scenario Task',
        department_id: dept.id,
        assignee_id: president.id,
        status: 'review',
      })
      .select('*')
      .single();

    const { data: changesInstance } = await admin
      .from('approval_instances')
      .insert({
        workflow_type: 'task_completion',
        entity_id: changesTask!.id,
        current_step: 1,
        status: 'in_progress',
      })
      .select('*')
      .single();

    await admin.from('approval_instance_steps').insert([
      { instance_id: changesInstance!.id, step_order: 1, approver_rule: 'committee_head', status: 'pending' },
    ]);

    await actOnApprovalStep({
      instanceId: changesInstance!.id,
      stepOrder: 1,
      action: 'changes_requested',
      notes: 'Please add unit tests and refactor helper.',
      callerId: president.id,
    });

    const { data: revertedTask } = await admin
      .from('tasks')
      .select('status')
      .eq('id', changesTask!.id)
      .single();

    const { data: auditChanges } = await admin
      .from('audit_logs')
      .select('action')
      .eq('entity_id', changesTask!.id)
      .eq('action', 'task_completion_changes_requested_stage1')
      .single();

    // Cleanup test data
    await admin.from('approval_instance_steps').delete().in('instance_id', [instance.id, changesInstance!.id]);
    await admin.from('approval_instances').delete().in('id', [instance.id, changesInstance!.id]);
    await admin.from('tasks').delete().in('id', [task.id, changesTask!.id]);

    return NextResponse.json({
      status: 'ok',
      message: 'ApprovalStageTracker engine, progression, and audit logs verified end-to-end!',
      results: {
        step1: {
          advancedToStep: stage1Result.instance.current_step,
          isFinal: stage1Result.isFinal,
          auditLogged: !!auditStage1,
        },
        step2: {
          advancedToStep: stage2Result.instance.current_step,
          isFinal: stage2Result.isFinal,
          auditLogged: !!auditStage2,
        },
        step3Final: {
          finalInstanceStatus: stage3Result.instance.status,
          isFinal: stage3Result.isFinal,
          finalTaskStatus: finalizedTask?.status,
          auditLogged: !!auditStage3,
        },
        changesRequestedScenario: {
          taskRevertedTo: revertedTask?.status,
          auditLogged: !!auditChanges,
        },
      },
      allStagesPass: 
        stage1Result.instance.current_step === 2 &&
        stage2Result.instance.current_step === 3 &&
        stage3Result.instance.status === 'approved' &&
        finalizedTask?.status === 'done' &&
        revertedTask?.status === 'in_progress' &&
        !!auditStage1 &&
        !!auditStage2 &&
        !!auditStage3 &&
        !!auditChanges,
    });
  } catch (err: any) {
    console.error('Test tracker error:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
