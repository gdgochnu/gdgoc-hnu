'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  Award,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  BookOpen,
  FileCheck2,
  Layers,
  ChevronRight,
  Filter,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MoveUp,
  MoveDown,
  Copy,
  ToggleLeft,
  ToggleRight,
  Brain,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import {
  CourseDetailHeader,
  CourseQuizItem,
  QuizLessonOption,
  CreateQuizInput,
  UpdateQuizInput,
  createCourseQuiz,
  updateCourseQuiz,
  toggleQuizStatus,
  deleteCourseQuiz,
} from '@/app/student-portal/admin/courses/[id]/quizzes/actions';
import { QuizQuestion, QuizStatus, QuizQuestionType } from '@/types/student';

interface CourseQuizzesClientProps {
  course: CourseDetailHeader;
  initialQuizzes: CourseQuizItem[];
  availableLessons: QuizLessonOption[];
  canManage: boolean;
  userRole?: string;
}

interface NotificationState {
  type: 'success' | 'error';
  message: string;
}

export function CourseQuizzesClient({
  course,
  initialQuizzes,
  availableLessons,
  canManage,
}: CourseQuizzesClientProps) {
  const [quizzes, setQuizzes] = useState<CourseQuizItem[]>(initialQuizzes);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<CourseQuizItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonId, setLessonId] = useState<string>('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | ''>(15);
  const [passingScore, setPassingScore] = useState<number>(70);
  const [allowRetakes, setAllowRetakes] = useState<boolean>(true);
  const [maxAttempts, setMaxAttempts] = useState<number>(3);
  const [status, setStatus] = useState<QuizStatus>('draft');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'questions'>('questions');

  // Filtered quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.lesson && q.lesson.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics KPIs
  const totalQuizzes = quizzes.length;
  const publishedQuizzes = quizzes.filter((q) => q.status === 'published').length;
  const draftQuizzes = quizzes.filter((q) => q.status === 'draft').length;
  const totalQuestionsBanked = quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0);
  const totalAttemptsCount = quizzes.reduce((acc, q) => acc + (q.attempts_count || 0), 0);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const openCreateModal = () => {
    setEditingQuiz(null);
    setTitle('');
    setDescription('');
    setLessonId('');
    setTimeLimitMinutes(15);
    setPassingScore(70);
    setAllowRetakes(true);
    setMaxAttempts(3);
    setStatus('draft');
    setQuestions([
      {
        id: `q_${Date.now()}_1`,
        type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 1,
        explanation: '',
      },
    ]);
    setActiveTab('questions');
    setIsModalOpen(true);
  };

  const openEditModal = (quiz: CourseQuizItem) => {
    setEditingQuiz(quiz);
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setLessonId(quiz.lesson_id || '');
    setTimeLimitMinutes(quiz.time_limit_minutes ?? '');
    setPassingScore(quiz.passing_score_percentage);
    setAllowRetakes(quiz.allow_retakes);
    setMaxAttempts(quiz.max_attempts);
    setStatus(quiz.status);

    // Normalize questions options
    const normalizedQuestions: QuizQuestion[] = (quiz.questions || []).map((q, idx) => {
      let opts: string[] = [];
      if (Array.isArray(q.options)) {
        opts = q.options.map((opt) => (typeof opt === 'string' ? opt : (opt as any).text || ''));
      }
      return {
        id: q.id || `q_${Date.now()}_${idx}`,
        type: q.type || 'multiple_choice',
        question_text: q.question_text || '',
        options: opts.length > 0 ? opts : ['', '', '', ''],
        correct_answer: q.correct_answer !== undefined ? q.correct_answer : 0,
        points: q.points || 1,
        explanation: q.explanation || '',
      };
    });

    setQuestions(
      normalizedQuestions.length > 0
        ? normalizedQuestions
        : [
            {
              id: `q_${Date.now()}_1`,
              type: 'multiple_choice',
              question_text: '',
              options: ['', '', '', ''],
              correct_answer: 0,
              points: 1,
              explanation: '',
            },
          ]
    );
    setActiveTab('questions');
    setIsModalOpen(true);
  };

  // Question manipulation helpers
  const handleAddQuestion = (type: QuizQuestionType = 'multiple_choice') => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      type,
      question_text: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : type === 'true_false' ? ['True', 'False'] : [],
      correct_answer: type === 'true_false' ? 'True' : 0,
      points: 1,
      explanation: '',
    };
    setQuestions((prev) => [...prev, newQuestion]);
  };

  const handleUpdateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      showNotification('error', 'A quiz must contain at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDuplicateQuestion = (index: number) => {
    const original = questions[index];
    const duplicate: QuizQuestion = {
      ...original,
      id: `q_${Date.now()}_dup`,
      question_text: `${original.question_text} (Copy)`,
      options: Array.isArray(original.options) ? (original.options.slice() as any) : [],
    };
    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicate);
      return copy;
    });
    showNotification('success', 'Question duplicated.');
  };

  // Quick toggle status switch
  const handleToggleStatus = async (quiz: CourseQuizItem) => {
    const nextStatus: QuizStatus = quiz.status === 'published' ? 'draft' : 'published';
    try {
      const res = await toggleQuizStatus(quiz.id, course.id, nextStatus);
      if (res.success) {
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quiz.id ? { ...q, status: nextStatus } : q))
        );
        showNotification(
          'success',
          `Quiz "${quiz.title}" is now ${nextStatus === 'published' ? 'Published' : 'Draft'}.`
        );
      } else {
        showNotification('error', res.error || 'Failed to update status.');
      }
    } catch {
      showNotification('error', 'Network error updating quiz status.');
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const res = await deleteCourseQuiz(quizId, course.id);
      if (res.success) {
        setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
        setDeleteConfirmId(null);
        showNotification('success', 'Quiz deleted successfully.');
      } else {
        showNotification('error', res.error || 'Failed to delete quiz.');
      }
    } catch {
      showNotification('error', 'Network error deleting quiz.');
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showNotification('error', 'Please enter a quiz title.');
      return;
    }

    if (questions.length === 0) {
      showNotification('error', 'Please add at least one question to the quiz.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        showNotification('error', `Question #${i + 1} is missing the question prompt.`);
        setActiveTab('questions');
        return;
      }
      if (q.type === 'multiple_choice') {
        const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
        if (opts.length < 2 || opts.some((o) => !o.trim())) {
          showNotification('error', `Question #${i + 1} must have at least 2 non-empty options.`);
          setActiveTab('questions');
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const timeLimitVal = timeLimitMinutes === '' ? null : Number(timeLimitMinutes);

      if (editingQuiz) {
        const updateInput: UpdateQuizInput = {
          id: editingQuiz.id,
          course_id: course.id,
          title: title.trim(),
          description: description.trim(),
          lesson_id: lessonId || null,
          time_limit_minutes: timeLimitVal,
          passing_score_percentage: Number(passingScore),
          allow_retakes: allowRetakes,
          max_attempts: Number(maxAttempts),
          status,
          questions,
        };

        const res = await updateCourseQuiz(updateInput);
        if (res.success && res.quiz) {
          setQuizzes((prev) => prev.map((q) => (q.id === res.quiz!.id ? res.quiz! : q)));
          setIsModalOpen(false);
          showNotification('success', 'Quiz updated successfully.');
        } else {
          showNotification('error', res.error || 'Failed to update quiz.');
        }
      } else {
        const createInput: CreateQuizInput = {
          course_id: course.id,
          title: title.trim(),
          description: description.trim(),
          lesson_id: lessonId || null,
          time_limit_minutes: timeLimitVal,
          passing_score_percentage: Number(passingScore),
          allow_retakes: allowRetakes,
          max_attempts: Number(maxAttempts),
          status,
          questions,
        };

        const res = await createCourseQuiz(createInput);
        if (res.success && res.quiz) {
          setQuizzes((prev) => [res.quiz!, ...prev]);
          setIsModalOpen(false);
          showNotification('success', 'Quiz created successfully.');
        } else {
          showNotification('error', res.error || 'Failed to create quiz.');
        }
      }
    } catch {
      showNotification('error', 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', paddingBottom: '5rem' }}>
      {/* Top Banner / Breadcrumb */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/student-portal/admin/courses"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#94A3B8',
                fontSize: '0.85rem',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
            >
              <ArrowLeft size={16} />
              <span>All Courses</span>
            </Link>
            <ChevronRight size={14} style={{ color: '#475569' }} />
            <Link
              href={`/student-portal/admin/courses/${course.id}`}
              style={{
                color: '#94A3B8',
                fontSize: '0.85rem',
                textDecoration: 'none',
                maxWidth: '220px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {course.title}
            </Link>
            <ChevronRight size={14} style={{ color: '#475569' }} />
            <span style={{ color: '#C084FC', fontSize: '0.85rem', fontWeight: 600 }}>
              Quizzes & Assessments
            </span>
          </div>

          <Link
            href={`/student/courses/${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = '#CBD5E1';
            }}
          >
            <span>Preview Student View</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Notification Banner */}
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
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
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
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-80px',
              right: '-60px',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1.5rem',
              flexWrap: 'wrap',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: '0.6rem',
                  flexWrap: 'wrap',
                }}
              >
                {course.category && (
                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      color: '#C084FC',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {course.category}
                  </span>
                )}
                {course.department_name && (
                  <span
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      color: '#93C5FD',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {course.department_name}
                  </span>
                )}
                <span
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    background:
                      course.status === 'published'
                        ? 'rgba(52, 168, 83, 0.15)'
                        : 'rgba(251, 188, 4, 0.15)',
                    border: `1px solid ${
                      course.status === 'published'
                        ? 'rgba(52, 168, 83, 0.35)'
                        : 'rgba(251, 188, 4, 0.35)'
                    }`,
                    color: course.status === 'published' ? '#86EFAC' : '#FDE047',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  Course {course.status}
                </span>
              </div>

              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  margin: '0 0 0.5rem 0',
                  color: '#FFFFFF',
                  letterSpacing: '-0.02em',
                }}
              >
                {course.title} — Quiz Builder
              </h1>
              <p
                style={{
                  color: '#94A3B8',
                  fontSize: '0.95rem',
                  maxWidth: '750px',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Create automated quizzes, multiple choice tests, true/false checks, and interactive
                question banks with customizable time limits and instant scoring.
              </p>
            </div>

            {canManage && (
              <button
                onClick={openCreateModal}
                id="create-quiz-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(147, 51, 234, 0.35)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(147, 51, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(147, 51, 234, 0.35)';
                }}
              >
                <Plus size={18} />
                <span>Create New Quiz</span>
              </button>
            )}
          </div>

          {/* Sub Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              overflowX: 'auto',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={`/student-portal/admin/courses/${course.id}`}
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
              <Layers size={14} />
              <span>Overview</span>
            </Link>

            <Link
              href={`/student-portal/admin/courses/${course.id}/sessions`}
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
              <Calendar size={14} style={{ color: '#60A5FA' }} />
              <span>Sessions</span>
            </Link>

            <Link
              href={`/student-portal/admin/courses/${course.id}/lessons`}
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
              <BookOpen size={14} style={{ color: '#93C5FD' }} />
              <span>Lessons</span>
            </Link>

            <Link
              href={`/student-portal/admin/courses/${course.id}/tasks`}
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
              <FileCheck2 size={14} style={{ color: '#FDE047' }} />
              <span>Tasks</span>
            </Link>

            <Link
              href={`/student-portal/admin/courses/${course.id}/submissions`}
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
              <Award size={14} style={{ color: '#34D399' }} />
              <span>Submissions & Grading</span>
            </Link>

            {/* Active Quizzes Tab */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                background:
                  'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(79, 70, 229, 0.25))',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              <HelpCircle size={14} style={{ color: '#C084FC' }} />
              <span>Quizzes ({totalQuizzes})</span>
            </div>

            <Link
              href={`/student-portal/admin/courses/${course.id}/enrollments`}
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
              <span>Enrollments</span>
            </Link>
          </div>
        </div>

        {/* KPI Statistics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C084FC',
              }}
            >
              <HelpCircle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                {totalQuizzes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Total Quizzes</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                {publishedQuizzes}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Published ({draftQuizzes} Drafts)
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <ListChecks size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                {totalQuestionsBanked}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Questions Banked</div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FDE047',
              }}
            >
              <Brain size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                {totalAttemptsCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Student Attempts</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
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
              placeholder="Search quizzes by title, description, or lesson..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Filter size={13} />
              Status:
            </span>
            {(['all', 'published', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  background:
                    statusFilter === st
                      ? 'rgba(168, 85, 247, 0.25)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${
                    statusFilter === st
                      ? 'rgba(168, 85, 247, 0.5)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  color: statusFilter === st ? '#C084FC' : '#CBD5E1',
                  fontSize: '0.8rem',
                  fontWeight: statusFilter === st ? 600 : 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Quizzes List / Grid */}
        {filteredQuizzes.length === 0 ? (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#C084FC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem auto',
              }}
            >
              <HelpCircle size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
              {searchQuery || statusFilter !== 'all'
                ? 'No quizzes matched your filters'
                : 'No Quizzes Created Yet'}
            </h3>
            <p
              style={{
                color: '#94A3B8',
                fontSize: '0.9rem',
                maxWidth: '480px',
                margin: '0 auto 1.5rem auto',
                lineHeight: 1.5,
              }}
            >
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search query or status filter to see other quizzes.'
                : 'Assess student knowledge by creating comprehensive quizzes linked to your curriculum lessons.'}
            </p>
            {canManage && (
              <button
                onClick={openCreateModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Create First Quiz</span>
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {filteredQuizzes.map((quiz) => {
              const qCount = quiz.questions?.length || 0;
              const pointsSum = (quiz.questions || []).reduce(
                (sum, q) => sum + (Number(q.points) || 0),
                0
              );

              return (
                <div
                  key={quiz.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top Row: Lesson Tag + Status Switch */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      {quiz.lesson ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(66, 133, 244, 0.15)',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            color: '#93C5FD',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <BookOpen size={12} />
                          Lesson {quiz.lesson.lesson_number}: {quiz.lesson.title}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(148, 163, 184, 0.12)',
                            border: '1px solid rgba(148, 163, 184, 0.25)',
                            color: '#94A3B8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          Standalone Assessment
                        </span>
                      )}

                      {/* Status Toggle */}
                      {canManage ? (
                        <button
                          onClick={() => handleToggleStatus(quiz)}
                          title={`Click to ${quiz.status === 'published' ? 'unpublish' : 'publish'}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '20px',
                            background:
                              quiz.status === 'published'
                                ? 'rgba(52, 168, 83, 0.15)'
                                : 'rgba(251, 188, 4, 0.15)',
                            border: `1px solid ${
                              quiz.status === 'published'
                                ? 'rgba(52, 168, 83, 0.35)'
                                : 'rgba(251, 188, 4, 0.35)'
                            }`,
                            color: quiz.status === 'published' ? '#34D399' : '#FDE047',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {quiz.status === 'published' ? (
                            <>
                              <ToggleRight size={14} />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={14} />
                              <span>Draft</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '20px',
                            background:
                              quiz.status === 'published'
                                ? 'rgba(52, 168, 83, 0.15)'
                                : 'rgba(251, 188, 4, 0.15)',
                            color: quiz.status === 'published' ? '#34D399' : '#FDE047',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {quiz.status}
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        margin: '0 0 0.4rem 0',
                        color: '#FFFFFF',
                        lineHeight: 1.4,
                      }}
                    >
                      {quiz.title}
                    </h3>

                    <p
                      style={{
                        color: '#94A3B8',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        margin: '0 0 1.25rem 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {quiz.description || 'No description provided.'}
                    </p>

                    {/* Metadata Badges */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#E2E8F0',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Clock size={12} style={{ color: '#60A5FA' }} />
                        <span>
                          {quiz.time_limit_minutes
                            ? `${quiz.time_limit_minutes} mins`
                            : 'No time limit'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#E2E8F0',
                          fontSize: '0.75rem',
                        }}
                      >
                        <Award size={12} style={{ color: '#34D399' }} />
                        <span>Pass: {quiz.passing_score_percentage}%</span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#E2E8F0',
                          fontSize: '0.75rem',
                        }}
                      >
                        <ListChecks size={12} style={{ color: '#C084FC' }} />
                        <span>
                          {qCount} {qCount === 1 ? 'Question' : 'Questions'} ({pointsSum} pts)
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#E2E8F0',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span>
                          {quiz.allow_retakes
                            ? `${quiz.max_attempts} max attempts`
                            : 'Single attempt'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Stats + Actions */}
                  <div
                    style={{
                      paddingTop: '1rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      <span style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {quiz.attempts_count}
                      </span>{' '}
                      attempts ({quiz.passed_count} passed)
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {canManage && (
                        <>
                          <button
                            onClick={() => openEditModal(quiz)}
                            title="Edit Quiz & Questions"
                            style={{
                              padding: '0.45rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#CBD5E1',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                              e.currentTarget.style.color = '#C084FC';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                              e.currentTarget.style.color = '#CBD5E1';
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          {deleteConfirmId === quiz.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <button
                                onClick={() => handleDeleteQuiz(quiz.id)}
                                title="Confirm Delete"
                                style={{
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.25)',
                                  border: '1px solid rgba(239, 68, 68, 0.5)',
                                  color: '#FCA5A5',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                  padding: '0.4rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(quiz.id)}
                              title="Delete Quiz"
                              style={{
                                padding: '0.45rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                e.currentTarget.style.color = '#F87171';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.color = '#94A3B8';
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz Builder Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
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
              maxWidth: '920px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              position: 'relative',
              overflow: 'hidden',
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
                background: 'rgba(30, 41, 59, 0.95)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                    {editingQuiz ? 'Edit Quiz & Question Bank' : 'Create New Assessment'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
                    {course.title} &bull; {questions.length} Questions &bull; {totalPoints} Total Points
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(15, 23, 42, 0.6)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '0 1.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === 'questions'
                      ? '2px solid #C084FC'
                      : '2px solid transparent',
                  color: activeTab === 'questions' ? '#C084FC' : '#94A3B8',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ListChecks size={16} />
                <span>Question Bank ({questions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom:
                    activeTab === 'settings'
                      ? '2px solid #C084FC'
                      : '2px solid transparent',
                  color: activeTab === 'settings' ? '#C084FC' : '#94A3B8',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Clock size={16} />
                <span>Quiz Settings & Rules</span>
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmit}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* TAB 1: Questions Bank */}
              {activeTab === 'questions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Quick Title Bar inside questions tab */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#E2E8F0',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Quiz Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Midterm Assessment: Neural Networks Fundamentals"
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          color: '#FFFFFF',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {/* Add Question Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      padding: '0.5rem 0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0' }}>
                        Questions ({questions.length})
                      </span>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          color: '#C084FC',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {totalPoints} Total Points
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('multiple_choice')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.4)',
                          color: '#C084FC',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>+ Multiple Choice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddQuestion('true_false')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.4)',
                          color: '#93C5FD',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>+ True / False</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddQuestion('short_answer')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.45rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          border: '1px solid rgba(52, 168, 83, 0.4)',
                          color: '#86EFAC',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>+ Short Answer</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {questions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        style={{
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          position: 'relative',
                        }}
                      >
                        {/* Question Top Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            marginBottom: '1rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingBottom: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span
                              style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: 'rgba(168, 85, 247, 0.2)',
                                color: '#C084FC',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                              }}
                            >
                              {idx + 1}
                            </span>

                            {/* Type selector */}
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const nextType = e.target.value as QuizQuestionType;
                                handleUpdateQuestion(idx, {
                                  type: nextType,
                                  options:
                                    nextType === 'multiple_choice'
                                      ? ['', '', '', '']
                                      : nextType === 'true_false'
                                      ? ['True', 'False']
                                      : [],
                                  correct_answer: nextType === 'true_false' ? 'True' : 0,
                                });
                              }}
                              style={{
                                background: 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                padding: '0.3rem 0.6rem',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                outline: 'none',
                              }}
                            >
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="true_false">True / False</option>
                              <option value="short_answer">Short Answer</option>
                            </select>
                          </div>

                          {/* Controls: Points, Up/Down, Dup, Delete */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                marginRight: '0.5rem',
                              }}
                            >
                              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Points:</span>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={q.points || 1}
                                onChange={(e) =>
                                  handleUpdateQuestion(idx, {
                                    points: Math.max(1, parseInt(e.target.value) || 1),
                                  })
                                }
                                style={{
                                  width: '52px',
                                  background: 'rgba(30, 41, 59, 0.8)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.4rem',
                                  color: '#FFFFFF',
                                  fontSize: '0.8rem',
                                  textAlign: 'center',
                                  outline: 'none',
                                }}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              disabled={idx === 0}
                              title="Move Up"
                              style={{
                                padding: '0.35rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: idx === 0 ? '#475569' : '#CBD5E1',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <MoveUp size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              disabled={idx === questions.length - 1}
                              title="Move Down"
                              style={{
                                padding: '0.35rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: idx === questions.length - 1 ? '#475569' : '#CBD5E1',
                                cursor: idx === questions.length - 1 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <MoveDown size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(idx)}
                              title="Duplicate Question"
                              style={{
                                padding: '0.35rem',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#CBD5E1',
                                cursor: 'pointer',
                              }}
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(idx)}
                              title="Delete Question"
                              style={{
                                padding: '0.35rem',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#F87171',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Question Prompt Input */}
                        <div style={{ marginBottom: '1rem' }}>
                          <textarea
                            rows={2}
                            placeholder="Enter the question prompt here..."
                            value={q.question_text}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, { question_text: e.target.value })
                            }
                            style={{
                              width: '100%',
                              background: 'rgba(30, 41, 59, 0.6)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              padding: '0.65rem 0.85rem',
                              color: '#FFFFFF',
                              fontSize: '0.9rem',
                              outline: 'none',
                              resize: 'vertical',
                            }}
                          />
                        </div>

                        {/* Multiple Choice Options */}
                        {q.type === 'multiple_choice' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#94A3B8',
                                marginBottom: '0.2rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span>Select the radio button next to the correct answer:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentOpts = Array.isArray(q.options)
                                    ? (q.options as string[])
                                    : [];
                                  handleUpdateQuestion(idx, {
                                    options: [...currentOpts, ''],
                                  });
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#C084FC',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                + Add Option
                              </button>
                            </div>

                            {(Array.isArray(q.options) ? (q.options as string[]) : []).map(
                              (opt, optIdx) => {
                                const isCorrect =
                                  q.correct_answer === optIdx ||
                                  (typeof q.correct_answer === 'string' &&
                                    q.correct_answer === opt);

                                return (
                                  <div
                                    key={optIdx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.6rem',
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      name={`correct_${q.id || idx}`}
                                      checked={Boolean(isCorrect)}
                                      onChange={() =>
                                        handleUpdateQuestion(idx, { correct_answer: optIdx })
                                      }
                                      style={{ cursor: 'pointer', accentColor: '#34A853' }}
                                    />
                                    <input
                                      type="text"
                                      placeholder={`Option ${optIdx + 1}`}
                                      value={opt}
                                      onChange={(e) => {
                                        const currentOpts = [
                                          ...(q.options as string[]),
                                        ];
                                        currentOpts[optIdx] = e.target.value;
                                        handleUpdateQuestion(idx, { options: currentOpts });
                                      }}
                                      style={{
                                        flex: 1,
                                        background: isCorrect
                                          ? 'rgba(52, 168, 83, 0.1)'
                                          : 'rgba(30, 41, 59, 0.7)',
                                        border: `1px solid ${
                                          isCorrect
                                            ? 'rgba(52, 168, 83, 0.4)'
                                            : 'rgba(255, 255, 255, 0.1)'
                                        }`,
                                        borderRadius: '6px',
                                        padding: '0.45rem 0.75rem',
                                        color: '#FFFFFF',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                      }}
                                    />
                                    {(q.options as string[]).length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentOpts = (
                                            q.options as string[]
                                          ).filter((_, i) => i !== optIdx);
                                          handleUpdateQuestion(idx, {
                                            options: currentOpts,
                                            correct_answer: 0,
                                          });
                                        }}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#94A3B8',
                                          cursor: 'pointer',
                                          padding: '0.2rem',
                                        }}
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                        {/* True / False Options */}
                        {q.type === 'true_false' && (
                          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            {['True', 'False'].map((tfVal) => {
                              const isSelected = String(q.correct_answer) === tfVal;
                              return (
                                <button
                                  key={tfVal}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateQuestion(idx, { correct_answer: tfVal })
                                  }
                                  style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    background: isSelected
                                      ? 'rgba(52, 168, 83, 0.2)'
                                      : 'rgba(30, 41, 59, 0.6)',
                                    border: `1px solid ${
                                      isSelected
                                        ? 'rgba(52, 168, 83, 0.5)'
                                        : 'rgba(255, 255, 255, 0.1)'
                                    }`,
                                    color: isSelected ? '#86EFAC' : '#CBD5E1',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                  }}
                                >
                                  {isSelected && <Check size={16} />}
                                  <span>{tfVal}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Short Answer */}
                        {q.type === 'short_answer' && (
                          <div>
                            <label
                              style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                color: '#94A3B8',
                                marginBottom: '0.35rem',
                              }}
                            >
                              Expected Answer / Model Solution:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Backpropagation or gradient descent"
                              value={String(q.correct_answer || '')}
                              onChange={(e) =>
                                handleUpdateQuestion(idx, { correct_answer: e.target.value })
                              }
                              style={{
                                width: '100%',
                                background: 'rgba(30, 41, 59, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                padding: '0.5rem 0.75rem',
                                color: '#FFFFFF',
                                fontSize: '0.85rem',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}

                        {/* Explanation Box */}
                        <div style={{ marginTop: '0.85rem' }}>
                          <input
                            type="text"
                            placeholder="Explanation / feedback shown after grading (optional)..."
                            value={q.explanation || ''}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, { explanation: e.target.value })
                            }
                            style={{
                              width: '100%',
                              background: 'transparent',
                              border: '1px dashed rgba(255, 255, 255, 0.12)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.65rem',
                              color: '#94A3B8',
                              fontSize: '0.75rem',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: Quiz Settings */}
              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Basic fields */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#E2E8F0',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Chapter 1 Mastery Check"
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#E2E8F0',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Associated Lesson (Optional)
                    </label>
                    <select
                      value={lessonId}
                      onChange={(e) => setLessonId(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    >
                      <option value="">No specific lesson (Course-level assessment)</option>
                      {availableLessons.map((les) => (
                        <option key={les.id} value={les.id}>
                          Lesson {les.lesson_number}: {les.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#E2E8F0',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Instructions & Student Guidelines
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Provide helpful instructions, passing threshold notice, or rules for students..."
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  {/* Timing & Passing Criteria */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1rem',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#E2E8F0',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Time Limit (Minutes)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={timeLimitMinutes}
                        onChange={(e) =>
                          setTimeLimitMinutes(
                            e.target.value === '' ? '' : parseInt(e.target.value) || 0
                          )
                        }
                        placeholder="Leave blank for untimed"
                        style={{
                          width: '100%',
                          background: 'rgba(30, 41, 59, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '0.55rem 0.75rem',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                        Set 0 or blank for no timer
                      </span>
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#E2E8F0',
                          marginBottom: '0.35rem',
                        }}
                      >
                        Passing Score Percentage (%)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="range"
                          min={40}
                          max={100}
                          step={5}
                          value={passingScore}
                          onChange={(e) => setPassingScore(parseInt(e.target.value))}
                          style={{ flex: 1, accentColor: '#9333EA' }}
                        />
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#C084FC',
                            width: '45px',
                            textAlign: 'right',
                          }}
                        >
                          {passingScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Retakes & Attempts Policy */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
                          Allow Retakes
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          Permit students to reattempt the quiz if they scored below the passing mark
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowRetakes(!allowRetakes)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: allowRetakes ? '#34D399' : '#94A3B8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {allowRetakes ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {allowRetakes && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>
                          Max Attempts Allowed:
                        </label>
                        <select
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                          style={{
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        >
                          <option value={1}>1 attempt</option>
                          <option value={2}>2 attempts</option>
                          <option value={3}>3 attempts</option>
                          <option value={5}>5 attempts</option>
                          <option value={10}>10 attempts</option>
                          <option value={999}>Unlimited retakes</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Status Selection */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#E2E8F0',
                        marginBottom: '0.35rem',
                      }}
                    >
                      Publish Status
                    </label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        <input
                          type="radio"
                          name="quiz_status"
                          value="draft"
                          checked={status === 'draft'}
                          onChange={() => setStatus('draft')}
                          style={{ accentColor: '#FBBC04' }}
                        />
                        <span>Draft (Hidden from students)</span>
                      </label>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        <input
                          type="radio"
                          name="quiz_status"
                          value="published"
                          checked={status === 'published'}
                          onChange={() => setStatus('published')}
                          style={{ accentColor: '#34A853' }}
                        />
                        <span>Published (Visible in Course Quizzes tab)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div
                style={{
                  paddingTop: '1.25rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94A3B8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {activeTab === 'questions' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Next: Settings & Rules &rarr;
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('questions')}
                      style={{
                        padding: '0.65rem 1.25rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#FFFFFF',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      &larr; Back to Questions
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    id="save-quiz-submit-btn"
                    style={{
                      padding: '0.65rem 1.5rem',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #9333EA, #4F46E5)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {isSubmitting ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>{editingQuiz ? 'Save Changes' : 'Create Quiz'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
