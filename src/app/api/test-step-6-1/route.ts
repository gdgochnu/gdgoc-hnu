import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // Check tasks columns
    const { data: tasks, error: tasksErr } = await admin
      .from('tasks')
      .select('*')
      .limit(1);

    // Check task_assignees table
    const { data: assignees, error: assigneesErr } = await admin
      .from('task_assignees')
      .select('*')
      .limit(1);

    const taskSampleKeys = tasks && tasks.length > 0 ? Object.keys(tasks[0]) : [];

    return NextResponse.json({
      status: 'ok',
      tasks: {
        error: tasksErr?.message || null,
        sampleKeys: taskSampleKeys,
        hasParentTaskId: taskSampleKeys.includes('parent_task_id'),
        hasDelegatedById: taskSampleKeys.includes('delegated_by_id'),
        hasAssignmentMode: taskSampleKeys.includes('assignment_mode'),
        hasEventId: taskSampleKeys.includes('event_id'),
      },
      taskAssignees: {
        exists: !assigneesErr,
        error: assigneesErr?.message || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
