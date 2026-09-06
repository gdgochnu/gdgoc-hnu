import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // 1. Get test department
    const { data: depts, error: deptErr } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({ error: 'No department found for testing' }, { status: 400 });
    }
    const testDept = depts[0];

    // 2. Fetch or prepare at least 2 active test members in this department
    const { data: deptMembers } = await admin
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('department_id', testDept.id)
      .eq('status', 'active')
      .limit(2);

    let testMembers = deptMembers || [];
    if (testMembers.length < 2) {
      const { data: anyMembers } = await admin
        .from('profiles')
        .select('id, full_name, role, status')
        .eq('status', 'active')
        .limit(2);

      testMembers = anyMembers || [];
    }

    if (testMembers.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 active profiles to test broadcast review' }, { status: 400 });
    }

    // 3. Create a Broadcast Task in 'in_progress' status
    const taskTitle = `[Test 6.3] Broadcast Review & Consolidation #${Date.now()}`;
    const { data: testTask, error: taskErr } = await admin
      .from('tasks')
      .insert({
        title: taskTitle,
        description: 'Test task for broadcast submissions consolidation into multi-stage review pipeline.',
        department_id: testDept.id,
        assignment_mode: 'broadcast',
        assignee_id: null,
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      })
      .select('*')
      .single();

    if (taskErr || !testTask) {
      return NextResponse.json({ error: taskErr?.message || 'Failed to create test broadcast task' }, { status: 500 });
    }

    // 4. Create 2 task_assignees rows
    const m1Evidence = 'https://drive.google.com/file/d/test-best-deliverable-member-1';
    const m2Evidence = 'https://github.com/gdgochnu/gdgoc-hnu/pull/101';

    const { data: assigneeRows, error: assigneesErr } = await admin
      .from('task_assignees')
      .insert([
        {
          task_id: testTask.id,
          profile_id: testMembers[0].id,
          status: 'submitted',
          evidence_url: m1Evidence,
          submitted_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          task_id: testTask.id,
          profile_id: testMembers[1].id,
          status: 'submitted',
          evidence_url: m2Evidence,
          submitted_at: new Date().toISOString(),
        },
      ])
      .select('id, profile_id, status, evidence_url');

    if (assigneesErr || !assigneeRows) {
      return NextResponse.json({ error: assigneesErr?.message || 'Failed to create test assignees' }, { status: 500 });
    }

    // 5. Execute the consolidation review submission via internal fetch or direct route logic
    // We will call the submit-review endpoint directly using fetch to the local dev server
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const submitReviewUrl = `${protocol}://${host}/api/tasks/${testTask.id}/submit-review?mock=committee_head`;

    const consolidationNotes = `Selected Member 1's deliverable (${testMembers[0].full_name}) as the optimal chapter artifact. Consolidated by task owner.`;

    const submitRes = await fetch(submitReviewUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence_url: m1Evidence,
        notes: consolidationNotes,
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      return NextResponse.json({
        error: 'Failed to consolidate task deliverable via API',
        details: submitData,
      }, { status: 500 });
    }

    // 6. Verify task and approval pipeline state in DB
    const { data: updatedTask } = await admin
      .from('tasks')
      .select('*')
      .eq('id', testTask.id)
      .single();

    const { data: approvalInstance } = updatedTask?.approval_instance_id
      ? await admin.from('approval_instances').select('*').eq('id', updatedTask.approval_instance_id).single()
      : { data: null };

    const { data: comments } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', testTask.id);

    const consolidationCommentFound = comments?.some((c) => c.body.includes(consolidationNotes)) ?? false;

    // 7. Verify assertions
    const passedEvidenceMatch = updatedTask?.evidence_url === m1Evidence;
    const passedStatusReview = updatedTask?.status === 'review';
    const passedApprovalCreated = !!approvalInstance && approvalInstance.status === 'in_progress';

    const allPassed = passedEvidenceMatch && passedStatusReview && passedApprovalCreated && consolidationCommentFound;

    return NextResponse.json({
      status: allPassed ? 'ok' : 'assertion_failed',
      message: allPassed
        ? 'Phase 6 - Step 6.3 Broadcast Submissions Review & Consolidation verification passed!'
        : 'One or more Step 6.3 assertions failed.',
      verification: {
        task: {
          id: testTask.id,
          title: testTask.title,
          assignment_mode: testTask.assignment_mode,
        },
        assigneesCount: assigneeRows.length,
        selectedDeliverableUrl: m1Evidence,
        assertions: {
          passedEvidenceMatch,
          actualEvidenceUrl: updatedTask?.evidence_url,
          passedStatusReview,
          actualStatus: updatedTask?.status,
          passedApprovalCreated,
          approvalInstanceId: updatedTask?.approval_instance_id,
          approvalStatus: approvalInstance?.status,
          consolidationCommentFound,
        },
        reviewPageUrl: `/tasks/${testTask.id}/review-submissions`,
        taskDetailPageUrl: `/tasks/${testTask.id}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
