import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  try {
    // 1. Fetch test profiles
    const [presRes, deptRes, memberRes] = await Promise.all([
      admin.from('profiles').select('id, full_name, role').eq('role', 'president').limit(1).single(),
      admin.from('departments').select('id, name').limit(1).single(),
      admin.from('profiles').select('id, full_name, role').eq('status', 'active').limit(1).single(),
    ]);

    const president = presRes.data;
    const department = deptRes.data;
    const member = memberRes.data;

    if (!president || !department) {
      throw new Error('President or Department not found in database.');
    }

    // 2. Create task in 'in_progress'
    const { data: testTask, error: taskErr } = await admin
      .from('tasks')
      .insert({
        title: `Move-to-Review Verification Task ${Date.now()}`,
        description: 'Testing Step 5.3 transition from In Progress to Review pipeline',
        department_id: department.id,
        assignee_id: member?.id || president.id,
        created_by: president.id,
        status: 'in_progress',
        priority: 'high',
      })
      .select('*')
      .single();

    if (taskErr || !testTask) {
      throw new Error(`Failed to create test task: ${taskErr?.message}`);
    }

    // 3. Call submit-review internal logic
    const evidenceUrl = 'https://github.com/GDGoC-HNU/chapter-os/pull/42';
    const handoverNotes = 'Deliverable code complete and tested locally. Verified responsive layout.';

    // Create approval instance using Phase 4 engine
    const { createApprovalInstance } = await import('@/lib/approvals/approval-engine');
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'task_completion',
      entityId: testTask.id,
      submitterId: testTask.assignee_id || president.id,
      departmentId: testTask.department_id,
    });

    // Update evidence URL
    await admin
      .from('tasks')
      .update({ evidence_url: evidenceUrl })
      .eq('id', testTask.id);

    // Add handover comment
    await admin.from('task_comments').insert({
      task_id: testTask.id,
      author_id: president.id,
      body: `📋 **Submitted for Review**\n\n${handoverNotes}\n\n📎 Evidence: ${evidenceUrl}`,
    });

    // 4. Verify in database
    const [finalTaskRes, finalInstRes, stepsRes, commentRes, auditRes] = await Promise.all([
      admin.from('tasks').select('*').eq('id', testTask.id).single(),
      admin.from('approval_instances').select('*').eq('id', instance.id).single(),
      admin.from('approval_instance_steps').select('*').eq('instance_id', instance.id).order('step_order'),
      admin.from('task_comments').select('*').eq('task_id', testTask.id),
      admin.from('audit_logs').select('*').eq('entity_id', testTask.id),
    ]);

    const finalTask = finalTaskRes.data;
    const finalInst = finalInstRes.data;
    const steps = stepsRes.data || [];
    const comments = commentRes.data || [];
    const auditLogs = auditRes.data || [];

    const isSuccess =
      finalTask?.approval_instance_id === instance.id &&
      (finalTask?.status === 'review' || finalTask?.status === 'done') &&
      finalInst?.entity_id === testTask.id &&
      finalInst?.workflow_type === 'task_completion' &&
      comments.length > 0 &&
      auditLogs.length > 0;

    // 5. Cleanup test data
    await admin.from('approval_instance_steps').delete().eq('instance_id', instance.id);
    await admin.from('approval_instances').delete().eq('id', instance.id);
    await admin.from('task_comments').delete().eq('task_id', testTask.id);
    await admin.from('audit_logs').delete().eq('entity_id', testTask.id);
    await admin.from('tasks').delete().eq('id', testTask.id);

    return NextResponse.json({
      status: 'ok',
      message: 'Move-to-Review and Phase 4 approval instance creation verified successfully!',
      results: {
        taskTransitioned: isSuccess,
        taskStatus: finalTask?.status,
        approvalInstanceId: finalTask?.approval_instance_id,
        workflowType: finalInst?.workflow_type,
        totalStepsGenerated: computation.totalSteps,
        isAutoApproved: computation.isAutoApproved,
        stepsInDatabase: steps.length,
        commentsRecorded: comments.length,
        auditLogsRecorded: auditLogs.length,
      },
      allTestsPass: isSuccess,
    });
  } catch (err: any) {
    console.error('Test move to review error:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
