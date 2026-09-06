import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole, TaskPriority } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    let callerId = user?.id;
    let callerRole: UserRole | null = null;
    let callerDeptId: string | null = null;

    // Check query param for mock development testing
    const { searchParams } = new URL(req.url);
    const mockRole = searchParams.get('mock');

    if (callerId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, role, department_id, status')
        .eq('id', callerId)
        .single();

      if (profile && profile.status === 'active') {
        callerRole = profile.role as UserRole;
        callerDeptId = profile.department_id;
      }
    } else if (mockRole && process.env.NODE_ENV !== 'production') {
      const { data: mockUser } = await admin
        .from('profiles')
        .select('id, role, department_id')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();

      if (mockUser) {
        callerId = mockUser.id;
        callerRole = mockUser.role as UserRole;
        callerDeptId = mockUser.department_id;
      }
    }

    if (!callerId || !callerRole) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Permission check: Heads / Co-Heads / Branch Heads / President / Co-President only (Spec §1.3)
    const allowedRoles: UserRole[] = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'];
    if (!allowedRoles.includes(callerRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Only chapter leadership can create and assign tasks.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, description, department_id, assignee_id, priority = 'medium', deadline } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required.' }, { status: 400 });
    }

    if (!department_id) {
      return NextResponse.json({ error: 'Department / Committee is required.' }, { status: 400 });
    }

    // Committee Head / Co-Head can only assign tasks to their own committee
    if (['committee_head', 'committee_co_head'].includes(callerRole)) {
      if (callerDeptId && callerDeptId !== department_id) {
        return NextResponse.json(
          { error: 'Forbidden: Committee Heads can only create tasks for their own committee.' },
          { status: 403 }
        );
      }
    }

    // Validate priority
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority value.' }, { status: 400 });
    }

    // Insert task
    const { data: newTask, error: insertErr } = await admin
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        department_id,
        assignee_id: assignee_id || null,
        created_by: callerId,
        priority,
        status: 'todo',
        deadline: deadline ? new Date(deadline).toISOString() : null,
      })
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

    if (insertErr || !newTask) {
      console.error('Error creating task:', insertErr);
      return NextResponse.json({ error: insertErr?.message || 'Failed to create task' }, { status: 500 });
    }

    // Notify assignee if assigned
    if (assignee_id && assignee_id !== callerId) {
      await admin.from('notifications').insert({
        profile_id: assignee_id,
        type: 'task_assigned',
        title: 'New Task Assigned 📋',
        message: `You have been assigned the task: "${title.trim()}". Check your Kanban board.`,
        related_entity_type: 'task',
        related_entity_id: newTask.id,
      });
    }

    // Record audit log
    await admin.from('audit_logs').insert({
      actor_id: callerId,
      action: 'task_created',
      entity_type: 'task',
      entity_id: newTask.id,
      metadata: {
        title: newTask.title,
        department_id: newTask.department_id,
        assignee_id: newTask.assignee_id,
        priority: newTask.priority,
      },
    });

    return NextResponse.json({ status: 'ok', task: newTask }, { status: 201 });
  } catch (err: any) {
    console.error('Task creation exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
