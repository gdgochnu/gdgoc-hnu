import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = createAdminClient();

    let callerId = user?.id;

    // Support mock dev query param
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

    const bodyJson = await req.json().catch(() => null);
    const evidenceUrl = bodyJson?.evidenceUrl?.trim();

    if (!evidenceUrl) {
      return NextResponse.json({ error: 'Evidence URL is required' }, { status: 400 });
    }

    try {
      new URL(evidenceUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format. Must start with http:// or https://' }, { status: 400 });
    }

    // Verify task exists
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('id, title, evidence_url, status')
      .eq('id', taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update evidence URL
    const { data: updatedTask, error: updateErr } = await admin
      .from('tasks')
      .update({
        evidence_url: evidenceUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Record comment in thread
    await admin.from('task_comments').insert({
      task_id: taskId,
      author_id: callerId,
      body: `📎 Updated deliverable evidence link: ${evidenceUrl}`,
    });

    return NextResponse.json({
      status: 'ok',
      message: 'Deliverable evidence updated successfully',
      task: updatedTask,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
