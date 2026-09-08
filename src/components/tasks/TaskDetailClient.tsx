'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Send,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Building2,
  CheckSquare,
  FileText,
  Link2,
  Edit3,
  X,
  AlertTriangle,
  Radio,
  Users,
  Award,
  GitFork,
  Share2,
  ArrowUpRight
} from 'lucide-react';
import { 
  ApprovalStageTracker, 
  ApprovalInstanceData, 
  ApprovalStepItem 
} from '@/components/approvals/ApprovalStageTracker';
import { SubmitForReviewModal } from '@/components/tasks/SubmitForReviewModal';
import { ReviewBroadcastSubmissionsModal } from '@/components/tasks/ReviewBroadcastSubmissionsModal';
import { DelegateTaskModal } from '@/components/tasks/DelegateTaskModal';
import { AddToCalendarButton } from '@/components/tasks/AddToCalendarButton';
import { TaskStatus, TaskPriority, UserRole, TaskAssignmentMode, TaskAssigneeStatus } from '@/types';

export interface TaskAssigneeItem {
  id: string;
  task_id: string;
  profile_id: string;
  status: TaskAssigneeStatus;
  evidence_url?: string | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string | null;
    role?: UserRole;
    position?: string | null;
  } | null;
}

export interface TaskDetailData {
  id: string;
  title: string;
  description?: string | null;
  department_id: string;
  assignee_id?: string | null;
  created_by?: string | null;
  delegated_by_id?: string | null;
  parent_task_id?: string | null;
  assignment_mode?: TaskAssignmentMode;
  event_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string | null;
  evidence_url?: string | null;
  approval_instance_id?: string | null;
  created_at: string;
  updated_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
    branch?: string;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string | null;
    role?: UserRole;
    position?: string | null;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string | null;
    role?: UserRole;
    position?: string | null;
  } | null;
}

export interface TaskCommentItem {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role?: UserRole;
    position?: string | null;
  } | null;
}

export interface TaskDetailClientProps {
  task: TaskDetailData;
  initialComments: TaskCommentItem[];
  approvalInstance: ApprovalInstanceData | null;
  approvalSteps: ApprovalStepItem[];
  canUserApprove: boolean;
  canEditTask: boolean;
  canSubmitReview: boolean;
  currentUserId?: string;
  currentUserRole?: UserRole;
  mockRole?: string | null;
  assignees?: TaskAssigneeItem[];
  parentTask?: {
    id: string;
    title: string;
    status: TaskStatus;
    assignee_id?: string | null;
    departments?: { name: string } | null;
  } | null;
  childTasks?: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    assignment_mode: TaskAssignmentMode;
    assignee_id?: string | null;
    department_id: string;
    created_at: string;
    assignee?: { id: string; full_name: string; avatar_url?: string | null; role?: string } | null;
    departments?: { id: string; name: string; code: string } | null;
  }>;
}

