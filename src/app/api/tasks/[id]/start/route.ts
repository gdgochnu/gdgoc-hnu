import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    const { data: task } = await admin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 2. Update status to in_progress (and assign caller if unassigned)
    const updates: any = {
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    };

    if (!task.assignee_id) {
      updates.assignee_id = callerId;
    }

    const { data: updatedTask, error: updateErr } = await admin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
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
      .single();

    if (updateErr || !updatedTask) {
      return NextResponse.json({ error: updateErr?.message || 'Failed to start task' }, { status: 500 });
    }

    // Audit log
    await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: 'task_started',
      entity_type: 'task',
      entity_id: taskId,
      metadata: { new_status: 'in_progress' },
    });

    return NextResponse.json({ status: 'ok', task: updatedTask });
  } catch (err: any) {
    console.error('Error starting task:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
