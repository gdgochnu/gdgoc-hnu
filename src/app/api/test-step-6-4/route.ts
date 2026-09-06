import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // 1. Fetch test profiles for the delegation chain
    // We need:
    // - A Branch Head (or President) to be the Delegator
    // - A Committee Head to be the Delegatee
    // - A Committee with members for the Broadcast test
    const { data: branchHeads } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .in('role', ['branch_head', 'president'])
      .eq('status', 'active')
      .limit(1);

    const { data: commHeads } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .in('role', ['committee_head', 'committee_co_head'])
      .eq('status', 'active')
      .limit(1);

    const { data: depts } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .limit(1);

    if (!branchHeads || branchHeads.length === 0 || !commHeads || commHeads.length === 0 || !depts || depts.length === 0) {
      return NextResponse.json({ error: 'Missing seed profiles/departments to run delegation test' }, { status: 400 });
    }

    const delegator = branchHeads[0];
    const delegatee = commHeads[0];
    const targetDept = depts[0];

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';

    // -------------------------------------------------------------
    // TEST PART 1: Single Recipient Downward Delegation
    // -------------------------------------------------------------
    const parent1Title = `[Test 6.4-A] Parent Single Task #${Date.now()}`;
    const { data: parentTask1, error: p1Err } = await admin
      .from('tasks')
      .insert({
        title: parent1Title,
        description: 'Root deliverable created for Branch Head to delegate down.',
        department_id: targetDept.id,
        assignee_id: delegator.id,
        created_by: delegator.id,
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      })
      .select('*')
      .single();

    if (p1Err || !parentTask1) {
      return NextResponse.json({ error: p1Err?.message || 'Failed to create parent task 1' }, { status: 500 });
    }

    // Call GET /api/tasks/[id]/delegation-targets
    const targetsUrl = `${protocol}://${host}/api/tasks/${parentTask1.id}/delegation-targets?mock=${delegator.role}`;
    const targetsRes = await fetch(targetsUrl);
    const targetsData = await targetsRes.json();
    const passedTargetsEndpoint = targetsRes.ok && Array.isArray(targetsData.candidates) && Array.isArray(targetsData.departments);

    // Call POST /api/tasks/[id]/delegate (Single mode)
    const delegateUrl1 = `${protocol}://${host}/api/tasks/${parentTask1.id}/delegate?mock=${delegator.role}`;
    const singleNotes = 'Please conduct technical assessment and report back with proof.';
    const delegateRes1 = await fetch(delegateUrl1, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_mode: 'single',
        recipient_profile_id: delegatee.id,
        delegation_notes: singleNotes,
        priority: 'high',
      }),
    });

    const delegateData1 = await delegateRes1.json();
    if (!delegateRes1.ok) {
      return NextResponse.json({
        error: 'Single delegation failed via API',
        details: delegateData1,
      }, { status: 500 });
    }

    // Verify DB state for Parent 1 and Child 1
    const { data: updatedParent1 } = await admin
      .from('tasks')
      .select('*')
      .eq('id', parentTask1.id)
      .single();

    const { data: childTask1 } = await admin
      .from('tasks')
      .select('*')
      .eq('id', delegateData1.childTask.id)
      .single();

    const { data: parent1Comments } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', parentTask1.id);

    const { data: child1Comments } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', childTask1?.id || '');

    const { data: auditLogs1 } = await admin
      .from('audit_logs')
      .select('*')
      .eq('entity_id', parentTask1.id)
      .eq('action', 'task_delegated');

    const passedParent1Delegated = updatedParent1?.status === 'delegated';
    const passedChild1ParentId = childTask1?.parent_task_id === parentTask1.id;
    const passedChild1Assignee = childTask1?.assignee_id === delegatee.id;
    const passedChild1DelegatedBy = childTask1?.delegated_by_id === delegator.id;
    const passedChild1StatusTodo = childTask1?.status === 'todo';
    const passedChild1NotesAppended = childTask1?.description?.includes(singleNotes) ?? false;
    const passedParent1Comment = parent1Comments?.some((c) => c.body.includes('Task Delegated Downward')) ?? false;
    const passedChild1Comment = child1Comments?.some((c) => c.body.includes('Delegated Task Received')) ?? false;
    const passedAuditLog1 = (auditLogs1?.length || 0) > 0;

    // -------------------------------------------------------------
    // TEST PART 2: Committee Broadcast Downward Delegation
    // -------------------------------------------------------------
    const parent2Title = `[Test 6.4-B] Parent Broadcast Delegation Task #${Date.now()}`;
    const { data: parentTask2, error: p2Err } = await admin
      .from('tasks')
      .insert({
        title: parent2Title,
        description: 'Committee-wide sprint assignment to be broadcast down to members.',
        department_id: targetDept.id,
        assignee_id: delegatee.id,
        created_by: delegator.id,
        priority: 'medium',
        status: 'todo',
        deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      })
      .select('*')
      .single();

    if (p2Err || !parentTask2) {
      return NextResponse.json({ error: p2Err?.message || 'Failed to create parent task 2' }, { status: 500 });
    }

    // Call POST /api/tasks/[id]/delegate (Broadcast mode)
    const delegateUrl2 = `${protocol}://${host}/api/tasks/${parentTask2.id}/delegate?mock=${delegatee.role}`;
    const broadcastNotes = 'Sprint deliverable broadcast to all committee members. Everyone submit an independent attempt.';
    const delegateRes2 = await fetch(delegateUrl2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_mode: 'broadcast',
        recipient_department_id: targetDept.id,
        delegation_notes: broadcastNotes,
        priority: 'medium',
      }),
    });

    const delegateData2 = await delegateRes2.json();
    if (!delegateRes2.ok) {
      return NextResponse.json({
        error: 'Broadcast delegation failed via API',
        details: delegateData2,
      }, { status: 500 });
    }

    // Verify DB state for Parent 2 and Child 2
    const { data: updatedParent2 } = await admin
      .from('tasks')
      .select('*')
      .eq('id', parentTask2.id)
      .single();

    const { data: childTask2 } = await admin
      .from('tasks')
      .select('*')
      .eq('id', delegateData2.childTask.id)
      .single();

    const { data: child2Assignees } = await admin
      .from('task_assignees')
      .select('*')
      .eq('task_id', childTask2?.id || '');

    const passedParent2Delegated = updatedParent2?.status === 'delegated';
    const passedChild2Broadcast = childTask2?.assignment_mode === 'broadcast';
    const passedChild2ParentId = childTask2?.parent_task_id === parentTask2.id;
    const passedChild2AssigneeNull = childTask2?.assignee_id === null;
    const passedChild2AssigneesGenerated = (child2Assignees?.length || 0) > 0;

    const allAssertionsPassed =
      passedTargetsEndpoint &&
      passedParent1Delegated &&
      passedChild1ParentId &&
      passedChild1Assignee &&
      passedChild1DelegatedBy &&
      passedChild1StatusTodo &&
      passedChild1NotesAppended &&
      passedParent1Comment &&
      passedChild1Comment &&
      passedAuditLog1 &&
      passedParent2Delegated &&
      passedChild2Broadcast &&
      passedChild2ParentId &&
      passedChild2AssigneeNull;

    return NextResponse.json({
      status: allAssertionsPassed ? 'ok' : 'assertion_failed',
      message: allAssertionsPassed
        ? 'Phase 6 - Step 6.4 Downward Task Delegation verification passed!'
        : 'One or more Step 6.4 assertions failed.',
      verification: {
        part1_singleDelegation: {
          delegator: { id: delegator.id, name: delegator.full_name, role: delegator.role },
          delegatee: { id: delegatee.id, name: delegatee.full_name, role: delegatee.role },
          parentTaskId: parentTask1.id,
          childTaskId: childTask1?.id,
          assertions: {
            passedTargetsEndpoint,
            passedParent1Delegated,
            passedChild1ParentId,
            passedChild1Assignee,
            passedChild1DelegatedBy,
            passedChild1StatusTodo,
            passedChild1NotesAppended,
            passedParent1Comment,
            passedChild1Comment,
            passedAuditLog1,
          },
        },
        part2_broadcastDelegation: {
          committee: { id: targetDept.id, name: targetDept.name },
          parentTaskId: parentTask2.id,
          childTaskId: childTask2?.id,
          broadcastAssigneesCount: child2Assignees?.length || 0,
          assertions: {
            passedParent2Delegated,
            passedChild2Broadcast,
            passedChild2ParentId,
            passedChild2AssigneeNull,
            passedChild2AssigneesGenerated,
          },
        },
        parent1DetailUrl: `/tasks/${parentTask1.id}`,
        child1DetailUrl: `/tasks/${childTask1?.id}`,
        parent2DetailUrl: `/tasks/${parentTask2.id}`,
        child2DetailUrl: `/tasks/${childTask2?.id}`,
      },
    });
  } catch (err: any) {
    console.error('Error in test-step-6-4:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
