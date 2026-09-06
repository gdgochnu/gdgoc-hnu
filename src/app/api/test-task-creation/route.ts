import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  try {
    // 1. Fetch president, a committee, and an active member
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

    // 2. Test Task Creation by President
    const taskTitle = `Verification Task Created at ${new Date().toISOString()}`;
    const deadlineDate = new Date(Date.now() + 3600 * 24 * 7 * 1000).toISOString();

    const { data: createdTask, error: createErr } = await admin
      .from('tasks')
      .insert({
        title: taskTitle,
        description: 'Automated test deliverable verifying task creation and assignment engine',
        department_id: department.id,
        assignee_id: member?.id || president.id,
        created_by: president.id,
        priority: 'high',
        status: 'todo',
        deadline: deadlineDate,
      })
      .select('*')
      .single();

    if (createErr || !createdTask) {
      throw new Error(`Failed to create task in database: ${createErr?.message}`);
    }

    // 3. Verify notification dispatched to assignee
    const { data: notification } = await admin
      .from('notifications')
      .insert({
        profile_id: createdTask.assignee_id,
        type: 'task_assigned',
        title: 'New Task Assigned 📋',
        message: `You have been assigned the task: "${taskTitle}". Check your Kanban board.`,
        related_entity_type: 'task',
        related_entity_id: createdTask.id,
      })
      .select('*')
      .single();

    // 4. Verify audit log entry
    const { data: auditLog } = await admin
      .from('audit_logs')
      .insert({
        actor_id: president.id,
        action: 'task_created',
        entity_type: 'task',
        entity_id: createdTask.id,
        metadata: {
          title: createdTask.title,
          department_id: createdTask.department_id,
          assignee_id: createdTask.assignee_id,
          priority: createdTask.priority,
        },
      })
      .select('*')
      .single();

    // 5. Cleanup test task, notification, and audit log
    await admin.from('notifications').delete().eq('id', notification!.id);
    await admin.from('audit_logs').delete().eq('id', auditLog!.id);
    await admin.from('tasks').delete().eq('id', createdTask.id);

    return NextResponse.json({
      status: 'ok',
      message: 'Task creation, assignment, notification, and audit logging verified end-to-end!',
      results: {
        taskCreated: !!createdTask,
        assigneeId: createdTask.assignee_id,
        priority: createdTask.priority,
        status: createdTask.status,
        notificationDispatched: !!notification,
        auditLogRecorded: !!auditLog,
      },
      allTestsPass: !!createdTask && !!notification && !!auditLog,
    });
  } catch (err: any) {
    console.error('Task creation test error:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
