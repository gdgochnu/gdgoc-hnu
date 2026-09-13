import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { TasksKanbanClient, TaskItem, DepartmentOption } from '@/components/tasks/TasksKanbanClient';
import { TasksSkeleton } from '@/components/skeletons/TasksSkeleton';
import { CheckSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface TasksPageProps {
  searchParams?: Promise<{
    departmentId?: string;
    dept?: string;
    taskId?: string;
  }>;
}

async function TasksDataLoader({
  initialDepartmentId,
  initialTaskId,
  profile,
  role,
  isPresident,
  isBranchHead,
}: {
  initialDepartmentId?: string;
  initialTaskId?: string;
  profile: any;
  role: string;
  isPresident: boolean;
  isBranchHead: boolean;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Fetch available departments scoped to user's permissions
  let deptQuery = admin.from('departments').select('id, name, code, branch').order('name');
  if (!isPresident) {
    if (isBranchHead && profile?.department?.branch) {
      deptQuery = deptQuery.eq('branch', profile.department.branch);
    } else if (profile?.department_id) {
      deptQuery = deptQuery.eq('id', profile.department_id);
    }
  }

  const { data: deptList } = await deptQuery;
  const departments: DepartmentOption[] = deptList || [];

  // 2. Fetch active members for task assignment
  const { data: memberRows } = await admin
    .from('profiles')
    .select('id, full_name, role, department_id, avatar_url')
    .eq('status', 'active')
    .order('full_name');

  const members = memberRows || [];

  // 3. Fetch tasks respecting committee scope
  let taskQuery = supabase
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
      departments:department_id (id, name, code, branch),
      assignee:assignee_id (id, full_name, avatar_url, role, position),
      task_assignees (
        id,
        profile_id,
        status,
        evidence_url,
        submitted_at,
        profile:profile_id (id, full_name, avatar_url, role, position)
      )
    `)
    .order('created_at', { ascending: false });

  const { data: rawTasks } = await taskQuery;
  let tasks: TaskItem[] = (rawTasks as any) || [];

  return (
    <TasksKanbanClient
      initialTasks={tasks}
      departments={departments}
      members={members}
      currentUserRole={role as any}
      currentUserId={profile?.id || ''}
      userDepartmentId={profile?.department_id}
      initialDepartmentId={initialDepartmentId}
      initialTaskId={initialTaskId}
    />
  );
}

export default async function TasksPage(props: TasksPageProps) {
  const [context, searchParams] = await Promise.all([
    getUserContext(),
    props.searchParams,
  ]);

  const initialDepartmentId = searchParams?.departmentId || searchParams?.dept;
  const initialTaskId = searchParams?.taskId;

  const profile = context.profile;
  const role = profile?.role || 'member';
  const isPresident = role === 'president' || role === 'co_president';
  const isBranchHead = role === 'branch_head';

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Kanban Header (instant) */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: '#93C5FD',
                  fontWeight: 700,
                }}
              >
                Chapter Operations
              </span>
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {isPresident ? 'All Committees View' : `${profile?.department?.name || 'Committee'} Board`}
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, marginBottom: '0.4rem' }}>
              Tasks Kanban Board
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', margin: 0 }}>
              Track deliverables, sprint milestones, and governance review stages across all chapter committees.
            </p>
          </div>
        </div>

        {/* Kanban Board Component wrapped in Suspense with TasksSkeleton */}
        <Suspense fallback={<TasksSkeleton />}>
          <TasksDataLoader
            initialDepartmentId={initialDepartmentId}
            initialTaskId={initialTaskId}
            profile={profile}
            role={role}
            isPresident={isPresident}
            isBranchHead={isBranchHead}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
