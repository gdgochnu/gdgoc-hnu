import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeRichText } from '@/lib/security/sanitizer';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const admin = createAdminClient();

    const { data: comments, error } = await admin
      .from('task_comments')
      .select(`
        id,
        task_id,
        author_id,
        body,
        created_at,
        author:author_id (
          id,
          full_name,
          avatar_url,
          role,
          position
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

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
    const rawBody = bodyJson?.body;
    const body = sanitizeRichText(rawBody, 2000);

    if (!body || body.trim().length === 0) {
      return NextResponse.json({ error: 'Comment body cannot be empty' }, { status: 400 });
    }

    // Verify task exists
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('id, title')
      .eq('id', taskId)
      .maybeSingle();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Insert comment
    const { data: newComment, error: insertErr } = await admin
      .from('task_comments')
      .insert({
        task_id: taskId,
        author_id: callerId,
        body,
      })
      .select(`
        id,
        task_id,
        author_id,
        body,
        created_at,
        author:author_id (
          id,
          full_name,
          avatar_url,
          role,
          position
        )
      `)
      .single();

    if (insertErr || !newComment) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to post comment' }, { status: 500 });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Comment posted successfully',
      comment: newComment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
