'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ExternalLink,
  Award,
  FileText,
  User,
  Sparkles,
  BookOpen,
  HelpCircle,
  Filter,
  Check,
  X,
  Send,
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  CourseDetailHeader,
  TaskOption,
  SubmissionItem,
  gradeStudentSubmission,
} from '@/app/student-portal/admin/courses/[id]/submissions/actions';
import { TaskSubmissionStatus } from '@/types/student';

interface CourseSubmissionsClientProps {
  course: CourseDetailHeader;
  initialTasks: TaskOption[];
  initialSubmissions: SubmissionItem[];
  canManage: boolean;
  userRole?: string;
}

export function CourseSubmissionsClient({
  course,
  initialTasks,
  initialSubmissions,
  canManage,
  userRole,
}: CourseSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>(initialSubmissions);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Grading Modal State
  const [evaluatingSub, setEvaluatingSub] = useState<SubmissionItem | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<TaskSubmissionStatus>('graded');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeModalError, setGradeModalError] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      // Task filter
      if (selectedTaskId !== 'all' && sub.task_id !== selectedTaskId) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending') {
          if (sub.status !== 'submitted' && sub.status !== 'pending') return false;
        } else if (sub.status !== selectedStatus) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (sub.student.full_name_en || sub.student.full_name_ar || '').toLowerCase();
        const studentEmail = sub.student.email.toLowerCase();
        const taskTitle = sub.task.title.toLowerCase();
        const link = (sub.submission_link || '').toLowerCase();

        return (
          studentName.includes(q) ||
          studentEmail.includes(q) ||
          taskTitle.includes(q) ||
          link.includes(q)
        );
      }

      return true;
    });
  }, [submissions, selectedTaskId, selectedStatus, searchQuery]);

  // KPI Metrics
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'pending').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded' || s.status === 'final').length;
  const revisionCount = submissions.filter((s) => s.status === 'needs_revision').length;

  const averageScore = useMemo(() => {
    const gradedList = submissions.filter((s) => (s.status === 'graded' || s.status === 'final') && s.score !== null);
    if (gradedList.length === 0) return null;
    const sum = gradedList.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Math.round(sum / gradedList.length);
  }, [submissions]);

  // Open Grading Drawer / Modal
  const handleOpenEvaluate = (sub: SubmissionItem) => {
    setEvaluatingSub(sub);
    setScoreInput(sub.score !== null && sub.score !== undefined ? String(sub.score) : String(sub.task.max_score));
    setFeedbackInput(sub.feedback_comment || '');
    setStatusInput(sub.status === 'needs_revision' ? 'needs_revision' : 'graded');
    setGradeModalError(null);
  };

  // Submit Grade
  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingSub) return;

    const numericScore = parseFloat(scoreInput);
    if (isNaN(numericScore) || numericScore < 0) {
      setGradeModalError('Please enter a valid non-negative score.');
      return;
    }

    if (numericScore > evaluatingSub.task.max_score) {
      setGradeModalError(`Score cannot exceed maximum points (${evaluatingSub.task.max_score}).`);
      return;
    }

    try {
      setIsSubmittingGrade(true);
      setGradeModalError(null);

      const res = await gradeStudentSubmission({
        submissionId: evaluatingSub.id,
        courseId: course.id,
        score: numericScore,
        feedbackComment: feedbackInput,
        status: statusInput,
      });

      if (!res.success) {
        setGradeModalError(res.error || 'Failed to save evaluation.');
        return;
      }

      // Update state locally
      setSubmissions((prev) =>
        prev.map((s) => {
          if (s.id === evaluatingSub.id) {
            return {
              ...s,
              score: numericScore,
              feedback_comment: feedbackInput.trim() || null,
              status: statusInput,
              graded_at: new Date().toISOString(),
              grader: {
                id: 'me',
                full_name: 'Me (Instructor)',
                avatar_url: null,
              },
            };
          }
          return s;
        })
      );

      setActionToast({
        type: 'success',
        text: res.message || 'Submission graded successfully!',
      });
      setEvaluatingSub(null);

      setTimeout(() => {
        setActionToast(null);
      }, 4000);
    } catch (err: any) {
      setGradeModalError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '2.5rem 2rem 4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Top Breadcrumbs & Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
          <Link
            href="/student-portal/admin/courses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#60A5FA',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Courses
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <Link
            href={`/student-portal/admin/courses/${course.id}/tasks`}
            style={{ color: '#94A3B8', textDecoration: 'none', fontWeight: 600 }}
          >
            Tasks
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Submissions & Grading</span>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/courses/${course.id}/tasks`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <FileText size={15} style={{ color: '#FBBF24' }} />
            Manage Tasks
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/lessons`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <BookOpen size={15} style={{ color: '#60A5FA' }} />
            Curriculum
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/quizzes`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#C084FC',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <HelpCircle size={15} style={{ color: '#C084FC' }} />
            Quizzes
          </Link>

          <Link
            href={`/student/courses/${course.id}`}
            target="_blank"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#60A5FA',
              fontSize: '0.84rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} />
            Student View
          </Link>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionToast && (
        <div
          style={{
            padding: '1rem 1.4rem',
            borderRadius: '12px',
            background:
              actionToast.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${actionToast.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: actionToast.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {actionToast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {actionToast.text}
        </div>
      )}

      {/* Hero Header Card */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem 2.25rem',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.76rem',
              fontWeight: 800,
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#FBBF24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            MENTOR REVIEW PANEL
          </span>
          {course.department_name && (
            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#CBD5E1',
              }}
            >
              {course.department_name}
            </span>
          )}
        </div>

        <div>
          <h1 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.3rem)', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
            {course.title} — Submissions & Grading
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.94rem', margin: '0.4rem 0 0 0', lineHeight: 1.6 }}>
            Evaluate student practical assignments, inspect source code repositories and project links, provide constructive feedback comments, and record official scores.
          </p>
        </div>

        {/* Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '1rem',
            paddingTop: '0.5rem',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Submissions
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
              {totalCount}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}>
              Pending Evaluation
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.2rem' }}>
              {pendingCount}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.08)',
              border: '1px solid rgba(52, 168, 83, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
              Evaluated & Graded
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34D399', marginTop: '0.2rem' }}>
              {gradedCount}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(234, 67, 53, 0.08)',
              border: '1px solid rgba(234, 67, 53, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#F87171', fontWeight: 700, textTransform: 'uppercase' }}>
              Needs Revision
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F87171', marginTop: '0.2rem' }}>
              {revisionCount}
            </div>
          </div>

          <div
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(66, 133, 244, 0.08)',
              border: '1px solid rgba(66, 133, 244, 0.25)',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
              Average Score
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>
              {averageScore !== null ? `${averageScore}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          {/* Task Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={16} style={{ color: '#94A3B8' }} />
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0F172A', color: '#FFF' }}>
                All Tasks ({initialTasks.length})
              </option>
              {initialTasks.map((t) => (
                <option key={t.id} value={t.id} style={{ background: '#0F172A', color: '#FFF' }}>
                  {t.title} ({t.max_score} Pts)
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: '#94A3B8' }} />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all" style={{ background: '#0F172A', color: '#FFF' }}>
                All Statuses
              </option>
              <option value="pending" style={{ background: '#0F172A', color: '#FFF' }}>
                Pending Review ({pendingCount})
              </option>
              <option value="graded" style={{ background: '#0F172A', color: '#FFF' }}>
                Graded ({gradedCount})
              </option>
              <option value="needs_revision" style={{ background: '#0F172A', color: '#FFF' }}>
                Needs Revision ({revisionCount})
              </option>
            </select>
          </div>

          {/* Student / Task Search */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, or URL..."
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
          Showing <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{filteredSubmissions.length}</span> of {submissions.length} submissions
        </div>
      </div>

      {/* Submissions List / Table */}
      {filteredSubmissions.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4.5rem 2rem',
            textAlign: 'center',
            borderRadius: '20px',
            color: '#94A3B8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Award size={48} style={{ color: '#475569', marginBottom: '0.5rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
            No Submissions Match Your Filter
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', maxWidth: '440px', lineHeight: 1.5 }}>
            {submissions.length === 0
              ? 'Students enrolled in this course have not submitted any assignments yet.'
              : 'Try clearing your search query or selecting a different status/task filter.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredSubmissions.map((sub) => {
            const isGraded = sub.status === 'graded' || sub.status === 'final';
            const isPending = sub.status === 'submitted' || sub.status === 'pending';
            const isRevision = sub.status === 'needs_revision';
            const studentName = sub.student.full_name_en || sub.student.full_name_ar || 'Registered Student';

            return (
              <div
                key={sub.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem 1.75rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left: Student & Task Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', minWidth: '280px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4285F4, #34A853)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {sub.student.avatar_url ? (
                      <img src={sub.student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      studentName.slice(0, 1).toUpperCase()
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {studentName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                      {sub.student.email}
                      {sub.student.university ? ` • ${sub.student.university}` : ''}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#CBD5E1',
                        }}
                      >
                        Task: {sub.task.title}
                      </span>
                      {sub.task.lesson && (
                        <span
                          style={{
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(66, 133, 244, 0.15)',
                            color: '#60A5FA',
                          }}
                        >
                          Lesson #{sub.task.lesson.lesson_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Submission URL & Timestamp */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '220px' }}>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>
                    Submitted {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  {sub.submission_link ? (
                    <a
                      href={sub.submission_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#60A5FA',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <ExternalLink size={13} style={{ flexShrink: 0 }} />
                      {sub.submission_link}
                    </a>
                  ) : sub.submission_file_drive_id ? (
                    <span style={{ fontSize: '0.82rem', color: '#E2E8F0', fontWeight: 600 }}>
                      Drive File: {sub.submission_file_drive_id}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontStyle: 'italic' }}>
                      No link provided
                    </span>
                  )}

                  {sub.feedback_comment && (
                    <div style={{ fontSize: '0.76rem', color: '#34D399', marginTop: '0.15rem' }}>
                      Feedback: &ldquo;{sub.feedback_comment.length > 50 ? sub.feedback_comment.slice(0, 50) + '...' : sub.feedback_comment}&rdquo;
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div style={{ minWidth: '130px', textAlign: 'center' }}>
                  {isGraded ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.3rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          background: 'rgba(52, 168, 83, 0.2)',
                          color: '#34D399',
                          border: '1px solid rgba(52, 168, 83, 0.35)',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        {sub.score} / {sub.task.max_score} Pts
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                        {Math.round(((sub.score || 0) / sub.task.max_score) * 100)}%
                      </span>
                    </div>
                  ) : isRevision ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: 'rgba(234, 67, 53, 0.2)',
                        color: '#F87171',
                        border: '1px solid rgba(234, 67, 53, 0.35)',
                      }}
                    >
                      <AlertTriangle size={13} />
                      Needs Revision
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#FBBF24',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      <Clock size={13} />
                      Pending Evaluation
                    </span>
                  )}
                </div>

                {/* Right: Evaluation CTA */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenEvaluate(sub)}
                    style={{
                      padding: '0.6rem 1.2rem',
                      borderRadius: '10px',
                      background: isGraded ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #4285F4, #1D4ED8)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Award size={15} />
                    {isGraded ? 'Edit Grade' : 'Evaluate & Grade'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GRADING & EVALUATION MODAL */}
      {/* ========================================================================= */}
      {evaluatingSub && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => !isSubmittingGrade && setEvaluatingSub(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              maxHeight: '90vh',
              borderRadius: '20px',
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(30, 41, 59, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={20} style={{ color: '#FBBF24' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Evaluate Student Assignment
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingGrade}
                onClick={() => setEvaluatingSub(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.4rem',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={handleSaveGrade}
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                overflowY: 'auto',
              }}
            >
              {/* Student Header Summary */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Student
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.1rem' }}>
                    {evaluatingSub.student.full_name_en || evaluatingSub.student.full_name_ar || 'Registered Student'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
                    {evaluatingSub.student.email}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Assignment
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.1rem' }}>
                    {evaluatingSub.task.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1' }}>
                    Max: {evaluatingSub.task.max_score} Points
                  </div>
                </div>
              </div>

              {/* Solution Link / File Card */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(66, 133, 244, 0.08)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                    Submitted Solution URL
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      marginTop: '0.2rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '360px',
                    }}
                  >
                    {evaluatingSub.submission_link || evaluatingSub.submission_file_drive_id || 'No link provided'}
                  </div>
                </div>

                {evaluatingSub.submission_link && (
                  <a
                    href={evaluatingSub.submission_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: '8px',
                      background: '#4285F4',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                    }}
                  >
                    Open Project
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {gradeModalError && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(234, 67, 53, 0.15)',
                    border: '1px solid rgba(234, 67, 53, 0.35)',
                    color: '#F87171',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  {gradeModalError}
                </div>
              )}

              {/* Score Input & Quick Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#CBD5E1' }}>
                    Official Grade Score (Max: {evaluatingSub.task.max_score})
                  </label>
                  {scoreInput && !isNaN(parseFloat(scoreInput)) && (
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34D399' }}>
                      {Math.round((parseFloat(scoreInput) / evaluatingSub.task.max_score) * 100)}%
                    </span>
                  )}
                </div>

                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={evaluatingSub.task.max_score}
                  value={scoreInput}
                  onChange={(e) => setScoreInput(e.target.value)}
                  placeholder={`0 - ${evaluatingSub.task.max_score}`}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    outline: 'none',
                  }}
                />

                {/* Score Preset Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginRight: '0.2rem' }}>Presets:</span>
                  {[
                    { label: 'Full Marks (100%)', val: evaluatingSub.task.max_score },
                    { label: '90%', val: Math.round(evaluatingSub.task.max_score * 0.9) },
                    { label: '80%', val: Math.round(evaluatingSub.task.max_score * 0.8) },
                    { label: '70%', val: Math.round(evaluatingSub.task.max_score * 0.7) },
                    { label: 'Pass (60%)', val: Math.round(evaluatingSub.task.max_score * 0.6) },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setScoreInput(String(p.val))}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#CBD5E1',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#CBD5E1' }}>
                  Evaluation Outcome Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setStatusInput('graded')}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border:
                        statusInput === 'graded'
                          ? '1px solid rgba(52, 168, 83, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                      background:
                        statusInput === 'graded'
                          ? 'rgba(52, 168, 83, 0.18)'
                          : 'rgba(255, 255, 255, 0.03)',
                      color: statusInput === 'graded' ? '#34D399' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    Mark as Graded
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusInput('needs_revision')}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      border:
                        statusInput === 'needs_revision'
                          ? '1px solid rgba(245, 158, 11, 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                      background:
                        statusInput === 'needs_revision'
                          ? 'rgba(245, 158, 11, 0.18)'
                          : 'rgba(255, 255, 255, 0.03)',
                      color: statusInput === 'needs_revision' ? '#FBBF24' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <AlertTriangle size={16} />
                    Request Revision
                  </button>
                </div>
              </div>

              {/* Feedback Comment Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#CBD5E1' }}>
                  Mentor Feedback & Review Notes
                </label>
                <textarea
                  rows={4}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder="Provide constructive feedback: praise what they did well, point out edge cases, code quality observations, or suggestions for improvements..."
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  disabled={isSubmittingGrade}
                  onClick={() => setEvaluatingSub(null)}
                  style={{
                    padding: '0.65rem 1.15rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    color: '#94A3B8',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingGrade}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4285F4, #1D4ED8)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: isSubmittingGrade ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Send size={15} />
                  {isSubmittingGrade ? 'Saving...' : 'Save Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
