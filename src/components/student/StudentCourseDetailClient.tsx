'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  LogIn,
  QrCode,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  RotateCcw,
  X,
  Radio,
  FileCode,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Minimize2,
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
import { RichMarkdownView } from './RichMarkdownView';

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

function getTaskDeadlineInfo(dueDate: string | null | undefined, isCompleted: boolean) {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diffMs = due - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (isCompleted) {
    return {
      type: 'completed' as const,
      label: `Due ${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      color: '#94A3B8',
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      icon: 'calendar' as const,
      pulse: false,
    };
  }

  if (diffMs < 0) {
    const passedDays = Math.max(1, Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24)));
    return {
      type: 'overdue' as const,
      label: `Past Deadline (${passedDays === 1 ? '1 day ago' : `${passedDays}d ago`})`,
      color: '#F87171',
      background: 'rgba(234, 67, 53, 0.15)',
      border: '1px solid rgba(234, 67, 53, 0.35)',
      icon: 'alert' as const,
      pulse: false,
    };
  }

  if (diffHours <= 24) {
    const hoursLeft = Math.max(1, Math.round(diffHours));
    return {
      type: 'urgent' as const,
      label: `Due Today (${hoursLeft === 1 ? '1 hr left!' : `${hoursLeft}h left!`})`,
      color: '#EF4444',
      background: 'rgba(239, 68, 68, 0.18)',
      border: '1px solid rgba(239, 68, 68, 0.45)',
      icon: 'clock' as const,
      pulse: true,
    };
  }

  if (diffHours <= 48) {
    return {
      type: 'soon' as const,
      label: `Due Tomorrow (${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`,
      color: '#FBBF24',
      background: 'rgba(251, 188, 4, 0.15)',
      border: '1px solid rgba(251, 188, 4, 0.35)',
      icon: 'clock' as const,
      pulse: true,
    };
  }

  return {
    type: 'future' as const,
    label: `Due: ${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    color: '#CBD5E1',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    icon: 'calendar' as const,
    pulse: false,
  };
}

function detectLinkPlatform(url: string) {
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.includes('github.com')) {
    return {
      platform: 'GitHub Repository',
      color: '#60A5FA',
      bg: 'rgba(66, 133, 244, 0.15)',
      border: 'rgba(66, 133, 244, 0.35)',
      badge: 'GitHub Repository ✓',
    };
  }
  if (trimmed.includes('colab.research.google.com') || trimmed.includes('colab.google')) {
    return {
      platform: 'Google Colab Notebook',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.35)',
      badge: 'Google Colab ✓',
    };
  }
  if (trimmed.includes('drive.google.com')) {
    return {
      platform: 'Google Drive File',
      color: '#34D399',
      bg: 'rgba(52, 168, 83, 0.15)',
      border: 'rgba(52, 168, 83, 0.35)',
      badge: 'Google Drive Link ✓',
    };
  }
  if (trimmed.includes('figma.com')) {
    return {
      platform: 'Figma Project',
      color: '#A855F7',
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.35)',
      badge: 'Figma Design ✓',
    };
  }
  if (trimmed.includes('codesandbox.io') || trimmed.includes('stackblitz.com') || trimmed.includes('replit.com')) {
    return {
      platform: 'Web Sandbox',
      color: '#38BDF8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.35)',
      badge: 'Web Sandbox Demo ✓',
    };
  }
  if (trimmed.includes('vercel.app') || trimmed.includes('netlify.app')) {
    return {
      platform: 'Live Demo',
      color: '#34D399',
      bg: 'rgba(52, 168, 83, 0.15)',
      border: 'rgba(52, 168, 83, 0.35)',
      badge: 'Live Web Demo ✓',
    };
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return {
      platform: parsed.hostname,
      color: '#60A5FA',
      bg: 'rgba(66, 133, 244, 0.1)',
      border: 'rgba(66, 133, 244, 0.25)',
      badge: `${parsed.hostname} ✓`,
    };
  } catch {
    return null;
  }
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

  const [myEnrollment, setMyEnrollment] = useState(initialMyEnrollment);
  const [canEnroll, setCanEnroll] = useState(initialCanEnroll);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEnrollConfirmModal, setShowEnrollConfirmModal] = useState(false);

  const isConfirmed = myEnrollment?.status === 'confirmed';
  const isPending = myEnrollment?.status === 'pending';
  const isWaitlisted = myEnrollment?.status === 'waitlisted';
  const isEnrolled = isConfirmed || isStaff;

  const isRegOpen = course.registration_open !== false;
  const hasDeadline = Boolean(course.registration_deadline);
  const isDeadlinePassed = hasDeadline && new Date(course.registration_deadline!) < new Date();
  const isRegistrationClosed = !isRegOpen || isDeadlinePassed;

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'lessons' | 'tasks' | 'quizzes'>(
    initialMyEnrollment?.status === 'confirmed' || initialData.isStaff ? 'sessions' : 'overview'
  );

  // Active modular session selection
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : ''
  );

  // Active lesson selection
  const [activeLessonId, setActiveLessonId] = useState<string>(
    lessons.length > 0 ? lessons[0].id : ''
  );

  // Cinema / Focus Mode for expanded lecture view
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Attendance stats
  const attendedCount = sessions.filter((s) => s.is_attended).length;
  const attendanceRate = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;

  // Sync URL search params with active tab, session, and lesson (Deep Linking)
  const updateUrlParams = useCallback(
    (newTab: string, newSessionId?: string, newLessonId?: string) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);

      if (newTab === 'sessions') {
        const sId = newSessionId || activeSessionId;
        const s = sessions.find((x) => x.id === sId);
        if (s) {
          url.searchParams.set('session', String(s.session_number));
        }
        url.searchParams.delete('lesson');
      } else if (newTab === 'lessons') {
        const lId = newLessonId || activeLessonId;
        const l = lessons.find((x) => x.id === lId);
        if (l) {
          url.searchParams.set('lesson', String(l.lesson_number));
        }
        url.searchParams.delete('session');
      } else {
        url.searchParams.delete('session');
        url.searchParams.delete('lesson');
      }

      window.history.replaceState(null, '', url.pathname + url.search);
    },
    [activeSessionId, activeLessonId, sessions, lessons]
  );

  // Read initial query params from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const sessionParam = params.get('session');
    const lessonParam = params.get('lesson');

    if (tabParam && ['overview', 'sessions', 'lessons', 'tasks', 'quizzes'].includes(tabParam)) {
      if (tabParam === 'overview' || isEnrolled) {
        setActiveTab(tabParam as any);
      }
    }

    if (sessionParam && sessions.length > 0) {
      const match = sessions.find(
        (s) => s.id === sessionParam || String(s.session_number) === sessionParam
      );
      if (match) {
        setActiveSessionId(match.id);
      }
    }

    if (lessonParam && lessons.length > 0) {
      const match = lessons.find(
        (l) => l.id === lessonParam || String(l.lesson_number) === lessonParam
      );
      if (match) {
        setActiveLessonId(match.id);
      }
    }
  }, [isEnrolled, sessions, lessons]);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const sessionParam = params.get('session');
      const lessonParam = params.get('lesson');

      if (tabParam && ['overview', 'sessions', 'lessons', 'tasks', 'quizzes'].includes(tabParam)) {
        if (tabParam === 'overview' || isEnrolled) {
          setActiveTab(tabParam as any);
        }
      }
      if (sessionParam && sessions.length > 0) {
        const match = sessions.find(
          (s) => s.id === sessionParam || String(s.session_number) === sessionParam
        );
        if (match) setActiveSessionId(match.id);
      }
      if (lessonParam && lessons.length > 0) {
        const match = lessons.find(
          (l) => l.id === lessonParam || String(l.lesson_number) === lessonParam
        );
        if (match) setActiveLessonId(match.id);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEnrolled, sessions, lessons]);

  const handleTabChange = (tab: 'overview' | 'sessions' | 'lessons' | 'tasks' | 'quizzes') => {
    setActiveTab(tab);
    updateUrlParams(tab);
  };

  const handleInitiateEnroll = () => {
    if (!isAuthenticated) {
      router.push(`/student?signin=true&returnUrl=/student/courses/${course.id}`);
      return;
    }

    if (needsOnboarding) {
      router.push('/student/onboarding');
      return;
    }

    setShowEnrollConfirmModal(true);
  };

  const handleConfirmEnroll = async () => {
    setShowEnrollConfirmModal(false);
    await handleEnroll();
  };

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
      if (res.status === 'confirmed') {
        handleTabChange('sessions');
      }
      setActionMessage({ type: 'success', text: res.message || 'Enrollment processed successfully!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    updateUrlParams('sessions', sessionId);
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    updateUrlParams('lessons', undefined, lessonId);
  };

  const handlePrevSession = () => {
    if (activeSessionIndex > 0) {
      const prevId = sessions[activeSessionIndex - 1].id;
      setActiveSessionId(prevId);
      updateUrlParams('sessions', prevId);
    }
  };

  const handleNextSession = () => {
    if (activeSessionIndex < sessions.length - 1) {
      const nextId = sessions[activeSessionIndex + 1].id;
      setActiveSessionId(nextId);
      updateUrlParams('sessions', nextId);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      const prevId = lessons[activeLessonIndex - 1].id;
      setActiveLessonId(prevId);
      updateUrlParams('lessons', undefined, prevId);
    }
  };

  const handleNextLesson = () => {
    if (activeLessonIndex < lessons.length - 1) {
      const nextId = lessons[activeLessonIndex + 1].id;
      setActiveLessonId(nextId);
      updateUrlParams('lessons', undefined, nextId);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
    <div className="student-course-detail-container">
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
        className="glass-panel student-course-hero"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          padding: 'clamp(1.25rem, 4vw, 2.5rem)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {course.cover_image_url && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.18,
              filter: 'blur(2px)',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            <Image
              src={course.cover_image_url}
              alt=""
              fill
              sizes="100vw"
              loading="lazy"
              unoptimized
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '880px', position: 'relative', zIndex: 1 }}>
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
                Admission Pending
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
                {course.enrollment_type === 'open' ? 'Open Admission' : 'Admission by Review'}
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.4rem, 4vw, 2.7rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              wordBreak: 'break-word',
            }}
          >
            {course.title}
          </h1>

          <p style={{ color: '#94A3B8', fontSize: '1.02rem', lineHeight: 1.6, margin: 0 }}>
            {course.department_name ? `Official ${course.department_name} Learning Track` : 'Official GDGoC Learning Track'} • Comprehensive curriculum with interactive sessions, hands-on assignments, and official certification.
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} style={{ color: '#FBBF24' }} />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {isStaff && course.capacity ? `${course.enrollment_count} / ${course.capacity} Enrolled` : 'Cohort Admission'}
                </div>
                <div style={{ fontSize: '0.75rem', color: isRegistrationClosed ? '#F87171' : '#94A3B8' }}>
                  {isRegistrationClosed ? 'Registration closed' : course.is_full ? 'Capacity reached' : 'Registration open'}
                </div>
              </div>
            </div>

            {hasDeadline && (
              <>
                <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} style={{ color: isDeadlinePassed ? '#F87171' : '#FBBF24' }} />
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: isDeadlinePassed ? '#F87171' : '#FFFFFF' }}>
                      {new Date(course.registration_deadline!).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isDeadlinePassed ? '#F87171' : '#94A3B8' }}>
                      {isDeadlinePassed ? 'Deadline passed' : 'Registration deadline'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Hero Action Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              paddingTop: '1.25rem',
              marginTop: '0.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {!isAuthenticated ? (
                <div style={{ fontSize: '0.86rem', color: '#94A3B8' }}>
                  Sign in with your student account to enroll • Free curriculum & certification
                </div>
              ) : isConfirmed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#34D399', fontSize: '0.92rem', fontWeight: 800 }}>
                  <CheckCircle2 size={18} />
                  <span>You are enrolled in this track</span>
                </div>
              ) : isPending ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#FBBF24', fontSize: '0.9rem', fontWeight: 700 }}>
                  <Clock3 size={18} />
                  <span>Application received • Under review by track leads</span>
                </div>
              ) : isWaitlisted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#C084FC', fontSize: '0.92rem', fontWeight: 800 }}>
                  <Clock3 size={18} />
                  <span>You are placed on the waitlist</span>
                </div>
              ) : isRegistrationClosed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#F87171', fontSize: '0.9rem', fontWeight: 700 }}>
                  <Lock size={17} />
                  <span>{isDeadlinePassed ? 'Registration deadline has passed' : 'Registration for this track is currently closed'}</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.86rem', color: '#94A3B8' }}>
                  Free chapter admission • Complete curriculum & certificate included
                </div>
              )}
            </div>

            {/* Primary Action Button in Hero */}
            {!isAuthenticated ? (
              <Link
                href={`/student?signin=true&returnUrl=/student/courses/${course.id}`}
                style={{
                  padding: '0.8rem 1.6rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  boxShadow: '0 4px 16px rgba(66, 133, 244, 0.45)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <LogIn size={17} />
                <span>Sign In to Enroll</span>
              </Link>
            ) : isConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  handleTabChange('sessions');
                  const el = document.getElementById('course-workspace-tabs');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  padding: '0.75rem 1.4rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.25) 0%, rgba(66, 133, 244, 0.2) 100%)',
                  border: '1px solid rgba(52, 168, 83, 0.5)',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Play size={16} color="#34D399" />
                <span>Go to Sessions & Lessons</span>
              </button>
            ) : isPending ? (
              <div
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  background: 'rgba(251, 188, 4, 0.12)',
                  border: '1px solid rgba(251, 188, 4, 0.35)',
                  color: '#FBBF24',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 8px rgba(251, 188, 4, 0.15)',
                }}
              >
                <CheckCircle2 size={15} />
                <span>Submitted for Review</span>
              </div>
            ) : isWaitlisted ? (
              <div
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  color: '#C084FC',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                On Waitlist
              </div>
            ) : isRegistrationClosed ? (
              <div
                style={{
                  padding: '0.75rem 1.4rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#F87171',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Lock size={16} />
                <span>{isDeadlinePassed ? 'Registration Deadline Passed' : 'Registration Closed'}</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleInitiateEnroll}
                style={{
                  padding: '0.8rem 1.6rem',
                  borderRadius: '12px',
                  background: course.is_full
                    ? '#A855F7'
                    : course.enrollment_type === 'open'
                    ? 'linear-gradient(135deg, #34A853 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  boxShadow: '0 4px 16px rgba(66, 133, 244, 0.45)',
                  transition: 'transform 0.15s ease',
                }}
              >
                {isSubmitting ? (
                  'Submitting...'
                ) : course.is_full ? (
                  <>
                    <Clock3 size={16} />
                    <span>Join Track Waitlist</span>
                  </>
                ) : course.enrollment_type === 'open' ? (
                  <>
                    <Sparkles size={16} />
                    <span>Join Course Track — Free</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Apply for Admission</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Course Workspace Navigation Tabs (Only shown when enrolled or staff) */}
      {isEnrolled && (
        <div
          id="course-workspace-tabs"
          className="student-scroll-tabs"
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
            { key: 'overview', label: 'Course Overview', count: undefined, icon: BookOpen },
            { key: 'sessions', label: 'Sessions & Schedule', count: sessions.length, icon: Calendar },
            { key: 'lessons', label: 'Lessons & Curriculum', count: lessons.length, icon: Play },
            { key: 'tasks', label: 'Tasks & Assignments', count: tasksList.length, icon: FileText },
            { key: 'quizzes', label: 'Quizzes & Tests', count: quizzes.length, icon: Sparkles },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key as any)}
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
                {tab.count !== undefined && (
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
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: COURSE OVERVIEW (Exclusive view for non-enrolled students, or Overview tab for enrolled) */}
      {/* ========================================================================= */}
      {(!isEnrolled || activeTab === 'overview') && (
        <div className="student-course-layout">
          {/* Left Column: Overview, Syllabus, Sessions outline, Instructors */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
            {/* 1. About the course */}
            <div
              className="glass-panel"
              style={{
                padding: '2rem',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <BookOpen size={20} color="#4285F4" />
                <span>About this Course & Curriculum</span>
              </h2>
              <p style={{ color: '#CBD5E1', fontSize: '0.96rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
                {course.description ||
                  'This comprehensive learning journey is designed by Google Developer Groups on Campus Helwan National University technical departments to equip students with production-grade skills through structured sessions and practical milestones.'}
              </p>

              {/* Learning Highlights Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.08)', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#60A5FA', fontWeight: 700 }}>Track Category</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>{course.category || 'Technical Track'}</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.08)', border: '1px solid rgba(52, 168, 83, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#34D399', fontWeight: 700 }}>Total Curriculum Duration</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>~{totalHours} Training Hours</div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.08)', border: '1px solid rgba(251, 188, 4, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: 700 }}>Sessions & Workshops</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                    {sessions.length > 0 ? `${sessions.length} Interactive Sessions` : 'Comprehensive Modules'}
                  </div>
                </div>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#C084FC', fontWeight: 700 }}>Credential</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>Official GDGoC Certificate</div>
                </div>
              </div>
            </div>

            {/* 2. Syllabus & Topics (Parsed Rich Markdown) */}
            {course.syllabus && (
              <div
                className="glass-panel"
                style={{
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FileText size={20} color="#34A853" />
                    <span>Syllabus & Learning Path</span>
                  </h2>
                  <span style={{ fontSize: '0.76rem', color: '#60A5FA', background: 'rgba(66, 133, 244, 0.12)', border: '1px solid rgba(66, 133, 244, 0.25)', padding: '0.25rem 0.65rem', borderRadius: '20px', fontWeight: 700 }}>
                    Official Track Curriculum
                  </span>
                </div>
                <RichMarkdownView content={course.syllabus} />
              </div>
            )}

            {/* 3. Sessions & Topics Outline (Only shown if sessions exist) */}
            {sessions.length > 0 && (
              <div
                className="glass-panel"
                style={{
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Calendar size={20} color="#F59E0B" />
                      <span>Curriculum & Scheduled Sessions ({sessions.length})</span>
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                      High-level curriculum schedule of interactive lectures and hands-on milestones
                    </p>
                  </div>
                  {!isEnrolled && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.3rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontSize: '0.76rem',
                        color: '#94A3B8',
                        fontWeight: 600,
                      }}
                    >
                      <Lock size={12} />
                      Full materials unlocked upon enrollment
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {sessions.map((s) => {
                    const isOnline = s.type === 'online';
                    return (
                      <div
                        key={s.id}
                        style={{
                          padding: '1.15rem 1.35rem',
                          borderRadius: '14px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isOnline ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                              color: isOnline ? '#F87171' : '#60A5FA',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            #{s.session_number}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {s.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.78rem', color: '#94A3B8', flexWrap: 'wrap' }}>
                              <span>{new Date(s.session_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                              <span>•</span>
                              <span>{s.duration_minutes || 120} mins</span>
                              <span>•</span>
                              <span style={{ color: isOnline ? '#F87171' : '#34D399', fontWeight: 600 }}>
                                {isOnline ? 'Online (Virtual Meeting)' : (s.venue || 'Chapter Campus Hall')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isEnrolled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748B', fontSize: '0.78rem', fontWeight: 600 }}>
                            <Lock size={14} />
                            <span>Locked Content</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleTabChange('sessions');
                              handleSelectSession(s.id);
                            }}
                            style={{
                              padding: '0.45rem 0.9rem',
                              borderRadius: '8px',
                              background: 'rgba(66, 133, 244, 0.15)',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              color: '#60A5FA',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            View Session
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Instructors & Mentors (Only shown if instructors exist) */}
            {instructors.length > 0 && (
              <div
                className="glass-panel"
                style={{
                  padding: '2rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <GraduationCap size={22} color="#10B981" />
                  <span>Teaching Staff & Mentors ({instructors.length})</span>
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {instructors.map((ins) => (
                    <div
                      key={ins.id}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                      }}
                    >
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: ins.role === 'instructor' ? '#4285F4' : '#10B981',
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
                        {ins.avatar_url ? (
                          <img src={ins.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          ins.full_name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {ins.full_name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                          {ins.department_name || ins.committee_role}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: '0.35rem',
                            padding: '0.15rem 0.5rem',
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Admission & Enrollment Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '5rem' }}>
            {/* Admission Action Card */}
            <div
              className="glass-panel student-course-admission-card"
              style={{
                padding: '1.75rem',
                borderRadius: '20px',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {isConfirmed ? 'Enrolled Student' : 'Admission & Enrollment'}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0 0 0' }}>
                  {isConfirmed
                    ? 'You are enrolled in this track ✓'
                    : isPending
                    ? 'Application Under Review'
                    : isWaitlisted
                    ? 'You are on the Waitlist'
                    : isRegistrationClosed
                    ? (isDeadlinePassed ? 'Registration Deadline Passed' : 'Registration Closed')
                    : course.enrollment_type === 'open'
                    ? 'Join Course Track'
                    : 'Apply for Admission'}
                </h3>
              </div>

              {/* Deadline notice if set */}
              {hasDeadline && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: isDeadlinePassed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 188, 4, 0.1)',
                    border: `1px solid ${isDeadlinePassed ? 'rgba(239, 68, 68, 0.25)' : 'rgba(251, 188, 4, 0.25)'}`,
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} style={{ color: isDeadlinePassed ? '#F87171' : '#FBBF24' }} />
                    <span>Registration Deadline:</span>
                  </span>
                  <span style={{ color: isDeadlinePassed ? '#F87171' : '#CBD5E1', fontWeight: 700 }}>
                    {new Date(course.registration_deadline!).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Status Message */}
              <p style={{ color: '#94A3B8', fontSize: '0.86rem', lineHeight: 1.6, margin: 0 }}>
                {isConfirmed
                  ? 'Your enrollment is confirmed! You have full access to interactive sessions, lecture notes, assignments, and quizzes.'
                  : isPending
                  ? 'Your application has been received and is currently under review by track leads. You will receive a notification once evaluated.'
                  : isWaitlisted
                  ? 'You are registered on the waitlist. You will be notified automatically if an enrollment spot becomes available.'
                  : isRegistrationClosed
                  ? (isDeadlinePassed ? 'The registration deadline for this track has passed. Enrollments are now closed.' : 'Registration for this track is currently closed.')
                  : course.enrollment_type === 'open'
                  ? 'Open admission program: click below to confirm your spot immediately.'
                  : 'Admission by review: applications are evaluated by track leads before enrollment is confirmed.'}
              </p>

              {/* Action Button */}
              {isConfirmed ? (
                <button
                  type="button"
                  onClick={() => handleTabChange('sessions')}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    borderRadius: '12px',
                    background: '#34A853',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(52, 168, 83, 0.4)',
                  }}
                >
                  <BookOpen size={18} />
                  <span>Go to Learning Workspace (Sessions)</span>
                </button>
              ) : isPending ? (
                <div
                  style={{
                    padding: '0.9rem',
                    borderRadius: '12px',
                    background: 'rgba(251, 188, 4, 0.15)',
                    border: '1px solid rgba(251, 188, 4, 0.35)',
                    color: '#FBBF24',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Clock3 size={18} />
                  <span>Awaiting Evaluation...</span>
                </div>
              ) : isRegistrationClosed ? (
                <div
                  style={{
                    padding: '0.9rem',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#F87171',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Lock size={18} />
                  <span>{isDeadlinePassed ? 'Registration Deadline Passed' : 'Registration Closed'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleInitiateEnroll}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '12px',
                    background: course.is_full ? '#A855F7' : '#4285F4',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSubmitting ? (
                    'Processing...'
                  ) : course.is_full ? (
                    'Join Waitlist'
                  ) : course.enrollment_type === 'open' ? (
                    <>
                      <Sparkles size={18} />
                      <span>Enroll in Track (Instant)</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              )}

              {/* What you will get */}
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>Included with your course track:</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <CheckCircle2 size={15} color="#34A853" />
                  <span>Interactive live sessions & workshops</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <CheckCircle2 size={15} color="#34A853" />
                  <span>Lecture recordings, slides, and learning assets</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <CheckCircle2 size={15} color="#34A853" />
                  <span>Hands-on milestone assignments & grading</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <CheckCircle2 size={15} color="#34A853" />
                  <span>Quizzes & comprehension assessments</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#E2E8F0' }}>
                  <CheckCircle2 size={15} color="#34A853" />
                  <span>Official verified GDGoC completion certificate</span>
                </div>
              </div>
            </div>

            {/* Additional Track Info Card */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                <span>Organizing Department:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{course.department_name || 'Technical'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                <span>Delivery Format:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>Hybrid (Campus + Online)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                <span>Track Status:</span>
                <span style={{ color: course.is_full ? '#F87171' : '#34D399', fontWeight: 700 }}>
                  {course.is_full ? 'Closed (Full)' : 'Open for Applicants'}
                </span>
              </div>
              {isStaff && course.capacity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.8rem', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '0.5rem' }}>
                  <span>Seats (Staff Only):</span>
                  <span style={{ color: '#FBBF24', fontWeight: 600 }}>{course.enrollment_count} / {course.capacity}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Modular LMS Workspace (Sessions Tab) */}
      {isEnrolled && activeTab === 'sessions' && (
        <div
          className={`student-course-sidebar-layout ${isCinemaMode ? 'cinema-mode' : ''}`}
          style={{ gridTemplateColumns: isCinemaMode ? '1fr' : undefined }}
        >
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Modular Session Navigator & Learning Progress */}
        {/* ========================================================================= */}
        {!isCinemaMode && (
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
                  : 'Admission by review: applications are evaluated by track leads before enrollment is confirmed.'}
              </p>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleInitiateEnroll}
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
                      onClick={() => handleSelectSession(s.id)}
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
      )}

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

                {/* Session Stepper & Action Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {/* Focus / Cinema Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsCinemaMode(!isCinemaMode)}
                    style={{
                      padding: '0.45rem 0.8rem',
                      borderRadius: '8px',
                      background: isCinemaMode ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: isCinemaMode ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isCinemaMode ? '#60A5FA' : '#CBD5E1',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                    }}
                    title={isCinemaMode ? 'Exit Focus Mode (Show Playlist)' : 'Focus / Cinema Mode (Hide Playlist)'}
                  >
                    {isCinemaMode ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                    <span>{isCinemaMode ? 'Show Playlist' : 'Focus Mode'}</span>
                  </button>

                  {/* Share / Copy Direct Session Link */}
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: copiedLink ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: copiedLink ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: copiedLink ? '#34D399' : '#CBD5E1',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                    }}
                    title="Copy direct link to this session"
                  >
                    {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                    <span>{copiedLink ? 'Copied!' : 'Share'}</span>
                  </button>

                  <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.12)', margin: '0 0.1rem' }} />

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
      {isEnrolled && activeTab === 'lessons' && (
        <div
          className={`student-course-sidebar-layout ${isCinemaMode ? 'cinema-mode' : ''}`}
          style={{ gridTemplateColumns: isCinemaMode ? '1fr' : undefined }}
        >
          {/* Left Column: Lessons Navigation */}
          {!isCinemaMode && (
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
                        onClick={() => handleSelectLesson(l.id)}
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
        )}

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

                  {/* Stepper & Action Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {/* Focus / Cinema Mode Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsCinemaMode(!isCinemaMode)}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '8px',
                        background: isCinemaMode ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                        border: isCinemaMode ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: isCinemaMode ? '#60A5FA' : '#CBD5E1',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        transition: 'all 0.15s ease',
                      }}
                      title={isCinemaMode ? 'Exit Focus Mode (Show Curriculum)' : 'Focus / Cinema Mode (Hide Curriculum)'}
                    >
                      {isCinemaMode ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
                      <span>{isCinemaMode ? 'Show Curriculum' : 'Focus Mode'}</span>
                    </button>

                    {/* Share / Copy Direct Lesson Link */}
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: copiedLink ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: copiedLink ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: copiedLink ? '#34D399' : '#CBD5E1',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        transition: 'all 0.15s ease',
                      }}
                      title="Copy direct link to this lesson"
                    >
                      {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                      <span>{copiedLink ? 'Copied!' : 'Share'}</span>
                    </button>

                    <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.12)', margin: '0 0.1rem' }} />

                    <button
                      type="button"
                      disabled={activeLessonIndex <= 0}
                      onClick={handlePrevLesson}
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
                      onClick={handleNextLesson}
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
                        onClick={() => handleTabChange('tasks')}
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
                        onClick={() => handleTabChange('quizzes')}
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
      {isEnrolled && activeTab === 'tasks' && (
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
                padding: '3.5rem 2rem',
                textAlign: 'center',
                borderRadius: '20px',
                color: '#94A3B8',
                background: 'rgba(15, 23, 42, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(66, 133, 244, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60A5FA',
                }}
              >
                <FileText size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 850, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                  No Tasks or Assignments Yet
                </h3>
                <p style={{ fontSize: '0.94rem', color: '#CBD5E1', maxWidth: '540px', margin: '0 auto 0.5rem auto', lineHeight: 1.6 }}>
                  No assignments have been assigned to this track yet. Hands-on projects and milestones will appear here once published by track leads with submission deadlines.
                </p>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Practical milestones and assignment prompts will appear here automatically when released.
                </div>
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

                      {/* Due Date Urgency Indicator */}
                      {(() => {
                        const deadline = getTaskDeadlineInfo(t.due_date, isSubmitted || isGraded);
                        if (!deadline) return null;

                        return (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              background: deadline.background,
                              border: deadline.border,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: deadline.color,
                            }}
                          >
                            {deadline.icon === 'alert' ? (
                              <AlertCircle size={14} style={{ color: deadline.color }} />
                            ) : deadline.icon === 'clock' ? (
                              <Clock3 size={14} style={{ color: deadline.color }} />
                            ) : (
                              <Calendar size={14} style={{ color: deadline.color }} />
                            )}
                            <span>{deadline.label}</span>
                            {deadline.pulse && (
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: deadline.color,
                                  boxShadow: `0 0 8px ${deadline.color}`,
                                  animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                                }}
                              />
                            )}
                          </div>
                        );
                      })()}
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
      {isEnrolled && activeTab === 'quizzes' && (
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
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

                      {attempts.length === 0 ? (
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
                          <span>Start Quiz</span>
                        </Link>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Link
                            href={`/student/courses/${course.id}/quizzes/${q.id}/take?mode=review`}
                            style={{
                              padding: '0.5rem 0.85rem',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              color: '#CBD5E1',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              transition: 'all 0.15s ease',
                            }}
                            title="View your previous answers and score breakdown"
                          >
                            <Eye size={14} style={{ color: '#93C5FD' }} />
                            <span>Review Results</span>
                          </Link>

                          {((!hasPassed || q.allow_retakes) && (q.allow_retakes || attempts.length < q.max_attempts)) && (
                            <Link
                              href={`/student/courses/${course.id}/quizzes/${q.id}/take?mode=retake`}
                              style={{
                                padding: '0.5rem 0.85rem',
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
                              title="Start a new quiz attempt"
                            >
                              <RotateCcw size={14} />
                              <span>Retake Quiz (#{attempts.length + 1})</span>
                            </Link>
                          )}
                        </div>
                      )}
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
                  <div style={{ marginTop: '0.35rem' }}>
                    {(() => {
                      const dl = getTaskDeadlineInfo(submittingTask.due_date, false);
                      if (!dl) return null;
                      return (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: dl.background,
                            border: dl.border,
                            fontSize: '0.74rem',
                            color: dl.color,
                            fontWeight: 700,
                          }}
                        >
                          {dl.icon === 'alert' ? <AlertCircle size={13} /> : <Clock3 size={13} />}
                          <span>{dl.label}</span>
                        </div>
                      );
                    })()}
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

              {(submittingTask.submission_type === 'link' || submittingTask.submission_type === 'both') && (() => {
                const detectedPlatform = detectLinkPlatform(taskSubmissionLink);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                        Solution URL {submittingTask.submission_type === 'link' ? '*' : '(Optional if file provided)'}
                      </label>
                      {detectedPlatform && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '6px',
                            background: detectedPlatform.bg,
                            color: detectedPlatform.color,
                            border: `1px solid ${detectedPlatform.border}`,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={11} />
                          {detectedPlatform.badge}
                        </span>
                      )}
                    </div>
                    <input
                      type="url"
                      value={taskSubmissionLink}
                      onChange={(e) => setTaskSubmissionLink(e.target.value)}
                      placeholder="https://github.com/... or https://colab.research.google.com/..."
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: detectedPlatform
                          ? `1px solid ${detectedPlatform.border}`
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        outline: 'none',
                        transition: 'border 0.2s ease',
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      Paste a link to your public repository, Google Colab notebook, Figma board, or Drive file.
                    </span>
                  </div>
                );
              })()}

              {(submittingTask.submission_type === 'file' || submittingTask.submission_type === 'both') && (() => {
                const isDriveLink = taskSubmissionDriveId.toLowerCase().includes('drive.google.com');
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1' }}>
                        File Drive Link or ID {submittingTask.submission_type === 'file' ? '*' : '(Optional)'}
                      </label>
                      {isDriveLink && (
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(52, 168, 83, 0.15)',
                            color: '#34D399',
                            border: '1px solid rgba(52, 168, 83, 0.35)',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Check size={11} />
                          Google Drive Link ✓
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={taskSubmissionDriveId}
                      onChange={(e) => setTaskSubmissionDriveId(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or file ID"
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: isDriveLink
                          ? '1px solid rgba(52, 168, 83, 0.45)'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        outline: 'none',
                        transition: 'border 0.2s ease',
                      }}
                    />
                  </div>
                );
              })()}

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

      {/* Course Application / Enrollment Confirmation Modal */}
      {showEnrollConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(3, 7, 18, 0.82)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => !isSubmitting && setShowEnrollConfirmModal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(10, 15, 29, 0.98) 100%)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(66, 133, 244, 0.2)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem 1.75rem 1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background:
                      course.enrollment_type === 'open'
                        ? 'rgba(52, 168, 83, 0.18)'
                        : 'rgba(66, 133, 244, 0.18)',
                    border: `1px solid ${
                      course.enrollment_type === 'open'
                        ? 'rgba(52, 168, 83, 0.35)'
                        : 'rgba(66, 133, 244, 0.35)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: course.enrollment_type === 'open' ? '#34D399' : '#60A5FA',
                  }}
                >
                  {course.enrollment_type === 'open' ? <Sparkles size={22} /> : <Send size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {course.is_full
                      ? 'Join Course Waitlist'
                      : course.enrollment_type === 'open'
                      ? 'Confirm Instant Enrollment'
                      : 'Confirm Course Application'}
                  </h3>
                  <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                    Google Developer Groups on Campus HNU
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowEnrollConfirmModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.45rem',
                  color: '#94A3B8',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Course Brief Card */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: '#60A5FA', fontWeight: 700 }}>
                  {course.category || 'Technical Track'}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.35 }}>
                  {course.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                  <span>⏱ ~{totalHours} Total Hours</span>
                  {sessions.length > 0 && <span>• 📅 {sessions.length} Scheduled Sessions</span>}
                </div>
              </div>

              {/* Confirmation Notice */}
              <div
                style={{
                  padding: '0.9rem 1.1rem',
                  borderRadius: '12px',
                  background:
                    course.enrollment_type === 'open'
                      ? 'rgba(52, 168, 83, 0.1)'
                      : 'rgba(66, 133, 244, 0.1)',
                  border: `1px solid ${
                    course.enrollment_type === 'open'
                      ? 'rgba(52, 168, 83, 0.25)'
                      : 'rgba(66, 133, 244, 0.25)'
                  }`,
                  color: '#CBD5E1',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                }}
              >
                {course.is_full
                  ? 'You are joining the waiting list for this track. You will be notified automatically if an enrollment seat opens up.'
                  : course.enrollment_type === 'open'
                  ? 'Clicking Confirm will immediately confirm your registration and unlock all learning materials and sessions.'
                  : 'Are you sure you want to submit your application for this track? Your student profile details will be submitted to the course instructors for review.'}
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowEnrollConfirmModal(false)}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#CBD5E1',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmEnroll}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  background:
                    course.is_full
                      ? '#A855F7'
                      : course.enrollment_type === 'open'
                      ? '#34A853'
                      : '#4285F4',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
                }}
              >
                {isSubmitting ? (
                  'Submitting...'
                ) : course.is_full ? (
                  'Confirm & Join Waitlist'
                ) : course.enrollment_type === 'open' ? (
                  <>
                    <Sparkles size={16} />
                    <span>Confirm Enrollment</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Confirm & Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MOBILE FLOATING STICKY ACTION BAR */}
      {/* ========================================================================= */}
      <div
        className="student-mobile-sticky-bar"
        style={{
          position: 'fixed',
          bottom: isAuthenticated
            ? 'calc(62px + env(safe-area-inset-bottom, 0px))'
            : '0px',
          left: 0,
          right: 0,
          zIndex: 45,
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(66, 133, 244, 0.35)',
          padding: isAuthenticated
            ? '0.75rem 1.25rem'
            : '0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom, 0px)) 1.25rem',
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.6)',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 800,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {course.title}
          </div>
          <div style={{ fontSize: '0.74rem', color: isConfirmed ? '#34D399' : '#94A3B8', marginTop: '0.15rem' }}>
            {!isAuthenticated
              ? 'Sign in to enroll • Free admission'
              : isConfirmed
              ? '✓ Enrolled in Track'
              : isPending
              ? '⏳ Application Submitted'
              : isWaitlisted
              ? '⏸ On Waitlist'
              : `${sessions.length} Sessions • Free Admission`}
          </div>
        </div>

        {!isAuthenticated ? (
          <Link
            href={`/student?signin=true&returnUrl=/student/courses/${course.id}`}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.4)',
            }}
          >
            <LogIn size={15} />
            <span>Sign In to Enroll</span>
          </Link>
        ) : isConfirmed ? (
          <button
            type="button"
            onClick={() => {
              handleTabChange('sessions');
              const el = document.getElementById('course-workspace-tabs');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
            style={{
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.25) 0%, rgba(66, 133, 244, 0.2) 100%)',
              border: '1px solid rgba(52, 168, 83, 0.5)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={15} color="#34D399" />
            <span>Workspace</span>
          </button>
        ) : isPending ? (
          <div
            style={{
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              background: 'rgba(251, 188, 4, 0.15)',
              border: '1px solid rgba(251, 188, 4, 0.35)',
              color: '#FBBF24',
              fontSize: '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Clock3 size={13} />
            <span>In Review</span>
          </div>
        ) : isWaitlisted ? (
          <div
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              color: '#C084FC',
              fontSize: '0.8rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            On Waitlist
          </div>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleInitiateEnroll}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              background:
                course.is_full
                  ? '#A855F7'
                  : course.enrollment_type === 'open'
                  ? '#34A853'
                  : '#4285F4',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.4)',
            }}
          >
            {isSubmitting ? (
              'Submitting...'
            ) : course.is_full ? (
              'Join Waitlist'
            ) : course.enrollment_type === 'open' ? (
              <>
                <Sparkles size={14} />
                <span>Join Track</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>Apply Now</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
