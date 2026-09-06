import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POST as submitReviewPOST } from '@/app/api/tasks/[id]/submit-review/route';
import { POST as approvalsActPOST } from '@/app/api/approvals/act/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Resolve actors across the 3-stage fixed escalation chain (Spec §4.2 Part C)
    const [presRes, branchRes, headRes, memberRes, deptRes] = await Promise.all([
      admin.from('profiles').select('id, full_name, role').eq('role', 'president').limit(1).single(),
      admin.from('profiles').select('id, full_name, role, department_id').eq('role', 'branch_head').limit(1).single(),
      admin.from('profiles').select('id, full_name, role, department_id').eq('role', 'committee_head').limit(1).single(),
      admin.from('profiles').select('id, full_name, role, department_id').eq('role', 'member').limit(1).single(),
      admin.from('departments').select('id, name, code, branch, head_id').limit(1).single(),
    ]);

    const president = presRes.data;
    const branchHead = branchRes.data;
    const head = headRes.data;
    const member = memberRes.data;
    const department = deptRes.data;

    if (!president || !branchHead || !head || !member || !department) {
      return NextResponse.json(
        { error: 'Required seed profiles (president, branch_head, committee_head, member, department) not found.' },
        { status: 500 }
      );
    }

    // Ensure member and head are assigned to department
    await admin.from('profiles').update({ department_id: department.id, status: 'active' }).in('id', [member.id, head.id]);
    await admin.from('departments').update({ head_id: head.id }).eq('id', department.id);

    // 2. Create a normal, direct task assigned directly to Member (never delegated)
    const testEvidenceUrl = `https://github.com/gdgochnu/gdgoc-hnu/pull/e2e-stage-test-${testRunId}`;
    const taskTitle = `[Test 6.7 Direct Member Task] Fixed 3-Stage Escalation #${testRunId}`;

    const { data: testTask, error: taskCreateErr } = await admin
      .from('tasks')
      .insert({
        title: taskTitle,
        description: 'Direct task assigned directly to Member with no downstream delegation. Testing fixed 3-stage escalation.',
        department_id: department.id,
        assignee_id: member.id,
        created_by: head.id,
        assignment_mode: 'single',
        parent_task_id: null,
        delegated_by_id: null,
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      })
      .select('*')
      .single();

    if (taskCreateErr || !testTask) {
      throw new Error(`Failed to create direct member task: ${taskCreateErr?.message}`);
    }

    // 3. Member submits deliverable for review
    const submitReq = new NextRequest(
      `http://localhost:3000/api/tasks/${testTask.id}/submit-review?mock=member&mock_user_id=${member.id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_url: testEvidenceUrl,
          notes: 'Member deliverable ready. Submitting into fixed 3-stage escalation pipeline.',
        }),
      }
    );

    // Mock caller as member
    const submitRes = await submitReviewPOST(submitReq, { params: Promise.resolve({ id: testTask.id }) });
    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      throw new Error(`Member submit-review failed: ${submitData.error}`);
    }

    // Verify Task moved to 'review' with approval instance
    const { data: taskInReview } = await admin.from('tasks').select('*').eq('id', testTask.id).single();
    const instanceId = taskInReview?.approval_instance_id;

    if (!instanceId) {
      throw new Error('Approval instance was not created for direct member task.');
    }

    // Query steps generated
    const { data: initialSteps } = await admin
      .from('approval_instance_steps')
      .select('*')
      .eq('instance_id', instanceId)
      .order('step_order');

    const passed3StepsGenerated =
      initialSteps?.length === 3 &&
      initialSteps[0]?.approver_rule === 'committee_head' &&
      initialSteps[1]?.approver_rule === 'branch_head' &&
      initialSteps[2]?.approver_rule === 'president_or_co_president';

    // 4. Stage 1: Committee Head approves
    const act1Req = new NextRequest(`http://localhost:3000/api/approvals/act?mock=committee_head&mock_user_id=${head.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId,
        stepOrder: 1,
        action: 'approved',
        notes: 'Stage 1: Committee Head reviewed and approved deliverable. Escalating to Branch Head.',
      }),
    });
    const act1Res = await approvalsActPOST(act1Req);
    const act1Data = await act1Res.json();
    if (!act1Res.ok) throw new Error(`Stage 1 Committee Head approval failed: ${act1Data.error}`);

    // Verify after stage 1
    const { data: instAfterStage1 } = await admin.from('approval_instances').select('*').eq('id', instanceId).single();
    const { data: taskAfterStage1 } = await admin.from('tasks').select('*').eq('id', testTask.id).single();
    const passedStage1 = instAfterStage1?.current_step === 2 && taskAfterStage1?.status === 'review';

    // 5. Stage 2: Branch Head approves
    const act2Req = new NextRequest(`http://localhost:3000/api/approvals/act?mock=branch_head&mock_user_id=${branchHead.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId,
        stepOrder: 2,
        action: 'approved',
        notes: 'Stage 2: Branch Head cross-functional evaluation passed. Escalating to President.',
      }),
    });
    const act2Res = await approvalsActPOST(act2Req);
    const act2Data = await act2Res.json();
    if (!act2Res.ok) throw new Error(`Stage 2 Branch Head approval failed: ${act2Data.error}`);

    // Verify after stage 2
    const { data: instAfterStage2 } = await admin.from('approval_instances').select('*').eq('id', instanceId).single();
    const { data: taskAfterStage2 } = await admin.from('tasks').select('*').eq('id', testTask.id).single();
    const passedStage2 = instAfterStage2?.current_step === 3 && taskAfterStage2?.status === 'review';

    // 6. Stage 3: President gives final approval
    const act3Req = new NextRequest(`http://localhost:3000/api/approvals/act?mock=president&mock_user_id=${president.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId,
        stepOrder: 3,
        action: 'approved',
        notes: 'Stage 3: Executive chapter command final sign-off granted.',
      }),
    });
    const act3Res = await approvalsActPOST(act3Req);
    const act3Data = await act3Res.json();
    if (!act3Res.ok) throw new Error(`Stage 3 President approval failed: ${act3Data.error}`);

    // Verify final states
    const [finalTaskRes, finalInstanceRes, finalStepsRes, auditLogsRes] = await Promise.all([
      admin.from('tasks').select('*').eq('id', testTask.id).single(),
      admin.from('approval_instances').select('*').eq('id', instanceId).single(),
      admin.from('approval_instance_steps').select('*').eq('instance_id', instanceId).order('step_order'),
      admin.from('audit_logs').select('*').eq('entity_id', testTask.id),
    ]);

    const finalTask = finalTaskRes.data;
    const finalInstance = finalInstanceRes.data;
    const finalSteps = finalStepsRes.data || [];
    const auditLogs = auditLogsRes.data || [];

    const passedTaskReachesDone = finalTask?.status === 'done';
    const passedInstanceReachesApproved = finalInstance?.status === 'approved';
    const passedAll3StepsApproved = finalSteps.length === 3 && finalSteps.every((s) => s.status === 'approved');
    const passedAuditLogsRecorded = auditLogs.length >= 3;

    const allStep67AssertionsPassed =
      passed3StepsGenerated &&
      passedStage1 &&
      passedStage2 &&
      passedTaskReachesDone &&
      passedInstanceReachesApproved &&
      passedAll3StepsApproved &&
      passedAuditLogsRecorded;

    return NextResponse.json({
      status: allStep67AssertionsPassed ? 'ok' : 'assertion_failed',
      message: allStep67AssertionsPassed
        ? 'Phase 6 - Step 6.7 Original Fixed 3-Stage Escalation Chain PASSED unchanged!'
        : 'One or more assertions failed during Step 6.7 verification.',
      verification: {
        taskId: testTask.id,
        instanceId,
        stages: finalSteps.map((s) => ({
          step: s.step_order,
          rule: s.approver_rule,
          status: s.status,
          notes: s.notes,
        })),
        assertions: {
          passed3StepsGenerated,
          passedStage1HeadApproval: passedStage1,
          passedStage2BranchHeadApproval: passedStage2,
          passedTaskReachesDone,
          passedInstanceReachesApproved,
          passedAll3StepsApproved,
          passedAuditLogsRecorded,
        },
        finalTaskStatus: finalTask?.status,
        finalInstanceStatus: finalInstance?.status,
        allStep67AssertionsPassed,
      },
      urls: {
        taskUrl: `/tasks/${testTask.id}`,
      },
    });
  } catch (err: any) {
    console.error('Error in Step 6.7 verification:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
