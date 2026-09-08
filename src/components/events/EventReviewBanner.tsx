'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitEventForReview, publishEvent, completeEvent, closeEvent } from '@/app/events/actions';
import { Event, EventStatus } from '@/types';
import Link from 'next/link';
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Globe,
  Copy,
  Check,
  Archive
} from 'lucide-react';

interface EventReviewBannerProps {
  event: Event;
  canManage: boolean;
  approvalInstance?: any;
}

export function EventReviewBanner({ event, canManage, approvalInstance }: EventReviewBannerProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishSuccessMsg, setPublishSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmitReview = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await submitEventForReview(event.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to submit event for review.');
      } else {
        setShowConfirmModal(false);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error submitting event for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    setErrorMsg(null);
    setIsPublishing(true);
    try {
      const res = await publishEvent(event.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to publish event.');
      } else {
        setShowPublishModal(false);
        setPublishSuccessMsg('Event successfully published to the public portal!');
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error publishing event.');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyPublicLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const fullUrl = `${origin}/events/${event.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleComplete = async () => {
    setErrorMsg(null);
    setIsCompleting(true);
    try {
      const res = await completeEvent({
        eventId: event.id,
        notes: completionNotes.trim() || undefined,
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to mark event as completed.');
      } else {
        setShowCompleteModal(false);
        setPublishSuccessMsg('Event has been marked as completed successfully!');
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error completing event.');
    } finally {
      setIsCompleting(false);
    }
  };

  const isDraftOrRejected = event.status === 'draft' || event.status === 'rejected';
  const isInReview = ['submitted_for_review', 'branch_review', 'pending_final_approval'].includes(event.status);
  const isApproved = event.status === 'approved';
  const isPublished = event.status === 'published';
  const isClosed = event.status === 'closed';
  const isCompleted = event.status === 'completed';

  if (!isDraftOrRejected && !isInReview && !isApproved && !isPublished && !isClosed && !isCompleted) {
    return null;
  }

  return (
    <>
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.75rem',
          borderRadius: '16px',
          border: isDraftOrRejected
            ? '1px solid rgba(251, 188, 4, 0.3)'
            : isInReview
            ? '1px solid rgba(66, 133, 244, 0.3)'
            : isApproved
            ? '1px solid rgba(52, 168, 83, 0.4)'
            : isPublished
            ? '1px solid rgba(52, 168, 83, 0.5)'
            : isClosed
            ? '1px solid rgba(251, 188, 4, 0.4)'
            : '1px solid rgba(168, 85, 247, 0.4)',
          background: isDraftOrRejected
            ? 'linear-gradient(135deg, rgba(251, 188, 4, 0.06), rgba(0, 0, 0, 0.4))'
            : isInReview
            ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.08), rgba(0, 0, 0, 0.4))'
            : isApproved
            ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.12), rgba(0, 0, 0, 0.4))'
            : isPublished
            ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.15), rgba(0, 0, 0, 0.5))'
            : isClosed
            ? 'linear-gradient(135deg, rgba(251, 188, 4, 0.1), rgba(0, 0, 0, 0.5))'
            : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(0, 0, 0, 0.5))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
        suppressHydrationWarning
      >
        {/* Left Side: Status Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: isDraftOrRejected
              ? 'rgba(251, 188, 4, 0.15)'
              : isInReview
              ? 'rgba(66, 133, 244, 0.15)'
              : isApproved
              ? 'rgba(52, 168, 83, 0.2)'
              : isPublished
              ? 'rgba(52, 168, 83, 0.25)'
              : isClosed
              ? 'rgba(251, 188, 4, 0.2)'
              : 'rgba(168, 85, 247, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {isDraftOrRejected ? (
              <Clock size={22} color="var(--google-yellow)" />
            ) : isInReview ? (
              <ShieldCheck size={22} color="var(--google-blue)" />
            ) : isApproved ? (
              <Sparkles size={22} color="var(--google-green)" />
            ) : isPublished ? (
              <Globe size={22} color="var(--google-green)" />
            ) : isClosed ? (
              <Clock size={22} color="var(--google-yellow)" />
            ) : (
              <CheckCircle2 size={22} color="#D8B4FE" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                {isDraftOrRejected
                  ? event.status === 'rejected' ? 'Event Revision Required' : 'Event Draft Ready for Review'
                  : isInReview
                  ? 'Event Under Executive Review'
                  : isApproved
                  ? 'Event Approved — Ready to Publish (Step 8.6)'
                  : isPublished
                  ? 'Event is Live on Public Portal'
                  : isClosed
                  ? 'Event Registrations Closed'
                  : 'Event Concluded & Completed (Step 8.11)'}
              </h4>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                background: isDraftOrRejected
                  ? 'rgba(251, 188, 4, 0.2)'
                  : isInReview
                  ? 'rgba(66, 133, 244, 0.2)'
                  : isPublished || isApproved
                  ? 'rgba(52, 168, 83, 0.25)'
                  : isClosed
                  ? 'rgba(251, 188, 4, 0.25)'
                  : 'rgba(168, 85, 247, 0.25)',
                color: isDraftOrRejected
                  ? '#FDE047'
                  : isInReview
                  ? '#93C5FD'
                  : isPublished || isApproved
                  ? '#86EFAC'
                  : isClosed
                  ? '#FDE047'
                  : '#D8B4FE',
                letterSpacing: '0.04em',
              }}>
                {event.status === 'draft' ? 'Draft' : event.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              {isDraftOrRejected ? (
                'Review details, tasks, and registration questions. Submit to trigger the 2-stage approval chain (Branch Head → President/Co-President).'
              ) : isInReview ? (
                `Currently in approval engine workflow. ${
                  event.status === 'branch_review' 
                    ? 'Stage 1: Awaiting Branch Head approval.' 
                    : 'Stage 2: Awaiting President / Co-President sign-off.'
                }`
              ) : isApproved ? (
                'Executive approvals completed! The Publish action is now unlocked (Spec §4.3 item 3).'
              ) : isPublished ? (
                `Accepting attendee registrations at /events/${event.slug}. Share this link on official channels.`
              ) : isClosed ? (
                'Public registration has closed. Check-in operations are active or ready to mark as completed.'
              ) : (
                'Event lifecycle has concluded. Attendance records finalized, feedback survey unlocked, and certificates ready to issue.'
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isDraftOrRejected && canManage && (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.2rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--google-blue), #2B6CB0)',
              }}
            >
              <Send size={15} />
              Submit for Review
            </button>
          )}

          {isInReview && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                href={`/events/${event.id}/review`}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                <ShieldCheck size={15} color="var(--google-blue)" />
                Review Screen
              </Link>

              <Link
                href="/approvals"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.84rem',
                }}
              >
                <span>Approvals Inbox</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          )}

          {isApproved && canManage && (
            <button
              type="button"
              onClick={() => setShowPublishModal(true)}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--google-green), #237A3D)',
                boxShadow: '0 4px 12px rgba(52, 168, 83, 0.3)',
              }}
            >
              <Sparkles size={16} />
              Publish Event Now
            </button>
          )}

          {isPublished && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyPublicLink}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.82rem',
                }}
              >
                {copied ? <Check size={14} color="var(--google-green)" /> : <Copy size={14} />}
                <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>

              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                }}
              >
                <Globe size={15} />
                <span>View Public Page</span>
                <ExternalLink size={13} />
              </Link>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#D8B4FE',
                  }}
                >
                  <CheckCircle2 size={15} color="#D8B4FE" />
                  <span>Mark as Completed</span>
                </button>
              )}
            </div>
          )}

          {isClosed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link
                href={`/events/${event.id}/attendance`}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.82rem',
                }}
              >
                <span>Check-in Attendance</span>
                <ExternalLink size={13} />
              </Link>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  className="btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Mark as Completed</span>
                </button>
              )}
            </div>
          )}

          {isCompleted && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link
                href={`/events/${event.id}/attendance`}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1rem',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Final Attendance Log</span>
              </Link>

              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.82rem',
                }}
              >
                <Globe size={14} />
                <span>Public Recap Page</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Submission Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(66, 133, 244, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Send size={18} color="var(--google-blue)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Submit Event for Review</h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Submitting <strong>"{event.title}"</strong> will lock draft edits and initiate the approval workflow:
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.2)',
                  color: 'var(--google-blue)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>1</span>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Stage 1 — Branch Head Review</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Tech or Non-Tech Branch Head cross-committee assessment</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(52, 168, 83, 0.2)',
                  color: 'var(--google-green)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>2</span>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700 }}>Stage 2 — Presidential Sign-off</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>President or Co-President final executive approval</div>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#F28B82',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Event Modal (Step 8.6) */}
      {showPublishModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(52, 168, 83, 0.4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Globe size={18} color="var(--google-green)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Publish Event to Public</h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              You are about to publish <strong>"{event.title}"</strong>. This will make the public registration page live immediately.
            </p>

            <div style={{
              background: 'rgba(52, 168, 83, 0.06)',
              border: '1px solid rgba(52, 168, 83, 0.2)',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.84rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--google-green)', fontWeight: 700 }}>
                <CheckCircle2 size={16} />
                <span>Executive Approvals Granted</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.78rem', lineHeight: 1.5 }}>
                Public URL will be activated at: <code style={{ color: '#86EFAC', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>/events/{event.slug}</code>
              </p>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#F28B82',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                disabled={isPublishing}
                className="btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'var(--google-green)',
                }}
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Globe size={15} />
                    Confirm & Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Completion Confirmation Modal (Step 8.11) */}
      {showCompleteModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '2rem',
            borderRadius: '20px',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            background: 'linear-gradient(180deg, #18132A 0%, #0F0E1A 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(168, 85, 247, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <CheckCircle2 size={24} color="#D8B4FE" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                  Conclude &amp; Mark as Completed
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: 0 }}>
                  Finalize lifecycle for &quot;{event.title}&quot; (§4.3 item 7)
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '1.25rem',
              fontSize: '0.84rem',
              lineHeight: 1.6,
              color: '#CBD5E1',
            }}>
              <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: '#F1F5F9' }}>
                Transitioning to &quot;Completed&quot; triggers the following:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Public registrations will be formally closed.</li>
                <li>Check-in records and final attendance rate will be finalized.</li>
                <li>Operations post-event &quot;After&quot; checklist reminder is flagged.</li>
                <li>Bulk certificate generation for attendees is unlocked (§4.14).</li>
              </ul>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                Optional Wrap-up Notes / Summary
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g. Turnout was great, 95 attendees attended, all sessions delivered successfully..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#F28B82',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={isCompleting}
                className="btn-secondary"
                style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={isCompleting}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                }}
              >
                {isCompleting ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm &amp; Complete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
