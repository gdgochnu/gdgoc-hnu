'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Search,
  Filter,
  Check,
  X,
  Send,
  HelpCircle,
  FileCheck2,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import {
  QuizAttemptReviewItem,
  gradeQuizAttempt,
  SubmitManualGradeInput,
} from '@/app/student-portal/admin/courses/[id]/quizzes/[quizId]/review/actions';
import { QuizQuestion } from '@/types/student';

interface QuizReviewClientProps {
  courseId: string;
  courseTitle: string;
  quiz: {
    id: string;
    course_id: string;
    title: string;
    description: string;
    time_limit_minutes: number | null;
    passing_score_percentage: number;
    questions: QuizQuestion[];
    totalPoints: number;
    status: string;
  };
  initialAttempts: QuizAttemptReviewItem[];
}

export function QuizReviewClient({
  courseId,
  courseTitle,
  quiz,
  initialAttempts,
}: QuizReviewClientProps) {
  const [attempts, setAttempts] = useState<QuizAttemptReviewItem[]>(initialAttempts);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');

  // Grading Modal state
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptReviewItem | null>(null);
  const [questionGrades, setQuestionGrades] = useState<
    Record<string, { points_awarded: number; comment: string }>
  >({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const totalAttempts = attempts.length;
  const pendingAttempts = attempts.filter((a) => a.status === 'submitted').length;
  const passedAttempts = attempts.filter((a) => a.passed === true).length;
  const failedAttempts = attempts.filter((a) => a.passed === false).length;

  const filteredAttempts = attempts.filter((a) => {
    const studentName = a.student.full_name_en?.toLowerCase() || '';
    const studentEmail = a.student.email?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    const matchesSearch = studentName.includes(q) || studentEmail.includes(q);

    if (statusFilter === 'pending') return matchesSearch && a.status === 'submitted';
    if (statusFilter === 'graded') return matchesSearch && a.status === 'graded';
    return matchesSearch;
  });

  const openGradingModal = (attempt: QuizAttemptReviewItem) => {
    setSelectedAttempt(attempt);
    setOverallFeedback(attempt.feedback || '');

    // Pre-populate open-ended grades from existing answers
    const initialGrades: Record<string, { points_awarded: number; comment: string }> = {};
    (attempt.answers || []).forEach((ans: any) => {
      if (ans.type === 'short_answer' || !ans.is_auto_graded) {
        initialGrades[ans.question_id] = {
          points_awarded: Number(ans.points_awarded) || 0,
          comment: ans.manual_comment || '',
        };
      }
    });

    setQuestionGrades(initialGrades);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt) return;

    setIsSubmitting(true);
    try {
      const input: SubmitManualGradeInput = {
        course_id: courseId,
        quiz_id: quiz.id,
        attempt_id: selectedAttempt.id,
        question_grades: questionGrades,
        overall_feedback: overallFeedback,
      };

      const res = await gradeQuizAttempt(input);
      if (res.success && res.attempt) {
        setAttempts((prev) =>
          prev.map((a) => (a.id === res.attempt!.id ? res.attempt! : a))
        );
        setSelectedAttempt(null);
        showNotification('success', 'Student submission graded and finalized.');
      } else {
        showNotification('error', res.error || 'Failed to submit grade.');
      }
    } catch {
      showNotification('error', 'Network error during grading.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', paddingBottom: '5rem' }}>
      {/* Top Header */}
      <div
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link
              href={`/student-portal/admin/courses/${courseId}/quizzes`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#94A3B8',
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={16} />
              <span>Course Quizzes</span>
            </Link>
            <ChevronRight size={14} style={{ color: '#475569' }} />
            <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{quiz.title}</span>
            <ChevronRight size={14} style={{ color: '#475569' }} />
            <span style={{ color: '#C084FC', fontSize: '0.85rem', fontWeight: 600 }}>
              Submissions Review
            </span>
          </div>

          <Link
            href={`/student-portal/admin/courses/${courseId}/quizzes`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Back to Builder</span>
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Notification */}
        {notification && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background:
                notification.type === 'success'
                  ? 'rgba(52, 168, 83, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${
                notification.type === 'success'
                  ? 'rgba(52, 168, 83, 0.4)'
                  : 'rgba(239, 68, 68, 0.4)'
              }`,
              color: notification.type === 'success' ? '#86EFAC' : '#FCA5A5',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {notification.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Hero Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                color: '#C084FC',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              Assessment Review Panel
            </span>
            <span
              style={{
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(52, 168, 83, 0.15)',
                color: '#86EFAC',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              Passing Score: {quiz.passing_score_percentage}%
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#FFFFFF' }}>
            {quiz.title} — Attempts & Grading
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem', margin: 0, maxWidth: '750px' }}>
            Review student exam submissions, grade open-ended short answer questions, and provide
            instructor feedback.
          </p>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>{totalAttempts}</div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Total Submissions</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FDE047' }}>{pendingAttempts}</div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Pending Manual Grading</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399' }}>{passedAttempts}</div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Passed Attempts</div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F87171' }}>{failedAttempts}</div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Below Passing Threshold</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flex: '1',
              minWidth: '260px',
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
            }}
          >
            <Search size={16} style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student by name or email..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                width: '100%',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['all', 'pending', 'graded'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  background:
                    statusFilter === f
                      ? 'rgba(168, 85, 247, 0.25)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${
                    statusFilter === f
                      ? 'rgba(168, 85, 247, 0.5)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  color: statusFilter === f ? '#C084FC' : '#CBD5E1',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === f ? 700 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'pending' ? 'Pending Review' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Attempts Table */}
        {filteredAttempts.length === 0 ? (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <HelpCircle size={36} style={{ color: '#64748B', margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              No Attempts Found
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
              No student submissions match your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94A3B8',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '1rem 1.25rem' }}>Student</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Attempt #</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Submitted At</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Auto Score</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Manual Score</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Total Score</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((attempt) => {
                  const isPending = attempt.status === 'submitted';
                  const isPassed = attempt.passed === true;

                  return (
                    <tr
                      key={attempt.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: '#FFFFFF' }}>
                          {attempt.student.full_name_en}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          {attempt.student.email}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          #{attempt.attempt_number}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', color: '#94A3B8', fontSize: '0.8rem' }}>
                        {attempt.submitted_at
                          ? new Date(attempt.submitted_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'In progress'}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                        {attempt.auto_graded_score ?? 0} pts
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: isPending ? '#FDE047' : '#FFFFFF' }}>
                        {isPending ? 'Pending' : `${attempt.manual_graded_score ?? 0} pts`}
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {attempt.total_score ?? attempt.auto_graded_score ?? 0} / {quiz.totalPoints} pts
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isPending
                              ? 'rgba(251, 188, 4, 0.15)'
                              : isPassed
                              ? 'rgba(52, 168, 83, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                            color: isPending ? '#FDE047' : isPassed ? '#34D399' : '#F87171',
                          }}
                        >
                          {isPending ? 'Needs Grading' : isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openGradingModal(attempt)}
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            background: isPending
                              ? 'linear-gradient(135deg, #9333EA, #4F46E5)'
                              : 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isPending ? 'Grade Answers' : 'Inspect Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grading / Inspection Modal */}
      {selectedAttempt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
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
              borderRadius: '20px',
              width: '100%',
              maxWidth: '860px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: '#FFFFFF' }}>
                  Evaluate Attempt #{selectedAttempt.attempt_number}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  Student: {selectedAttempt.student.full_name_en} ({selectedAttempt.student.email})
                </div>
              </div>

              <button
                onClick={() => setSelectedAttempt(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.45rem',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleGradeSubmit}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Question items */}
              {(selectedAttempt.answers || []).map((ans: any, idx: number) => {
                const isShort = ans.type === 'short_answer';
                const qDef = quiz.questions.find((q) => q.id === ans.question_id) || quiz.questions[idx];

                const getDisplayAnswer = (val: any) => {
                  if (val === null || val === undefined || val === '') return 'No answer provided';
                  if (ans.type === 'multiple_choice' && qDef?.options && qDef.options.length > 0) {
                    if (typeof val === 'number' && qDef.options[val]) {
                      const opt = qDef.options[val];
                      return typeof opt === 'string' ? opt : (opt as any).text || String(opt);
                    }
                    const num = parseInt(String(val), 10);
                    if (!isNaN(num) && String(num) === String(val).trim() && qDef.options[num]) {
                      const opt = qDef.options[num];
                      return typeof opt === 'string' ? opt : (opt as any).text || String(opt);
                    }
                  }
                  return String(val);
                };

                return (
                  <div
                    key={ans.question_id || idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: `1px solid ${
                        isShort ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)'
                      }`,
                      borderRadius: '12px',
                      padding: '1.25rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: isShort
                              ? 'rgba(168, 85, 247, 0.2)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: isShort ? '#C084FC' : '#CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                          {ans.type.replace('_', ' ')}
                        </span>
                      </div>

                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Max Points: {ans.points_possible}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFFFFF', margin: '0 0 0.85rem 0' }}>
                      {ans.question_text}
                    </p>

                    {/* Student's answer box */}
                    <div
                      style={{
                        background: 'rgba(30, 41, 59, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        color: '#E2E8F0',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                        Student Answer:
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {getDisplayAnswer(ans.student_answer)}
                      </div>
                    </div>

                    {/* Grading Controls for Open-Ended */}
                    {isShort ? (
                      <div
                        style={{
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C084FC' }}>
                            Award Points (0 - {ans.points_possible}):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={ans.points_possible}
                            value={questionGrades[ans.question_id]?.points_awarded ?? 0}
                            onChange={(e) => {
                              const val = Math.min(
                                ans.points_possible,
                                Math.max(0, parseInt(e.target.value) || 0)
                              );
                              setQuestionGrades((prev) => ({
                                ...prev,
                                [ans.question_id]: {
                                  points_awarded: val,
                                  comment: prev[ans.question_id]?.comment || '',
                                },
                              }));
                            }}
                            style={{
                              width: '70px',
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.5rem',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              textAlign: 'center',
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Optional feedback note for this question..."
                            value={questionGrades[ans.question_id]?.comment || ''}
                            onChange={(e) => {
                              const comment = e.target.value;
                              setQuestionGrades((prev) => ({
                                ...prev,
                                [ans.question_id]: {
                                  points_awarded: prev[ans.question_id]?.points_awarded ?? 0,
                                  comment,
                                },
                              }));
                            }}
                            style={{
                              width: '100%',
                              background: 'rgba(15, 23, 42, 0.6)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '0.45rem 0.75rem',
                              color: '#FFFFFF',
                              fontSize: '0.8rem',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8rem',
                          color: '#94A3B8',
                        }}
                      >
                        <div>
                          Auto-graded score:{' '}
                          <strong
                            style={{
                              color: ans.is_correct ? '#34D399' : '#F87171',
                            }}
                          >
                            {ans.points_awarded} / {ans.points_possible} pts
                          </strong>
                        </div>
                        <div>Correct Answer: {getDisplayAnswer(ans.correct_answer)}</div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Overall Feedback */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#E2E8F0',
                    marginBottom: '0.4rem',
                  }}
                >
                  Overall Instructor Comments & Advice:
                </label>
                <textarea
                  rows={3}
                  value={overallFeedback}
                  onChange={(e) => setOverallFeedback(e.target.value)}
                  placeholder="Provide encouragement or targeted suggestions for improvement..."
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94A3B8',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? 'Finalizing Grade...' : 'Save & Finalize Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
