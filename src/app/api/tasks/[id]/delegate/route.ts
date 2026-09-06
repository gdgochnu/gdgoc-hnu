import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TaskAssignmentMode, TaskPriority } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    let callerId = user?.id;

    // Check query param for mock development testing
    const { searchParams } = new URL(req.url);
    const mockRole = searchParams.get('mock');

    if ((!callerId || mockRole) && mockRole && process.env.NODE_ENV !== 'production') {
      const { data: mockUser } = await admin
        .from('profiles')
        .select('id, role, department_id, full_name')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();

      if (mockUser) callerId = mockUser.id;
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 1. Fetch caller profile
    const { data: callerProfile, error: callerErr } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('id', callerId)
      .single();

    if (callerErr || !callerProfile) {
      return NextResponse.json({ error: 'Caller profile not found' }, { status: 404 });
    }

    const callerRole = callerProfile.role;
    const isExecutive = callerRole === 'president' || callerRole === 'co_president';
    const isBranchHead = callerRole === 'branch_head';
    const isCommitteeHead = callerRole === 'committee_head' || callerRole === 'committee_co_head';

    if (!isExecutive && !isBranchHead && !isCommitteeHead) {
      return NextResponse.json(
        { error: 'Members do not have downstream delegation authority' },
        { status: 403 }
      );
    }

    // 2. Fetch parent task
    const { data: parentTask, error: taskErr } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        description,
        department_id,
        assignee_id,
        created_by,
        priority,
        status,
        deadline,
        event_id,
        parent_task_id,
        departments:department_id (id, name, code, branch)
      `)
      .eq('id', taskId)
      .single();

    if (taskErr || !parentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify task is not already delegated or closed
    if (parentTask.status === 'delegated') {
      return NextResponse.json(
        { error: 'This task is already in delegated status waiting on a child task.' },
        { status: 400 }
      );
    }

    if (parentTask.status === 'done') {
      return NextResponse.json(
        { error: 'Cannot delegate a task that is already completed.' },
        { status: 400 }
      );
    }

    if (parentTask.status === 'review') {
      return NextResponse.json(
        { error: 'Cannot delegate a task currently in review.' },
        { status: 400 }
      );
    }

    // Caller must be assignee or have executive oversight
    const isAssignee = parentTask.assignee_id === callerId;
    if (!isAssignee && !isExecutive) {
      // If branch head, must be over the department
      const deptBranch = (parentTask.departments as any)?.branch;
      const callerDeptId = callerProfile.department_id;
      let callerBranch: string | null = null;
      if (callerDeptId) {
        const { data: cd } = await admin.from('departments').select('branch').eq('id', callerDeptId).maybeSingle();
        callerBranch = cd?.branch || null;
      }

      if (!isBranchHead || callerBranch !== deptBranch) {
        return NextResponse.json(
          { error: 'You are neither assigned to this task nor have oversight authority to delegate it.' },
          { status: 403 }
        );
      }
    }

    // 3. Parse request payload
    const body = await req.json().catch(() => ({}));
    const recipientMode: TaskAssignmentMode = body.recipient_mode === 'broadcast' ? 'broadcast' : 'single';
    const recipientProfileId: string | null = body.recipient_profile_id || null;
    const recipientDepartmentId: string | null = body.recipient_department_id || null;
    const delegationNotes: string = typeof body.delegation_notes === 'string' ? body.delegation_notes.trim() : '';
    const childTitle: string = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : parentTask.title;
    const childPriority: TaskPriority = body.priority || parentTask.priority;
    const childDeadline: string | null = body.deadline || parentTask.deadline;

    let targetDepartmentId = parentTask.department_id;
    let targetAssigneeId: string | null = null;
    let targetLabel = '';

    if (recipientMode === 'single') {
      if (!recipientProfileId) {
        return NextResponse.json({ error: 'Please select a recipient member or head to delegate to.' }, { status: 400 });
      }

      const { data: recipient, error: recipErr } = await admin
        .from('profiles')
        .select('id, full_name, role, department_id')
        .eq('id', recipientProfileId)
        .eq('status', 'active')
        .single();

      if (recipErr || !recipient) {
        return NextResponse.json({ error: 'Selected recipient profile not found or inactive.' }, { status: 400 });
      }

      targetAssigneeId = recipient.id;
      targetLabel = recipient.full_name;
      if (recipient.department_id) {
        targetDepartmentId = recipient.department_id;
      }
    } else {
      // Broadcast mode
      if (!recipientDepartmentId) {
        return NextResponse.json({ error: 'Please select a target committee for broadcast delegation.' }, { status: 400 });
      }

      const { data: targetDept, error: tDeptErr } = await admin
        .from('departments')
        .select('id, name')
        .eq('id', recipientDepartmentId)
        .single();

      if (tDeptErr || !targetDept) {
        return NextResponse.json({ error: 'Selected target committee not found.' }, { status: 400 });
      }

      targetDepartmentId = targetDept.id;
      targetLabel = `Broadcast: ${targetDept.name} Committee`;
    }

    // 4. Construct description with delegation notes appended
    let fullDescription = parentTask.description || '';
    if (delegationNotes) {
      fullDescription += `\n\n---\n📌 **Delegation Instructions from ${callerProfile.full_name} (${callerProfile.role.replace('_', ' ')}):**\n${delegationNotes}`;
    }

    // 5. Create Child Task
    const { data: childTask, error: childInsertErr } = await admin
      .from('tasks')
      .insert({
        title: childTitle,
        description: fullDescription,
        department_id: targetDepartmentId,
        assignee_id: targetAssigneeId,
        created_by: callerId,
        delegated_by_id: callerId,
        parent_task_id: parentTask.id,
        assignment_mode: recipientMode,
        priority: childPriority,
        status: 'todo',
        deadline: childDeadline,
        event_id: parentTask.event_id || null,
      })
      .select('*')
      .single();

    if (childInsertErr || !childTask) {
      return NextResponse.json(
        { error: childInsertErr?.message || 'Failed to create child task' },
        { status: 500 }
      );
    }

    // 6. If Broadcast, populate task_assignees rows
    let broadcastCount = 0;
    if (recipientMode === 'broadcast') {
      const { data: activeMembers } = await admin
        .from('profiles')
        .select('id')
        .eq('department_id', targetDepartmentId)
        .eq('status', 'active');

      if (activeMembers && activeMembers.length > 0) {
        const assigneesPayload = activeMembers.map((m) => ({
          task_id: childTask.id,
          profile_id: m.id,
          status: 'todo' as const,
        }));

        await admin.from('task_assignees').insert(assigneesPayload);
        broadcastCount = activeMembers.length;
      }
    }

    // 7. Update Parent Task status to 'delegated'
    const { data: updatedParentTask, error: parentUpdateErr } = await admin
      .from('tasks')
      .update({ status: 'delegated' })
      .eq('id', parentTask.id)
      .select('*')
      .single();

    if (parentUpdateErr) {
      console.error('Error updating parent task status to delegated:', parentUpdateErr);
    }

    // 8. Add delegation comment to parent task thread
    await admin.from('task_comments').insert({
      task_id: parentTask.id,
      author_id: callerId,
      body: `🔀 **Task Delegated Downward**\n\nThis task has been delegated to **${targetLabel}**.\n\n` +
        `• **Child Task:** [${childTask.title}](/tasks/${childTask.id})\n` +
        `• **Assignment Mode:** ${recipientMode.toUpperCase()}${recipientMode === 'broadcast' ? ` (${broadcastCount} members assigned)` : ''}\n` +
        (delegationNotes ? `• **Delegation Notes:** ${delegationNotes}` : ''),
    });

    // 9. Add notification comment to child task thread
    await admin.from('task_comments').insert({
      task_id: childTask.id,
      author_id: callerId,
      body: `📥 **Delegated Task Received**\n\n` +
        `This task was delegated by **${callerProfile.full_name}** from parent task [${parentTask.title}](/tasks/${parentTask.id}).\n\n` +
        (delegationNotes ? `**Guidance / Instructions:**\n${delegationNotes}` : 'Please execute and submit deliverables for upward review.'),
    });

    // 10. Audit log entry
    await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: 'task_delegated',
      entity_type: 'task',
      entity_id: parentTask.id,
      metadata: {
        parent_task_id: parentTask.id,
        child_task_id: childTask.id,
        delegated_by_id: callerId,
        recipient_mode: recipientMode,
        recipient_profile_id: targetAssigneeId,
        target_department_id: targetDepartmentId,
        delegation_notes: delegationNotes || null,
      },
    });

    return NextResponse.json({
      status: 'ok',
      message: `Task successfully delegated to ${targetLabel}`,
      childTask,
      parentTask: updatedParentTask || { ...parentTask, status: 'delegated' },
    });
  } catch (err: any) {
    console.error('Error in task delegation:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
