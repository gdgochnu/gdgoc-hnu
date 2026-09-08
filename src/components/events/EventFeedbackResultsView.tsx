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
  BarChart2,
  Smile,
  Frown,
  Meh,
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

  // Percentage calculations
  const getPercent = (count: number) => {
    if (totalCount === 0) return 0;
    return Math.round((count / totalCount) * 100);
  };

  const positivePercent = getPercent((distribution[5] || 0) + (distribution[4] || 0));

  return (
    <div className="glass-panel overflow-hidden relative" style={{ padding: 0 }}>
      {/* Top Google Bar Accent */}
      <div className="h-1 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

      <div className="p-6 sm:p-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Event Feedback &amp; Satisfaction
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Aggregated attendee ratings, satisfaction metrics, and comment highlights (Spec §4.18).
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopySurveyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
              title="Copy public survey link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Share Survey Link</span>
                </>
              )}
            </button>

            <Link
              href={`/events/${eventSlugOrId}/feedback`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold border border-blue-500/30 transition"
            >
              <span>Submit / View My Feedback</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* When Total Count === 0 */}
        {totalCount === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
              <MessageSquare className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              No Feedback Submitted Yet
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              {isEventCompleted
                ? 'Survey invitations were dispatched to all attendees. Results and quotes will automatically appear here as attendees respond.'
                : 'Surveys are automatically sent out to all attendees when the event transitions to Completed.'}
            </p>
            <Link
              href={`/events/${eventSlugOrId}/feedback`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-blue-400 transition"
            >
              Be the First to Leave Feedback &rarr;
            </Link>
          </div>
        ) : (
          <>
            {/* KPI & Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-8">
              {/* Overall Score Card */}
              <div className="md:col-span-4 rounded-2xl bg-gradient-to-br from-[#1E293B]/40 to-[#0F172A]/80 border border-white/10 p-6 flex flex-col justify-between text-center relative overflow-hidden shadow-inner">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Average Satisfaction Score
                  </span>
                  <div className="flex items-baseline justify-center gap-1.5">
                    <span className="text-5xl sm:text-6xl font-black text-white tracking-tight">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-xl text-slate-500 font-bold">/ 5.0</span>
                  </div>

                  {/* Stars Graphic */}
                  <div className="flex items-center justify-center gap-1 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= Math.round(averageRating)
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,188,4,0.3)]'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Sentiment Pill */}
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <ThumbsUp className="w-3 h-3" />
                      {positivePercent}% Positive Ratings
                    </span>
                  </div>
                </div>

                {/* Sub-Metrics Summary */}
                <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-white/10 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{totalCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-400">{commentsCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Comments</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-400">{anonymousCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Anonymous</div>
                  </div>
                </div>
              </div>

              {/* Star Distribution Progress Bars */}
              <div className="md:col-span-8 rounded-2xl bg-[#0B0F19]/60 border border-white/10 p-6 flex flex-col justify-center space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <span>Rating Breakdown</span>
                  <span>{totalCount} Responses</span>
                </div>

                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
                  const pct = getPercent(count);

                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => setFilterStar(filterStar === star ? 'all' : star)}
                        className={`flex items-center gap-1 w-14 font-semibold transition ${
                          filterStar === star ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{star}</span>
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </button>

                      <div className="flex-1 h-3 rounded-full bg-slate-800/80 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${pct}%`,
                            background:
                              star >= 4
                                ? 'linear-gradient(90deg, #10B981, #059669)'
                                : star === 3
                                ? '#FBBF24'
                                : '#EF4444',
                          }}
                        />
                      </div>

                      <div className="w-16 text-right font-mono text-slate-400">
                        <span className="text-white font-bold">{count}</span>{' '}
                        <span className="text-[10px] text-slate-500">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>

                <button
                  onClick={() => setFilterStar('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterStar === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  All Stars ({totalCount})
                </button>

                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStar(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      filterStar === s
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{s}★</span>
                    <span className="text-[10px] opacity-75">
                      ({distribution[s as 1 | 2 | 3 | 4 | 5] || 0})
                    </span>
                  </button>
                ))}
              </div>

              {/* Only with comments toggle */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={onlyWithComments}
                  onChange={(e) => setOnlyWithComments(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Only with Comments ({commentsCount})</span>
              </label>
            </div>

            {/* Comments & Highlights Feed */}
            <div className="mt-6 space-y-4">
              {filteredFeedback.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
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
                      className="rounded-xl bg-[#0B0F19]/70 border border-white/10 p-5 hover:border-white/20 transition space-y-3"
                    >
                      {/* Top Row: Submitter info + Star rating + Date */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Submitter Badge */}
                        <div className="flex items-center gap-2">
                          {isAnon ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Shield className="w-3 h-3" /> Anonymous Attendee
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <UserCheck className="w-3 h-3" /> {submitterName || 'Verified Attendee'}
                            </span>
                          )}
                        </div>

                        {/* Rating Stars & Timestamp */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= fb.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Comment Body */}
                      {hasComment ? (
                        <p className="text-sm text-slate-200 leading-relaxed bg-white/5 rounded-lg p-3.5 border border-white/5 italic">
                          "{fb.comment}"
                        </p>
                      ) : (
                        <span className="text-xs text-slate-500 italic">
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
