'use client';

import { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Send, 
  Award, 
  FileText, 
  AlertCircle, 
  Check, 
  Radio, 
  Users,
  Clock
} from 'lucide-react';
import { TaskAssigneeItem, TaskDetailData } from './TaskDetailClient';

interface ReviewBroadcastSubmissionsModalProps {
  task: TaskDetailData;
  assignees: TaskAssigneeItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTask: any, approvalInstance: any) => void;
  mockRole?: string | null;
}

export function ReviewBroadcastSubmissionsModal({
  task,
  assignees,
  isOpen,
  onClose,
  onSuccess,
  mockRole,
}: ReviewBroadcastSubmissionsModalProps) {
  const submittedAssignees = assignees.filter((a) => a.status === 'submitted' && a.evidence_url);
  const pendingAssignees = assignees.filter((a) => a.status !== 'submitted' || !a.evidence_url);

  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    submittedAssignees[0]?.profile_id || null
  );
  const [consolidatedUrl, setConsolidatedUrl] = useState<string>(
    task.evidence_url || submittedAssignees[0]?.evidence_url || ''
  );
  const [consolidationNotes, setConsolidationNotes] = useState<string>(
    submittedAssignees.length > 0
      ? `Consolidated deliverable for committee broadcast task "${task.title}". Selected submission from ${submittedAssignees[0]?.profile?.full_name || 'committee member'}.`
      : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectBest = (assignee: TaskAssigneeItem) => {
    setSelectedAssigneeId(assignee.profile_id);
    if (assignee.evidence_url) {
      setConsolidatedUrl(assignee.evidence_url);
    }
    const memberName = assignee.profile?.full_name || 'committee member';
    setConsolidationNotes(
      `Selected best deliverable submitted by ${memberName} for "${task.title}". Verified and consolidated for multi-stage approval.`
    );
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consolidatedUrl.trim()) {
      setErrorMsg('Please provide or select a consolidated deliverable evidence link.');
      return;
    }

    try {
      new URL(consolidatedUrl.trim());
    } catch {
      setErrorMsg('Invalid URL format. Must start with http:// or https://');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const mockQuery = mockRole ? `?mock=${mockRole}` : '';
      const res = await fetch(`/api/tasks/${task.id}/submit-review${mockQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_url: consolidatedUrl.trim(),
          notes: consolidationNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to consolidate and move task to review');
      }

      onSuccess(data.task, data.instance);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting consolidated deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '920px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem',
          background: 'rgba(19, 27, 46, 0.96)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(168, 85, 247, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Radio size={16} color="#C084FC" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C084FC' }}>
                Broadcast Submissions Review (Spec §4.2 Part A)
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Review Submissions & Consolidate Deliverable
            </h2>
            <p style={{ margin: 0, marginTop: '0.35rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Compare all member attempts side-by-side, choose the best deliverable (or consolidate), and submit the task into the multi-stage review pipeline.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(234, 67, 53, 0.15)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Side-by-side Submissions Grid */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Member Deliverables ({submittedAssignees.length} submitted / {assignees.length} total)
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Click "Select as Best" to auto-populate the final consolidation
            </span>
          </div>

          {submittedAssignees.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
              }}
            >
              No committee members have submitted deliverables yet. You can still manually input consolidated evidence below when ready.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1rem',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '0.35rem',
              }}
            >
              {submittedAssignees.map((assignee) => {
                const isSelected = selectedAssigneeId === assignee.profile_id;

                return (
                  <div
                    key={assignee.id}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: `2px solid ${isSelected ? '#A855F7' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'var(--transition-smooth)',
                    }}
                  >
                    {/* Member info */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {assignee.profile?.avatar_url ? (
                          <img
                            src={assignee.profile.avatar_url}
                            alt={assignee.profile.full_name}
                            style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              background: 'rgba(168, 85, 247, 0.25)',
                              color: '#C084FC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {assignee.profile?.full_name?.charAt(0) || 'M'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {assignee.profile?.full_name || 'Committee Member'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {assignee.profile?.position || assignee.profile?.role?.replace('_', ' ') || 'Member'}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            background: 'rgba(168, 85, 247, 0.3)',
                            color: '#F3E8FF',
                            border: '1px solid #A855F7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <Check size={10} /> Selected
                        </span>
                      )}
                    </div>

                    {/* Evidence Link */}
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <a
                        href={assignee.evidence_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.8rem',
                          color: '#93C5FD',
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>{assignee.evidence_url}</span>
                      </a>
                    </div>

                    {/* Submission metadata & Select button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {assignee.submitted_at
                          ? new Date(assignee.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'Submitted'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleSelectBest(assignee)}
                        style={{
                          background: isSelected ? '#A855F7' : 'rgba(255, 255, 255, 0.06)',
                          border: `1px solid ${isSelected ? '#A855F7' : 'var(--border-subtle)'}`,
                          color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          transition: 'var(--transition-smooth)',
                        }}
                      >
                        <Award size={12} />
                        <span>{isSelected ? 'Selected as Best' : 'Select as Best'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pendingAssignees.length > 0 && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ⏳ Still awaiting submission from: {pendingAssignees.map((p) => p.profile?.full_name || 'Member').join(', ')}
            </div>
          )}
        </div>

        {/* Section 2: Consolidation Form */}
        <form
          onSubmit={handleSubmitReview}
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="var(--google-blue)" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Final Consolidated Deliverable & Synthesis
            </h4>
          </div>

          {/* Consolidated Evidence URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Final Deliverable Link <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="url"
              className="input-field"
              value={consolidatedUrl}
              onChange={(e) => setConsolidatedUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://github.com/..."
              required
            />
          </div>

          {/* Synthesis / Handover Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Consolidation Summary & Review Notes
            </label>
            <textarea
              className="input-field"
              rows={3}
              value={consolidationNotes}
              onChange={(e) => setConsolidationNotes(e.target.value)}
              placeholder="Explain why this deliverable was selected or summarize how member inputs were merged..."
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-outline"
              style={{ fontSize: '0.88rem', padding: '0.6rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !consolidatedUrl.trim()}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.88rem',
                padding: '0.6rem 1.5rem',
                background: 'linear-gradient(135deg, #A855F7, #4285F4)',
                border: 'none',
              }}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Submitting to Review...' : 'Consolidate & Move to Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
