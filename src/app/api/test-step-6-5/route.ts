import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POST as submitReviewPOST } from '@/app/api/tasks/[id]/submit-review/route';
import { POST as approveDelegationPOST } from '@/app/api/tasks/[id]/approve-delegation/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Fetch actors: President, Branch Head, Committee Head
    const [presRes, branchRes, headRes, deptRes] = await Promise.all([
      admin.from('profiles').select('id, full_name, role').eq('role', 'president').limit(1).single(),
      admin.from('profiles').select('id, full_name, role, department_id').eq('role', 'branch_head').limit(1).single(),
      admin.from('profiles').select('id, full_name, role, department_id').eq('role', 'committee_head').limit(1).single(),
      admin.from('departments').select('id, name').limit(1).single(),
    ]);

    const president = presRes.data;
    const branchHead = branchRes.data;
    const committeeHead = headRes.data;
    const department = deptRes.data;

    if (!president || !branchHead || !committeeHead || !department) {
      return NextResponse.json(
        { error: 'Required test seed profiles not found (president, branch_head, committee_head, department)' },
        { status: 500 }
      );
    }

    // 2. Create Multi-Tier Delegation Chain:
    // Root Task (Tier 0: President created, assigned to Branch Head, status = delegated)
    const { data: rootTask, error: rootErr } = await admin
      .from('tasks')
      .insert({
        title: `[Test 6.5 Root] Master Chapter Deliverable #${testRunId}`,
        description: 'Root chapter deliverable assigned to Branch Head, delegated downward.',
        department_id: department.id,
        assignee_id: branchHead.id,
        created_by: president.id,
        delegated_by_id: null,
        parent_task_id: null,
        assignment_mode: 'single',
        priority: 'high',
        status: 'delegated',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      })
      .select('*')
      .single();

    if (rootErr || !rootTask) {
      throw new Error(`Failed to create root task: ${rootErr?.message}`);
    }

    // Parent Task (Tier 1: Branch Head delegated to Committee Head, parent = rootTask.id, status = delegated)
    const { data: parentTask, error: parentErr } = await admin
      .from('tasks')
      .insert({
        title: `[Test 6.5 Parent] Committee Sub-Deliverable #${testRunId}`,
        description: 'Parent task delegated from root deliverable.',
        department_id: department.id,
        assignee_id: committeeHead.id,
        created_by: branchHead.id,
        delegated_by_id: branchHead.id,
        parent_task_id: rootTask.id,
        assignment_mode: 'single',
        priority: 'high',
        status: 'delegated',
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      })
      .select('*')
      .single();

    if (parentErr || !parentTask) {
      throw new Error(`Failed to create parent task: ${parentErr?.message}`);
    }

    // Child Task (Tier 2: Committee Head child implementation, parent = parentTask.id, status = in_progress)
    const { data: childTask, error: childErr } = await admin
      .from('tasks')
      .insert({
        title: `[Test 6.5 Child] Implementation Task #${testRunId}`,
        description: 'Child execution task being completed.',
        department_id: department.id,
        assignee_id: committeeHead.id,
        created_by: committeeHead.id,
        delegated_by_id: committeeHead.id,
        parent_task_id: parentTask.id,
        assignment_mode: 'single',
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      })
      .select('*')
      .single();

    if (childErr || !childTask) {
      throw new Error(`Failed to create child task: ${childErr?.message}`);
    }

    // -------------------------------------------------------------
    // STEP 1: Child Task Submits Review via API Route Handler
    // -------------------------------------------------------------
    const testDeliverableUrl = `https://github.com/gdgochnu/deliverable-step-6-5-${testRunId}`;
    const submitReq = new NextRequest(`http://localhost:3000/api/tasks/${childTask.id}/submit-review?mock=committee_head`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence_url: testDeliverableUrl,
        notes: 'Child task implementation is complete. Submitting deliverable up the chapter chain.',
      }),
    });

    const submitRes = await submitReviewPOST(submitReq, { params: Promise.resolve({ id: childTask.id }) });
    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      throw new Error(`submit-review API failed: ${submitData.error || submitRes.statusText}`);
    }

    // Verify Parent Task was automatically flipped from 'delegated' to 'review'
    const { data: freshParent } = await admin
      .from('tasks')
      .select('*')
      .eq('id', parentTask.id)
      .single();

    const passedParentFlippedToReview = freshParent?.status === 'review';
    const passedParentEvidenceCopied = freshParent?.evidence_url === testDeliverableUrl;

    // Verify notification was sent to Branch Head (parent delegator)
    const { data: parentNotifs } = await admin
      .from('notifications')
      .select('*')
      .eq('profile_id', branchHead.id)
      .eq('related_entity_id', parentTask.id)
      .order('created_at', { ascending: false });

    const passedBranchHeadNotified = !!(parentNotifs && parentNotifs.length > 0);

    // Verify activity comment on parent task
    const { data: parentComments } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', parentTask.id);

    const passedParentCommentAdded = parentComments?.some((c) =>
      c.body.includes('Delegated Deliverable Submitted for Review')
    );

    // Verify audit log
    const { data: upwardAudit } = await admin
      .from('audit_logs')
      .select('*')
      .eq('entity_id', parentTask.id)
      .eq('action', 'task_upward_auto_submitted')
      .maybeSingle();

    const passedAuditLog1 = !!upwardAudit;

    // -------------------------------------------------------------
    // STEP 2: Branch Head Reviews Parent & Submits Upward via API Route Handler
    // -------------------------------------------------------------
    const approveUpwardReq = new NextRequest(`http://localhost:3000/api/tasks/${parentTask.id}/approve-delegation?mock=branch_head`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve_upward',
        notes: 'Branch Head evaluated child deliverable. Endorsing and submitting upward for Presidential sign-off.',
      }),
    });

    const approveUpwardRes = await approveDelegationPOST(approveUpwardReq, { params: Promise.resolve({ id: parentTask.id }) });
    const approveUpwardData = await approveUpwardRes.json();
    if (!approveUpwardRes.ok) {
      throw new Error(`approve-delegation (approve_upward) failed: ${approveUpwardData.error || approveUpwardRes.statusText}`);
    }

    // Verify Root Task was flipped from 'delegated' to 'review'
    const { data: freshRoot } = await admin
      .from('tasks')
      .select('*')
      .eq('id', rootTask.id)
      .single();

    const passedRootFlippedToReview = freshRoot?.status === 'review';
    const passedRootEvidenceLinked = freshRoot?.evidence_url === testDeliverableUrl;

    // Verify notification was sent to President
    const { data: presNotifs } = await admin
      .from('notifications')
      .select('*')
      .eq('profile_id', president.id)
      .eq('related_entity_id', rootTask.id);

    const passedPresidentNotified = !!(presNotifs && presNotifs.length > 0);

    // -------------------------------------------------------------
    // STEP 3: President Gives Executive Final Sign-Off via API Route Handler
    // -------------------------------------------------------------
    const finalSignoffReq = new NextRequest(`http://localhost:3000/api/tasks/${rootTask.id}/approve-delegation?mock=president`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'final_signoff',
        notes: 'Executive final approval granted! Outstanding deliverable execution by the team.',
      }),
    });

    const finalSignoffRes = await approveDelegationPOST(finalSignoffReq, { params: Promise.resolve({ id: rootTask.id }) });
    const finalSignoffData = await finalSignoffRes.json();
    if (!finalSignoffRes.ok) {
      throw new Error(`approve-delegation (final_signoff) failed: ${finalSignoffData.error || finalSignoffRes.statusText}`);
    }

    // Verify that the whole chain closed as 'Done' (Spec §4.2 Part B #7)
    const [finalRootRes, finalParentRes, finalChildRes] = await Promise.all([
      admin.from('tasks').select('status').eq('id', rootTask.id).single(),
      admin.from('tasks').select('status').eq('id', parentTask.id).single(),
      admin.from('tasks').select('status').eq('id', childTask.id).single(),
    ]);

    const passedRootClosedDone = finalRootRes.data?.status === 'done';
    const passedParentClosedDone = finalParentRes.data?.status === 'done';
    const passedChildClosedDone = finalChildRes.data?.status === 'done';
    const passedWholeChainClosedDone = passedRootClosedDone && passedParentClosedDone && passedChildClosedDone;

    // Verify final closure comments
    const { data: childFinalComments } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', childTask.id);

    const passedChildFinalComment = childFinalComments?.some((c) =>
      c.body.includes('Delegation Chain Final Sign-Off')
    );

    const allAssertionsPassed =
      passedParentFlippedToReview &&
      passedParentEvidenceCopied &&
      passedBranchHeadNotified &&
      passedParentCommentAdded &&
      passedAuditLog1 &&
      passedRootFlippedToReview &&
      passedRootEvidenceLinked &&
      passedPresidentNotified &&
      passedWholeChainClosedDone &&
      passedChildFinalComment;

    return NextResponse.json({
      status: allAssertionsPassed ? 'ok' : 'assertion_failed',
      message: allAssertionsPassed
        ? 'Phase 6 - Step 6.5 Upward Task Delegation & Cascade Auto-Submit verification passed!'
        : 'One or more assertions failed during Step 6.5 verification.',
      verification: {
        chain: {
          rootTaskId: rootTask.id,
          parentTaskId: parentTask.id,
          childTaskId: childTask.id,
          testDeliverableUrl,
        },
        part1_childSubmitToParent: {
          passedParentFlippedToReview,
          actualParentStatus: freshParent?.status,
          passedParentEvidenceCopied,
          passedBranchHeadNotified,
          passedParentCommentAdded,
          passedAuditLog1,
        },
        part2_parentApprovalToRoot: {
          passedRootFlippedToReview,
          actualRootStatus: freshRoot?.status,
          passedRootEvidenceLinked,
          passedPresidentNotified,
        },
        part3_executiveFinalSignoff: {
          passedRootClosedDone,
          passedParentClosedDone,
          passedChildClosedDone,
          passedWholeChainClosedDone,
          passedChildFinalComment,
        },
        allAssertionsPassed,
      },
      urls: {
        rootTaskUrl: `/tasks/${rootTask.id}`,
        parentTaskUrl: `/tasks/${parentTask.id}`,
        childTaskUrl: `/tasks/${childTask.id}`,
      },
    });
  } catch (err: any) {
    console.error('Error during step 6.5 verification:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
