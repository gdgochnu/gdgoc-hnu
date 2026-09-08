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
  Clock,
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
      <div className="w-full max-w-2xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-[#131722] border border-emerald-500/30 shadow-2xl p-8 sm:p-10 text-center">
          {/* Top Google Brand Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] to-[#34A853]" />

          {/* Glowing Aura */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6 shadow-inner animate-bounce-subtle">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Feedback Recorded
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            Thank You for Your Feedback!
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto mb-8">
            Your opinion helps GDGoC Helwan National University craft higher-impact technical workshops, bootcamps, and hackathons.
          </p>

          {/* Submission Summary Card */}
          <div className="bg-[#0B0F19]/80 border border-white/10 rounded-xl p-6 text-left mb-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Event
              </span>
              <span className="text-sm font-bold text-blue-400">{event.title}</span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Your Rating
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= submittedFeedback.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-white">
                  {submittedDetails.emoji} {submittedDetails.text}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Identity Setting
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                {submittedFeedback.is_anonymous ? (
                  <>
                    <Shield className="w-3.5 h-3.5 text-blue-400" /> Anonymous
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Public
                  </>
                )}
              </span>
            </div>

            {submittedFeedback.comment && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Comments & Suggestions
                </span>
                <p className="text-sm text-slate-200 bg-white/5 rounded-lg p-3 italic border border-white/5">
                  "{submittedFeedback.comment}"
                </p>
              </div>
            )}
          </div>

          {/* Action Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/events/${event.slug || event.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Event Page
            </Link>
            <Link
              href="/events"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-sm font-semibold transition"
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
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-[#131722] border border-white/10 shadow-2xl p-6 sm:p-10">
        {/* Top 4-Color Google Brand Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC04] to-[#34A853]" />

        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Official Event Survey
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
            How was your experience?
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Please share your authentic thoughts on <span className="text-slate-200 font-semibold">{event.title}</span>. It only takes 30 seconds!
          </p>

          {/* Event Mini-Meta */}
          <div className="flex items-center justify-center flex-wrap gap-4 text-xs text-slate-400 mt-4 pt-3 border-t border-white/5">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" /> {event.event_date}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-400" /> {event.venue}
              </span>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Submission Notice</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Rating Stars Section */}
          <div className="space-y-3 text-center">
            <label className="block text-sm font-bold uppercase tracking-wider text-slate-300">
              Overall Satisfaction Rating <span className="text-red-400">*</span>
            </label>

            <div
              className="flex items-center justify-center gap-2 sm:gap-3 py-2"
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
                    className="p-2 sm:p-3 rounded-xl transition-all duration-200 transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <Star
                      className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors duration-200 ${
                        isLit
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,188,4,0.4)]'
                          : 'text-slate-600 hover:text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Dynamic Rating Label */}
            <div className="h-7 flex items-center justify-center">
              {ratingDetails ? (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border transition-all animate-fadeIn"
                  style={{
                    backgroundColor: `${ratingDetails.color}15`,
                    borderColor: `${ratingDetails.color}30`,
                    color: ratingDetails.color,
                  }}
                >
                  <span className="text-base">{ratingDetails.emoji}</span>
                  <span>{ratingDetails.text}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Click a star from 1 (Poor) to 5 (Excellent)</span>
              )}
            </div>
          </div>

          {/* 2. Optional Comment Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="feedback-comment" className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Comments & Suggestions
                <span className="text-xs text-slate-500 font-normal">(Optional)</span>
              </label>
              <span className={`text-xs ${comment.length > 900 ? 'text-amber-400' : 'text-slate-500'}`}>
                {comment.length} / 1000
              </span>
            </div>

            <textarea
              id="feedback-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="What did you like the most? Any ideas on how we can improve our sessions, speakers, or organization?"
              className="w-full rounded-xl bg-[#0B0F19] border border-white/10 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-none leading-relaxed"
            />
          </div>

          {/* 3. Anonymous-by-Default Toggle (Spec §4.18) */}
          <div className="rounded-xl bg-[#0B0F19]/60 border border-white/10 p-4 transition">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isAnonymous ? (
                    <Shield className="w-4 h-4 text-blue-400" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-sm font-bold text-white">
                    {isAnonymous ? 'Submit Anonymously' : 'Submit with My Name'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Default
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAnonymous
                    ? 'Your name and email will stay strictly confidential. Chapter organizers will only see the rating and comment.'
                    : `Your name (${userName || userEmail || 'your profile'}) will be attached so organizers can thank you for your input.`}
                </p>
              </div>

              {/* Accessible Custom Toggle */}
              <button
                type="button"
                id="feedback-anonymous-toggle"
                role="switch"
                aria-checked={isAnonymous}
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#131722] ${
                  isAnonymous ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4. Submit Button */}
          <div className="space-y-3 pt-2">
            <button
              type="submit"
              id="submit-feedback-button"
              disabled={isPending || rating === 0}
              className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                rating === 0 || isPending
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                  : 'bg-gradient-to-r from-[#4285F4] to-[#1A73E8] hover:from-[#3B78E7] hover:to-[#1765CC] text-white shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5'
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Feedback...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Feedback
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              By submitting, you contribute directly to improving future GDGoC Helwan National University activities.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
