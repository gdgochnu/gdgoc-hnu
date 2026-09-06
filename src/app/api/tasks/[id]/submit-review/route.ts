import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createApprovalInstance } from '@/lib/approvals/approval-engine';

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

    if (!callerId && mockRole && process.env.NODE_ENV !== 'production') {
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

    // 2. Update evidence_url if provided
    if (evidence_url) {
      await admin
        .from('tasks')
        .update({ evidence_url: evidence_url.trim() })
        .eq('id', taskId);
    }

    // 3. Determine submitter (task assignee or caller)
    const submitterId = task.assignee_id || callerId;

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
        body: `📋 **Submitted for Review**\n\n${notes.trim()}${evidence_url ? `\n\n📎 Evidence: ${evidence_url.trim()}` : ''}`,
      });
    }

    // 6. Fetch updated task with joined relations
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
    });
  } catch (err: any) {
    console.error('Error submitting task for review:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
