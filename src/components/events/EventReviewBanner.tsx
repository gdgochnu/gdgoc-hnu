'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  submitEventForReview, 
  publishEvent, 
  completeEvent, 
  closeEvent,
  overrideEventStatus,
  updateEventCapacity
} from '@/app/events/actions';
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
  Archive,
  ArrowRightLeft,
  Users,
  Lock,
  Unlock,
  Sliders,
  X,
  Plus,
  Minus
} from 'lucide-react';

interface EventReviewBannerProps {
  event: Event;
  canManage: boolean;
  approvalInstance?: any;
  isPresidential?: boolean;
  userRole?: string;
}

const ALL_STATUSES: { value: EventStatus; label: string; desc: string; color: string }[] = [
  { value: 'draft', label: 'Draft', desc: 'Working draft, visible to chapter organizers only', color: '#FBBF24' },
  { value: 'submitted_for_review', label: 'Submitted for Review', desc: 'Initial submission into review pipeline', color: '#60A5FA' },
  { value: 'branch_review', label: 'Branch Review', desc: 'Stage 1 Tech/Non-Tech Branch Head evaluation', color: '#38BDF8' },
  { value: 'pending_final_approval', label: 'Pending Final Approval', desc: 'Stage 2 Presidential executive sign-off', color: '#818CF8' },
  { value: 'approved', label: 'Approved', desc: 'Fully approved, unlocked for publication', color: '#34D399' },
  { value: 'published', label: 'Published (Live)', desc: 'Live on public portal, accepting attendee registrations', color: '#10B981' },
  { value: 'closed', label: 'Closed (Registration Capped)', desc: 'Public registrations capped or closed, check-ins ready', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', desc: 'Concluded lifecycle, feedback sent, certificates unlocked', color: '#A855F7' },
  { value: 'rejected', label: 'Rejected', desc: 'Returned with revision notes or cancelled', color: '#EF4444' },
];

export function EventReviewBanner({ event, canManage, approvalInstance, isPresidential = false, userRole }: EventReviewBannerProps) {
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

  // Status Override Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<EventStatus>(event.status);
  const [statusReason, setStatusReason] = useState('');
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Capacity Modal State
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [capacityValue, setCapacityValue] = useState<number | string>(event.capacity ?? 100);
  const [isUnlimitedCapacity, setIsUnlimitedCapacity] = useState<boolean>(event.capacity === null || event.capacity === undefined);
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState(false);

  const handleStatusOverride = async () => {
    if (!targetStatus) return;
    setErrorMsg(null);
    setIsChangingStatus(true);
    try {
      const res = await overrideEventStatus(event.id, targetStatus, statusReason.trim() || undefined);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to change event status.');
      } else {
        setShowStatusModal(false);
        setPublishSuccessMsg(`Event status successfully updated to '${targetStatus}'.`);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error changing event status.');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleCapacityUpdate = async () => {
    setErrorMsg(null);
    setIsUpdatingCapacity(true);
    try {
      const cap = isUnlimitedCapacity ? null : (parseInt(String(capacityValue), 10) || null);
      const res = await updateEventCapacity(event.id, cap);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update capacity.');
      } else {
        setShowCapacityModal(false);
        setPublishSuccessMsg(cap !== null ? `Event capacity updated to ${cap} attendees.` : 'Event capacity set to Unlimited.');
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating capacity.');
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  const handleToggleRegistration = async (newStatus: 'closed' | 'published') => {
    setErrorMsg(null);
    setIsChangingStatus(true);
    try {
      const res = await overrideEventStatus(
        event.id,
        newStatus,
        newStatus === 'closed' ? 'Registration closed by leadership (capacity satisfied)' : 'Registration reopened by leadership'
      );
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update registration status.');
      } else {
        setPublishSuccessMsg(newStatus === 'closed' ? 'Registration successfully closed.' : 'Registration reopened!');
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error toggling registration.');
    } finally {
      setIsChangingStatus(false);
    }
  };

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
      {publishSuccessMsg && (
        <div style={{
          background: 'rgba(52, 168, 83, 0.15)',
          border: '1px solid rgba(52, 168, 83, 0.4)',
          color: '#86EFAC',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem',
          fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} color="var(--google-green)" />
            <span>{publishSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPublishSuccessMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#86EFAC', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

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
              <Lock size={22} color="var(--google-yellow)" />
            ) : (
              <CheckCircle2 size={22} color="#D8B4FE" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                {isDraftOrRejected
                  ? event.status === 'rejected' ? 'Event Revision Required' : (isPresidential ? 'Presidential Executive Draft' : 'Event Draft Ready for Review')
                  : isInReview
                  ? 'Event Under Executive Review'
                  : isApproved
                  ? 'Event Approved — Ready to Publish (Step 8.6)'
                  : isPublished
                  ? 'Event is Live on Public Portal'
                  : isClosed
                  ? 'Event Registrations Closed / Capped'
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

              {event.capacity !== null && event.capacity !== undefined ? (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#93C5FD',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}>
                  Cap: {event.capacity} seats
                </span>
              ) : (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#6EE7B7',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  Unlimited Capacity
                </span>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              {isDraftOrRejected ? (
                isPresidential
                  ? 'Presidential Direct Authority: You can directly publish this event, adjust capacity, or transition to any status without review submission.'
                  : 'Review details, tasks, and registration questions. Submit to trigger the 2-stage approval chain (Branch Head → President/Co-President).'
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
                'Public registration has closed. Attendance check-ins are active or ready to mark as completed.'
              ) : (
                'Event lifecycle has concluded. Attendance finalized, feedback surveys sent, and certificates ready to issue.'
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Status-specific primary actions */}
          {isDraftOrRejected && (
            <>
              {isPresidential ? (
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
                  <span>Publish Directly</span>
                </button>
              ) : canManage ? (
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
              ) : null}
            </>
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

              {(canManage || isPresidential) && (
                <button
                  type="button"
                  disabled={isChangingStatus}
                  onClick={() => handleToggleRegistration('closed')}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    background: 'rgba(234, 67, 53, 0.12)',
                    border: '1px solid rgba(234, 67, 53, 0.35)',
                    color: '#F87171',
                  }}
                  title="Stop attendee registrations (cap numbers or close)"
                >
                  <Lock size={14} color="#F87171" />
                  <span>Close Registration</span>
                </button>
              )}

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

              {(canManage || isPresidential) && (
                <button
                  type="button"
                  disabled={isChangingStatus}
                  onClick={() => handleToggleRegistration('published')}
                  className="btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    background: 'rgba(52, 168, 83, 0.12)',
                    border: '1px solid rgba(52, 168, 83, 0.35)',
                    color: '#86EFAC',
                  }}
                  title="Reopen public registration"
                >
                  <Unlock size={14} color="#86EFAC" />
                  <span>Reopen Registration</span>
                </button>
              )}

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

          {/* Universal Leadership Actions: Capacity & Status Override across ALL statuses */}
          {(canManage || isPresidential) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderLeft: '1px solid rgba(255, 255, 255, 0.12)', paddingLeft: '0.6rem' }}>
              <button
                type="button"
                onClick={() => {
                  setCapacityValue(event.capacity ?? 100);
                  setIsUnlimitedCapacity(event.capacity === null || event.capacity === undefined);
                  setShowCapacityModal(true);
                }}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#93C5FD',
                }}
                title="Adjust capacity or limit registrations"
              >
                <Users size={14} color="#93C5FD" />
                <span>Capacity</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetStatus(event.status);
                  setStatusReason('');
                  setShowStatusModal(true);
                }}
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: 'rgba(251, 188, 4, 0.12)',
                  border: '1px solid rgba(251, 188, 4, 0.35)',
                  color: '#FDE047',
                }}
                title="Executive Override: Switch status from any status to any status"
              >
                <ArrowRightLeft size={14} color="#FDE047" />
                <span>Change Status</span>
              </button>
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
      {/* Status Override Modal */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.25rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(251, 188, 4, 0.4)',
            background: 'linear-gradient(180deg, #181611 0%, #0D0C09 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(251, 188, 4, 0.15)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(251, 188, 4, 0.15)',
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ArrowRightLeft size={22} color="#FDE047" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Executive Status Override
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.15rem 0 0' }}>
                    Switch status from any status to any status directly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Status Indicator */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Current Event Status:</span>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
              }}>
                {event.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            {/* Status Option List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {ALL_STATUSES.map((s) => {
                const isSelected = targetStatus === s.value;
                const isCurrent = event.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setTargetStatus(s.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      border: isSelected
                        ? `1.5px solid ${s.color}`
                        : '1px solid rgba(255, 255, 255, 0.07)',
                      background: isSelected
                        ? `linear-gradient(90deg, ${s.color}22, rgba(255, 255, 255, 0.03))`
                        : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isSelected ? `5px solid ${s.color}` : '2px solid rgba(255, 255, 255, 0.3)',
                        background: isSelected ? '#FFFFFF' : 'transparent',
                        flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? s.color : '#F1F5F9' }}>
                            {s.label}
                          </span>
                          {isCurrent && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.12)',
                              color: '#E2E8F0',
                            }}>
                              Current
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                          {s.desc}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Optional Reason / Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                Administrative Reason / Notes (Optional)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Approved directly by President / Urgent schedule update / Cap reached"
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
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

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                disabled={isChangingStatus}
                className="btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusOverride}
                disabled={isChangingStatus}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#000000',
                }}
              >
                {isChangingStatus ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={15} />
                    <span>Update Status Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Capacity Modal */}
      {showCapacityModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.25rem',
        }}>
          <div className="glass-panel" style={{
            maxWidth: '480px',
            width: '100%',
            padding: '1.75rem',
            borderRadius: '20px',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            background: 'linear-gradient(180deg, #111726 0%, #0B0E17 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(59, 130, 246, 0.15)',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Users size={22} color="#60A5FA" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Adjust Event Capacity
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.15rem 0 0' }}>
                    Set seat limits, cap numbers, or make unlimited
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Unlimited Capacity Checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: isUnlimitedCapacity ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: isUnlimitedCapacity ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              marginBottom: '1.25rem',
            }}>
              <input
                type="checkbox"
                checked={isUnlimitedCapacity}
                onChange={(e) => setIsUnlimitedCapacity(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isUnlimitedCapacity ? '#6EE7B7' : '#FFFFFF' }}>
                  Unlimited Capacity
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Accept registrations without automatic limit capping
                </div>
              </div>
            </label>

            {/* Capacity Input when not unlimited */}
            {!isUnlimitedCapacity && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Maximum Attendee Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  value={capacityValue}
                  onChange={(e) => setCapacityValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#FFFFFF',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    outline: 'none',
                    marginBottom: '0.75rem',
                  }}
                />

                {/* Quick Add Increment Pills */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[10, 25, 50, 100].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => {
                        const current = parseInt(String(capacityValue), 10) || 0;
                        setCapacityValue(current + inc);
                      }}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#93C5FD',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      +{inc} seats
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseInt(String(capacityValue), 10) || 0;
                      setCapacityValue(Math.max(1, current - 10));
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(234, 67, 53, 0.15)',
                      border: '1px solid rgba(234, 67, 53, 0.3)',
                      color: '#F87171',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    -10 seats
                  </button>
                </div>
              </div>
            )}

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

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                disabled={isUpdatingCapacity}
                className="btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapacityUpdate}
                disabled={isUpdatingCapacity}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                }}
              >
                {isUpdatingCapacity ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Capacity</span>
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
