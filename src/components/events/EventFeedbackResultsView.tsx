'use client';

import React, { useState } from 'react';
import { EventFeedbackSummary, EventFeedback } from '@/types';
import Link from 'next/link';
import {
  Star,
  MessageSquare,
  Shield,
  UserCheck,
  Sparkles,
  Share2,
  ExternalLink,
  Check,
  Filter,
  ThumbsUp,
} from 'lucide-react';

interface EventFeedbackResultsViewProps {
  summary: EventFeedbackSummary;
  eventSlugOrId: string;
  isEventCompleted: boolean;
  canManage?: boolean;
}

export function EventFeedbackResultsView({
  summary,
  eventSlugOrId,
  isEventCompleted,
  canManage = false,
}: EventFeedbackResultsViewProps) {
  const [filterStar, setFilterStar] = useState<number | 'all'>('all');
  const [onlyWithComments, setOnlyWithComments] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const { totalCount, averageRating, distribution, commentsCount, anonymousCount, feedback } = summary;

  // Filter feedback
  const filteredFeedback = feedback.filter((item) => {
    if (filterStar !== 'all' && item.rating !== filterStar) return false;
    if (onlyWithComments && (!item.comment || item.comment.trim().length === 0)) return false;
    return true;
  });

  const handleCopySurveyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/events/${eventSlugOrId}/feedback`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const getPercent = (count: number) => {
    if (totalCount === 0) return 0;
    return Math.round((count / totalCount) * 100);
  };

  const positivePercent = getPercent((distribution[5] || 0) + (distribution[4] || 0));

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Top Google 4-color Accent Bar */}
      <div
        style={{
          height: '4px',
          width: '100%',
          background: 'linear-gradient(90deg, #4285F4 0% 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75% 100%)',
        }}
      />

      <div style={{ padding: '1.75rem 2rem' }}>
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-yellow)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Event Feedback &amp; Satisfaction
              </h2>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)',
                  margin: '0.25rem 0 0',
                }}
              >
                Aggregated attendee ratings, satisfaction metrics, and comment highlights (Spec §4.18)
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleCopySurveyLink}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                color: copiedLink ? 'var(--google-green)' : 'var(--text-primary)',
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
              title="Copy public survey link"
            >
              {copiedLink ? (
                <>
                  <Check size={15} color="var(--google-green)" />
                  <span style={{ fontWeight: 700 }}>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 size={15} color="var(--google-blue)" />
                  <span>Share Survey Link</span>
                </>
              )}
            </button>

            <Link
              href={`/events/${eventSlugOrId}/feedback`}
              style={{
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                borderRadius: '10px',
                color: '#93C5FD',
                padding: '0.55rem 1.1rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Submit / View My Feedback</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>

        {/* When Total Count === 0 */}
        {totalCount === 0 ? (
          <div
            style={{
              padding: '3.5rem 1.5rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginBottom: '1.25rem',
              }}
            >
              <MessageSquare size={30} />
            </div>
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
              }}
            >
              No Feedback Submitted Yet
            </h3>
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                maxWidth: '480px',
                lineHeight: 1.6,
                margin: '0 0 1.5rem',
              }}
            >
              {isEventCompleted
                ? 'Survey invitations were dispatched to all attendees. Results and quotes will automatically appear here as attendees respond.'
                : 'Surveys are automatically sent out to all attendees when the event transitions to Completed.'}
            </p>
            <Link
              href={`/events/${eventSlugOrId}/feedback`}
              style={{
                background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                color: '#FFFFFF',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Be the First to Leave Feedback</span>
              <span>&rarr;</span>
            </Link>
          </div>
        ) : (
          <>
            {/* KPI & Metrics Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem',
                margin: '1.75rem 0',
              }}
            >
              {/* Overall Score Card */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ width: '100%' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                      display: 'block',
                    }}
                  >
                    Average Satisfaction Score
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      margin: '0.6rem 0 0.4rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '3.6rem',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {averageRating.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                      / 5.0
                    </span>
                  </div>

                  {/* Stars Graphic */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', margin: '0.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={22}
                        fill={star <= Math.round(averageRating) ? '#FBBC04' : 'transparent'}
                        color={star <= Math.round(averageRating) ? '#FBBC04' : '#475569'}
                      />
                    ))}
                  </div>

                  {/* Sentiment Pill */}
                  <div style={{ marginTop: '0.85rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.3rem 0.85rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(52, 168, 83, 0.15)',
                        color: 'var(--google-green)',
                        border: '1px solid rgba(52, 168, 83, 0.3)',
                      }}
                    >
                      <ThumbsUp size={13} />
                      {positivePercent}% Positive Ratings
                    </span>
                  </div>
                </div>

                {/* Sub-Metrics Summary */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    width: '100%',
                    marginTop: '1.5rem',
                    paddingTop: '1.25rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>{totalCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Total
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#93C5FD' }}>{commentsCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Comments
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#C084FC' }}>{anonymousCount}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Anonymous
                    </div>
                  </div>
                </div>
              </div>

              {/* Star Distribution Progress Bars */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span>Rating Breakdown</span>
                  <span>{totalCount} Total Responses</span>
                </div>

                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = getPercent(count);
                  const isSelected = filterStar === star;

                  return (
                    <div
                      key={star}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        fontSize: '0.82rem',
                      }}
                    >
                      <button
                        onClick={() => setFilterStar(filterStar === star ? 'all' : star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          width: '45px',
                          cursor: 'pointer',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#FBBC04' : 'var(--text-secondary)',
                          padding: '0.2rem 0',
                          fontSize: '0.82rem',
                        }}
                      >
                        <span>{star}</span>
                        <Star size={14} fill="#FBBC04" color="#FBBC04" />
                      </button>

                      <div
                        style={{
                          flex: 1,
                          height: '10px',
                          borderRadius: '999px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: '999px',
                            background:
                              star >= 4
                                ? 'linear-gradient(90deg, #10B981, #059669)'
                                : star === 3
                                ? '#FBBF24'
                                : '#EF4444',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>

                      <div
                        style={{
                          width: '65px',
                          textAlign: 'right',
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{count}</span>{' '}
                        <span>({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.85rem 0',
                borderTop: '1px solid var(--border-subtle)',
                marginTop: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginRight: '0.25rem',
                  }}
                >
                  <Filter size={13} /> Filter:
                </span>

                <button
                  onClick={() => setFilterStar('all')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: filterStar === 'all' ? 'var(--google-blue)' : 'var(--border-subtle)',
                    background: filterStar === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.04)',
                    color: filterStar === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  All ({totalCount})
                </button>

                {[5, 4, 3, 2, 1].map((s) => {
                  const isSelected = filterStar === s;
                  const count = distribution[s as 1 | 2 | 3 | 4 | 5] || 0;
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStar(s)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--google-yellow)' : 'var(--border-subtle)',
                        background: isSelected ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? 'var(--google-yellow)' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>{s}★</span>
                      <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Only with comments checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyWithComments}
                  onChange={(e) => setOnlyWithComments(e.target.checked)}
                  style={{
                    width: '15px',
                    height: '15px',
                    accentColor: 'var(--google-blue)',
                    cursor: 'pointer',
                  }}
                />
                <span>Only with Comments ({commentsCount})</span>
              </label>
            </div>

            {/* Comments & Highlights Feed */}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {filteredFeedback.length === 0 ? (
                <div
                  style={{
                    padding: '2.5rem',
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  No feedback matching the selected filter.
                </div>
              ) : (
                filteredFeedback.map((fb) => {
                  const hasComment = Boolean(fb.comment && fb.comment.trim().length > 0);
                  const isAnon = fb.is_anonymous;
                  const submitterName = fb.profile?.full_name || fb.registration?.full_name;

                  return (
                    <div
                      key={fb.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '14px',
                        padding: '1.25rem 1.4rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        transition: 'border-color 0.2s ease',
                      }}
                    >
                      {/* Top Row: Submitter info + Star rating + Date */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.6rem',
                        }}
                      >
                        {/* Submitter Badge */}
                        <div>
                          {isAnon ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'rgba(66, 133, 244, 0.12)',
                                color: '#93C5FD',
                                border: '1px solid rgba(66, 133, 244, 0.25)',
                              }}
                            >
                              <Shield size={13} /> Anonymous Attendee
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: 'rgba(52, 168, 83, 0.12)',
                                color: '#86EFAC',
                                border: '1px solid rgba(52, 168, 83, 0.25)',
                              }}
                            >
                              <UserCheck size={13} /> {submitterName || 'Verified Attendee'}
                            </span>
                          )}
                        </div>

                        {/* Rating Stars & Timestamp */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={15}
                                fill={star <= fb.rating ? '#FBBC04' : 'transparent'}
                                color={star <= fb.rating ? '#FBBC04' : '#475569'}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Comment Body */}
                      {hasComment ? (
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.88rem',
                            color: '#E2E8F0',
                            lineHeight: 1.6,
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            fontStyle: 'italic',
                          }}
                        >
                          &ldquo;{fb.comment}&rdquo;
                        </p>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          (Rating submitted without written comment)
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
