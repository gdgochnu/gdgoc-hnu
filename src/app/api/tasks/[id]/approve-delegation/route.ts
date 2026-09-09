import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { propagateDelegationUpwardOnSubmit, closeDelegationChain } from '@/lib/approvals/approval-actions';
import { 
  notifyTaskSubmittedUpward, 
  notifyTaskApproved, 
  notifyTaskRejectedOrChanges 
} from '@/lib/notifications/triggers';

export const dynamic = 'force-dynamic';

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

    // Support mock testing in development
    const { searchParams } = new URL(req.url);
    const mockRole = searchParams.get('mock');

    if ((!callerId || mockRole) && mockRole && process.env.NODE_ENV !== 'production') {
      const { data: mockUser } = await admin
        .from('profiles')
        .select('id, role, department_id, full_name')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();

      if (mockUser) callerId = mockUser.id;
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 1. Fetch caller profile
    const { data: callerProfile, error: callerErr } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('id', callerId)
      .single();

    if (callerErr || !callerProfile) {
      return NextResponse.json({ error: 'Caller profile not found' }, { status: 404 });
    }

    // 2. Fetch target task
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        description,
        department_id,
        assignee_id,
        created_by,
        priority,
        status,
        deadline,
        evidence_url,
        parent_task_id,
        delegated_by_id,
        assignment_mode,
        departments:department_id (id, name, code, branch)
      `)
      .eq('id', taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // 3. Parse request payload
    const body = await req.json().catch(() => ({}));
    const { action, notes } = body;

    if (!action || !['approve_upward', 'final_signoff', 'request_changes'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve_upward, final_signoff, or request_changes.' },
        { status: 400 }
      );
    }

    const callerRole = callerProfile.role;
    const isExecutive = callerRole === 'president' || callerRole === 'co_president';
    const isAssignee = task.assignee_id === callerId;
    const isDelegator = task.delegated_by_id === callerId || task.created_by === callerId;

    // Authority verification
    if (!isExecutive && !isAssignee && !isDelegator) {
      return NextResponse.json(
        { error: 'You do not have authorization to evaluate or sign-off this delegation deliverable.' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    // -------------------------------------------------------------
    // ACTION A: approve_upward (Pass deliverable up to parent task)
    // -------------------------------------------------------------
    if (action === 'approve_upward') {
      if (!task.parent_task_id) {
        return NextResponse.json(
          { error: 'This task is the root task and has no upstream parent. Use final_signoff to conclude the deliverable.' },
          { status: 400 }
        );
      }

      // Mark this intermediate task as done/approved
      await admin
        .from('tasks')
        .update({ status: 'done', updated_at: now })
        .eq('id', task.id);

      // Add approval comment on this task
      await admin.from('task_comments').insert({
        task_id: task.id,
        author_id: callerId,
        body: `✅ **Deliverable Approved & Submitted Upward**\n\n` +
          `Reviewed and endorsed by **${callerProfile.full_name}** (${callerRole.replace('_', ' ')}).\n\n` +
          `This deliverable has been propagated up to the parent task for final executive sign-off.\n\n` +
          (notes ? `💬 **Review Notes:** ${notes.trim()}\n\n` : '') +
          (task.evidence_url ? `📎 **Deliverable Evidence:** ${task.evidence_url}` : ''),
      });

      // Propagate upward to grandparent task
      const parentResult = await propagateDelegationUpwardOnSubmit({
        childTaskId: task.id,
        childTitle: task.title,
        childEvidenceUrl: task.evidence_url,
        parentTaskId: task.parent_task_id,
        actorId: callerId,
        actorName: callerProfile.full_name,
      });

      // Audit log
      await admin.from('audit_logs').insert({
        actor_id: callerId,
        action: 'task_delegation_approved_upward',
        entity_type: 'task',
        entity_id: task.id,
        metadata: {
          task_id: task.id,
          parent_task_id: task.parent_task_id,
          evidence_url: task.evidence_url,
          notes: notes || null,
        },
      });

      // In-App Notification upward (Spec §4.11)
      if (parentResult?.delegated_by_id || parentResult?.assignee_id) {
        await notifyTaskSubmittedUpward({
          taskId: parentResult.id,
          taskTitle: parentResult.title,
          submitterName: callerProfile.full_name || 'Team member',
          delegatorId: parentResult.delegated_by_id || parentResult.assignee_id,
        }).catch((err) => console.warn('Upward submission notification warning:', err));
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Deliverable endorsed and submitted upward to parent task.',
        task: { ...task, status: 'done' },
        parentTask: parentResult,
      });
    }

    // -------------------------------------------------------------
    // ACTION B: final_signoff (Root Executive Sign-off — Spec §4.2 Part B #7)
    // -------------------------------------------------------------
    if (action === 'final_signoff') {
      // Mark root task as done
      await admin
        .from('tasks')
        .update({ status: 'done', updated_at: now })
        .eq('id', task.id);

      // Post final closure comment
      await admin.from('task_comments').insert({
        task_id: task.id,
        author_id: callerId,
        body: `🎉 **Executive Final Sign-Off & Chapter Acceptance**\n\n` +
          `Deliverable officially approved by **${callerProfile.full_name}** (${callerRole.replace('_', ' ')}).\n\n` +
          `The entire delegation tree has completed its lifecycle and is officially closed as **Done**.\n\n` +
          (notes ? `💬 **Executive Notes:** ${notes.trim()}\n\n` : '') +
          (task.evidence_url ? `📎 **Final Chapter Deliverable:** ${task.evidence_url}` : ''),
      });

      // Recursively close all child tasks in the delegation chain
      await closeDelegationChain(task.id, callerId, callerProfile.full_name);

      // Record audit log
      await admin.from('audit_logs').insert({
        actor_id: callerId,
        action: 'task_delegation_final_signed_off',
        entity_type: 'task',
        entity_id: task.id,
        metadata: {
          task_id: task.id,
          notes: notes || null,
          evidence_url: task.evidence_url,
        },
      });

      // In-App Notification to Assignee (Spec §4.11)
      if (task.assignee_id) {
        await notifyTaskApproved({
          taskId: task.id,
          taskTitle: task.title,
          recipientId: task.assignee_id,
          approverName: callerProfile.full_name || 'President',
        }).catch((err) => console.warn('Final signoff notification warning:', err));
      }

      return NextResponse.json({
        status: 'ok',
        message: 'Final executive approval granted! The entire delegation chain is now closed as Done.',
        task: { ...task, status: 'done' },
      });
    }

    // -------------------------------------------------------------
    // ACTION C: request_changes (Send back to child task with notes)
    // -------------------------------------------------------------
    if (action === 'request_changes') {
      // Find downstream child tasks
      const { data: children } = await admin
        .from('tasks')
        .select('id, title, assignee_id')
        .eq('parent_task_id', task.id);

      // Place this parent task back in 'delegated' status
      await admin
        .from('tasks')
        .update({ status: 'delegated', updated_at: now })
        .eq('id', task.id);

      // Reset child tasks to in_progress and post feedback
      if (children && children.length > 0) {
        for (const child of children) {
          await admin
            .from('tasks')
            .update({ status: 'in_progress', updated_at: now })
            .eq('id', child.id);

          await admin.from('task_comments').insert({
            task_id: child.id,
            author_id: callerId,
            body: `⚠️ **Revisions Requested by Upstream Reviewer**\n\n` +
              `**${callerProfile.full_name}** (${callerRole.replace('_', ' ')}) has requested modifications on the submitted deliverable:\n\n` +
              `> ${notes ? notes.trim() : 'Please review requirements and re-submit an updated deliverable.'}\n\n` +
              `Task status has returned to **In Progress**.`,
          });

          if (child.assignee_id) {
            await notifyTaskRejectedOrChanges({
              taskId: child.id,
              taskTitle: child.title,
              recipientId: child.assignee_id,
              reviewerName: callerProfile.full_name,
              action: 'changes_requested',
              notes,
            }).catch((err) => console.warn('Revisions requested notification warning:', err));
          }
        }
      }

      await admin.from('task_comments').insert({
        task_id: task.id,
        author_id: callerId,
        body: `🔄 **Revisions Requested on Delegated Deliverable**\n\n` +
          `Task placed back into **Delegated** status while assignees address revisions.\n\n` +
          (notes ? `💬 **Feedback Provided:** ${notes.trim()}` : ''),
      });

      await admin.from('audit_logs').insert({
        actor_id: callerId,
        action: 'task_delegation_revisions_requested',
        entity_type: 'task',
        entity_id: task.id,
        metadata: {
          task_id: task.id,
          notes: notes || null,
        },
      });

      return NextResponse.json({
        status: 'ok',
        message: 'Revisions requested. Child deliverable placed back in progress.',
        task: { ...task, status: 'delegated' },
      });
    }

    return NextResponse.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in approve-delegation route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
