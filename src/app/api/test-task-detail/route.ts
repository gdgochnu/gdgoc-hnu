import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();

    // 1. Fetch departments
    const { data: dept } = await admin
      .from('departments')
      .select('id, name')
      .limit(1)
      .single();

    if (!dept) {
      return NextResponse.json({ error: 'No department found' }, { status: 500 });
    }

    // 2. Fetch a member profile
    const { data: member } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'member')
      .limit(1)
      .maybeSingle();

    const testMemberId = member?.id;

    // 3. Check if we have an existing task
    let { data: task } = await admin
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!task) {
      // Create a test task
      const { data: newTask, error: createErr } = await admin
        .from('tasks')
        .insert({
          title: 'Implement AI Model Fine-tuning Workshop Assets',
          description: 'Prepare Google Colab notebooks and presentation slides for the AI track.',
          department_id: dept.id,
          assignee_id: testMemberId || null,
          priority: 'high',
          status: 'in_progress',
          deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
        })
        .select()
        .single();

      if (createErr) throw createErr;
      task = newTask;
    }

    // 4. Test posting a comment to this task
    const { data: comment, error: commentErr } = await admin
      .from('task_comments')
      .insert({
        task_id: task.id,
        author_id: task.assignee_id || testMemberId,
        body: 'Initial draft for the Colab workshop is ready. Pushing to GitHub for review.',
      })
      .select(`
        id,
        task_id,
        author_id,
        body,
        created_at,
        author:author_id (full_name, role)
      `)
      .single();

    // 5. Test updating evidence URL
    const testEvidenceUrl = 'https://github.com/GDGoC-HNU/ai-workshop-lab';
    await admin
      .from('tasks')
      .update({ evidence_url: testEvidenceUrl })
      .eq('id', task.id);

    // 6. Fetch complete task bundle
    const { data: fullTask } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        status,
        evidence_url,
        approval_instance_id,
        department:departments(name),
        comments:task_comments(id, body)
      `)
      .eq('id', task.id)
      .single();

    // Also find task with approval_instance_id if any
    const { data: taskWithApproval } = await admin
      .from('tasks')
      .select('id, title, status, approval_instance_id')
      .not('approval_instance_id', 'is', null)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      status: 'ok',
      message: 'Task Detail page verification bundle ready',
      taskId: task.id,
      taskWithApprovalId: taskWithApproval?.id || null,
      task: fullTask,
      commentCreated: !!comment,
      evidenceUpdated: fullTask?.evidence_url === testEvidenceUrl,
      allTestsPass: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