export function TaskDetailClient({
  task: initialTask,
  initialComments,
  approvalInstance,
  approvalSteps,
  canUserApprove,
  canEditTask,
  canSubmitReview,
  currentUserId,
  currentUserRole,
  mockRole,
  assignees = [],
  parentTask,
  childTasks = [],
}: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskDetailData>(initialTask);
  const [comments, setComments] = useState<TaskCommentItem[]>(initialComments);
  const [assigneesList, setAssigneesList] = useState<TaskAssigneeItem[]>(assignees);
  const [childTasksList, setChildTasksList] = useState(childTasks);
  const myAssignment = assigneesList.find((a) => a.profile_id === currentUserId);
  const [personalEvidenceInput, setPersonalEvidenceInput] = useState(myAssignment?.evidence_url || '');
  const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
  const [isStartingPersonal, setIsStartingPersonal] = useState(false);
  const [isEditingPersonalEvidence, setIsEditingPersonalEvidence] = useState(!myAssignment?.evidence_url);

  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Evidence editing modal/inline state
  const [isEditingEvidence, setIsEditingEvidence] = useState(false);
  const [evidenceInput, setEvidenceInput] = useState(task.evidence_url || '');
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Submit for Review modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);

  // Action status state
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delegation Upward Action States (Spec §4.2 Part B #6 & #7, Step 6.5)
  const [delegationActionType, setDelegationActionType] = useState<'approve_upward' | 'final_signoff' | 'request_changes' | null>(null);
  const [delegationActionNotes, setDelegationActionNotes] = useState('');
  const [isActingOnDelegation, setIsActingOnDelegation] = useState(false);

  const handleDelegationAction = async () => {
    if (!delegationActionType) return;
    try {
      setIsActingOnDelegation(true);
      const url = `/api/tasks/${task.id}/approve-delegation${mockQuery}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: delegationActionType,
          notes: delegationActionNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      if (data.task) {
        setTask((prev) => ({ ...prev, ...data.task }));
      }
      setBannerNotice({
        type: 'success',
        text: data.message || 'Delegation workflow updated successfully!',
      });
      setDelegationActionType(null);
      setDelegationActionNotes('');
      router.refresh();
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err.message });
    } finally {
      setIsActingOnDelegation(false);
    }
  };

  const handleStartPersonalTask = async () => {
    try {
      setIsStartingPersonal(true);
      const url = `/api/tasks/${task.id}/start${mockQuery}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start task');

      setAssigneesList((prev) =>
        prev.map((a) => (a.profile_id === currentUserId ? { ...a, status: 'in_progress' } : a))
      );
      if (task.status === 'todo') {
        setTask((prev) => ({ ...prev, status: 'in_progress' }));
      }
      setBannerNotice({ type: 'success', text: 'You have started working on this broadcast deliverable!' });
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err.message });
    } finally {
      setIsStartingPersonal(false);
    }
  };

  const handleSubmitPersonalEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalEvidenceInput.trim()) return;

    try {
      setIsSubmittingPersonal(true);
      const url = `/api/tasks/${task.id}/evidence${mockQuery}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrl: personalEvidenceInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit deliverable');

      setAssigneesList((prev) =>
        prev.map((a) =>
          a.profile_id === currentUserId
            ? {
                ...a,
                status: 'submitted',
                evidence_url: personalEvidenceInput.trim(),
                submitted_at: new Date().toISOString(),
              }
            : a
        )
      );
      setIsEditingPersonalEvidence(false);
      setBannerNotice({ type: 'success', text: 'Your deliverable has been submitted successfully!' });
      setComments((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          task_id: task.id,
          author_id: currentUserId || '',
          body: `📥 Submitted personal deliverable: ${personalEvidenceInput.trim()}`,
          created_at: new Date().toISOString(),
          author: {
            id: currentUserId || '',
            full_name: 'You',
            avatar_url: null,
          },
        },
      ]);
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingPersonal(false);
    }
  };

  const mockQuery = mockRole ? `?mock=${mockRole}` : '';

  // Priority styling
  const getPriorityInfo = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return { label: 'High Priority', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'medium':
        return { label: 'Medium Priority', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'low':
        return { label: 'Low Priority', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      default:
        return { label: p, color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.3)' };
    }
  };

  // Status styling
  const getStatusInfo = (s: TaskStatus) => {
    switch (s) {
      case 'todo':
        return { label: 'To Do', icon: Clock, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
      case 'in_progress':
        return { label: 'In Progress', icon: Play, color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.25)' };
      case 'review':
        return { label: 'In Review', icon: ShieldCheck, color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)' };
      case 'done':
        return { label: 'Completed', icon: CheckCircle2, color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
      case 'delegated':
        return { label: 'Delegated', icon: GitFork, color: '#C084FC', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' };
      case 'rejected':
        return { label: 'Changes Requested', icon: AlertTriangle, color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.3)' };
      default:
        return { label: s, icon: Clock, color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
    }
  };

  const priorityMeta = getPriorityInfo(task.priority);
  const statusMeta = getStatusInfo(task.status);
  const StatusIcon = statusMeta.icon;

  // Format date
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No deadline specified';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Handle Start Task
  const handleStartTask = async () => {
    try {
      setActionLoading(true);
      setBannerNotice(null);
      const url = `/api/tasks/${task.id}/start${mockQuery}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start task');
      }

      setTask((prev) => ({ ...prev, status: 'in_progress', assignee_id: prev.assignee_id || currentUserId }));
      setBannerNotice({ type: 'success', text: 'Task started! Status moved to In Progress.' });
      router.refresh();
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err.message || 'Error starting task' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Post Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPostingComment) return;

    try {
      setIsPostingComment(true);
      setCommentError(null);

      const url = `/api/tasks/${task.id}/comments${mockQuery}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to post comment');
      }

      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
      }
      setNewComment('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  // Handle Save Evidence
  const handleSaveEvidence = async () => {
    if (!evidenceInput.trim()) return;

    try {
      setIsSavingEvidence(true);
      setEvidenceError(null);

      const url = `/api/tasks/${task.id}/evidence${mockQuery}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrl: evidenceInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update deliverable link');
      }

      setTask((prev) => ({ ...prev, evidence_url: evidenceInput.trim() }));
      setIsEditingEvidence(false);
      setBannerNotice({ type: 'success', text: 'Deliverable evidence link updated successfully!' });
      
      // Also append system comment
      setComments((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          task_id: task.id,
          author_id: currentUserId || '',
          body: `📎 Updated deliverable evidence link: ${evidenceInput.trim()}`,
          created_at: new Date().toISOString(),
          author: {
            id: currentUserId || '',
            full_name: 'You',
            avatar_url: null,
          },
        },
      ]);
    } catch (err: any) {
      setEvidenceError(err.message || 'Failed to update deliverable URL');
    } finally {
      setIsSavingEvidence(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb and Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <Link
            href={`/tasks${mockQuery}`}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'var(--transition-smooth)',
            }}
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <Link href={`/tasks${mockQuery}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Tasks
              </Link>
              <span>/</span>
              <span style={{ color: 'var(--text-secondary)' }}>{task.departments?.name || 'General'}</span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Task Specification & Governance
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Downward Delegation Action (Spec §4.2 Part B) */}
          {(task.status === 'todo' || task.status === 'in_progress') && canEditTask && (
            <button
              onClick={() => setShowDelegateModal(true)}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#C084FC',
                borderColor: 'rgba(168, 85, 247, 0.45)',
                background: 'rgba(168, 85, 247, 0.08)',
                padding: '0.55rem 1.15rem',
              }}
            >
              <GitFork size={16} />
              <span>Delegate Task</span>
            </button>
          )}

          {task.status === 'todo' && (
            <button
              onClick={handleStartTask}
              disabled={actionLoading}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'var(--google-blue)',
                padding: '0.55rem 1.15rem',
              }}
            >
              <Play size={16} />
              <span>{actionLoading ? 'Starting...' : 'Start Working'}</span>
            </button>
          )}

          {task.status === 'in_progress' && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                border: 'none',
                padding: '0.55rem 1.15rem',
              }}
            >
              <ShieldCheck size={16} />
              <span>Submit for Review</span>
            </button>
          )}

          {(task.status === 'rejected' || task.status === 'review') && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                padding: '0.55rem 1.15rem',
              }}
            >
              <RotateCcw size={16} />
              <span>Update Deliverable</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Notice */}
      {bannerNotice && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: bannerNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${bannerNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: bannerNotice.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{bannerNotice.text}</span>
          <button
            onClick={() => setBannerNotice(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Grid: 2 Columns (Content Left 68%, Metadata Right 32%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Main Task Spec, Deliverables, Workflow Tracker, Comments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Upstream Parent Task Link (If this task was delegated down) */}
          {parentTask && (
            <div
              style={{
                padding: '0.85rem 1.15rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <GitFork size={16} color="#C084FC" />
                <span style={{ color: 'var(--text-secondary)' }}>Delegated from parent task:</span>
                <Link
                  href={`/tasks/${parentTask.id}${mockQuery}`}
                  style={{ fontWeight: 700, color: '#F3E8FF', textDecoration: 'underline' }}
                >
                  {parentTask.title}
                </Link>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: 'rgba(168, 85, 247, 0.25)',
                  color: '#E9D5FF',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                Parent: {parentTask.status}
              </span>
            </div>
          )}

          {/* Downstream Delegated Branch (If this task is delegated or has child tasks) */}
          {(task.status === 'delegated' || childTasksList.length > 0) && (
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                background: 'rgba(19, 27, 46, 0.85)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitFork size={18} color="#C084FC" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#F3E8FF' }}>
                    Delegation Branch (Spec §4.2 Part B)
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: task.status === 'review' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: task.status === 'review' ? '#86EFAC' : '#D8B4FE',
                    border: task.status === 'review' ? '1px solid rgba(52, 168, 83, 0.45)' : '1px solid rgba(168, 85, 247, 0.45)',
                  }}
                >
                  {task.status === 'delegated' ? 'Waiting on Child Deliverable' : task.status === 'review' ? 'Deliverable Ready for Review' : 'Child Deliverable Active'}
                </span>
              </div>

              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {task.status === 'review'
                  ? 'Child task deliverable has been submitted! You can evaluate the work, advance it upward to the next chapter leadership tier, or give final executive sign-off.'
                  : 'This deliverable has been delegated down the chapter chain. When the child task is submitted, this parent task will automatically advance into Review for your sign-off.'}
              </p>

              {/* Review & Upward Advance Box when parent is in Review */}
              {task.status === 'review' && (
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(52, 168, 83, 0.08)',
                    border: '1px solid rgba(52, 168, 83, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} color="#34A853" />
                      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#A7F3D0' }}>
                        Delegated Deliverable Awaiting Evaluation
                      </span>
                    </div>
                    {task.evidence_url && (
                      <a
                        href={task.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: '#93C5FD',
                          borderColor: 'rgba(147, 197, 253, 0.4)',
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Inspect Submitted Deliverable</span>
                      </a>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {task.parent_task_id ? (
                      <button
                        type="button"
                        onClick={() => setDelegationActionType('approve_upward')}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.85rem',
                          padding: '0.45rem 1rem',
                          background: 'linear-gradient(135deg, #A855F7, #4285F4)',
                          border: 'none',
                          fontWeight: 700,
                        }}
                      >
                        <ArrowUpRight size={15} />
                        <span>Approve & Submit Upward</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDelegationActionType('final_signoff')}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.85rem',
                          padding: '0.45rem 1rem',
                          background: 'linear-gradient(135deg, #34A853, #0F9D58)',
                          border: 'none',
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>Executive Final Sign-Off (Close Chain)</span>
                      </button>
                    )}

                    {task.parent_task_id && (currentUserRole === 'president' || currentUserRole === 'co_president') && (
                      <button
                        type="button"
                        onClick={() => setDelegationActionType('final_signoff')}
                        className="btn btn-outline"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          fontSize: '0.85rem',
                          padding: '0.45rem 0.9rem',
                          color: '#86EFAC',
                          borderColor: 'rgba(52, 168, 83, 0.4)',
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Direct Final Sign-Off</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDelegationActionType('request_changes')}
                      className="btn btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.85rem',
                        padding: '0.45rem 0.9rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <RotateCcw size={14} />
                      <span>Request Revisions</span>
                    </button>
                  </div>
                </div>
              )}

              {/* List of child tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {childTasksList.map((ct) => (
                  <div
                    key={ct.id}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <Link
                        href={`/tasks/${ct.id}${mockQuery}`}
                        style={{ fontSize: '0.92rem', fontWeight: 700, color: '#93C5FD', textDecoration: 'none' }}
                      >
                        {ct.title}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {ct.assignment_mode === 'broadcast' ? 'Broadcast to Committee' : `Assigned to: ${ct.assignee?.full_name || 'Member'}`} • {ct.departments?.name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          background: ct.status === 'done' ? 'rgba(52, 168, 83, 0.18)' : ct.status === 'review' ? 'rgba(251, 188, 4, 0.18)' : 'rgba(255, 255, 255, 0.08)',
                          color: ct.status === 'done' ? '#86EFAC' : ct.status === 'review' ? '#FDE047' : 'var(--text-secondary)',
                          border: ct.status === 'done' ? '1px solid rgba(52, 168, 83, 0.35)' : ct.status === 'review' ? '1px solid rgba(251, 188, 4, 0.35)' : '1px solid var(--border-subtle)',
                        }}
                      >
                        {ct.status}
                      </span>

                      <Link
                        href={`/tasks/${ct.id}${mockQuery}`}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <span>Inspect Child Task</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 1: Task Core Overview */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Top Badges */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              {/* Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  background: statusMeta.bg,
                  color: statusMeta.color,
                  border: `1px solid ${statusMeta.border}`,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                <StatusIcon size={14} />
                <span>{statusMeta.label}</span>
              </div>

              {/* Priority Badge */}
              <div
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  background: priorityMeta.bg,
                  color: priorityMeta.color,
                  border: `1px solid ${priorityMeta.border}`,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                {priorityMeta.label}
              </div>

              {/* Department Badge */}
              <div
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-secondary)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Building2 size={13} />
                <span>{task.departments?.name || 'General Committee'}</span>
              </div>
            </div>

            {/* Task Title */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {task.title}
            </h2>

            {/* Task Description */}
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {task.description || (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No additional description or technical requirements specified.
                </span>
              )}
            </div>

            {/* Deliverable / Evidence Section */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '1.2rem',
                background: 'rgba(255, 255, 255, 0.025)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link2 size={17} color="var(--google-blue)" />
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Deliverable Evidence & Artifact
                  </span>
                </div>

                {!isEditingEvidence && (
                  <button
                    onClick={() => {
                      setEvidenceInput(task.evidence_url || '');
                      setIsEditingEvidence(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--google-blue)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>{task.evidence_url ? 'Change Link' : 'Add Link'}</span>
                  </button>
                )}
              </div>

              {isEditingEvidence ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <input
                    type="url"
                    value={evidenceInput}
                    onChange={(e) => setEvidenceInput(e.target.value)}
                    placeholder="https://drive.google.com/... or https://github.com/..."
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.88rem' }}
                    autoFocus
                  />
                  {evidenceError && (
                    <span style={{ color: '#F87171', fontSize: '0.8rem' }}>{evidenceError}</span>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setIsEditingEvidence(false);
                        setEvidenceError(null);
                      }}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      disabled={isSavingEvidence}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEvidence}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.95rem' }}
                      disabled={isSavingEvidence || !evidenceInput.trim()}
                    >
                      {isSavingEvidence ? 'Saving...' : 'Save Evidence'}
                    </button>
                  </div>
                </div>
              ) : task.evidence_url ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <a
                    href={task.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.88rem',
                      color: '#93C5FD',
                      textDecoration: 'underline',
                      wordBreak: 'break-all',
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>{task.evidence_url}</span>
                  </a>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Verified Deliverable
                  </span>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No deliverable link provided yet. Submit via Google Drive, GitHub repository, or Figma link when ready for review.
                </p>
              )}
            </div>
          </div>

          {/* Card: Broadcast Submissions & Member Workspace (Spec §3.17 & §4.2 Part A) */}
          {task.assignment_mode === 'broadcast' && (
            <div
              className="glass-panel"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                background: 'rgba(19, 27, 46, 0.75)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <Radio size={16} color="#C084FC" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#C084FC', letterSpacing: '0.05em' }}>
                      Broadcast Assignment
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Committee Submissions Dashboard
                  </h3>
                  <p style={{ margin: 0, marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    All active members of <strong>{task.departments?.name || 'this committee'}</strong> have an independent submission slot.
                  </p>
                </div>

                {/* Actions and Progress pill */}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.75rem',
                      borderRadius: '999px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#D8B4FE',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                    }}
                  >
                    {assigneesList.filter((a) => a.status === 'submitted').length} / {assigneesList.length} Submitted
                  </span>

                  <Link
                    href={`/tasks/${task.id}/review-submissions${mockQuery}`}
                    className="btn btn-outline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.75rem',
                      color: '#C084FC',
                      borderColor: 'rgba(168, 85, 247, 0.4)',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Review Grid</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="btn btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.8rem',
                      padding: '0.35rem 0.85rem',
                      background: 'linear-gradient(135deg, #A855F7, #4285F4)',
                      border: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <Award size={14} />
                    <span>Consolidate & Review</span>
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${assigneesList.length > 0 ? (assigneesList.filter((a) => a.status === 'submitted').length / assigneesList.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #A855F7, #34A853)',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              {/* Personal Member Submission Box (If logged in user is one of the assignees) */}
              {myAssignment && (
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={16} color="#C084FC" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F3E8FF' }}>
                        Your Personal Deliverable Slot
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background:
                          myAssignment.status === 'submitted'
                            ? 'rgba(52, 168, 83, 0.2)'
                            : myAssignment.status === 'in_progress'
                            ? 'rgba(251, 188, 4, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                        color:
                          myAssignment.status === 'submitted'
                            ? '#86EFAC'
                            : myAssignment.status === 'in_progress'
                            ? '#FDE047'
                            : 'var(--text-secondary)',
                        border:
                          myAssignment.status === 'submitted'
                            ? '1px solid rgba(52, 168, 83, 0.4)'
                            : myAssignment.status === 'in_progress'
                            ? '1px solid rgba(251, 188, 4, 0.4)'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      {myAssignment.status === 'submitted'
                        ? 'Submitted'
                        : myAssignment.status === 'in_progress'
                        ? 'In Progress'
                        : 'To Do'}
                    </span>
                  </div>

                  {myAssignment.status === 'todo' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        You haven't started this deliverable yet. Mark it in-progress when you begin.
                      </p>
                      <button
                        onClick={handleStartPersonalTask}
                        disabled={isStartingPersonal}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                      >
                        <Play size={14} />
                        <span>{isStartingPersonal ? 'Starting...' : 'Start Working'}</span>
                      </button>
                    </div>
                  )}

                  {/* Submission Form / Display */}
                  {myAssignment.status !== 'todo' && (
                    <div>
                      {myAssignment.status === 'submitted' && !isEditingPersonalEvidence ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <a
                              href={myAssignment.evidence_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.88rem',
                                color: '#93C5FD',
                                textDecoration: 'underline',
                                wordBreak: 'break-all',
                              }}
                            >
                              <ExternalLink size={14} />
                              <span>{myAssignment.evidence_url}</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                setPersonalEvidenceInput(myAssignment.evidence_url || '');
                                setIsEditingPersonalEvidence(true);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--google-blue)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <Edit3 size={13} />
                              <span>Change Link</span>
                            </button>
                          </div>
                          {myAssignment.submitted_at && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Submitted on {new Date(myAssignment.submitted_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitPersonalEvidence} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Deliverable Link (Google Drive / GitHub PR / Figma):
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="url"
                              value={personalEvidenceInput}
                              onChange={(e) => setPersonalEvidenceInput(e.target.value)}
                              placeholder="https://drive.google.com/... or https://github.com/..."
                              className="input-field"
                              style={{ flex: 1, fontSize: '0.85rem' }}
                              required
                            />
                            <button
                              type="submit"
                              disabled={isSubmittingPersonal}
                              className="btn btn-primary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                            >
                              <Send size={14} />
                              <span>{isSubmittingPersonal ? 'Submitting...' : 'Submit'}</span>
                            </button>
                            {myAssignment.status === 'submitted' && (
                              <button
                                type="button"
                                onClick={() => setIsEditingPersonalEvidence(false)}
                                className="btn btn-outline"
                                style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Committee Members Submissions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  All Committee Member Deliverables
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {assigneesList.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No members assigned to this broadcast deliverable yet.
                    </div>
                  ) : (
                    assigneesList.map((assignee) => {
                      const isSubmitted = assignee.status === 'submitted';
                      const isInProgress = assignee.status === 'in_progress';

                      return (
                        <div
                          key={assignee.id}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: `1px solid ${isSubmitted ? 'rgba(52, 168, 83, 0.25)' : 'var(--border-subtle)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                          }}
                        >
                          {/* Member identity */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {assignee.profile?.avatar_url ? (
                              <img
                                src={assignee.profile.avatar_url}
                                alt={assignee.profile.full_name}
                                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: 'rgba(168, 85, 247, 0.2)',
                                  color: '#C084FC',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                }}
                              >
                                {assignee.profile?.full_name?.charAt(0) || 'M'}
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {assignee.profile?.full_name || 'Committee Member'}
                                {assignee.profile_id === currentUserId && (
                                  <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: '#93C5FD' }}>(You)</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {assignee.profile?.position || assignee.profile?.role?.replace('_', ' ') || 'Member'}
                              </div>
                            </div>
                          </div>

                          {/* Status & Deliverable Link */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                background: isSubmitted
                                  ? 'rgba(52, 168, 83, 0.15)'
                                  : isInProgress
                                  ? 'rgba(251, 188, 4, 0.15)'
                                  : 'rgba(255, 255, 255, 0.05)',
                                color: isSubmitted
                                  ? '#86EFAC'
                                  : isInProgress
                                  ? '#FDE047'
                                  : 'var(--text-muted)',
                                border: isSubmitted
                                  ? '1px solid rgba(52, 168, 83, 0.3)'
                                  : isInProgress
                                  ? '1px solid rgba(251, 188, 4, 0.3)'
                                  : '1px solid var(--border-subtle)',
                              }}
                            >
                              {isSubmitted ? 'Submitted' : isInProgress ? 'In Progress' : 'To Do'}
                            </span>

                            {assignee.evidence_url ? (
                              <a
                                href={assignee.evidence_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.35rem 0.75rem',
                                  fontSize: '0.78rem',
                                  color: '#93C5FD',
                                  borderColor: 'rgba(66, 133, 244, 0.4)',
                                }}
                              >
                                <ExternalLink size={12} />
                                <span>View Deliverable</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Awaiting submission
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Governance & Multi-Stage Approval Tracker */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={20} color="var(--google-yellow)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Multi-Stage Governance Pipeline
                </h3>
              </div>

              {approvalInstance && (
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  Workflow ID: {approvalInstance.id.slice(0, 8)}...
                </span>
              )}
            </div>

            {approvalInstance ? (
              <ApprovalStageTracker
                instance={approvalInstance}
                steps={approvalSteps}
                canUserApprove={canUserApprove}
                currentUserId={currentUserId}
                onActionComplete={() => {
                  router.refresh();
                }}
              />
            ) : (
              <div
                style={{
                  padding: '2rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed var(--border-subtle)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <Clock size={32} color="var(--text-muted)" style={{ opacity: 0.6 }} />
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Approval Workflow Pending Review Submission
                </h4>
                <p style={{ margin: 0, maxWidth: '480px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Once the assignee marks the task as completed and submits deliverable evidence, the Phase 4 Dynamic Escalation Engine will initialize the multi-stage review hierarchy (Committee Head → Branch Head → Presidential Sign-off).
                </p>
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="btn btn-outline"
                    style={{ marginTop: '0.5rem', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
                  >
                    Submit for Review Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 3: Discussion & Activity Thread */}
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MessageSquare size={19} color="var(--google-green)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Activity & Discussion Thread
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  background: 'rgba(15, 157, 88, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(15, 157, 88, 0.3)',
                }}
              >
                {comments.length} Comments
              </span>
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {comments.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  No comments or handover notes yet. Be the first to share an update or question!
                </div>
              ) : (
                comments.map((comment) => {
                  const isHandoverNote = comment.body.includes('Handover Notes:') || comment.body.includes('Deliverable:');
                  return (
                    <div
                      key={comment.id}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isHandoverNote ? 'rgba(66, 133, 244, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${isHandoverNote ? 'rgba(66, 133, 244, 0.25)' : 'var(--border-subtle)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {/* Author header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {comment.author?.avatar_url ? (
                            <img
                              src={comment.author.avatar_url}
                              alt={comment.author.full_name}
                              style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(66, 133, 244, 0.2)',
                                color: '#93C5FD',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {comment.author?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}

                          <div>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {comment.author?.full_name || 'Chapter Member'}
                            </span>
                            {comment.author?.role && (
                              <span
                                style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                {comment.author.role.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatTimeAgo(comment.created_at)}
                        </span>
                      </div>

                      {/* Comment Body */}
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                        {comment.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment, share an update, or request technical support..."
                rows={3}
                className="input-field"
                style={{ width: '100%', fontSize: '0.88rem', resize: 'vertical' }}
              />

              {commentError && (
                <span style={{ color: '#F87171', fontSize: '0.8rem' }}>{commentError}</span>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Visible to committee members and chapter leadership.
                </span>

                <button
                  type="submit"
                  disabled={isPostingComment || !newComment.trim()}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '0.85rem',
                    padding: '0.45rem 1rem',
                  }}
                >
                  <Send size={14} />
                  <span>{isPostingComment ? 'Posting...' : 'Post Comment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Assignee, Creator, Timeline & Metadata */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Card: Assignee Details */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {task.assignment_mode === 'broadcast' ? 'Broadcast Recipients' : 'Assigned Member'}
            </div>

            {task.assignment_mode === 'broadcast' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'rgba(168, 85, 247, 0.2)',
                    color: '#C084FC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={22} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {task.departments?.name || 'Committee'} Members
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#D8B4FE' }}>
                    {assigneesList.length} members assigned
                  </span>
                </div>
              </div>
            ) : task.assignee ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {task.assignee.avatar_url ? (
                  <img
                    src={task.assignee.avatar_url}
                    alt={task.assignee.full_name}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(66, 133, 244, 0.2)',
                      color: '#93C5FD',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                    }}
                  >
                    {task.assignee.full_name.charAt(0)}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {task.assignee.full_name}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {task.assignee.position || task.assignee.role?.replace('_', ' ') || 'Chapter Member'}
                  </span>
                  {task.assignee.email && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {task.assignee.email}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <User size={18} />
                <span>Currently unassigned</span>
              </div>
            )}
          </div>

          {/* Card: Task Timeline & Governance Specs */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              Governance Timeline
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              {/* Deadline */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Calendar size={14} />
                  <span>Target Deadline</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(task.deadline)}
                </span>
              </div>

              {/* Add deadline to personal Google Calendar (Spec §4.17 Step 14.4) */}
              {task.deadline && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <AddToCalendarButton
                    taskTitle={task.title}
                    deadline={task.deadline}
                    description={task.description || undefined}
                    variant="link"
                  />
                </div>
              )}

              {/* Created Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Clock size={14} />
                  <span>Created At</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(task.created_at)}
                </span>
              </div>

              {/* Created By */}
              {task.creator && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <User size={14} />
                    <span>Created By</span>
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {task.creator.full_name}
                  </span>
                </div>
              )}

              {/* Approval Engine State */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Approval Status</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: approvalInstance?.status === 'approved' ? '#34D399' : approvalInstance?.status === 'in_progress' ? '#FBBF24' : 'var(--text-muted)',
                  }}
                >
                  {approvalInstance ? approvalInstance.status.replace('_', ' ').toUpperCase() : 'NOT SUBMITTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Help & Guidelines */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              background: 'rgba(66, 133, 244, 0.05)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#93C5FD', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sparkles size={15} />
              <span>Escalation Protocol</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Task sign-off moves sequentially from Committee Head to Branch Head to Chapter Presidential Command. Approvers can request modifications with detailed notes at any stage.
            </p>
          </div>

        </div>

      </div>

      {/* Submit For Review Modal */}
      {showSubmitModal && (
        <SubmitForReviewModal
          task={task as any}
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          onSuccess={() => {
            setShowSubmitModal(false);
            setBannerNotice({ type: 'success', text: 'Task successfully submitted for multi-stage governance review!' });
            router.refresh();
          }}
        />
      )}

      {/* Review Broadcast Submissions Modal */}
      {showReviewModal && (
        <ReviewBroadcastSubmissionsModal
          task={task}
          assignees={assigneesList}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={(updatedTask) => {
            setShowReviewModal(false);
            if (updatedTask) {
              setTask((prev) => ({ ...prev, ...updatedTask }));
            }
            setBannerNotice({
              type: 'success',
              text: 'Broadcast submissions consolidated! Task has been moved to Review in the approval engine.',
            });
            router.refresh();
          }}
          mockRole={mockRole}
        />
      )}

      {/* Delegate Task Modal (Spec §4.2 Part B) */}
      {showDelegateModal && (
        <DelegateTaskModal
          task={task}
          isOpen={showDelegateModal}
          onClose={() => setShowDelegateModal(false)}
          onSuccess={(childTask, updatedParentTask) => {
            setShowDelegateModal(false);
            if (updatedParentTask) {
              setTask((prev) => ({ ...prev, ...updatedParentTask, status: 'delegated' }));
            }
            if (childTask) {
              setChildTasksList((prev) => [childTask, ...prev]);
            }
            setBannerNotice({
              type: 'success',
              text: `Task successfully delegated! Child task created: "${childTask?.title || 'Delegated task'}"`,
            });
            router.refresh();
          }}
          mockRole={mockRole}
          currentUserId={currentUserId}
        />
      )}

      {/* Delegation Action Confirmation & Notes Modal */}
      {delegationActionType && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 8, 15, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setDelegationActionType(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              background: 'rgba(19, 27, 46, 0.95)',
              border: `1px solid ${
                delegationActionType === 'final_signoff'
                  ? 'rgba(52, 168, 83, 0.4)'
                  : delegationActionType === 'approve_upward'
                  ? 'rgba(168, 85, 247, 0.4)'
                  : 'rgba(234, 67, 53, 0.4)'
              }`,
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {delegationActionType === 'final_signoff'
                    ? '🎉 Executive Final Sign-Off'
                    : delegationActionType === 'approve_upward'
                    ? '🚀 Approve & Submit Upward'
                    : '🔄 Request Revisions'}
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {delegationActionType === 'final_signoff'
                    ? 'Grant chapter executive approval and officially close this deliverable and all downstream tasks as Done.'
                    : delegationActionType === 'approve_upward'
                    ? 'Endorse this deliverable and advance the parent task into Review for higher chapter leadership sign-off.'
                    : 'Return the deliverable back to the child task assignee with requested improvements.'}
                </p>
              </div>
              <button
                onClick={() => setDelegationActionType(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Review Notes & Feedback (Optional):
              </label>
              <textarea
                value={delegationActionNotes}
                onChange={(e) => setDelegationActionNotes(e.target.value)}
                placeholder={
                  delegationActionType === 'request_changes'
                    ? 'Detail what needs to be improved or corrected...'
                    : 'Add any remarks or praise for the team...'
                }
                rows={4}
                className="input-field"
                style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDelegationActionType(null)}
                disabled={isActingOnDelegation}
                className="btn btn-outline"
                style={{ fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelegationAction}
                disabled={isActingOnDelegation}
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.45rem 1.25rem',
                  background:
                    delegationActionType === 'final_signoff'
                      ? 'linear-gradient(135deg, #34A853, #0F9D58)'
                      : delegationActionType === 'approve_upward'
                      ? 'linear-gradient(135deg, #A855F7, #4285F4)'
                      : 'linear-gradient(135deg, #EA4335, #C5221F)',
                  border: 'none',
                  fontWeight: 700,
                }}
              >
                {isActingOnDelegation
                  ? 'Processing...'
                  : delegationActionType === 'final_signoff'
                  ? 'Confirm Final Sign-Off'
                  : delegationActionType === 'approve_upward'
                  ? 'Confirm & Submit Upward'
                  : 'Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
