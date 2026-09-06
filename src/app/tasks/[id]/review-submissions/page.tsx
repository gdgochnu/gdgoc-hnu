import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Radio, ShieldAlert } from 'lucide-react';
import { TaskDetailData, TaskAssigneeItem } from '@/components/tasks/TaskDetailClient';
import { ReviewSubmissionsClient } from '@/components/tasks/ReviewSubmissionsClient';
import { UserRole } from '@/types';

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
      .eq('role', mockParam as UserRole)
      .limit(1)
      .maybeSingle();

    if (mockUser) {
      userId = mockUser.id;
      userProfile = mockUser as any;
    }
  }

  // 1. Fetch task with relations
  const { data: rawTask, error: taskErr } = await admin
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
      departments:department_id (
        id,
        name,
        code,
        branch
      ),
      assignee:assignee_id (
        id,
        full_name,
        email,
        avatar_url,
        role,
        position
      ),
      creator:created_by (
        id,
        full_name,
        email,
        avatar_url,
        role,
        position
      )
    `)
    .eq('id', taskId)
    .maybeSingle();

  // If task not found, show user-friendly error card
  if (taskErr || !rawTask) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'rgba(234, 67, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#EA4335',
              }}
            >
              <ShieldAlert size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Broadcast Task Not Found
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              The requested broadcast task could not be found or may have been deleted.
            </p>

            <Link
              href={mockParam ? `/tasks?mock=${mockParam}` : '/tasks'}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
            >
              <ArrowLeft size={16} />
              <span>Return to Tasks Kanban</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // If not a broadcast task, redirect to standard task detail page
  if (rawTask.assignment_mode !== 'broadcast') {
    redirect(`/tasks/${taskId}${mockParam ? `?mock=${mockParam}` : ''}`);
  }

  // Normalize joined relations safely
  const departmentObj = Array.isArray(rawTask.departments)
    ? rawTask.departments[0]
    : rawTask.departments;
  const assigneeObj = Array.isArray(rawTask.assignee)
    ? rawTask.assignee[0]
    : rawTask.assignee;
  const creatorObj = Array.isArray(rawTask.creator)
    ? rawTask.creator[0]
    : rawTask.creator;

  const task: TaskDetailData = {
    ...rawTask,
    departments: departmentObj || null,
    assignee: assigneeObj || null,
    creator: creatorObj || null,
  };

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
                {task.departments?.name || 'Committee Deliverable'}
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
          task={task}
          assignees={assignees}
          mockRole={mockParam}
        />
      </div>
    </AppShell>
  );
}
