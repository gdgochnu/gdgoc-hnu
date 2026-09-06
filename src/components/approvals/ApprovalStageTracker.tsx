'use client';

import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  UserCheck, 
  ShieldAlert, 
  Send, 
  CornerDownRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  ApproverRule, 
  ApprovalStepStatus, 
  ApprovalInstanceStatus, 
  ApprovalWorkflowType 
} from '@/types';

export interface ApprovalStepItem {
  id: string;
  step_order: number;
  approver_rule: ApproverRule;
  status: ApprovalStepStatus;
  notes?: string | null;
  acted_at?: string | null;
  resolved_approver_id?: string | null;
  resolved_approver?: {
    full_name: string;
    avatar_url?: string | null;
    role?: string;
    position?: string | null;
  } | null;
}

export interface ApprovalInstanceData {
  id: string;
  workflow_type: ApprovalWorkflowType;
  current_step: number;
  status: ApprovalInstanceStatus;
  created_at: string;
  resolved_at?: string | null;
}

export interface ApprovalStageTrackerProps {
  instance: ApprovalInstanceData;
  steps: ApprovalStepItem[];
  canUserApprove: boolean;
  currentUserId?: string;
  onActionComplete?: () => void;
}

export function ApprovalStageTracker({
  instance,
  steps,
  canUserApprove,
  currentUserId,
  onActionComplete,
}: ApprovalStageTrackerProps) {
  const [localInstance, setLocalInstance] = useState<ApprovalInstanceData>(instance);
  const [localSteps, setLocalSteps] = useState<ApprovalStepItem[]>(steps);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<'approved' | 'rejected' | 'changes_requested' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const activeStep = localSteps.find((s) => s.step_order === localInstance.current_step);
  const isWorkflowActive = localInstance.status === 'in_progress';

  const formatRuleName = (rule: ApproverRule) => {
    switch (rule) {
      case 'committee_head':
        return 'Committee Head Review';
      case 'branch_head':
        return 'Branch Head Review';
      case 'president_or_co_president':
        return 'Presidential Sign-off';
      default:
        return rule;
    }
  };

  const formatRuleDesc = (rule: ApproverRule) => {
    switch (rule) {
      case 'committee_head':
        return 'Validation of quality, technical accuracy, and deliverables by Committee Leadership.';
      case 'branch_head':
        return 'Cross-committee alignment and branch-wide KPI sign-off by Branch Head.';
      case 'president_or_co_president':
        return 'Final chapter executive governance and command center confirmation.';
      default:
        return '';
    }
  };

  const getStatusBadge = (status: ApprovalStepStatus | ApprovalInstanceStatus) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          bg: 'rgba(52, 168, 83, 0.15)',
          color: '#4ADE80',
          border: 'rgba(52, 168, 83, 0.3)',
          icon: CheckCircle2,
        };
      case 'rejected':
        return {
          label: 'Rejected',
          bg: 'rgba(234, 67, 53, 0.15)',
          color: '#F87171',
          border: 'rgba(234, 67, 53, 0.3)',
          icon: XCircle,
        };
      case 'changes_requested':
        return {
          label: 'Changes Requested',
          bg: 'rgba(251, 188, 4, 0.15)',
          color: '#FDE047',
          border: 'rgba(251, 188, 4, 0.3)',
          icon: AlertTriangle,
        };
      case 'in_progress':
      case 'pending':
      default:
        return {
          label: 'In Review',
          bg: 'rgba(66, 133, 244, 0.15)',
          color: '#93C5FD',
          border: 'rgba(66, 133, 244, 0.3)',
          icon: Clock,
        };
    }
  };

  const handleAction = async (action: 'approved' | 'rejected' | 'changes_requested') => {
    if (!activeStep) return;

    if ((action === 'rejected' || action === 'changes_requested') && !notes.trim()) {
      setActionError('Feedback notes are required when requesting changes or rejecting.');
      return;
    }

    try {
      setIsSubmitting(true);
      setActiveAction(action);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch('/api/approvals/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: localInstance.id,
          stepOrder: activeStep.step_order,
          action,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review action');
      }

      // Update local state smoothly
      if (data.result) {
        setLocalInstance(data.result.instance);
        setLocalSteps((prev) =>
          prev.map((s) => (s.id === data.result.step.id ? { ...s, ...data.result.step } : s))
        );
      }

      setActionSuccess(
        action === 'approved'
          ? 'Approval registered successfully! Workflow advanced.'
          : action === 'changes_requested'
          ? 'Changes requested. The submitter has been notified.'
          : 'Submission rejected and returned to submitter.'
      );
      setNotes('');

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err: any) {
      setActionError(err.message || 'Error executing action');
    } finally {
      setIsSubmitting(false);
      setActiveAction(null);
    }
  };

  const overallBadge = getStatusBadge(localInstance.status);
  const OverallIcon = overallBadge.icon;

  return (
    <div
      className="glass-panel"
      style={{
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
      }}
    >
      {/* Header: Workflow Stage Tracker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--google-blue)' }}>
              Multi-Stage Escalation Chain
            </span>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {localInstance.workflow_type.replace('_', ' ')}
            </span>
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
            Approval & Governance Pipeline
          </h3>
        </div>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            borderRadius: '999px',
            background: overallBadge.bg,
            border: `1px solid ${overallBadge.border}`,
            color: overallBadge.color,
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          <OverallIcon size={16} />
          <span>{overallBadge.label}</span>
          {isWorkflowActive && (
            <span style={{ opacity: 0.8, fontSize: '0.8rem' }}>
              (Stage {localInstance.current_step} of {localSteps.length})
            </span>
          )}
        </div>
      </div>

      {/* Stepper Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
        {localSteps.map((step, idx) => {
          const isCompleted = step.status === 'approved';
          const isRejected = step.status === 'rejected';
          const isChanges = step.status === 'changes_requested';
          const isCurrent = isWorkflowActive && step.step_order === localInstance.current_step;
          const isUpcoming = isWorkflowActive && step.step_order > localInstance.current_step;

          const stepBadge = getStatusBadge(step.status);

          let nodeBg = 'rgba(255, 255, 255, 0.05)';
          let nodeColor = 'var(--text-muted)';
          let nodeBorder = 'var(--border-subtle)';

          if (isCompleted) {
            nodeBg = 'rgba(52, 168, 83, 0.2)';
            nodeColor = '#4ADE80';
            nodeBorder = 'rgba(52, 168, 83, 0.4)';
          } else if (isCurrent) {
            nodeBg = 'rgba(66, 133, 244, 0.2)';
            nodeColor = '#60A5FA';
            nodeBorder = 'var(--google-blue)';
          } else if (isChanges) {
            nodeBg = 'rgba(251, 188, 4, 0.2)';
            nodeColor = '#FDE047';
            nodeBorder = 'rgba(251, 188, 4, 0.4)';
          } else if (isRejected) {
            nodeBg = 'rgba(234, 67, 53, 0.2)';
            nodeColor = '#F87171';
            nodeBorder = 'rgba(234, 67, 53, 0.4)';
          }

          return (
            <div
              key={step.id || idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1.25rem',
                position: 'relative',
              }}
            >
              {/* Vertical connector line */}
              {idx < localSteps.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '36px',
                    left: '17px',
                    bottom: '-20px',
                    width: '2px',
                    background: isCompleted ? 'rgba(52, 168, 83, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                    zIndex: 1,
                  }}
                />
              )}

              {/* Node Indicator */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: nodeBg,
                  border: `2px solid ${nodeBorder}`,
                  color: nodeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0,
                  zIndex: 2,
                  boxShadow: isCurrent ? '0 0 14px rgba(66, 133, 244, 0.4)' : 'none',
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 size={18} />
                ) : isRejected ? (
                  <XCircle size={18} />
                ) : isChanges ? (
                  <AlertTriangle size={18} />
                ) : (
                  <span>{step.step_order}</span>
                )}
              </div>

              {/* Step Details Box */}
              <div
                style={{
                  flex: 1,
                  background: isCurrent ? 'rgba(66, 133, 244, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isCurrent ? 'rgba(66, 133, 244, 0.25)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem 1.3rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                      Stage {step.step_order}: {formatRuleName(step.approver_rule)}
                    </span>
                    {isCurrent && (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.2)', color: '#93C5FD', fontWeight: 800 }}>
                        Active
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: stepBadge.bg,
                      color: stepBadge.color,
                      border: `1px solid ${stepBadge.border}`,
                    }}
                  >
                    {stepBadge.label}
                  </span>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                  {formatRuleDesc(step.approver_rule)}
                </p>

                {/* Approver history info */}
                {step.resolved_approver && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <UserCheck size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reviewed by: <strong style={{ color: 'var(--text-primary)' }}>{step.resolved_approver.full_name}</strong>
                    </span>
                    {step.acted_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        • {new Date(step.acted_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Feedback Notes */}
                {step.notes && (
                  <div
                    style={{
                      marginTop: '0.6rem',
                      padding: '0.6rem 0.9rem',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${stepBadge.color}`,
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                    }}
                  >
                    "{step.notes}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Action Console (Displayed for authorized reviewer) */}
      {isWorkflowActive && canUserApprove && activeStep && (
        <div
          style={{
            marginTop: '0.5rem',
            padding: '1.5rem',
            background: 'rgba(19, 27, 46, 0.85)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="var(--google-blue)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Action Required: Review Stage {activeStep.step_order} ({formatRuleName(activeStep.approver_rule)})
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0 }}>
            You have governance authority to evaluate this submission. Choose to approve and forward to the next stage, request adjustments, or reject.
          </p>

          <textarea
            className="input-field"
            placeholder="Add reviewer notes, requirements, or congratulatory remarks (required for changes/rejection)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />

          {actionError && (
            <div
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#FCA5A5',
                fontSize: '0.84rem',
              }}
            >
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div
              style={{
                padding: '0.6rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                color: '#86EFAC',
                fontSize: '0.84rem',
              }}
            >
              {actionSuccess}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <button
              onClick={() => handleAction('approved')}
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                background: '#34A853',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting && activeAction === 'approved' ? 'Approving...' : 'Approve & Forward'}</span>
            </button>

            <button
              onClick={() => handleAction('changes_requested')}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{
                borderColor: 'rgba(251, 188, 4, 0.4)',
                color: '#FDE047',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <AlertTriangle size={16} />
              <span>{isSubmitting && activeAction === 'changes_requested' ? 'Requesting...' : 'Request Changes'}</span>
            </button>

            <button
              onClick={() => handleAction('rejected')}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{
                borderColor: 'rgba(234, 67, 53, 0.4)',
                color: '#F87171',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <XCircle size={16} />
              <span>{isSubmitting && activeAction === 'rejected' ? 'Rejecting...' : 'Reject'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Non-approver informational message */}
      {isWorkflowActive && !canUserApprove && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
          }}
        >
          <Clock size={16} color="var(--google-blue)" />
          <span>
            Waiting for review by {activeStep ? formatRuleName(activeStep.approver_rule) : 'designated leadership'}.
          </span>
        </div>
      )}
    </div>
  );
}
