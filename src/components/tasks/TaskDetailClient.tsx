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
  AlertTriangle
} from 'lucide-react';
import { 
  ApprovalStageTracker, 
  ApprovalInstanceData, 
  ApprovalStepItem 
} from '@/components/approvals/ApprovalStageTracker';
import { SubmitForReviewModal } from '@/components/tasks/SubmitForReviewModal';
import { TaskStatus, TaskPriority, UserRole, TaskAssignmentMode } from '@/types';

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
  mockRole?: string | null;
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
  mockRole,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskDetailData>(initialTask);
  const [comments, setComments] = useState<TaskCommentItem[]>(initialComments);
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

  // Action status state
  const [actionLoading, setActionLoading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              Assigned Member
            </div>

            {task.assignee ? (
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
    </div>
  );
}
