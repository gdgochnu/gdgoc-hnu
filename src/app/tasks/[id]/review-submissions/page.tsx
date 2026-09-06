import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Radio, ShieldAlert } from 'lucide-react';
import { ReviewBroadcastSubmissionsModal } from '@/components/tasks/ReviewBroadcastSubmissionsModal';
import { TaskDetailData, TaskAssigneeItem } from '@/components/tasks/TaskDetailClient';
import { ReviewSubmissionsClient } from './ReviewSubmissionsClient';

export const dynamic = 'force-dynamic';

interface ReviewSubmissionsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReviewSubmissionsPage({
  params,
  searchParams,
}: ReviewSubmissionsPageProps) {
  const { id: taskId } = await params;
  const sParams = await searchParams;
  const mockParam = typeof sParams.mock === 'string' ? sParams.mock : null;

  const [context, admin] = await Promise.all([
    getUserContext(),
    createAdminClient(),
  ]);

  let userId = context.user?.id;
  let userProfile = context.profile;

  if ((!userId || mockParam) && process.env.NODE_ENV !== 'production' && mockParam) {
    const { data: mockUser } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id, status')
      .eq('role', mockParam)
      .limit(1)
      .maybeSingle();

    if (mockUser) {
      userId = mockUser.id;
      userProfile = mockUser as any;
    }
  }

  // 1. Fetch task
  const { data: task, error: taskErr } = await admin
    .from('tasks')
    .select(`
      id,
      title,
      description,
      department_id,
      assignee_id,
      created_by,
      delegated_by_id,
      parent_task_id,
      assignment_mode,
      event_id,
      priority,
      status,
      deadline,
      evidence_url,
      approval_instance_id,
      created_at,
      updated_at,
      departments:department_id (id, name, code, branch)
    `)
    .eq('id', taskId)
    .maybeSingle();

  if (taskErr || !task) {
    notFound();
  }

  if (task.assignment_mode !== 'broadcast') {
    redirect(`/tasks/${taskId}`);
  }

  // 2. Fetch all task assignees
  const { data: rawAssignees } = await admin
    .from('task_assignees')
    .select(`
      id,
      task_id,
      profile_id,
      status,
      evidence_url,
      submitted_at,
      created_at,
      updated_at,
      profile:profile_id (
        id,
        full_name,
        email,
        avatar_url,
        role,
        position
      )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  const assignees: TaskAssigneeItem[] = (rawAssignees as any) || [];

  return (
    <AppShell>
      <div
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Back Link */}
        <div>
          <Link
            href={`/tasks/${taskId}${mockParam ? `?mock=${mockParam}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Task Detail</span>
          </Link>
        </div>

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#C084FC',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Radio size={13} />
                Broadcast Task Review
              </span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {(task.departments as any)?.name || 'Committee'}
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
              Review Submissions: {task.title}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Compare member attempts, pick the primary deliverable, consolidate your review notes, and submit into the governance approval pipeline.
            </p>
          </div>
        </div>

        {/* Review & Consolidation Workspace Client */}
        <ReviewSubmissionsClient
          task={task as any}
          assignees={assignees}
          mockRole={mockParam}
        />
      </div>
    </AppShell>
  );
}
