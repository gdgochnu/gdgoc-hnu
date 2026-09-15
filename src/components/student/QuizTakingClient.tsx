'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Award,
  HelpCircle,
  Sparkles,
  BookOpen,
  Send,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import {
  StudentQuizData,
  submitQuizAttempt,
  SubmitQuizAnswerPayload,
  SubmitQuizResult,
} from '@/app/student/courses/[id]/quizzes/[quizId]/take/actions';
import { QuizAttempt } from '@/types/student';

interface QuizTakingClientProps {
  courseId: string;
  courseTitle: string;
  quiz: StudentQuizData;
  existingAttempts: QuizAttempt[];
  canAttempt: boolean;
  nextAttemptNumber: number;
  reason?: string;
  initialMode?: 'take' | 'review';
}

export function QuizTakingClient({
  courseId,
  courseTitle,
  quiz,
  existingAttempts,
  canAttempt: initialCanAttempt,
  nextAttemptNumber,
  reason,
  initialMode = 'take',
}: QuizTakingClientProps) {
  const router = useRouter();

  // Answers state: question_id -> answer value
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitQuizResult | null>(null);

  // Timer states (in seconds)
  const totalSecondsAllowed = quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null;
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(totalSecondsAllowed);
  const [hasTimeExpired, setHasTimeExpired] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Show previous attempts review if mode is 'review' or student cannot take quiz now
  const latestAttempt = existingAttempts[existingAttempts.length - 1];
  const [viewingPastAttempt, setViewingPastAttempt] = useState<QuizAttempt | null>(
    (initialMode === 'review' || !initialCanAttempt) && latestAttempt ? latestAttempt : null
  );

  // Countdown timer effect
  useEffect(() => {
    if (totalSecondsAllowed === null || viewingPastAttempt || submissionResult) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timer);
          setHasTimeExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [totalSecondsAllowed, viewingPastAttempt, submissionResult]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (hasTimeExpired && !submissionResult && !isSubmitting) {
      handleFinalSubmit();
    }
  }, [hasTimeExpired]);

  // Format time remaining MM:SS
  const formatTime = (secs: number | null) => {
    if (secs === null) return 'Untimed';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== ''
  ).length;

  const handleSelectAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const payload: SubmitQuizAnswerPayload[] = quiz.questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id],
      }));

      const res = await submitQuizAttempt(courseId, quiz.id, payload, timeSpent);
      if (res.success && res.attempt) {
        setSubmissionResult(res);
      } else {
        alert(res.error || 'Failed to submit quiz.');
        setIsSubmitting(false);
      }
    } catch {
      alert('An unexpected network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW: Results Screen (Instant post-submission OR Past Attempt)
  // -------------------------------------------------------------
  const displayedAttempt = submissionResult?.attempt || viewingPastAttempt;
  if (displayedAttempt) {
    const isPassed = displayedAttempt.passed;
    const isPending = displayedAttempt.status === 'submitted' && displayedAttempt.passed === null;
    const score = displayedAttempt.total_score ?? displayedAttempt.auto_graded_score ?? 0;
    const percentage = quiz.totalPoints > 0 ? Math.round((Number(score) / quiz.totalPoints) * 100) : 0;
    const evaluatedAnswers: any[] = Array.isArray(displayedAttempt.answers)
      ? displayedAttempt.answers
      : [];

    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', paddingBottom: '6rem' }}>
        {/* Top Header */}
        <div
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Link
              href={`/student/courses/${courseId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#94A3B8',
                fontSize: '0.85rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to {courseTitle}</span>
            </Link>

            <span style={{ color: '#C084FC', fontSize: '0.85rem', fontWeight: 700 }}>
              Assessment Results
            </span>
          </div>
        </div>

        {/* Results Container */}
        <div style={{ maxWidth: '960px', margin: '2rem auto', padding: '0 1.5rem' }}>
          {/* Result Banner */}
          <div
            style={{
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              marginBottom: '2rem',
              position: 'relative',
              overflow: 'hidden',
              background: isPending
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(79, 70, 229, 0.2))'
                : isPassed
                ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.2), rgba(16, 185, 129, 0.15))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.15))',
              border: `1px solid ${
                isPending
                  ? 'rgba(168, 85, 247, 0.4)'
                  : isPassed
                  ? 'rgba(52, 168, 83, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)'
              }`,
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                margin: '0 auto 1.25rem auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isPending
                  ? 'rgba(168, 85, 247, 0.25)'
                  : isPassed
                  ? 'rgba(52, 168, 83, 0.25)'
                  : 'rgba(239, 68, 68, 0.25)',
                color: isPending ? '#C084FC' : isPassed ? '#34D399' : '#F87171',
              }}
            >
              {isPending ? (
                <Clock size={36} />
              ) : isPassed ? (
                <Award size={36} />
              ) : (
                <AlertTriangle size={36} />
              )}
            </div>

            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#FFFFFF' }}>
              {isPending
                ? 'Answers Submitted for Review'
                : isPassed
                ? 'Congratulations! You Passed'
                : 'Quiz Completed — Passing Mark Not Met'}
            </h1>

            <p style={{ color: '#CBD5E1', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto 1.75rem auto' }}>
              {isPending
                ? 'Your multiple choice answers have been scored. Open-ended questions will be reviewed by your course mentors.'
                : isPassed
                ? `Great job! You achieved ${percentage}%, exceeding the required passing score of ${quiz.passing_score_percentage}%.`
                : `You achieved ${percentage}%. The minimum required passing score is ${quiz.passing_score_percentage}%.`}
            </p>

            {/* Score Pill Breakdown */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2rem',
                padding: '1rem 2rem',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Your Score
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {score} / {quiz.totalPoints} pts
                </div>
              </div>

              <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)' }} />

              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Percentage
                </div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    color: isPassed ? '#34D399' : isPending ? '#C084FC' : '#F87171',
                  }}
                >
                  {percentage}%
                </div>
              </div>

              <div style={{ width: '1px', height: '40px', background: 'rgba(255, 255, 255, 0.1)' }} />

              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Passing Threshold
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#CBD5E1' }}>
                  {quiz.passing_score_percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              marginBottom: '2rem',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
              Question Breakdown
            </h2>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {quiz.allow_retakes && (!isPassed || quiz.allow_retakes) && (
                <button
                  type="button"
                  onClick={() => {
                    setViewingPastAttempt(null);
                    setSubmissionResult(null);
                    setAnswers({});
                    setCurrentQuestionIndex(0);
                    setSecondsRemaining(totalSecondsAllowed);
                    startTimeRef.current = Date.now();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Retake Quiz</span>
                </button>
              )}

              <Link
                href={`/student/courses/${courseId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <span>Back to Course</span>
              </Link>
            </div>
          </div>

          {/* Detailed Question Review Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {evaluatedAnswers.map((item, idx) => {
              const isCorrect = item.is_correct === true;
              const isShort = item.type === 'short_answer';
              const qDef = quiz.questions.find((q) => q.id === item.question_id) || quiz.questions[idx];

              const getDisplayAnswer = (val: any) => {
                if (val === null || val === undefined || val === '') return 'No answer recorded';
                if (item.type === 'multiple_choice' && qDef?.options && qDef.options.length > 0) {
                  if (typeof val === 'number' && qDef.options[val]) {
                    return qDef.options[val];
                  }
                  const num = parseInt(String(val), 10);
                  if (!isNaN(num) && String(num) === String(val).trim() && qDef.options[num]) {
                    return qDef.options[num];
                  }
                }
                return String(val);
              };

              return (
                <div
                  key={item.question_id || idx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.65)',
                    border: `1px solid ${
                      isShort
                        ? 'rgba(168, 85, 247, 0.3)'
                        : isCorrect
                        ? 'rgba(52, 168, 83, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'
                    }`,
                    borderRadius: '14px',
                    padding: '1.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isShort
                            ? 'rgba(168, 85, 247, 0.2)'
                            : isCorrect
                            ? 'rgba(52, 168, 83, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                          color: isShort ? '#C084FC' : isCorrect ? '#34D399' : '#F87171',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isShort
                          ? 'rgba(168, 85, 247, 0.15)'
                          : isCorrect
                          ? 'rgba(52, 168, 83, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        color: isShort ? '#C084FC' : isCorrect ? '#34D399' : '#F87171',
                      }}
                    >
                      {isShort
                        ? 'Pending Mentor Review'
                        : isCorrect
                        ? `+${item.points_awarded} / ${item.points_possible} pts`
                        : `0 / ${item.points_possible} pts`}
                    </span>
                  </div>

                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', margin: '0 0 1rem 0' }}>
                    {item.question_text}
                  </p>

                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: '#94A3B8' }}>Your Answer: </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isCorrect ? '#86EFAC' : isShort ? '#FFFFFF' : '#FCA5A5',
                        }}
                      >
                        {getDisplayAnswer(item.student_answer)}
                      </span>
                    </div>

                    {!isCorrect && !isShort && item.correct_answer !== undefined && (
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: '#94A3B8' }}>Correct Answer: </span>
                        <span style={{ fontWeight: 700, color: '#86EFAC' }}>
                          {getDisplayAnswer(item.correct_answer)}
                        </span>
                      </div>
                    )}

                    {item.explanation && (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          fontSize: '0.8rem',
                          color: '#94A3B8',
                        }}
                      >
                        <span style={{ color: '#C084FC', fontWeight: 600 }}>Explanation: </span>
                        {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: Ineligible / Blocked Screen
  // -------------------------------------------------------------
  if (!initialCanAttempt) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', padding: '4rem 1.5rem' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(251, 188, 4, 0.15)',
              color: '#FDE047',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <AlertCircle size={32} />
          </div>

          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.75rem 0' }}>
            Quiz Cannot Be Started
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
            {reason || 'You are not eligible to take this quiz at this time.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {latestAttempt && (
              <button
                type="button"
                onClick={() => setViewingPastAttempt(latestAttempt)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Review Past Attempt
              </button>
            )}

            <Link
              href={`/student/courses/${courseId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#CBD5E1',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to Course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: Active Exam Taking Interface
  // -------------------------------------------------------------
  const isTimeWarning = secondsRemaining !== null && secondsRemaining < 180;

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      {/* Top Fixed Header with Timer */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Left info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{courseTitle}</span>
              {quiz.lesson && (
                <span
                  style={{
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    background: 'rgba(66, 133, 244, 0.15)',
                    color: '#93C5FD',
                    fontWeight: 600,
                  }}
                >
                  Lesson {quiz.lesson.lesson_number}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              {quiz.title}
            </h1>
          </div>

          {/* Right Controls: Timer + Submit button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {totalSecondsAllowed !== null && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '10px',
                  background: isTimeWarning
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(168, 85, 247, 0.15)',
                  border: `1px solid ${
                    isTimeWarning
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(168, 85, 247, 0.4)'
                  }`,
                  color: isTimeWarning ? '#FCA5A5' : '#C084FC',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                <Clock size={16} />
                <span>{formatTime(secondsRemaining)}</span>
              </div>
            )}

            <button
              type="button"
              id="quiz-submit-trigger"
              onClick={() => setShowConfirmSubmit(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #34A853, #059669)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <Send size={14} />
              <span>Finish & Submit</span>
            </button>
          </div>
        </div>

        {/* Question Bubble Navigator */}
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '0.5rem 1.5rem 0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
          }}
        >
          {quiz.questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== '';
            const isCurrent = idx === currentQuestionIndex;

            return (
              <button
                key={q.id || idx}
                type="button"
                onClick={() => setCurrentQuestionIndex(idx)}
                style={{
                  minWidth: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: isCurrent
                    ? '2px solid #C084FC'
                    : isAnswered
                    ? '1px solid rgba(52, 168, 83, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: isCurrent
                    ? 'rgba(168, 85, 247, 0.3)'
                    : isAnswered
                    ? 'rgba(52, 168, 83, 0.2)'
                    : 'rgba(30, 41, 59, 0.6)',
                  color: isCurrent ? '#FFFFFF' : isAnswered ? '#86EFAC' : '#94A3B8',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Question Area */}
      <main style={{ flex: 1, maxWidth: '840px', width: '100%', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            minHeight: '420px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Question Header */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    color: '#C084FC',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                  {currentQuestion.type.replace('_', ' ')}
                </span>
              </div>

              <span
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#CBD5E1',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {currentQuestion.points} {currentQuestion.points === 1 ? 'Point' : 'Points'}
              </span>
            </div>

            {/* Question Text */}
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                lineHeight: 1.5,
                color: '#FFFFFF',
                marginBottom: '1.75rem',
              }}
            >
              {currentQuestion.question_text}
            </h2>

            {/* Interactive Answer Input */}
            {currentQuestion.type === 'multiple_choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(currentQuestion.options || []).map((opt, optIdx) => {
                  const isSelected =
                    answers[currentQuestion.id] === optIdx ||
                    answers[currentQuestion.id] === opt;

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, optIdx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        borderRadius: '10px',
                        background: isSelected
                          ? 'rgba(168, 85, 247, 0.18)'
                          : 'rgba(15, 23, 42, 0.6)',
                        border: `1px solid ${
                          isSelected
                            ? 'rgba(168, 85, 247, 0.6)'
                            : 'rgba(255, 255, 255, 0.08)'
                        }`,
                        color: isSelected ? '#FFFFFF' : '#CBD5E1',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#C084FC' : '#64748B'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? '#C084FC' : 'transparent',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && <CheckCircle2 size={16} style={{ color: '#0F172A' }} />}
                      </div>
                      <span style={{ fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400 }}>
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'true_false' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {['True', 'False'].map((val) => {
                  const isSelected = String(answers[currentQuestion.id]) === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectAnswer(currentQuestion.id, val)}
                      style={{
                        padding: '1.5rem',
                        borderRadius: '12px',
                        background: isSelected
                          ? 'rgba(52, 168, 83, 0.2)'
                          : 'rgba(15, 23, 42, 0.6)',
                        border: `2px solid ${
                          isSelected ? '#34D399' : 'rgba(255, 255, 255, 0.08)'
                        }`,
                        color: isSelected ? '#34D399' : '#CBD5E1',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'short_answer' && (
              <div>
                <textarea
                  rows={4}
                  placeholder="Type your response here..."
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '1rem',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.4rem', display: 'block' }}>
                  This open-ended answer will be reviewed and graded by the course instructor.
                </span>
              </div>
            )}
          </div>

          {/* Bottom Navigation Buttons */}
          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: currentQuestionIndex === 0 ? '#475569' : '#CBD5E1',
                cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              {answeredCount} of {totalQuestions} answered
            </span>

            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <span>Next Question</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #34A853, #059669)',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <span>Review & Submit</span>
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#C084FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <Send size={24} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', margin: '0 0 0.5rem 0' }}>
              Submit Your Assessment?
            </h3>

            <p style={{ color: '#94A3B8', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
              You have answered{' '}
              <strong style={{ color: '#FFFFFF' }}>
                {answeredCount} of {totalQuestions}
              </strong>{' '}
              questions. Once submitted, your score will be computed immediately.
            </p>

            {answeredCount < totalQuestions && (
              <div
                style={{
                  background: 'rgba(251, 188, 4, 0.1)',
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#FDE047',
                  fontSize: '0.8rem',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>You still have unanswered questions!</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#CBD5E1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Review Answers
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalSubmit}
                id="confirm-quiz-submit-button"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #34A853, #059669)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
