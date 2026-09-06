import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { TasksKanbanClient, TaskItem, DepartmentOption } from '@/components/tasks/TasksKanbanClient';
import { CheckSquare, Plus, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const [context, supabase] = await Promise.all([
    getUserContext(),
    createClient(),
  ]);

  const admin = createAdminClient();
  const profile = context.profile;
  const role = profile?.role || 'member';

  const isPresident = role === 'president' || role === 'co_president';
  const isBranchHead = role === 'branch_head';
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);

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

  const { data: rawTasks, error: taskErr } = await taskQuery;
  let tasks: TaskItem[] = (rawTasks as any) || [];

  // 3. If no tasks exist yet, seed initial chapter tasks for the active department
  if (tasks.length === 0 && departments.length > 0) {
    const firstDept = departments[0];
    const samplePayloads = [
      {
        title: 'Design Chapter Brand Guidelines & Social Posters',
        description: 'Create high-resolution templates in Figma following Google Developer Groups 2026 brand kit tokens.',
        department_id: firstDept.id,
        priority: 'high',
        status: 'todo',
        deadline: new Date(Date.now() + 3600 * 24 * 3 * 1000).toISOString(),
      },
      {
        title: 'Develop Google Cloud Study Jam Architecture Workshop',
        description: 'Prepare lab notebooks and Google Cloud console walkthroughs for the upcoming chapter tech sprint.',
        department_id: firstDept.id,
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 3600 * 24 * 1 * 1000).toISOString(),
      },
      {
        title: 'Implement Multi-Stage Escalation Approval Engine',
        description: 'Full dynamic step-generation and audit log wiring for chapter deliverable sign-offs.',
        department_id: firstDept.id,
        priority: 'medium',
        status: 'review',
        deadline: new Date(Date.now() - 3600 * 24 * 1 * 1000).toISOString(),
      },
      {
        title: 'Setup Official GDGoC HNU Domain DNS & Google Workspace',
        description: 'Configure SPF, DKIM, DMARC, and create chapter leadership distribution groups.',
        department_id: firstDept.id,
        priority: 'low',
        status: 'done',
        deadline: new Date(Date.now() - 3600 * 24 * 5 * 1000).toISOString(),
      },
    ];

    const { data: createdSamples } = await admin
      .from('tasks')
      .insert(samplePayloads)
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
        assignee:assignee_id (id, full_name, avatar_url, role, position)
      `);

    if (createdSamples) {
      tasks = createdSamples as any;
    }
  }

  return (
    <AppShell>
      <div
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '1440px',
          margin: '0 auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
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

        {/* Kanban Board Component */}
        <TasksKanbanClient
          initialTasks={tasks}
          departments={departments}
          members={members}
          currentUserRole={role as any}
          currentUserId={profile?.id || ''}
          userDepartmentId={profile?.department_id}
        />
      </div>
    </AppShell>
  );
}
