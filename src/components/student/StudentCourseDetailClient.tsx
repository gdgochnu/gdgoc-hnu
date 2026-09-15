'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
  MapPin,
  Video,
  Play,
  ExternalLink,
  FileText,
  ShieldCheck,
  GraduationCap,
  Download,
  AlertTriangle,
  Send,
  Lock,
  QrCode,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  X,
  Radio,
  FileCode,
  Share2,
} from 'lucide-react';
import {
  CourseDetailResult,
  CourseSessionDetail,
  CourseLessonDetail,
  StudentTaskDetail,
  QuizDetail,
  enrollInCourse,
  submitStudentTask,
} from '@/app/student/courses/actions';

interface StudentCourseDetailClientProps {
  initialData: CourseDetailResult;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/i
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function StudentCourseDetailClient({ initialData }: StudentCourseDetailClientProps) {
  const router = useRouter();
  const {
    course,
    instructors,
    sessions,
    lessons = [],
    tasks = [],
    quizzes = [],
    myEnrollment: initialMyEnrollment,
    canEnroll: initialCanEnroll,
    needsOnboarding,
    isAuthenticated,
    isStaff,
    adminManageUrl,
  } = initialData;

  const [activeTab, setActiveTab] = useState<'sessions' | 'lessons' | 'tasks' | 'quizzes'>('sessions');

  const [myEnrollment, setMyEnrollment] = useState(initialMyEnrollment);
  const [canEnroll, setCanEnroll] = useState(initialCanEnroll);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active modular session selection
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : ''
  );

  // Active lesson selection
  const [activeLessonId, setActiveLessonId] = useState<string>(
    lessons.length > 0 ? lessons[0].id : ''
  );

