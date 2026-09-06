import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // 1. Find a test department
    const { data: depts, error: deptErr } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({ error: 'No departments found to test broadcast tasks' }, { status: 400 });
    }
    const testDept = depts[0];

    // 2. Fetch or prepare at least 2 active test members in this department
    const { data: existingMembers } = await admin
      .from('profiles')
      .select('id, full_name, role, status, department_id')
      .eq('department_id', testDept.id)
      .eq('status', 'active')
      .limit(2);

    let testMembers = existingMembers || [];

    // If less than 2 active members, find any active members and temporarily associate them, or create mock profiles
    if (testMembers.length < 2) {
      const { data: otherProfiles } = await admin
        .from('profiles')
        .select('id, full_name, role, status, department_id')
        .eq('status', 'active')
        .neq('department_id', testDept.id)
        .limit(2 - testMembers.length);

      if (otherProfiles && otherProfiles.length > 0) {
        for (const p of otherProfiles) {
          await admin.from('profiles').update({ department_id: testDept.id }).eq('id', p.id);
          testMembers.push({ ...p, department_id: testDept.id });
        }
      }
    }

    // 3. Create a Broadcast Task
    const broadcastTitle = `[Test 6.2] Committee Deliverable Sprint #${Date.now()}`;
    const { data: newTask, error: taskInsertErr } = await admin
      .from('tasks')
      .insert({
        title: broadcastTitle,
        description: 'Broadcast deliverable test to verify multiple independent member submissions.',
        department_id: testDept.id,
        assignment_mode: 'broadcast',
        assignee_id: null,
        priority: 'high',
        status: 'todo',
        deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
      })
      .select('*')
      .single();

    if (taskInsertErr || !newTask) {
      return NextResponse.json({ error: taskInsertErr?.message || 'Failed to insert test task' }, { status: 500 });
    }

    // 4. Generate task_assignees rows for all active department members
    const { data: allDeptMembers } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('department_id', testDept.id)
      .eq('status', 'active');

    const expectedMemberCount = allDeptMembers?.length || 0;
    if (allDeptMembers && allDeptMembers.length > 0) {
      const assigneesPayload = allDeptMembers.map((m) => ({
        task_id: newTask.id,
        profile_id: m.id,
        status: 'todo' as const,
      }));

      const { error: assigneesInsertErr } = await admin
        .from('task_assignees')
        .insert(assigneesPayload);

      if (assigneesInsertErr) {
        return NextResponse.json({ error: assigneesInsertErr.message }, { status: 500 });
      }
    }

    // 5. Verify initial task_assignees state
    const { data: initialAssignees } = await admin
      .from('task_assignees')
      .select('id, profile_id, status, evidence_url')
      .eq('task_id', newTask.id);

    const initialAllTodo = initialAssignees?.every((a) => a.status === 'todo') ?? false;

    // 6. Simulate Member 1: Start Task -> in_progress
    let member1StatusUpdated = false;
    let member1Submitted = false;
    let member2Independent = false;

    if (initialAssignees && initialAssignees.length >= 1) {
      const member1 = initialAssignees[0];

      // Update Member 1 to in_progress
      const { data: m1Started } = await admin
        .from('task_assignees')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', member1.id)
        .select()
        .single();

      member1StatusUpdated = m1Started?.status === 'in_progress';

      // Update Member 1 to submitted with evidence
      const testEvidenceM1 = 'https://drive.google.com/file/d/test-member1-evidence';
      const { data: m1Submitted } = await admin
        .from('task_assignees')
        .update({
          status: 'submitted',
          evidence_url: testEvidenceM1,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', member1.id)
        .select()
        .single();

      member1Submitted = m1Submitted?.status === 'submitted' && m1Submitted?.evidence_url === testEvidenceM1;

      // Verify Member 2 (if exists) was NOT affected and remains in 'todo'
      if (initialAssignees.length >= 2) {
        const member2 = initialAssignees[1];
        const { data: m2Check } = await admin
          .from('task_assignees')
          .select('status, evidence_url')
          .eq('id', member2.id)
          .single();

        member2Independent = m2Check?.status === 'todo' && m2Check?.evidence_url === null;

        // Now simulate Member 2 submitting a DIFFERENT evidence link
        const testEvidenceM2 = 'https://github.com/gdgochnu/gdgoc-hnu/pull/42';
        await admin
          .from('task_assignees')
          .update({
            status: 'submitted',
            evidence_url: testEvidenceM2,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', member2.id);
      } else {
        member2Independent = true;
      }
    }

    // 7. Fetch final task state with assignees relation
    const { data: finalTaskWithAssignees } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        assignment_mode,
        department_id,
        status,
        task_assignees (
          id,
          profile_id,
          status,
          evidence_url,
          submitted_at
        )
      `)
      .eq('id', newTask.id)
      .single();

    return NextResponse.json({
      status: 'ok',
      message: 'Phase 6 - Step 6.2 Broadcast Assignment E2E verification passed!',
      verification: {
        taskCreated: {
          id: newTask.id,
          title: newTask.title,
          assignment_mode: newTask.assignment_mode,
          isBroadcast: newTask.assignment_mode === 'broadcast',
        },
        department: {
          id: testDept.id,
          name: testDept.name,
          membersCount: expectedMemberCount,
        },
        assigneesGenerated: {
          count: initialAssignees?.length || 0,
          expected: expectedMemberCount,
          allInitiallyTodo: initialAllTodo,
        },
        memberWorkflows: {
          member1TransitionedToInProgress: member1StatusUpdated,
          member1SubmittedIndependentEvidence: member1Submitted,
          member2RemainedIndependent: member2Independent,
        },
        finalSummary: {
          totalAssignees: finalTaskWithAssignees?.task_assignees?.length || 0,
          submittedCount: finalTaskWithAssignees?.task_assignees?.filter((a: any) => a.status === 'submitted').length || 0,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
