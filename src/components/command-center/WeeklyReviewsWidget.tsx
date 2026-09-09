'use client';

import { useState, useTransition } from 'react';
import {
  WeeklyReviewsSummary,
  WeeklyHeadReview,
  SubmitWeeklyReviewInput,
} from '@/types/command-center';
import {
  submitWeeklyHeadReview,
  submitPresidentReviewFeedback,
} from '@/app/command-center/actions';
import {
  Sparkles,
  Star,
  MessageSquareQuote,
  CheckCircle2,
  AlertTriangle,
  Send,
  Edit3,
  ChevronDown,
  ChevronUp,
  Award,
  ShieldAlert,
  Calendar,
  Layers,
  HeartHandshake,
  Smile,
  Users,
  Info,
} from 'lucide-react';

interface WeeklyReviewsWidgetProps {
  initialSummary: WeeklyReviewsSummary;
}

export function WeeklyReviewsWidget({ initialSummary }: WeeklyReviewsWidgetProps) {
  const [summary, setSummary] = useState<WeeklyReviewsSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();

  // Head form state
  const [isEditingHeadForm, setIsEditingHeadForm] = useState<boolean>(
    !initialSummary.userCurrentReview && initialSummary.isHeadOrCoHead
  );
  const [q1, setQ1] = useState(initialSummary.userCurrentReview?.q1Achievements || '');
  const [q2, setQ2] = useState(initialSummary.userCurrentReview?.q2Blockers || '');
  const [q3, setQ3] = useState(initialSummary.userCurrentReview?.q3NextWeekPlan || '');
  const [q4, setQ4] = useState(initialSummary.userCurrentReview?.q4SupportNeeded || '');
  const [q5, setQ5] = useState<number>(initialSummary.userCurrentReview?.q5MoraleRating || 5);
  const [headFormError, setHeadFormError] = useState<string | null>(null);
  const [headFormSuccess, setHeadFormSuccess] = useState<string | null>(null);

  // President feedback drafts: map reviewId -> feedback string
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Filter tabs for the President's feed
  const [feedFilter, setFeedFilter] = useState<'all' | 'awaiting_feedback' | 'low_morale'>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter reviews
  const filteredReviews = summary.reviews.filter((rev) => {
    if (feedFilter === 'awaiting_feedback') {
      return !rev.presidentFeedback || rev.presidentFeedback.trim() === '';
    }
    if (feedFilter === 'low_morale') {
      return rev.q5MoraleRating <= 3;
    }
    return true;
  });

  // Handle Head submission
  const handleHeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHeadFormError(null);
    setHeadFormSuccess(null);

    if (!summary.userDepartmentId) {
      setHeadFormError('Your user profile is not linked to a specific committee department.');
      return;
    }

    if (!q1.trim() || !q2.trim() || !q3.trim()) {
      setHeadFormError('Please answer questions 1, 2, and 3 before submitting.');
      return;
    }

    const payload: SubmitWeeklyReviewInput = {
      departmentId: summary.userDepartmentId,
      weekStartDate: summary.weekStartDate,
      q1Achievements: q1.trim(),
      q2Blockers: q2.trim(),
      q3NextWeekPlan: q3.trim(),
      q4SupportNeeded: q4.trim() || undefined,
      q5MoraleRating: q5,
    };

    startTransition(async () => {
      const res = await submitWeeklyHeadReview(payload);
      if (!res.success) {
        setHeadFormError(res.error || 'Failed to submit review');
        return;
      }

      setHeadFormSuccess('Your 5-question weekly check-in has been submitted to Executive Leadership!');
      setIsEditingHeadForm(false);

      if (res.review) {
        const updatedReviews = [...summary.reviews];
        const existingIdx = updatedReviews.findIndex((r) => r.departmentId === summary.userDepartmentId);
        if (existingIdx >= 0) {
          updatedReviews[existingIdx] = {
            ...updatedReviews[existingIdx],
            ...res.review,
          };
        } else {
          updatedReviews.unshift({
            ...res.review,
            departmentName: 'Your Committee',
            departmentCode: 'COMM',
          });
        }

        setSummary((prev) => ({
          ...prev,
          totalSubmissions: updatedReviews.length,
          reviews: updatedReviews,
          userCurrentReview: res.review,
        }));
      }
    });
  };

  // Handle President feedback submission
  const handleSendFeedback = (reviewId: string) => {
    const feedbackText = feedbackDrafts[reviewId];
    if (!feedbackText || !feedbackText.trim()) return;

    setFeedbackError(null);

    startTransition(async () => {
      const res = await submitPresidentReviewFeedback(reviewId, feedbackText.trim());
      if (!res.success) {
        setFeedbackError(res.error || 'Failed to save feedback');
        return;
      }

      // Update in local state
      setSummary((prev) => {
        const updated = prev.reviews.map((r) => {
          if (r.id === reviewId) {
            return {
              ...r,
              presidentFeedback: feedbackText.trim(),
              reviewedAt: new Date().toISOString(),
            };
          }
          return r;
        });

        const pendingCount = updated.filter((r) => !r.presidentFeedback || !r.presidentFeedback.trim()).length;

        return {
          ...prev,
          reviews: updated,
          pendingFeedbackCount: pendingCount,
        };
      });

      setEditingFeedbackId(null);
    });
  };

  const getMoraleEmoji = (rating: number) => {
    switch (rating) {
      case 1:
        return '😟 Critical Blockers';
      case 2:
        return '😐 Struggling';
      case 3:
        return '🙂 Steady Progress';
      case 4:
        return '😊 High Energy';
      case 5:
        return '🚀 Supercharged';
      default:
        return '⭐ Rated';
    }
  };

  return (
    <div
      id="weekly-reviews-widget"
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        padding: '2rem',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* 1. Header & Summary Stats */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBC04',
              }}
            >
              <MessageSquareQuote size={20} />
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Weekly Committee Pulse (5 Questions)
            </h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Structured weekly check-in from Committee Heads to the President: achievements, blockers, plans, and team morale.
          </p>
        </div>

        {/* Executive Stats Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Week Date Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Calendar size={13} color="var(--google-blue)" />
            Week of {summary.weekStartDate}
          </div>

          {/* Submissions Count Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              background:
                summary.totalSubmissions > 0 ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border:
                summary.totalSubmissions > 0
                  ? '1px solid rgba(52, 168, 83, 0.35)'
                  : '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: summary.totalSubmissions > 0 ? '#34A853' : 'var(--text-muted)',
            }}
          >
            <CheckCircle2 size={13} />
            {summary.totalSubmissions} / {summary.expectedCommitteesCount || 'All'} Committees
          </div>

          {/* Average Morale Rating */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              background: 'rgba(251, 188, 4, 0.12)',
              border: '1px solid rgba(251, 188, 4, 0.35)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#FCD34D',
            }}
          >
            <Star size={13} fill="#FBBC04" color="#FBBC04" />
            Avg Morale: {summary.averageMorale > 0 ? `${summary.averageMorale} / 5.0` : 'N/A'}
          </div>

          {/* Pending President Feedback */}
          {summary.isPresidentOrCo && summary.pendingFeedbackCount > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.35)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#EA4335',
              }}
            >
              <AlertTriangle size={13} />
              {summary.pendingFeedbackCount} Awaiting Feedback
            </div>
          )}
        </div>
      </div>

      {/* 2. Head / Co-Head Submission Portal (If user is Head or Co-Head) */}
      {summary.isHeadOrCoHead && (
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'rgba(66, 133, 244, 0.05)',
            border: '1px solid rgba(66, 133, 244, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={18} color="var(--google-blue)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                My Committee Weekly Check-in
              </h3>
              {summary.userCurrentReview && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 168, 83, 0.2)',
                    color: '#34A853',
                    border: '1px solid rgba(52, 168, 83, 0.4)',
                  }}
                >
                  ✓ Submitted
                </span>
              )}
            </div>

            {summary.userCurrentReview && !isEditingHeadForm && (
              <button
                type="button"
                onClick={() => setIsEditingHeadForm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Edit3 size={13} />
                Edit My Answers
              </button>
            )}
          </div>

          {headFormSuccess && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                color: '#86EFAC',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              {headFormSuccess}
            </div>
          )}

          {headFormError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.35)',
                color: '#FCA5A5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              {headFormError}
            </div>
          )}

          {/* Form View */}
          {isEditingHeadForm ? (
            <form onSubmit={handleHeadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Question 1 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#93C5FD',
                    marginBottom: '0.35rem',
                  }}
                >
                  1. What did your committee achieve this week? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={q1}
                  onChange={(e) => setQ1(e.target.value)}
                  placeholder="Key deliverables completed, workshops hosted, milestones reached..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Question 2 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#FCA5A5',
                    marginBottom: '0.35rem',
                  }}
                >
                  2. Any blockers, delays, or challenges encountered? *
                </label>
                <textarea
                  required
                  rows={2}
                  value={q2}
                  onChange={(e) => setQ2(e.target.value)}
                  placeholder="Dependencies waiting, stalled approvals, low turnout, technical issues..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Question 3 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#86EFAC',
                    marginBottom: '0.35rem',
                  }}
                >
                  3. Key priorities and plan for next week? *
                </label>
                <textarea
                  required
                  rows={2}
                  value={q3}
                  onChange={(e) => setQ3(e.target.value)}
                  placeholder="Top 2-3 focus tasks or event preparation steps..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Question 4 */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#FCD34D',
                    marginBottom: '0.35rem',
                  }}
                >
                  4. What support or resources do you need from Core Leadership? (Optional)
                </label>
                <textarea
                  rows={2}
                  value={q4}
                  onChange={(e) => setQ4(e.target.value)}
                  placeholder="Budget approval, graphic design help, speaker contacts, logistics..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Question 5: Morale Rating */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    marginBottom: '0.5rem',
                  }}
                >
                  5. Committee Morale Rating (1 - 5 Stars):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setQ5(star)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          color: star <= q5 ? '#FBBC04' : 'rgba(255, 255, 255, 0.2)',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <Star size={24} fill={star <= q5 ? '#FBBC04' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#FCD34D',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(251, 188, 4, 0.15)',
                      border: '1px solid rgba(251, 188, 4, 0.3)',
                    }}
                  >
                    {getMoraleEmoji(q5)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                {summary.userCurrentReview && (
                  <button
                    type="button"
                    onClick={() => setIsEditingHeadForm(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.35rem',
                    borderRadius: '8px',
                    background: 'var(--google-blue)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isPending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                  }}
                >
                  <Send size={14} />
                  {isPending ? 'Submitting…' : 'Submit Weekly Pulse'}
                </button>
              </div>
            </form>
          ) : (
            /* Summary of current submission + President's feedback */
            summary.userCurrentReview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#93C5FD', fontWeight: 700 }}>1. Achievements</div>
                    <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.25rem' }}>
                      {summary.userCurrentReview.q1Achievements}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#FCA5A5', fontWeight: 700 }}>2. Blockers</div>
                    <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.25rem' }}>
                      {summary.userCurrentReview.q2Blockers}
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#86EFAC', fontWeight: 700 }}>3. Next Week Plan</div>
                    <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.25rem' }}>
                      {summary.userCurrentReview.q3NextWeekPlan}
                    </div>
                  </div>
                  {summary.userCurrentReview.q4SupportNeeded && (
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)' }}>
                      <div style={{ fontSize: '0.72rem', color: '#FCD34D', fontWeight: 700 }}>4. Support Needed</div>
                      <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.25rem' }}>
                        {summary.userCurrentReview.q4SupportNeeded}
                      </div>
                    </div>
                  )}
                </div>

                {/* Morale Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Morale:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        color="#FBBC04"
                        fill={star <= summary.userCurrentReview!.q5MoraleRating ? '#FBBC04' : 'none'}
                      />
                    ))}
                  </div>
                  <span style={{ fontWeight: 700, color: '#FCD34D' }}>
                    {getMoraleEmoji(summary.userCurrentReview.q5MoraleRating)}
                  </span>
                </div>

                {/* Executive Feedback Display */}
                {summary.userCurrentReview.presidentFeedback ? (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(52, 168, 83, 0.12)',
                      border: '1px solid rgba(52, 168, 83, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34A853', fontSize: '0.78rem', fontWeight: 800 }}>
                      <Award size={15} />
                      President’s Executive Feedback:
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontStyle: 'italic', lineHeight: 1.5 }}>
                      “{summary.userCurrentReview.presidentFeedback}”
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                      padding: '0.4rem 0',
                    }}
                  >
                    Waiting for Executive Leadership review...
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* 3. President Feed: Submissions Across All Committees */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} color="var(--google-blue)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
              Committee Reports Feed
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
              }}
            >
              ({filteredReviews.length} shown)
            </span>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setFeedFilter('all')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                border: 'none',
                background: feedFilter === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.06)',
                color: feedFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All Committees
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('awaiting_feedback')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                border: 'none',
                background: feedFilter === 'awaiting_feedback' ? '#EA4335' : 'rgba(255, 255, 255, 0.06)',
                color: feedFilter === 'awaiting_feedback' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Needs Feedback ({summary.pendingFeedbackCount})
            </button>
            <button
              type="button"
              onClick={() => setFeedFilter('low_morale')}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                border: 'none',
                background: feedFilter === 'low_morale' ? '#FBBC04' : 'rgba(255, 255, 255, 0.06)',
                color: feedFilter === 'low_morale' ? '#1E293B' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Low Morale (≤3)
            </button>
          </div>
        </div>

        {feedbackError && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(234, 67, 53, 0.15)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.8rem',
            }}
          >
            {feedbackError}
          </div>
        )}

        {/* Reviews List */}
        {filteredReviews.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              borderRadius: '12px',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}
          >
            <Smile size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            No committee reports match this filter for the week of {summary.weekStartDate}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredReviews.map((review) => {
              const isExpanded = expandedCards[review.id] ?? true;
              const hasFeedback = !!review.presidentFeedback && review.presidentFeedback.trim() !== '';
              const isEditingThis = editingFeedbackId === review.id;
              const currentDraft = feedbackDrafts[review.id] ?? (review.presidentFeedback || '');

              return (
                <div
                  key={review.id}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    transition: 'border-color 0.2s ease',
                  }}
                >
                  {/* Committee Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Avatar */}
                      {review.headAvatar ? (
                        <img
                          src={review.headAvatar}
                          alt={review.headName || 'Head'}
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(66, 133, 244, 0.2)',
                            color: '#93C5FD',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                          }}
                        >
                          {review.headName ? review.headName.charAt(0).toUpperCase() : 'H'}
                        </div>
                      )}

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                            {review.departmentName}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {review.departmentCode}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Head: {review.headName} • Submitted {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Morale Pill & Expand Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          background:
                            review.q5MoraleRating <= 2
                              ? 'rgba(234, 67, 53, 0.15)'
                              : review.q5MoraleRating === 3
                              ? 'rgba(251, 188, 4, 0.15)'
                              : 'rgba(52, 168, 83, 0.15)',
                          border:
                            review.q5MoraleRating <= 2
                              ? '1px solid rgba(234, 67, 53, 0.35)'
                              : review.q5MoraleRating === 3
                              ? '1px solid rgba(251, 188, 4, 0.35)'
                              : '1px solid rgba(52, 168, 83, 0.35)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color:
                            review.q5MoraleRating <= 2
                              ? '#EA4335'
                              : review.q5MoraleRating === 3
                              ? '#FBBC04'
                              : '#34A853',
                        }}
                      >
                        <Star size={12} fill="currentColor" />
                        {review.q5MoraleRating}/5 • {getMoraleEmoji(review.q5MoraleRating)}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCard(review.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                        }}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Body Content (The 5 Answers) */}
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '0.75rem',
                        }}
                      >
                        {/* Q1: Achievements */}
                        <div
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(52, 168, 83, 0.06)',
                            border: '1px solid rgba(52, 168, 83, 0.2)',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34A853', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <CheckCircle2 size={13} />
                            Achievements This Week
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {review.q1Achievements}
                          </div>
                        </div>

                        {/* Q2: Blockers */}
                        <div
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(234, 67, 53, 0.06)',
                            border: '1px solid rgba(234, 67, 53, 0.2)',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EA4335', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <AlertTriangle size={13} />
                            Blockers & Challenges
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {review.q2Blockers}
                          </div>
                        </div>

                        {/* Q3: Next Week Plan */}
                        <div
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(66, 133, 244, 0.06)',
                            border: '1px solid rgba(66, 133, 244, 0.2)',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4285F4', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} />
                            Next Week Plan
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {review.q3NextWeekPlan}
                          </div>
                        </div>

                        {/* Q4: Support Needed */}
                        <div
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '10px',
                            background: 'rgba(251, 188, 4, 0.06)',
                            border: '1px solid rgba(251, 188, 4, 0.2)',
                          }}
                        >
                          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FBBC04', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <HeartHandshake size={13} />
                            Support from Leadership
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#FFFFFF', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {review.q4SupportNeeded || 'No extra support requested.'}
                          </div>
                        </div>
                      </div>

                      {/* Executive Feedback Area */}
                      <div
                        style={{
                          marginTop: '0.25rem',
                          padding: '0.85rem',
                          borderRadius: '10px',
                          background: hasFeedback
                            ? 'rgba(52, 168, 83, 0.08)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: hasFeedback
                            ? '1px solid rgba(52, 168, 83, 0.25)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              color: hasFeedback ? '#34A853' : 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Award size={14} />
                            President’s Response & Guidance
                          </span>

                          {summary.isPresidentOrCo && hasFeedback && !isEditingThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setFeedbackDrafts((prev) => ({
                                  ...prev,
                                  [review.id]: review.presidentFeedback || '',
                                }));
                                setEditingFeedbackId(review.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <Edit3 size={11} />
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Existing Feedback Text */}
                        {hasFeedback && !isEditingThis ? (
                          <div style={{ fontSize: '0.82rem', color: '#FFFFFF', fontStyle: 'italic', lineHeight: 1.5 }}>
                            “{review.presidentFeedback}”
                          </div>
                        ) : null}

                        {/* Form for President to leave or edit feedback */}
                        {summary.isPresidentOrCo && (!hasFeedback || isEditingThis) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <textarea
                              rows={2}
                              value={currentDraft}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFeedbackDrafts((prev) => ({ ...prev, [review.id]: val }));
                              }}
                              placeholder="Add guidance, acknowledgment, or action steps for this Head..."
                              style={{
                                width: '100%',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                color: '#FFFFFF',
                                fontSize: '0.8rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                              {isEditingThis && (
                                <button
                                  type="button"
                                  onClick={() => setEditingFeedbackId(null)}
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    borderRadius: '6px',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isPending || !currentDraft.trim()}
                                onClick={() => handleSendFeedback(review.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.95rem',
                                  borderRadius: '6px',
                                  background: 'var(--google-blue)',
                                  border: 'none',
                                  color: '#FFFFFF',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: isPending || !currentDraft.trim() ? 'not-allowed' : 'pointer',
                                }}
                              >
                                <Send size={12} />
                                {isPending ? 'Saving…' : 'Send Feedback'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
