'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Award,
  ExternalLink,
  Send,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Check,
  Radio,
  Users,
  ShieldCheck,
  Copy,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { TaskDetailData, TaskAssigneeItem } from '@/components/tasks/TaskDetailClient';

interface ReviewSubmissionsClientProps {
  task: TaskDetailData;
  assignees: TaskAssigneeItem[];
  mockRole?: string | null;
}

export function ReviewSubmissionsClient({
  task,
  assignees,
  mockRole,
}: ReviewSubmissionsClientProps) {
  const router = useRouter();
  const mockQuery = mockRole ? `?mock=${mockRole}` : '';

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
      ? `Consolidated deliverable for broadcast task "${task.title}". Selected submission from ${submittedAssignees[0]?.profile?.full_name || 'committee member'}.`
      : ''
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleSelectBest = (assignee: TaskAssigneeItem) => {
    setSelectedAssigneeId(assignee.profile_id);
    if (assignee.evidence_url) {
      setConsolidatedUrl(assignee.evidence_url);
    }
    const memberName = assignee.profile?.full_name || 'committee member';
    setConsolidationNotes(
      `Consolidated deliverable for broadcast task "${task.title}". Selected submission from ${memberName}. Verified and consolidated for governance approval.`
    );
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleSubmitConsolidation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consolidatedUrl.trim()) {
      setErrorMsg('Please enter or select a deliverable evidence URL.');
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
        throw new Error(data.error || 'Failed to submit consolidated deliverable for review');
      }

      setSuccessMsg('Consolidated deliverable successfully submitted! Moving to task view...');
      setTimeout(() => {
        router.push(`/tasks/${task.id}${mockQuery}`);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error consolidating deliverable');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Stat Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C084FC',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Assigned
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {assignees.length} Members
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(52, 168, 83, 0.3)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34A853',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Submissions Ready
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34A853' }}>
              {submittedAssignees.length} / {assignees.length}
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(251, 188, 4, 0.3)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(251, 188, 4, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBC04',
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Submissions
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FBBC04' }}>
              {pendingAssignees.length} Members
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            border: '1px solid rgba(66, 133, 244, 0.3)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-blue)',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Target Pipeline
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              3-Stage Gate
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banners */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(234, 67, 53, 0.15)',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            color: '#FCA5A5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            color: '#86EFAC',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of All Member Deliverables */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Member Deliverables Comparison
            </h2>
            <p style={{ margin: 0, marginTop: '0.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Inspect deliverables submitted by each assigned member. Click <strong>"Select as Best"</strong> on the preferred version to populate the consolidation form.
            </p>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {assignees.length} member slots
          </span>
        </div>

        {assignees.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            No assignees registered for this broadcast task yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {assignees.map((assignee) => {
              const isSubmitted = assignee.status === 'submitted' && !!assignee.evidence_url;
              const isSelected = selectedAssigneeId === assignee.profile_id && isSubmitted;

              return (
                <div
                  key={assignee.id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected
                      ? 'rgba(168, 85, 247, 0.12)'
                      : isSubmitted
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(255, 255, 255, 0.015)',
                    border: `2px solid ${
                      isSelected
                        ? '#A855F7'
                        : isSubmitted
                        ? 'rgba(168, 85, 247, 0.3)'
                        : 'var(--border-subtle)'
                    }`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    position: 'relative',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  {/* Top Bar: Member info & Selection status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {assignee.profile?.avatar_url ? (
                        <img
                          src={assignee.profile.avatar_url}
                          alt={assignee.profile.full_name}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: 'rgba(168, 85, 247, 0.25)',
                            color: '#C084FC',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.9rem',
                            fontWeight: 800,
                          }}
                        >
                          {assignee.profile?.full_name?.charAt(0) || 'M'}
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {assignee.profile?.full_name || 'Committee Member'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {assignee.profile?.position || assignee.profile?.role?.replace('_', ' ') || 'Member'}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: isSubmitted
                          ? 'rgba(52, 168, 83, 0.18)'
                          : assignee.status === 'in_progress'
                          ? 'rgba(251, 188, 4, 0.18)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: isSubmitted
                          ? '#86EFAC'
                          : assignee.status === 'in_progress'
                          ? '#FDE047'
                          : 'var(--text-muted)',
                        border: isSubmitted
                          ? '1px solid rgba(52, 168, 83, 0.35)'
                          : assignee.status === 'in_progress'
                          ? '1px solid rgba(251, 188, 4, 0.35)'
                          : '1px solid var(--border-subtle)',
                      }}
                    >
                      {isSubmitted ? 'Submitted' : assignee.status === 'in_progress' ? 'In Progress' : 'To Do'}
                    </span>
                  </div>

                  {/* Deliverable Link Display */}
                  {isSubmitted && assignee.evidence_url ? (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <a
                        href={assignee.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.85rem',
                          color: '#93C5FD',
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>{assignee.evidence_url}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(assignee.evidence_url!)}
                        title="Copy URL"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: copiedUrl === assignee.evidence_url ? '#34D399' : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                        }}
                      >
                        {copiedUrl === assignee.evidence_url ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed var(--border-subtle)',
                        fontSize: '0.82rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No deliverable evidence submitted yet.
                    </div>
                  )}

                  {/* Submission date & Select as Best Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {assignee.submitted_at
                        ? `Submitted ${new Date(assignee.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Awaiting submission'}
                    </span>

                    {isSubmitted && (
                      <button
                        type="button"
                        onClick={() => handleSelectBest(assignee)}
                        style={{
                          background: isSelected ? '#A855F7' : 'rgba(255, 255, 255, 0.08)',
                          border: `1px solid ${isSelected ? '#A855F7' : 'var(--border-subtle)'}`,
                          color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.4rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'var(--transition-smooth)',
                        }}
                      >
                        <Award size={14} />
                        <span>{isSelected ? 'Selected as Best' : 'Select as Best'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consolidation Form & Governance Submission */}
      <form
        onSubmit={handleSubmitConsolidation}
        className="glass-panel"
        style={{
          padding: '2rem',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          background: 'rgba(19, 27, 46, 0.9)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(168, 85, 247, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={20} color="#C084FC" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Consolidated Chapter Deliverable & Approval Submission
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Specify the consolidated master deliverable for this task. Once submitted, the task status will update to <strong>In Review</strong> and advance to the chapter approval engine.
        </p>

        {/* Consolidated Link */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Final Consolidated Deliverable Link <span style={{ color: 'var(--google-red)' }}>*</span>
          </label>
          <input
            type="url"
            value={consolidatedUrl}
            onChange={(e) => setConsolidatedUrl(e.target.value)}
            placeholder="https://drive.google.com/... or https://github.com/..."
            className="input-field"
            style={{ width: '100%', fontSize: '0.9rem' }}
            required
          />
          <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Can be chosen via "Select as Best" from member cards above, or custom combined Google Drive / PR link.
          </span>
        </div>

        {/* Synthesis Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Consolidation Summary & Synthesis Notes
          </label>
          <textarea
            value={consolidationNotes}
            onChange={(e) => setConsolidationNotes(e.target.value)}
            placeholder="Document why this deliverable was chosen, or provide notes for the approvers..."
            className="input-field"
            rows={4}
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Link
            href={`/tasks/${task.id}${mockQuery}`}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Cancel & Return</span>
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !consolidatedUrl.trim()}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              padding: '0.65rem 1.75rem',
              background: 'linear-gradient(135deg, #A855F7, #4285F4)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
            }}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Submitting to Review Pipeline...' : 'Consolidate & Move to Review'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
