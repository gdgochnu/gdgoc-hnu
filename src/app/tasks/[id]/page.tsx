import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { TaskDetailClient, TaskDetailData, TaskCommentItem } from '@/components/tasks/TaskDetailClient';
import { canUserApproveCurrentStep } from '@/lib/approvals/approval-engine';
import { ApprovalInstanceData, ApprovalStepItem } from '@/components/approvals/ApprovalStageTracker';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, CheckSquare } from 'lucide-react';
import { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TaskDetailPage({ params, searchParams }: TaskDetailPageProps) {
  const { id: taskId } = await params;
  const sParams = await searchParams;
  const mockParam = typeof sParams.mock === 'string' ? sParams.mock : null;

  const [context, supabase] = await Promise.all([
    getUserContext(),
    createClient(),
  ]);

  const admin = createAdminClient();
  let userProfile = context.profile;
  let userId = context.user?.id;

  // Mock role testing in non-production
  if ((!userId || mockParam) && process.env.NODE_ENV !== 'production' && mockParam) {
    const { data: mockUser } = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, status, position, department_id')
      .eq('role', mockParam as UserRole)
      .limit(1)
      .maybeSingle();

    if (mockUser) {
      userProfile = {
        ...mockUser,
        department: null,
      } as any;
      userId = mockUser.id;
    }
  }

  // 1. Fetch Task with relations
  const { data: task, error: taskError } = await admin
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

  // If task not found, display clean 404
  if (taskError || !task) {
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
              Task Not Found
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              The requested chapter task could not be found or you do not have permission to view it.
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

  // 2. Fetch Comments
  const { data: rawComments } = await admin
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

  const comments: TaskCommentItem[] = (rawComments as any) || [];

  // 3. Fetch Approval Instance and Steps if exists
  let approvalInstance: ApprovalInstanceData | null = null;
  let approvalSteps: ApprovalStepItem[] = [];
  let canUserApprove = false;

  if (task.approval_instance_id) {
    const { data: inst } = await admin
      .from('approval_instances')
      .select('*')
      .eq('id', task.approval_instance_id)
      .maybeSingle();

    if (inst) {
      approvalInstance = inst as ApprovalInstanceData;

      const { data: steps } = await admin
        .from('approval_instance_steps')
        .select(`
          id,
          step_order,
          approver_rule,
          status,
          notes,
          acted_at,
          resolved_approver_id,
          resolved_approver:resolved_approver_id (
            id,
            full_name,
            avatar_url,
            role,
            position
          )
        `)
        .eq('instance_id', inst.id)
        .order('step_order', { ascending: true });

      approvalSteps = (steps as any) || [];

      // Calculate canUserApprove
      if (userProfile && inst.status === 'in_progress') {
        const activeStep = approvalSteps.find((s) => s.step_order === inst.current_step);
        if (activeStep) {
          // Fetch committee head info for this task's department
          let deptHeadId: string | null = null;
          let deptCoHeadId: string | null = null;
          if (task.department_id) {
            const { data: dept } = await admin
              .from('departments')
              .select('head_id, co_head_id')
              .eq('id', task.department_id)
              .maybeSingle();

            deptHeadId = dept?.head_id || null;
            deptCoHeadId = dept?.co_head_id || null;
          }

          canUserApprove = canUserApproveCurrentStep({
            userRole: userProfile.role,
            userId: userProfile.id,
            stepRule: activeStep.approver_rule,
            departmentHeadId: deptHeadId,
            departmentCoHeadId: deptCoHeadId,
          });
        }
      }
    }
  }

  // 4. Fetch Task Assignees for Broadcast Tasks (Spec §3.17 & §4.2)
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

  const assignees = rawAssignees || [];

  // 5. Fetch Parent and Child tasks for Delegation chain (Spec §4.2 Part B)
  let parentTask: any = null;
  if (task.parent_task_id) {
    const { data: pTask } = await admin
      .from('tasks')
      .select('id, title, status, assignee_id, departments:department_id(name)')
      .eq('id', task.parent_task_id)
      .maybeSingle();
    parentTask = pTask;
  }

  const { data: rawChildTasks } = await admin
    .from('tasks')
    .select(`
      id,
      title,
      status,
      assignment_mode,
      assignee_id,
      department_id,
      created_at,
      assignee:assignee_id(id, full_name, avatar_url, role),
      departments:department_id(id, name, code)
    `)
    .eq('parent_task_id', taskId)
    .order('created_at', { ascending: false });

  const childTasks = rawChildTasks || [];

  // 6. Permissions check
  const role = userProfile?.role || 'member';
  const isPresident = role === 'president' || role === 'co_president';
  const isBranchHead = role === 'branch_head';
  const isCommitteeHead = role === 'committee_head' || role === 'committee_co_head';
  const isAssignee = userId === task.assignee_id || assignees.some((a) => a.profile_id === userId);
  const isCreator = userId === task.created_by;

  const canEditTask = isPresident || isBranchHead || isCommitteeHead;
  const canSubmitReview = isAssignee || canEditTask;

  return (
    <AppShell>
      <TaskDetailClient
        task={task as any}
        initialComments={comments}
        approvalInstance={approvalInstance}
        approvalSteps={approvalSteps}
        canUserApprove={canUserApprove}
        canEditTask={canEditTask}
        canSubmitReview={canSubmitReview}
        currentUserId={userId}
        mockRole={mockParam}
        assignees={assignees as any}
        parentTask={parentTask}
        childTasks={childTasks as any}
      />
    </AppShell>
  );
}