  // Tasks local state for dynamic updates
  const [tasksList, setTasksList] = useState<StudentTaskDetail[]>(tasks);
  const [submittingTask, setSubmittingTask] = useState<StudentTaskDetail | null>(null);
  const [taskSubmissionLink, setTaskSubmissionLink] = useState('');
  const [taskSubmissionDriveId, setTaskSubmissionDriveId] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
  const [taskModalSuccess, setTaskModalSuccess] = useState<string | null>(null);

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string; url?: string } | null>(null);

  const activeSessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
  const activeSession = sessions[activeSessionIndex] || sessions[0] || null;

  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLessonId);
  const activeLesson = lessons[activeLessonIndex] || lessons[0] || null;

  const totalHours = Math.round((course.total_duration_minutes || 120) / 60);
  const isConfirmed = myEnrollment?.status === 'confirmed';
  const isPending = myEnrollment?.status === 'pending';
  const isWaitlisted = myEnrollment?.status === 'waitlisted';

  // Attendance stats
  const attendedCount = sessions.filter((s) => s.is_attended).length;
  const attendanceRate = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/student?signin=true&returnUrl=/student/courses/${course.id}`);
      return;
    }

    if (needsOnboarding) {
      router.push('/student/onboarding');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionMessage(null);

      const res = await enrollInCourse(course.id);
      if (!res.success || !res.status) {
        setActionMessage({ type: 'error', text: res.error || 'Failed to complete enrollment.' });
        return;
      }

      setMyEnrollment({
        status: res.status,
        enrolled_at: new Date().toISOString(),
        confirmed_at: res.status === 'confirmed' ? new Date().toISOString() : null,
      });
      setCanEnroll(false);
      setActionMessage({ type: 'success', text: res.message || 'Enrollment processed successfully!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevSession = () => {
    if (activeSessionIndex > 0) {
      setActiveSessionId(sessions[activeSessionIndex - 1].id);
    }
  };

  const handleNextSession = () => {
    if (activeSessionIndex < sessions.length - 1) {
      setActiveSessionId(sessions[activeSessionIndex + 1].id);
    }
  };

  const handleOpenSubmitModal = (t: StudentTaskDetail) => {
    setSubmittingTask(t);
    setTaskSubmissionLink(t.my_submission?.submission_link || '');
    setTaskSubmissionDriveId(t.my_submission?.submission_file_drive_id || '');
    setTaskModalError(null);
    setTaskModalSuccess(null);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTask) return;

    if (submittingTask.submission_type === 'link' && !taskSubmissionLink.trim()) {
      setTaskModalError('Please provide a valid solution URL.');
      return;
    }

    try {
      setIsSubmittingTask(true);
      setTaskModalError(null);

      const res = await submitStudentTask({
        taskId: submittingTask.id,
        courseId: course.id,
        submissionLink: taskSubmissionLink.trim() || undefined,
        submissionFileDriveId: taskSubmissionDriveId.trim() || undefined,
      });

      if (!res.success) {
        setTaskModalError(res.error || 'Failed to submit assignment.');
        return;
      }

      setTaskModalSuccess('Assignment submitted successfully!');

      setTasksList((prev) =>
        prev.map((t) => {
          if (t.id === submittingTask.id) {
            return {
              ...t,
              my_submission: {
                id: t.my_submission?.id || 'temp-sub-id',
                status: 'submitted',
                submission_link: taskSubmissionLink.trim() || null,
                submission_file_drive_id: taskSubmissionDriveId.trim() || null,
                score: t.my_submission?.score || null,
                feedback_comment: t.my_submission?.feedback_comment || null,
                submitted_at: new Date().toISOString(),
                graded_at: t.my_submission?.graded_at || null,
              },
            };
          }
          return t;
        })
      );

      setTimeout(() => {
        setSubmittingTask(null);
        setTaskModalSuccess(null);
      }, 1000);
    } catch (err: any) {
      setTaskModalError(err.message || 'An error occurred while submitting.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '2rem 2.5rem 4rem 2.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Top Breadcrumb & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
          <Link
            href="/student/courses"
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
            Courses Catalog
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#94A3B8' }}>{course.category || 'Track'}</span>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{course.title}</span>
        </div>

        {/* Staff Management Quick Links */}
        {isStaff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={`/student-portal/admin/courses/${course.id}/lessons`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                color: '#60A5FA',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <BookOpen size={14} />
              Lessons Admin
            </Link>
            <Link
              href={`/student-portal/admin/courses/${course.id}/tasks`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#FBBF24',
                fontSize: '0.8rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <FileText size={14} />
              Tasks Admin
            </Link>
            {adminManageUrl && (
              <Link
                href={adminManageUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34D399',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <ShieldCheck size={14} />
                Sessions & Attendance
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: '1rem 1.4rem',
            borderRadius: '12px',
            background:
              actionMessage.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: actionMessage.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.92rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {actionMessage.text}
        </div>
      )}

      {/* Course Hero Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {course.category && (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  background: 'rgba(66, 133, 244, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                }}
              >
                {course.category}
              </span>
            )}

            {course.department_name && (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {course.department_name} ({course.department_code})
              </span>
            )}

            {/* Enrolled Status Pill in Hero (Replaces annoying repetitive banner) */}
            {isConfirmed ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: 'rgba(52, 168, 83, 0.2)',
                  color: '#34D399',
                  border: '1px solid rgba(52, 168, 83, 0.4)',
                }}
              >
                <CheckCircle2 size={13} />
                Enrolled Student • Active Track
              </span>
            ) : isPending ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  background: 'rgba(251, 188, 4, 0.2)',
                  color: '#FBBF24',
                  border: '1px solid rgba(251, 188, 4, 0.4)',
                }}
              >
                <Clock3 size={13} />
                Application Pending Review
              </span>
            ) : (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  background:
                    course.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.18)' : 'rgba(251, 188, 4, 0.18)',
                  color: course.enrollment_type === 'open' ? '#34D399' : '#FBBF24',
                  border: `1px solid ${course.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(251, 188, 4, 0.35)'}`,
                }}
              >
                {course.enrollment_type === 'open' ? 'Open Admission' : 'Application Required'}
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            {course.title}
          </h1>

          <p style={{ color: '#CBD5E1', fontSize: '1rem', lineHeight: 1.65, margin: 0 }}>
            {course.description ||
              'A structured learning journey developed by GDGoC technical teams to build industry-level technical competencies through interactive sessions and practical milestones.'}
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: '#60A5FA' }} />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {sessions.length} Sessions
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Interactive Curriculum</div>
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#34D399' }} />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  ~{totalHours} Total Hours
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Practical Training</div>
              </div>
            </div>

            {course.capacity && (
              <>
                <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: '#FBBF24' }} />
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {course.enrollment_count} / {course.capacity} Enrolled
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {course.is_full ? 'Capacity reached' : 'Registration open'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course Workspace Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'sessions', label: 'Sessions & Schedule', count: sessions.length, icon: Calendar },
          { key: 'lessons', label: 'Lessons & Curriculum', count: lessons.length, icon: BookOpen },
          { key: 'tasks', label: 'Tasks & Assignments', count: tasksList.length, icon: FileText },
          { key: 'quizzes', label: 'Quizzes & Tests', count: quizzes.length, icon: Sparkles },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                border: isActive ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(30, 41, 59, 0.9) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isActive ? '#60A5FA' : '#94A3B8',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span
                style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  background: isActive ? '#4285F4' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#FFFFFF' : '#CBD5E1',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Layout: Modular LMS Workspace */}
      {activeTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modular Session Navigator & Learning Progress */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Student Learning Progress Card (Only shown when enrolled) */}
          {isConfirmed ? (
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(52, 168, 83, 0.25)',
                background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.8rem', color: '#34D399', fontWeight: 700, textTransform: 'uppercase' }}>
                  My Course Progress
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {attendanceRate}%
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${attendanceRate}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #4285F4, #34A853)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8' }}>
                <span>{attendedCount} of {sessions.length} attended</span>
                <span>{sessions.length - attendedCount} remaining</span>
              </div>

              {/* Permanent QR Pass Shortcut */}
              <Link
                href="/student/my-qr"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  color: '#60A5FA',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  marginTop: '0.25rem',
                }}
              >
                <QrCode size={15} />
                Open Attendance QR Pass
              </Link>
            </div>
          ) : !isPending && canEnroll ? (
            /* Enrollment Action Box (Only shown if NOT yet enrolled) */
            <div
              className="glass-panel"
              style={{
                padding: '1.75rem',
                borderRadius: '16px',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                  Admission
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0 0 0' }}>
                  {course.enrollment_type === 'open' ? 'Join Course Track' : 'Apply for Admission'}
                </h3>
              </div>

              <p style={{ color: '#94A3B8', fontSize: '0.84rem', lineHeight: 1.5, margin: 0 }}>
                {course.enrollment_type === 'open'
                  ? 'Open admission program: click below to confirm your spot immediately.'
                  : 'Gated program: requires instructor approval before enrollment is confirmed.'}
              </p>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleEnroll}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: course.is_full ? '#A855F7' : '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                }}
              >
                {isSubmitting ? (
                  'Processing...'
                ) : course.is_full ? (
                  'Join Waitlist'
                ) : course.enrollment_type === 'open' ? (
                  <>
                    <Sparkles size={16} />
                    Enroll Now (Instant)
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          ) : myEnrollment?.status === 'rejected' ? (
            /* Rejected Application Notice */
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                background: 'linear-gradient(135deg, rgba(234, 67, 53, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F87171', fontWeight: 700, fontSize: '0.92rem' }}>
                <AlertCircle size={18} />
                Application Not Accepted
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                Your previous application for this track was not accepted. If the course instructors remove your rejected record or reconsider your submission, you will be able to apply again.
              </p>
            </div>
          ) : null}

          {/* Modular Sessions Navigator List */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>
                Course Sessions ({sessions.length})
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Select to view</span>
            </div>

            {sessions.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.84rem', padding: '1rem 0' }}>
                No sessions scheduled yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sessions.map((s, idx) => {
                  const isActive = s.id === activeSession?.id;
                  const isOnline = s.type === 'online';

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSessionId(s.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '12px',
                        border: isActive
                          ? '1px solid rgba(66, 133, 244, 0.5)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%)'
                          : 'rgba(255, 255, 255, 0.02)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: isActive
                              ? '#4285F4'
                              : isOnline
                              ? 'rgba(234, 67, 53, 0.15)'
                              : 'rgba(66, 133, 244, 0.12)',
                            color: isActive ? '#FFFFFF' : isOnline ? '#F87171' : '#60A5FA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                          }}
                        >
                          #{s.session_number}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color: isActive ? '#FFFFFF' : '#E2E8F0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {s.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                            {new Date(s.session_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            • {isOnline ? 'Online' : 'In-Person'}
                          </div>
                        </div>
                      </div>

                      {/* Attendance Badge on Item */}
                      {s.is_attended ? (
                        <span
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            background: 'rgba(52, 168, 83, 0.2)',
                            color: '#34D399',
                            flexShrink: 0,
                          }}
                        >
                          Attended
                        </span>
                      ) : (
                        <ChevronRight
                          size={14}
                          style={{ color: isActive ? '#60A5FA' : '#64748B', flexShrink: 0 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Instructors List Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
          >
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <GraduationCap size={16} style={{ color: '#34A853' }} />
              Teaching Staff ({instructors.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {instructors.map((ins) => (
                <div
                  key={ins.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.65rem',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: ins.role === 'instructor' ? '#4285F4' : '#10B981',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {ins.avatar_url ? (
                        <img src={ins.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        ins.full_name.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {ins.full_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                        {ins.department_name || ins.committee_role}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: ins.role === 'instructor' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                      color: ins.role === 'instructor' ? '#60A5FA' : '#34D399',
                    }}
                  >
                    {ins.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Focused Active Session Workspace */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          {activeSession ? (
            <div
              className="glass-panel"
              style={{
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.7)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Session Top Bar */}
              <div
                style={{
                  padding: '1.5rem 2rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: '#4285F4',
                        color: '#FFFFFF',
                      }}
                    >
                      SESSION #{activeSession.session_number}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: activeSession.type === 'online' ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                        color: activeSession.type === 'online' ? '#F87171' : '#60A5FA',
                        border: `1px solid ${activeSession.type === 'online' ? 'rgba(234, 67, 53, 0.3)' : 'rgba(66, 133, 244, 0.3)'}`,
                      }}
                    >
                      {activeSession.type === 'online' ? <Video size={13} /> : <MapPin size={13} />}
                      {activeSession.type === 'online' ? 'Online Session' : 'In-Person Workshop'}
                    </span>

                    {activeSession.is_attended && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          background: 'rgba(52, 168, 83, 0.2)',
                          color: '#34D399',
                          border: '1px solid rgba(52, 168, 83, 0.4)',
                        }}
                      >
                        <Check size={13} />
                        Attendance Recorded
                      </span>
                    )}
                  </div>

                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                    {activeSession.title}
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem', color: '#94A3B8', fontSize: '0.84rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={14} style={{ color: '#60A5FA' }} />
                      {new Date(activeSession.session_date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock size={14} style={{ color: '#34D399' }} />
                      {activeSession.start_time.slice(0, 5)} - {activeSession.end_time.slice(0, 5)}
                    </span>

                    {activeSession.duration_minutes && (
                      <span style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                        {Math.floor(activeSession.duration_minutes / 60)}h{' '}
                        {activeSession.duration_minutes % 60 > 0 ? `${activeSession.duration_minutes % 60}m` : ''} duration
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Stepper Navigation Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    disabled={activeSessionIndex === 0}
                    onClick={handlePrevSession}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: activeSessionIndex === 0 ? '#475569' : '#CBD5E1',
                      cursor: activeSessionIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    <ChevronLeft size={15} />
                    Prev
                  </button>

                  <button
                    type="button"
                    disabled={activeSessionIndex === sessions.length - 1}
                    onClick={handleNextSession}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: activeSessionIndex === sessions.length - 1 ? '#475569' : '#CBD5E1',
                      cursor: activeSessionIndex === sessions.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Session Body Content */}
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {/* Description */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>
                    Session Overview & Topics
                  </h4>
                  <p style={{ color: '#E2E8F0', fontSize: '0.94rem', lineHeight: 1.7, margin: 0 }}>
                    {activeSession.description || 'Detailed topic overview for this curriculum milestone.'}
                  </p>
                </div>

                {/* ONLINE INTERACTIVE BROADCAST / MEETING VIEWER */}
                {activeSession.type === 'online' && (
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
                      Online Session Access
                    </h4>

                    {/* Check if it's a Live Meeting (Google Meet / Zoom / Teams) */}
                    {activeSession.is_meeting ? (
                      <div
                        style={{
                          padding: '1.5rem',
                          borderRadius: '14px',
                          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.1) 100%)',
                          border: '1px solid rgba(66, 133, 244, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1.25rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '12px',
                              background: '#4285F4',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.4)',
                            }}
                          >
                            <Radio size={24} />
                          </div>

                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                              Live Interactive Classroom
                            </div>
                            <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginTop: '0.15rem' }}>
                              Join the real-time session via Google Meet / conference meeting room with your mentors.
                            </div>
                          </div>
                        </div>

                        {activeSession.youtube_url ? (
                          <a
                            href={activeSession.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '0.75rem 1.4rem',
                              borderRadius: '10px',
                              background: '#34A853',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              boxShadow: '0 4px 12px rgba(52, 168, 83, 0.4)',
                            }}
                          >
                            <Video size={17} />
                            Launch Live Meeting
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.84rem', color: '#FBBF24', fontWeight: 600 }}>
                            Meeting link will be shared 15 mins before start
                          </span>
                        )}
                      </div>
                    ) : (
                      /* YouTube Stream / Video Embed Player */
                      (() => {
                        const embedUrl = getYouTubeEmbedUrl(activeSession.youtube_url);
                        return embedUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div
                              style={{
                                position: 'relative',
                                width: '100%',
                                paddingTop: '56.25%', // 16:9 Aspect Ratio
                                borderRadius: '14px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                background: '#000000',
                                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                              }}
                            >
                              <iframe
                                src={embedUrl}
                                title={`${activeSession.title} Lecture Stream`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <a
                                href={activeSession.youtube_url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  color: '#EA4335',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                }}
                              >
                                <ExternalLink size={14} />
                                Open on YouTube
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              padding: '1.25rem',
                              borderRadius: '12px',
                              background: 'rgba(234, 67, 53, 0.08)',
                              border: '1px solid rgba(234, 67, 53, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.88rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
                              <Video size={17} style={{ color: '#EA4335' }} />
                              <span>Recorded video or stream broadcast:</span>
                            </div>
                            {activeSession.youtube_url ? (
                              <a
                                href={activeSession.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: '#EA4335',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                Open Video
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>Video lecture will be posted after session</span>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* IN-PERSON CLASSROOM VENUE INFO */}
                {activeSession.type === 'offline' && activeSession.venue && (
                  <div>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
                      In-Person Classroom Venue
                    </h4>

                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(66, 133, 244, 0.08)',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: '#4285F4',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <MapPin size={20} />
                      </div>

                      <div>
                        <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {activeSession.venue}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                          Helwan National University Campus • Please arrive 10 minutes before session start
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* INTERACTIVE LECTURE MATERIALS & FILES */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', margin: '0 0 0.75rem 0' }}>
                    Session Handouts & Materials ({activeSession.materials?.length || 0})
                  </h4>

                  {!activeSession.materials || activeSession.materials.length === 0 ? (
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#94A3B8',
                        fontSize: '0.86rem',
                      }}
                    >
                      No handouts uploaded for this session yet. Instructors will attach lecture slides prior to the
                      class.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                      {activeSession.materials.map((matId, mIdx) => (
                        <div
                          key={mIdx}
                          style={{
                            padding: '1rem',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(234, 67, 53, 0.15)',
                                color: '#EA4335',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Lecture Slide Deck #{mIdx + 1}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                                PDF Presentation Document
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}>
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewFile({
                                  id: matId,
                                  name: `Lecture Slide Deck #${mIdx + 1}`,
                                  url: matId.startsWith('http')
                                    ? matId
                                    : `https://drive.google.com/file/d/${matId}/preview`,
                                })
                              }
                              style={{
                                flex: 1,
                                padding: '0.45rem',
                                borderRadius: '6px',
                                background: 'rgba(66, 133, 244, 0.15)',
                                border: '1px solid rgba(66, 133, 244, 0.3)',
                                color: '#60A5FA',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <Eye size={13} />
                              Open / Preview
                            </button>

                            <a
                              href={
                                matId.startsWith('http')
                                  ? matId
                                  : `https://drive.google.com/uc?export=download&id=${matId}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#CBD5E1',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Download File"
                            >
                              <Download size={13} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ATTENDANCE CHECK-IN NOTICE & HR SCANNING BANNER */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: activeSession.is_attended
                      ? 'rgba(52, 168, 83, 0.1)'
                      : 'rgba(66, 133, 244, 0.08)',
                    border: `1px solid ${activeSession.is_attended ? 'rgba(52, 168, 83, 0.3)' : 'rgba(66, 133, 244, 0.2)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: activeSession.is_attended ? '#34A853' : '#4285F4',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {activeSession.is_attended ? <Check size={20} /> : <QrCode size={20} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {activeSession.is_attended
                          ? 'Attendance Status: Present ✓'
                          : 'Official Session Attendance Check-in'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '0.15rem' }}>
                        {activeSession.is_attended
                          ? 'Your attendance for this session has been confirmed and logged in your portal records.'
                          : 'Course instructors and Chapter HR scan your permanent student QR pass during or after class.'}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/student/my-qr"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <QrCode size={14} style={{ color: '#60A5FA' }} />
                    View My QR Pass
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="glass-panel"
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                borderRadius: '20px',
                color: '#94A3B8',
              }}
            >
              Select a session from the list on the left to view lecture materials and live access.
            </div>
          )}
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LESSONS & CURRICULUM */}
      {/* ========================================================================= */}
      {activeTab === 'lessons' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left Column: Lessons Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={17} style={{ color: '#60A5FA' }} />
                  Course Curriculum ({lessons.length})
                </h3>
              </div>

              {lessons.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.86rem' }}>
                  No lessons published yet for this course.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {lessons.map((l) => {
                    const isActive = l.id === activeLesson?.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setActiveLessonId(l.id)}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '12px',
                          border: isActive
                            ? '1px solid rgba(66, 133, 244, 0.5)'
                            : '1px solid rgba(255, 255, 255, 0.06)',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(30, 41, 59, 0.8) 100%)'
                            : 'rgba(255, 255, 255, 0.02)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: isActive ? '#4285F4' : 'rgba(66, 133, 244, 0.12)',
                              color: isActive ? '#FFFFFF' : '#60A5FA',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              flexShrink: 0,
                            }}
                          >
                            #{l.lesson_number}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.86rem',
                                fontWeight: 700,
                                color: isActive ? '#FFFFFF' : '#E2E8F0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {l.title}
                            </div>
                            {l.session_title && (
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                                Session #{l.session_number}: {l.session_title}
                              </div>
                            )}
                          </div>
                        </div>

                        {l.youtube_url && (
                          <Video size={14} style={{ color: '#F87171', flexShrink: 0 }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Teaching Staff Card */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <GraduationCap size={16} style={{ color: '#34A853' }} />
                Teaching Staff ({instructors.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {instructors.map((ins) => (
                  <div
                    key={ins.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.65rem',
                      padding: '0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: ins.role === 'instructor' ? '#4285F4' : '#10B981',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        {ins.avatar_url ? (
                          <img src={ins.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          ins.full_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {ins.full_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          {ins.department_name || ins.committee_role}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: ins.role === 'instructor' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                        color: ins.role === 'instructor' ? '#60A5FA' : '#34D399',
                      }}
                    >
                      {ins.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Active Lesson Workspace */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            {activeLesson ? (
              <div
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Lesson Header Bar */}
                <div
                  style={{
                    padding: '1.5rem 2rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: '#4285F4',
                          color: '#FFFFFF',
                        }}
                      >
                        LESSON #{activeLesson.lesson_number}
                      </span>
                      {activeLesson.session_title && (
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: 'rgba(52, 168, 83, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                          }}
                        >
                          Session #{activeLesson.session_number}: {activeLesson.session_title}
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                      {activeLesson.title}
                    </h2>
                  </div>

                  {/* Stepper Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button
                      type="button"
                      disabled={activeLessonIndex <= 0}
                      onClick={() => setActiveLessonId(lessons[activeLessonIndex - 1].id)}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: activeLessonIndex <= 0 ? '#475569' : '#CBD5E1',
                        cursor: activeLessonIndex <= 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      <ChevronLeft size={15} />
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={activeLessonIndex >= lessons.length - 1}
                      onClick={() => setActiveLessonId(lessons[activeLessonIndex + 1].id)}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: activeLessonIndex >= lessons.length - 1 ? '#475569' : '#CBD5E1',
                        cursor: activeLessonIndex >= lessons.length - 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      Next
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>

                {/* Video Player (if activeLesson.youtube_url) */}
                {activeLesson.youtube_url && (
                  <div style={{ padding: '1.5rem 2rem 0.5rem 2rem' }}>
                    <div
                      style={{
                        position: 'relative',
                        paddingTop: '56.25%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        background: '#000000',
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                      }}
                    >
                      <iframe
                        src={getYouTubeEmbedUrl(activeLesson.youtube_url) || ''}
                        title={activeLesson.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                        }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                {/* Lesson Lecture Notes / Content */}
                <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Lecture Notes & Instructions
                  </div>

                  <div
                    style={{
                      color: '#E2E8F0',
                      fontSize: '0.95rem',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '14px',
                      padding: '1.5rem',
                    }}
                  >
                    {activeLesson.content || 'No detailed lecture notes written for this lesson yet.'}
                  </div>

                  {/* Materials & Slides */}
                  {activeLesson.materials && activeLesson.materials.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                        Downloadable Resources ({activeLesson.materials.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                        {activeLesson.materials.map((mat, idx) => (
                          <a
                            key={idx}
                            href={mat.startsWith('http') ? mat : `/api/drive/files/${mat}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              background: 'rgba(66, 133, 244, 0.12)',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              color: '#60A5FA',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <Download size={14} />
                            Resource #{idx + 1}
                            <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Task or Quiz Prompt */}
                  {tasksList.some((t) => t.lesson_id === activeLesson.id) && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <FileText size={18} style={{ color: '#FBBF24' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FDE68A' }}>
                          This lesson includes a practical assignment!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          background: '#F59E0B',
                          color: '#000000',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Go to Assignments
                      </button>
                    </div>
                  )}

                  {quizzes.some((q) => q.lesson_id === activeLesson.id) && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Sparkles size={18} style={{ color: '#C084FC' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#E9D5FF' }}>
                          This lesson includes a knowledge check quiz!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('quizzes')}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          background: '#A855F7',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Go to Quizzes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className="glass-panel"
                style={{
                  padding: '4rem 2rem',
                  textAlign: 'center',
                  borderRadius: '20px',
                  color: '#94A3B8',
                }}
              >
                Select a lesson from the list on the left to view notes and video lecture.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TASKS & ASSIGNMENTS */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Overview Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem 2rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Practical Work & Assignments
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '0.3rem 0 0 0' }}>
                Course Tasks & Projects
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                Submit your code repositories, project demos, or drive files for mentor review and grading.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF' }}>{tasksList.length}</div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Total Tasks</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255, 255, 255, 0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34D399' }}>
                  {tasksList.filter((t) => t.my_submission?.status === 'graded').length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Graded</div>
              </div>
              <div style={{ width: '1px', height: '30px', background: 'rgba(255, 255, 255, 0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60A5FA' }}>
                  {tasksList.filter((t) => t.my_submission?.status === 'submitted').length}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Submitted</div>
              </div>
            </div>
          </div>

          {tasksList.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                borderRadius: '20px',
                color: '#94A3B8',
              }}
            >
              <FileText size={40} style={{ color: '#475569', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.25rem' }}>
                No Tasks Assigned Yet
              </div>
              <div style={{ fontSize: '0.86rem' }}>
                Assignments created by instructors will appear here with deadlines and submission options.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {tasksList.map((t) => {
                const sub = t.my_submission;
                const isGraded = sub?.status === 'graded';
                const isSubmitted = sub?.status === 'submitted';
                const needsRevision = sub?.status === 'needs_revision';
                const isClosed = t.status === 'closed';

                return (
                  <div
                    key={t.id}
                    className="glass-panel"
                    style={{
                      padding: '1.75rem',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(15, 23, 42, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem',
                    }}
                  >
                    {/* Task Card Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {t.lesson && (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'rgba(66, 133, 244, 0.15)',
                                color: '#60A5FA',
                              }}
                            >
                              Lesson #{t.lesson.lesson_number}: {t.lesson.title}
                            </span>
                          )}

                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#CBD5E1',
                            }}
                          >
                            Submission: {t.submission_type === 'both' ? 'Link or File' : t.submission_type === 'file' ? 'File Only' : 'URL Link'}
                          </span>

                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(52, 168, 83, 0.12)',
                              color: '#34D399',
                            }}
                          >
                            Max: {t.max_score} Pts
                          </span>

                          {isClosed && (
                            <span
                              style={{
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                background: 'rgba(234, 67, 53, 0.2)',
                                color: '#F87171',
                              }}
                            >
                              Closed
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                          {t.title}
                        </h3>
                      </div>

                      {/* Due Date Indicator */}
                      {t.due_date && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.78rem',
                            color: '#94A3B8',
                          }}
                        >
                          <Clock3 size={14} style={{ color: '#FBBF24' }} />
                          Due: {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>

                    {/* Task Description */}
                    {t.description && (
                      <div
                        style={{
                          color: '#CBD5E1',
                          fontSize: '0.88rem',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '1rem 1.25rem',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        {t.description}
                      </div>
                    )}

                    {/* Student Submission Status Panel */}
                    <div
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: isGraded
                          ? 'rgba(52, 168, 83, 0.08)'
                          : isSubmitted
                          ? 'rgba(66, 133, 244, 0.08)'
                          : needsRevision
                          ? 'rgba(245, 158, 11, 0.08)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isGraded
                          ? '1px solid rgba(52, 168, 83, 0.25)'
                          : isSubmitted
                          ? '1px solid rgba(66, 133, 244, 0.25)'
                          : needsRevision
                          ? '1px solid rgba(245, 158, 11, 0.25)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          {isGraded ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                background: 'rgba(52, 168, 83, 0.2)',
                                color: '#34D399',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Graded: {sub?.score} / {t.max_score} Pts
                            </span>
                          ) : isSubmitted ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                background: 'rgba(66, 133, 244, 0.2)',
                                color: '#60A5FA',
                              }}
                            >
                              <Clock size={13} />
                              Submitted (Pending Evaluation)
                            </span>
                          ) : needsRevision ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                background: 'rgba(245, 158, 11, 0.2)',
                                color: '#FBBF24',
                              }}
                            >
                              <AlertTriangle size={13} />
                              Revision Requested
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94A3B8',
                              }}
                            >
                              Not Submitted Yet
                            </span>
                          )}
                        </div>

                        {sub?.submission_link && (
                          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.3rem' }}>
                            Submitted URL:{' '}
                            <a
                              href={sub.submission_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#60A5FA', textDecoration: 'underline' }}
                            >
                              {sub.submission_link}
                            </a>
                          </div>
                        )}

                        {sub?.feedback_comment && (
                          <div
                            style={{
                              marginTop: '0.6rem',
                              padding: '0.6rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              fontSize: '0.82rem',
                              color: '#E2E8F0',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#34D399' }}>Mentor Feedback: </span>
                            {sub.feedback_comment}
                          </div>
                        )}
                      </div>

                      {/* Submission CTA */}
                      <div>
                        {isGraded ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 1rem',
                              borderRadius: '10px',
                              background: 'rgba(52, 168, 83, 0.12)',
                              border: '1px solid rgba(52, 168, 83, 0.3)',
                              color: '#34D399',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={15} />
                            Grade Finalized
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isClosed}
                            onClick={() => handleOpenSubmitModal(t)}
                            style={{
                              padding: '0.6rem 1.15rem',
                              borderRadius: '10px',
                              background: sub ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #4285F4, #1D4ED8)',
                              color: '#FFFFFF',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              cursor: isClosed ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Send size={15} />
                            {needsRevision ? 'Resubmit Solution' : isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: QUIZZES & TESTS */}
      {/* ========================================================================= */}
      {activeTab === 'quizzes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Overview Card */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem 2rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.8rem', color: '#C084FC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assessments & Knowledge Checks
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', margin: '0.3rem 0 0 0' }}>
                Course Quizzes & Tests
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                Validate your understanding of the concepts covered in lectures and hands-on workshops.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF' }}>{quizzes.length}</div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Total Quizzes</div>
              </div>
            </div>
          </div>

          {quizzes.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '4rem 2rem',
                textAlign: 'center',
                borderRadius: '20px',
                color: '#94A3B8',
              }}
            >
              <Sparkles size={40} style={{ color: '#475569', marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.25rem' }}>
                No Quizzes Available Yet
              </div>
              <div style={{ fontSize: '0.86rem' }}>
                Quizzes published by instructors will appear here with passing criteria and attempt records.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {quizzes.map((q) => {
                const attempts = q.my_attempts || [];
                const latestAttempt = attempts[attempts.length - 1];
                const hasPassed = attempts.some((a) => a.passed);

                return (
                  <div
                    key={q.id}
                    className="glass-panel"
                    style={{
                      padding: '1.75rem',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(15, 23, 42, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {q.lesson && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(66, 133, 244, 0.15)',
                              color: '#60A5FA',
                            }}
                          >
                            Lesson #{q.lesson.lesson_number}: {q.lesson.title}
                          </span>
                        )}

                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#C084FC',
                          }}
                        >
                          Passing: {q.passing_score_percentage}%
                        </span>

                        {q.time_limit_minutes && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#CBD5E1',
                            }}
                          >
                            {q.time_limit_minutes} Mins
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                        {q.title}
                      </h3>

                      {q.description && (
                        <p style={{ color: '#94A3B8', fontSize: '0.84rem', lineHeight: 1.5, margin: 0 }}>
                          {q.description}
                        </p>
                      )}
                    </div>

                    {/* Attempts & Action */}
                    <div
                      style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        {hasPassed ? (
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              background: 'rgba(52, 168, 83, 0.2)',
                              color: '#34D399',
                            }}
                          >
                            Passed
                          </span>
                        ) : latestAttempt ? (
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#FBBF24',
                            }}
                          >
                            Attempt #{latestAttempt.attempt_number} ({latestAttempt.score ?? 'Pending'}%)
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                            0 Attempts Taken
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/student/courses/${course.id}/quizzes/${q.id}/take`}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #A855F7, #7C3AED)',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Sparkles size={14} />
                        <span>
                          {hasPassed
                            ? 'Review / Retake'
                            : attempts.length > 0
                            ? `Retake (#${attempts.length + 1})`
                            : 'Start Quiz'}
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STUDENT TASK SUBMISSION MODAL */}
      {/* ========================================================================= */}
      {submittingTask && (
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
          onClick={() => !isSubmittingTask && setSubmittingTask(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
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
                <FileText size={20} style={{ color: '#FBBF24' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Submit Assignment
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingTask}
                onClick={() => setSubmittingTask(null)}
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

            <form onSubmit={handleTaskSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase' }}>
                  Task
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.15rem' }}>
                  {submittingTask.title}
                </div>
                {submittingTask.due_date && (
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                    Deadline: {new Date(submittingTask.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>

              {taskModalError && (
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
                  {taskModalError}
                </div>
              )}

              {taskModalSuccess && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(52, 168, 83, 0.15)',
                    border: '1px solid rgba(52, 168, 83, 0.35)',
                    color: '#34D399',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  {taskModalSuccess}
                </div>
              )}

              {(submittingTask.submission_type === 'link' || submittingTask.submission_type === 'both') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                    Solution URL {submittingTask.submission_type === 'link' ? '*' : '(Optional if file provided)'}
                  </label>
                  <input
                    type="url"
                    value={taskSubmissionLink}
                    onChange={(e) => setTaskSubmissionLink(e.target.value)}
                    placeholder="https://github.com/... or https://colab.research.google.com/..."
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Paste a link to your public repository, Google Colab notebook, Figma board, or Drive file.
                  </span>
                </div>
              )}

              {(submittingTask.submission_type === 'file' || submittingTask.submission_type === 'both') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                    File Drive Link or ID {submittingTask.submission_type === 'file' ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={taskSubmissionDriveId}
                    onChange={(e) => setTaskSubmissionDriveId(e.target.value)}
                    placeholder="Google Drive link or file ID"
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isSubmittingTask}
                  onClick={() => setSubmittingTask(null)}
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
                  disabled={isSubmittingTask}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #4285F4, #1D4ED8)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: isSubmittingTask ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <Send size={15} />
                  {isSubmittingTask ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE FILE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewFile && (
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
          onClick={() => setPreviewFile(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              height: '82vh',
              borderRadius: '16px',
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
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(15, 23, 42, 0.95)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileText size={18} style={{ color: '#EA4335' }} />
                <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#FFFFFF' }}>
                  {previewFile.name}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {previewFile.url && (
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      color: '#60A5FA',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Open in New Tab
                    <ExternalLink size={13} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
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
            </div>

            {/* Modal Body / Iframe */}
            <div style={{ flex: 1, background: '#070B14', position: 'relative' }}>
              {previewFile.url ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay"
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                  }}
                >
                  Preview not available for this file.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
