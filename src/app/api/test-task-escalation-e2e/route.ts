import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createApprovalInstance } from '@/lib/approvals/approval-engine';
import { actOnApprovalStep } from '@/lib/approvals/approval-actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // 1. Fetch department first
    const { data: dept } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .limit(1)
      .single();

    // 2. Fetch or create relevant profiles for the 3 hierarchy levels
    let { data: member } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'member')
      .limit(1)
      .maybeSingle();

    if (!member) {
      const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
        email: `test.member.${Date.now()}@gdgoc-hnu.org`,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'Karim Mostafa (Member)' },
      });

      if (authUser?.user) {
        await admin
          .from('profiles')
          .update({ status: 'active', role: 'member', department_id: dept?.id })
          .eq('id', authUser.user.id);

        const { data: p } = await admin
          .from('profiles')
          .select('id, full_name, role, department_id')
          .eq('id', authUser.user.id)
          .single();
        member = p;
      }
    }

    let { data: head } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'committee_head')
      .limit(1)
      .maybeSingle();

    let { data: branchHead } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'branch_head')
      .limit(1)
      .maybeSingle();

    if (!branchHead) {
      const { data: authUser } = await admin.auth.admin.createUser({
        email: `test.branchhead.${Date.now()}@gdgoc-hnu.org`,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { full_name: 'Dr. Tarek Zaki (Branch Head)' },
      });

      if (authUser?.user) {
        await admin
          .from('profiles')
          .update({ status: 'active', role: 'branch_head' })
          .eq('id', authUser.user.id);

        const { data: p } = await admin
          .from('profiles')
          .select('id, full_name, role, department_id')
          .eq('id', authUser.user.id)
          .single();
        branchHead = p;
      }
    }

    let { data: president } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'president')
      .limit(1)
      .maybeSingle();

    if (!member || !head || !branchHead || !president || !dept) {
      return NextResponse.json({
        error: 'Missing required roles or department in database to run dry run',
        found: { member: !!member, head: !!head, branchHead: !!branchHead, president: !!president, dept: !!dept },
      }, { status: 500 });
    }

    // 2. Create a clean test task assigned to the Member
    const { data: testTask, error: taskCreateErr } = await admin
      .from('tasks')
      .insert({
        title: `E2E Escalation Lifecycle Test ${Date.now()}`,
        description: 'Complete end-to-end verification of Member -> Head -> Branch Head -> President escalation chain.',
        department_id: dept.id,
        assignee_id: member.id,
        created_by: head.id,
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      })
      .select()
      .single();

    if (taskCreateErr || !testTask) {
      return NextResponse.json({ error: `Failed to create test task: ${taskCreateErr?.message}` }, { status: 500 });
    }

    // 3. Member submits task for review with deliverable evidence
    const deliverableUrl = 'https://drive.google.com/drive/folders/gdoc-e2e-evidence-test';
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'task_completion',
      entityId: testTask.id,
      submitterId: member.id,
      departmentId: dept.id,
    });

    // Verify instance generation: should generate 3 steps for a Member
    const initialStepsCount = computation.steps.length;
    const initialInstanceStatus = instance.status; // 'in_progress'

    // 4. Stage 1: Committee Head approves
    const headApprovalResult = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 1,
      action: 'approved',
      notes: 'Deliverable meets committee standards and design tokens. Escalating to Branch Head.',
      callerId: head.id,
    });

    // 5. Stage 2: Branch Head approves
    const branchHeadApprovalResult = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 2,
      action: 'approved',
      notes: 'Cross-functional dependencies confirmed. Ready for presidential sign-off.',
      callerId: branchHead.id,
    });

    // 6. Stage 3: President approves (final sign-off)
    const presidentialApprovalResult = await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 3,
      action: 'approved',
      notes: 'Chapter executive command sign-off granted. Excellent work.',
      callerId: president.id,
    });

    // 7. Verify final states in DB
    const { data: finalTask } = await admin
      .from('tasks')
      .select('id, status, approval_instance_id')
      .eq('id', testTask.id)
      .single();

    const { data: finalInstance } = await admin
      .from('approval_instances')
      .select('id, status, current_step, resolved_at')
      .eq('id', instance.id)
      .single();

    const { data: allSteps } = await admin
      .from('approval_instance_steps')
      .select('step_order, approver_rule, status, notes, acted_at, resolved_approver_id')
      .eq('instance_id', instance.id)
      .order('step_order');

    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('id, action, actor_id, metadata, created_at')
      .eq('entity_id', testTask.id)
      .order('created_at', { ascending: true });

    const allStepsApproved = allSteps?.every((s) => s.status === 'approved');
    const taskReachesDone = finalTask?.status === 'done';
    const instanceReachesApproved = finalInstance?.status === 'approved';

    return NextResponse.json({
      status: 'ok',
      message: 'End-to-end task escalation dry run completed successfully!',
      results: {
        taskId: testTask.id,
        instanceId: instance.id,
        initialStepsCount,
        initialInstanceStatus,
        allStepsApproved,
        taskReachesDone,
        instanceReachesApproved,
        totalAuditLogs: auditLogs?.length || 0,
        stages: allSteps?.map((s) => ({
          step: s.step_order,
          rule: s.approver_rule,
          status: s.status,
          notes: s.notes,
        })),
        finalTaskStatus: finalTask?.status,
        finalInstanceStatus: finalInstance?.status,
      },
      allTestsPass: allStepsApproved && taskReachesDone && instanceReachesApproved,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
