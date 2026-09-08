'use client';

import React, { useState, useTransition } from 'react';
import { submitEventFeedback, SubmitEventFeedbackInput } from '@/app/events/actions';
import { Event, EventFeedback } from '@/types';
import Link from 'next/link';
import {
  Star,
  Shield,
  UserCheck,
  CheckCircle2,
  Calendar,
  MapPin,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react';

interface EventFeedbackFormProps {
  event: Event;
  existingFeedback?: EventFeedback | null;
  registrationId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

const RATING_LABELS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Poor', emoji: '😞', color: '#EF4444' },
  2: { text: 'Fair', emoji: '😐', color: '#F97316' },
  3: { text: 'Good', emoji: '🙂', color: '#FBBF24' },
  4: { text: 'Very Good', emoji: '😊', color: '#34D399' },
  5: { text: 'Excellent!', emoji: '🤩', color: '#60A5FA' },
};

export function EventFeedbackForm({
  event,
  existingFeedback,
  registrationId,
  userName,
  userEmail,
}: EventFeedbackFormProps) {
  // If user already submitted, show completed view directly
  const [submittedFeedback, setSubmittedFeedback] = useState<EventFeedback | null>(
    existingFeedback || null
  );

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true); // Spec §4.18: anonymous-by-default
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeRating = hoverRating || rating;
  const ratingDetails = activeRating ? RATING_LABELS[activeRating] : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars.');
      return;
    }

    setError(null);
    startTransition(async () => {
      const payload: SubmitEventFeedbackInput = {
        eventId: event.id,
        rating,
        comment: comment.trim() ? comment.trim() : null,
        isAnonymous,
        registrationId: registrationId || null,
      };

      const res = await submitEventFeedback(payload);
      if (!res.success) {
        setError(res.error || 'Failed to submit feedback. Please try again.');
      } else if (res.feedback) {
        setSubmittedFeedback(res.feedback as EventFeedback);
      }
    });
  };

  // --------------------------------------------------------------------------
  // SUCCESS / ALREADY SUBMITTED VIEW
  // --------------------------------------------------------------------------
  if (submittedFeedback) {
    const submittedDetails = RATING_LABELS[submittedFeedback.rating] || RATING_LABELS[5];

    return (
      <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
        <div
          className="glass-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '24px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(52, 168, 83, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          {/* Top Google Brand Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          {/* Success Icon */}
          <div
            style={{
              margin: '0 auto 1.25rem',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-green)',
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(52, 168, 83, 0.15)',
                color: 'var(--google-green)',
                border: '1px solid rgba(52, 168, 83, 0.25)',
              }}
            >
              <Sparkles size={13} /> Feedback Recorded
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            Thank You for Your Feedback!
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              maxWidth: '460px',
              margin: '0 auto 1.75rem',
              lineHeight: 1.6,
            }}
          >
            Your opinion helps GDGoC Helwan National University craft higher-impact technical workshops, bootcamps, and hackathons.
          </p>

          {/* Submission Summary Card */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              textAlign: 'left',
              marginBottom: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Event
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93C5FD' }}>
                {event.title}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Your Rating
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      fill={star <= submittedFeedback.rating ? '#FBBC04' : 'transparent'}
                      color={star <= submittedFeedback.rating ? '#FBBC04' : '#475569'}
                    />
                  ))}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {submittedDetails.emoji} {submittedDetails.text}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: submittedFeedback.comment ? '0.75rem' : '0',
                borderBottom: submittedFeedback.comment ? '1px solid var(--border-subtle)' : 'none',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Identity Setting
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                {submittedFeedback.is_anonymous ? (
                  <>
                    <Shield size={14} color="var(--google-blue)" /> Anonymous
                  </>
                ) : (
                  <>
                    <UserCheck size={14} color="var(--google-green)" /> Public
                  </>
                )}
              </span>
            </div>

            {submittedFeedback.comment && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Comments &amp; Suggestions
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#E2E8F0',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px',
                    padding: '0.75rem 0.9rem',
                    border: '1px solid var(--border-subtle)',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;{submittedFeedback.comment}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Action Links */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Link
              href={`/events/${event.slug || event.id}`}
              style={{
                background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                color: '#FFFFFF',
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
              }}
            >
              <ArrowLeft size={16} /> Back to Event Page
            </Link>
            <Link
              href="/events"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              Explore Chapter Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // FEEDBACK SUBMISSION FORM
  // --------------------------------------------------------------------------
  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          padding: '2.5rem 2rem',
        }}
      >
        {/* Top 4-Color Google Brand Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(66, 133, 244, 0.12)',
                color: '#93C5FD',
                border: '1px solid rgba(66, 133, 244, 0.25)',
              }}
            >
              <Sparkles size={13} /> Official Event Survey
            </span>
          </div>

          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: '0 0 0.5rem',
              letterSpacing: '-0.02em',
            }}
          >
            How was your experience?
          </h1>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              maxWidth: '440px',
              margin: '0 auto',
              lineHeight: 1.5,
            }}
          >
            Please share your authentic thoughts on{' '}
            <strong style={{ color: '#FFFFFF' }}>{event.title}</strong>. It only takes 30 seconds!
          </p>

          {/* Event Mini-Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} color="var(--google-blue)" /> {event.event_date}
            </span>
            {event.venue && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={14} color="var(--google-red)" /> {event.venue}
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: 'rgba(234, 67, 53, 0.12)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Submission Notice</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* 1. Rating Stars Section */}
          <div style={{ textAlign: 'center' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
              }}
            >
              Overall Satisfaction Rating <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>

            {/* Stars Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.65rem',
                padding: '0.5rem 0',
              }}
              role="radiogroup"
              aria-label="Rating out of 5 stars"
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    id={`feedback-star-${star}`}
                    type="button"
                    onClick={() => {
                      setRating(star);
                      setError(null);
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${star} Star${star > 1 ? 's' : ''}`}
                    aria-checked={rating === star}
                    role="radio"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.4rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'transform 0.15s ease',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: isLit ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={36}
                      fill={isLit ? '#FBBC04' : 'transparent'}
                      color={isLit ? '#FBBC04' : '#475569'}
                      style={{
                        filter: isLit ? 'drop-shadow(0 0 10px rgba(251, 188, 4, 0.45))' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Rating Label */}
            <div style={{ minHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.35rem' }}>
              {ratingDetails ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.3rem 0.85rem',
                    borderRadius: '999px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: `${ratingDetails.color}20`,
                    border: `1px solid ${ratingDetails.color}40`,
                    color: ratingDetails.color,
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{ratingDetails.emoji}</span>
                  <span>{ratingDetails.text}</span>
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Click a star from 1 (Poor) to 5 (Excellent)
                </span>
              )}
            </div>
          </div>

          {/* 2. Comments Textarea */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
              }}
            >
              <label
                htmlFor="feedback-comment"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <MessageSquare size={16} color="var(--google-blue)" />
                <span>Comments &amp; Suggestions</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: comment.length > 900 ? 'var(--google-yellow)' : 'var(--text-muted)',
                }}
              >
                {comment.length} / 1000
              </span>
            </div>

            <textarea
              id="feedback-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="What did you like the most? Any ideas on how we can improve our sessions, speakers, or organization?"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.9rem',
                color: '#FFFFFF',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 3. Anonymous-by-Default Toggle Card (Spec §4.18) */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {isAnonymous ? (
                  <Shield size={16} color="var(--google-blue)" />
                ) : (
                  <UserCheck size={16} color="var(--google-green)" />
                )}
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {isAnonymous ? 'Submit Anonymously' : 'Submit with My Name'}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(66, 133, 244, 0.15)',
                    color: '#93C5FD',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                  }}
                >
                  Default
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isAnonymous
                  ? 'Your name and email will stay strictly confidential. Chapter organizers will only see the rating and comment.'
                  : `Your name (${userName || userEmail || 'your profile'}) will be attached so organizers can thank you for your input.`}
              </p>
            </div>

            {/* Accessible Toggle Button */}
            <button
              type="button"
              id="feedback-anonymous-toggle"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous(!isAnonymous)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                height: '28px',
                width: '52px',
                flexShrink: 0,
                cursor: 'pointer',
                borderRadius: '999px',
                border: '2px solid transparent',
                background: isAnonymous ? 'var(--google-blue)' : '#334155',
                transition: 'background-color 0.2s ease',
                outline: 'none',
                padding: 0,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  height: '24px',
                  width: '24px',
                  borderRadius: '50%',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                  transform: isAnonymous ? 'translateX(24px)' : 'translateX(0px)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>
          </div>

          {/* 4. Submit Button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            <button
              type="submit"
              id="submit-feedback-button"
              disabled={isPending || rating === 0}
              style={{
                width: '100%',
                padding: '0.95rem 1.5rem',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                border: 'none',
                cursor: rating === 0 || isPending ? 'not-allowed' : 'pointer',
                background:
                  rating === 0 || isPending
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                color: rating === 0 || isPending ? 'var(--text-muted)' : '#FFFFFF',
                boxShadow:
                  rating === 0 || isPending ? 'none' : '0 4px 16px rgba(66, 133, 244, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Submitting Feedback...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
              By submitting, you contribute directly to improving future GDGoC Helwan National University activities.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
