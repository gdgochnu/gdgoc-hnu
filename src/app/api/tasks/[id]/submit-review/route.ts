import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createApprovalInstance } from '@/lib/approvals/approval-engine';
import { propagateDelegationUpwardOnSubmit, closeDelegationChain } from '@/lib/approvals/approval-actions';

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
        .select('id')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();

      if (mockUser) callerId = mockUser.id;
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 1. Fetch task
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status === 'review' && task.approval_instance_id) {
      return NextResponse.json(
        { error: 'Task is already in review pipeline.', approval_instance_id: task.approval_instance_id },
        { status: 400 }
      );
    }

    if (task.status === 'done') {
      return NextResponse.json({ error: 'Task is already completed.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { evidence_url, notes } = body;
    const finalEvidenceUrl = evidence_url ? evidence_url.trim() : task.evidence_url;

    // 2. Update evidence_url if provided
    if (evidence_url) {
      await admin
        .from('tasks')
        .update({ evidence_url: finalEvidenceUrl })
        .eq('id', taskId);
    }

    // 3. Determine submitter (task assignee or caller)
    const submitterId = task.assignee_id || callerId;

    // Fetch caller profile for name/role
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', callerId)
      .maybeSingle();

    // 4. Create approval instance using Phase 4 engine
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'task_completion',
      entityId: taskId,
      submitterId,
      departmentId: task.department_id,
    });

    // 5. Add handover notes as a task comment if provided
    if (notes && notes.trim()) {
      await admin.from('task_comments').insert({
        task_id: taskId,
        author_id: callerId,
        body: `📋 **Submitted for Review**\n\n${notes.trim()}${finalEvidenceUrl ? `\n\n📎 Evidence: ${finalEvidenceUrl}` : ''}`,
      });
    }

    // 6. Upward Auto-Submit (Spec §4.2 Part B #6, Step 6.5)
    // When a child task is submitted/done, automatically flip its parent_task_id task to Review
    // and notify whoever delegated it!
    let parentTaskResult = null;
    if (task.parent_task_id) {
      parentTaskResult = await propagateDelegationUpwardOnSubmit({
        childTaskId: taskId,
        childTitle: task.title,
        childEvidenceUrl: finalEvidenceUrl,
        parentTaskId: task.parent_task_id,
        actorId: callerId,
        actorName: callerProfile?.full_name,
      });
    }

    // 7. If auto-approved at this tier, cascade closure to child tasks if any
    if (computation.isAutoApproved) {
      await closeDelegationChain(taskId, callerId, callerProfile?.full_name);
    }

    // 8. Fetch updated task with joined relations
    const { data: updatedTask } = await admin
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
        evidence_url,
        approval_instance_id,
        parent_task_id,
        delegated_by_id,
        assignment_mode,
        created_at,
        updated_at,
        departments:department_id (id, name, code, branch),
        assignee:assignee_id (id, full_name, avatar_url, role, position)
      `)
      .eq('id', taskId)
      .single();

    return NextResponse.json({
      status: 'ok',
      task: updatedTask,
      instance,
      computation,
      parentTask: parentTaskResult,
    });
  } catch (err: any) {
    console.error('Error submitting task for review:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
