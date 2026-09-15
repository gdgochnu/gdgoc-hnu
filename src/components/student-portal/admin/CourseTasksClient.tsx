'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  HelpCircle,
  Edit2,
  Trash2,
  ExternalLink,
  Award,
  CheckCircle2,
  AlertCircle,
  Clock3,
  X,
  Search,
  Users,
  GraduationCap,
  BookOpen,
  QrCode,
  Link2,
  Upload,
  Layers,
  ChevronRight,
  Filter,
  Check,
  AlertTriangle,
  Send,
  Eye,
  UserCheck,
} from 'lucide-react';
import {
  CourseDetailHeader,
  CourseTaskItem,
  TaskLessonOption,
  EnrolledStudentOption,
  CreateTaskInput,
  UpdateTaskInput,
  createCourseTask,
  updateCourseTask,
  deleteCourseTask,
  updateTaskStatus,
} from '@/app/student-portal/admin/courses/[id]/tasks/actions';
import { TaskStatus, TaskSubmissionType, TaskAssignedScope } from '@/types/student';

interface CourseTasksClientProps {
  course: CourseDetailHeader;
  initialTasks: CourseTaskItem[];
  availableLessons: TaskLessonOption[];
  enrolledStudents: EnrolledStudentOption[];
  canManage: boolean;
  userRole?: string;
}

// Helper to format deadline and time left
function formatDeadlineInfo(dateStr: string | null | undefined): { text: string; isExpired: boolean; label: string } {
  if (!dateStr) return { text: 'No Deadline', isExpired: false, label: 'Ongoing' };
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const formatted = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diff <= 0) {
      return { text: formatted, isExpired: true, label: 'Expired' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return { text: formatted, isExpired: false, label: `${days}d ${hours}h left` };
    }
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { text: formatted, isExpired: false, label: `${hours}h ${mins}m left` };
  } catch {
    return { text: dateStr, isExpired: false, label: 'Scheduled' };
  }
}

export function CourseTasksClient({
  course,
  initialTasks,
  availableLessons,
  enrolledStudents,
  canManage,
}: CourseTasksClientProps) {
  const [tasks, setTasks] = useState<CourseTaskItem[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lessonFilter, setLessonFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CourseTaskItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [submissionType, setSubmissionType] = useState<TaskSubmissionType>('link');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [assignedScope, setAssignedScope] = useState<TaskAssignedScope>('all_enrolled');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('active');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // ----------------------------------------------------------------------------
  // Open Modals
  // ----------------------------------------------------------------------------
  const openCreateModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setSelectedLessonId('');
    setDueDate('');
    setSubmissionType('link');
    setMaxScore(100);
    setAssignedScope('all_enrolled');
    setSelectedStudentIds([]);
    setTaskStatus('active');
    setStudentSearchQuery('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (t: CourseTaskItem) => {
    setEditingTask(t);
    setTaskTitle(t.title);
    setTaskDescription(t.description || '');
    setSelectedLessonId(t.lesson_id || '');
    setDueDate(t.due_date ? new Date(t.due_date).toISOString().slice(0, 16) : '');
    setSubmissionType(t.submission_type);
    setMaxScore(t.max_score || 100);
    setAssignedScope(t.assigned_to);
    setSelectedStudentIds(t.specific_student_ids || []);
    setTaskStatus(t.status);
    setStudentSearchQuery('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Quick Preset for Due Dates
  const handleSetDuePreset = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(23, 59, 0, 0);
    setDueDate(d.toISOString().slice(0, 16));
  };

  // Toggle specific student selection
  const handleToggleStudent = (studentId: string) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(enrolledStudents.map((s) => s.id));
  };

  const handleClearAllStudents = () => {
    setSelectedStudentIds([]);
  };

  // ----------------------------------------------------------------------------
  // Save Task Handler
  // ----------------------------------------------------------------------------
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setFormError('Task title is required.');
      return;
    }

    if (assignedScope === 'specific' && selectedStudentIds.length === 0) {
      setFormError('Please select at least one student when assigning to specific students.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingTask) {
        const updatePayload: UpdateTaskInput = {
          id: editingTask.id,
          course_id: course.id,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          lesson_id: selectedLessonId || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          submission_type: submissionType,
          max_score: maxScore,
          assigned_to: assignedScope,
          specific_student_ids: assignedScope === 'specific' ? selectedStudentIds : [],
          status: taskStatus,
        };

        const res = await updateCourseTask(updatePayload);
        if (!res.success || !res.task) {
          setFormError(res.error || 'Failed to update task.');
          return;
        }

        setTasks(
          tasks.map((t) =>
            t.id === editingTask.id
              ? {
                  ...res.task!,
                  submissions_count: t.submissions_count,
                  graded_count: t.graded_count,
                  pending_count: t.pending_count,
                  total_eligible_students:
                    assignedScope === 'specific' ? selectedStudentIds.length : enrolledStudents.length,
                }
              : t
          )
        );
      } else {
        const createPayload: CreateTaskInput = {
          course_id: course.id,
          title: taskTitle.trim(),
          description: taskDescription.trim(),
          lesson_id: selectedLessonId || null,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          submission_type: submissionType,
          max_score: maxScore,
          assigned_to: assignedScope,
          specific_student_ids: assignedScope === 'specific' ? selectedStudentIds : [],
          status: taskStatus,
        };

        const res = await createCourseTask(createPayload);
        if (!res.success || !res.task) {
          setFormError(res.error || 'Failed to create task.');
          return;
        }

        const formatted = {
          ...res.task,
          total_eligible_students: assignedScope === 'specific' ? selectedStudentIds.length : enrolledStudents.length,
        };

        setTasks([formatted, ...tasks]);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Delete Task Handler
  // ----------------------------------------------------------------------------
  const handleDeleteTask = async (taskId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete task "${title}"? Any existing submissions will be permanently deleted.`)) {
      return;
    }

    try {
      const res = await deleteCourseTask(taskId, course.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete task.');
        return;
      }
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Toggle Status Handler (Quick Active / Closed)
  // ----------------------------------------------------------------------------
  const handleToggleStatus = async (taskId: string, currentStatus: TaskStatus) => {
    const nextStatus: TaskStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      const res = await updateTaskStatus(taskId, course.id, nextStatus);
      if (!res.success) {
        alert(res.error || 'Failed to update status.');
        return;
      }
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Filtered Tasks
  // ----------------------------------------------------------------------------
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.lesson?.title && t.lesson.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesType = typeFilter === 'all' || t.submission_type === typeFilter;
    const matchesLesson =
      lessonFilter === 'all' ||
      (lessonFilter === 'standalone' && !t.lesson_id) ||
      t.lesson_id === lessonFilter;

    return matchesSearch && matchesStatus && matchesType && matchesLesson;
  });

  const totalTasks = tasks.length;
  const activeTasksCount = tasks.filter((t) => t.status === 'active').length;
  const totalSubmissions = tasks.reduce((acc, t) => acc + t.submissions_count, 0);
  const totalGraded = tasks.reduce((acc, t) => acc + t.graded_count, 0);

  const filteredEnrolledStudents = enrolledStudents.filter((s) => {
    const q = studentSearchQuery.toLowerCase();
    return (
      (s.full_name_en && s.full_name_en.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header & Navigation Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', color: '#94A3B8' }}>
          <Link
            href="/student-portal/admin/courses"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Courses
          </Link>
          <span>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{course.title}</span>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Tasks & Assignments</span>
        </div>

        {/* Sub-Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(217, 119, 6, 0.25))',
              border: '1px solid rgba(251, 188, 4, 0.5)',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <FileCheck2 size={14} style={{ color: '#FDE047' }} />
            <span>Tasks ({totalTasks})</span>
          </div>

          <Link
            href={`/student-portal/admin/courses/${course.id}/submissions`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              color: '#34D399',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Award size={14} />
            <span>Submissions & Grading ({totalSubmissions})</span>
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/quizzes`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#C084FC',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <HelpCircle size={14} />
            <span>Quizzes</span>
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/enrollments`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.28)',
              color: '#86EFAC',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <GraduationCap size={14} />
            <span>Enrollments</span>
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/instructors`}
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
            <Users size={14} style={{ color: '#60A5FA' }} />
            <span>Instructors</span>
          </Link>

          <Link
            href={`/student-portal/admin/attendance/scan?type=course&courseId=${course.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(234, 67, 53, 0.12)',
              border: '1px solid rgba(234, 67, 53, 0.28)',
              color: '#FCA5A5',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <QrCode size={14} />
            <span>Scan QR</span>
          </Link>
        </div>
      </div>

      {/* 2. Course Hero Banner Card */}
      <div
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.75rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(251, 188, 4, 0.35)',
              flexShrink: 0,
            }}
          >
            <FileCheck2 size={30} color="#1E293B" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(251, 188, 4, 0.18)',
                  color: '#FDE047',
                  border: '1px solid rgba(251, 188, 4, 0.35)',
                }}
              >
                Task Assignments & Deliverables
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(52, 168, 83, 0.18)',
                  color: '#86EFAC',
                  border: '1px solid rgba(52, 168, 83, 0.35)',
                }}
              >
                {enrolledStudents.length} Confirmed Students
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', margin: 0, lineHeight: 1.25 }}>
              {course.title}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '650px' }}>
              Create coding challenges, practical projects, and homework. Assign to all students or target specific mentees.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.4rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
              color: '#1E293B',
              fontWeight: 800,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(251, 188, 4, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={18} />
            <span>Assign New Task</span>
          </button>
        )}
      </div>

      {/* 3. KPI Highlights Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
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
              background: 'rgba(251, 188, 4, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBC04',
            }}
          >
            <FileCheck2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{totalTasks}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Total Tasks</div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
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
              background: 'rgba(52, 168, 83, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34A853',
            }}
          >
            <Clock3 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{activeTasksCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Active Tasks</div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
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
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA',
            }}
          >
            <Send size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{totalSubmissions}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Submissions Received</div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '1.1rem 1.25rem',
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
              background: 'rgba(168, 85, 247, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C084FC',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{totalGraded}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Graded Submissions</div>
          </div>
        </div>
      </div>

      {/* 4. Filter & Search Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '0.85rem 1.2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search tasks by title, instructions, or lesson..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '0.86rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: '#E2E8F0',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="draft">Drafts Only</option>
            <option value="closed">Closed Only</option>
          </select>

          {/* Submission Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: '#E2E8F0',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Submission Types</option>
            <option value="link">URL / Link</option>
            <option value="file">File Upload</option>
            <option value="both">Both</option>
          </select>

          {/* Lesson Filter */}
          <select
            value={lessonFilter}
            onChange={(e) => setLessonFilter(e.target.value)}
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: '#E2E8F0',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Lessons / Standalone</option>
            <option value="standalone">Standalone Tasks Only</option>
            {availableLessons.map((l) => (
              <option key={l.id} value={l.id}>
                Lesson {l.lesson_number}: {l.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. Tasks List / Cards */}
      {filteredTasks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '14px',
            border: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <FileCheck2 size={44} style={{ color: '#64748B' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E2E8F0' }}>
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || lessonFilter !== 'all'
              ? 'No tasks match the active filters'
              : 'No tasks created yet'}
          </div>
          <p style={{ fontSize: '0.86rem', color: '#94A3B8', maxWidth: '460px', margin: 0 }}>
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || lessonFilter !== 'all'
              ? 'Try resetting the search terms or dropdown filters.'
              : 'Create your first course task to evaluate students, set submission deadlines, and start collecting work.'}
          </p>
          {canManage && (
            <button
              onClick={openCreateModal}
              style={{
                marginTop: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                background: '#FBBC04',
                color: '#1E293B',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Assign First Task</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredTasks.map((task) => {
            const deadline = formatDeadlineInfo(task.due_date);
            const submissionPercent =
              task.total_eligible_students > 0
                ? Math.min(100, Math.round((task.submissions_count / task.total_eligible_students) * 100))
                : 0;

            return (
              <div
                key={task.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'border-color 0.2s ease, transform 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Card Top Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {/* Status Pill */}
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background:
                            task.status === 'active'
                              ? 'rgba(52, 168, 83, 0.16)'
                              : task.status === 'draft'
                              ? 'rgba(148, 163, 184, 0.16)'
                              : 'rgba(234, 67, 53, 0.16)',
                          color:
                            task.status === 'active'
                              ? '#86EFAC'
                              : task.status === 'draft'
                              ? '#CBD5E1'
                              : '#FCA5A5',
                          border:
                            task.status === 'active'
                              ? '1px solid rgba(52, 168, 83, 0.3)'
                              : task.status === 'draft'
                              ? '1px solid rgba(148, 163, 184, 0.3)'
                              : '1px solid rgba(234, 67, 53, 0.3)',
                        }}
                      >
                        {task.status}
                      </span>

                      {/* Submission Type Pill */}
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(66, 133, 244, 0.14)',
                          color: '#93C5FD',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {task.submission_type === 'link' && <Link2 size={11} />}
                        {task.submission_type === 'file' && <Upload size={11} />}
                        {task.submission_type === 'both' && <Layers size={11} />}
                        <span>{task.submission_type === 'link' ? 'URL Link' : task.submission_type === 'file' ? 'File Upload' : 'Link & File'}</span>
                      </span>
                    </div>

                    {/* Max Score Pill */}
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        background: 'rgba(251, 188, 4, 0.15)',
                        color: '#FDE047',
                        border: '1px solid rgba(251, 188, 4, 0.3)',
                      }}
                    >
                      {task.max_score} Pts
                    </span>
                  </div>

                  {/* Title & Lesson link */}
                  <div>
                    <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 0.35rem 0', lineHeight: 1.3 }}>
                      {task.title}
                    </h3>
                    {task.lesson ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#93C5FD', fontWeight: 600 }}>
                        <BookOpen size={12} />
                        <span>Lesson {task.lesson.lesson_number}: {task.lesson.title}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>
                        Standalone Course Assignment
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: '#94A3B8',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Card Middle: Deadline & Targeting */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {/* Deadline row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      padding: '0.55rem 0.75rem',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#CBD5E1' }}>
                      <Clock size={13} style={{ color: deadline.isExpired ? '#F87171' : '#FDE047' }} />
                      <span>{deadline.text}</span>
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        color: deadline.isExpired ? '#FCA5A5' : '#86EFAC',
                      }}
                    >
                      {deadline.label}
                    </span>
                  </div>

                  {/* Submissions Progress */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#CBD5E1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Users size={12} />
                        <span>
                          {task.submissions_count} / {task.total_eligible_students} Submissions ({submissionPercent}%)
                        </span>
                      </span>
                      <span style={{ color: '#86EFAC', fontWeight: 600 }}>
                        {task.graded_count} Graded
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${submissionPercent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #FBBC04, #34A853)',
                          borderRadius: '999px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Bottom Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '0.85rem',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <Link
                    href={`/student-portal/admin/courses/${course.id}/submissions?taskId=${task.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(66, 133, 244, 0.14)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      color: '#93C5FD',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                    title="Review student submissions and assign grades"
                  >
                    <Send size={12} />
                    <span>Submissions ({task.submissions_count})</span>
                  </Link>

                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(task.id, task.status)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: task.status === 'active' ? '#FCA5A5' : '#86EFAC',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title={task.status === 'active' ? 'Close submissions' : 'Activate task'}
                      >
                        {task.status === 'active' ? 'Close' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(task)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#CBD5E1',
                          cursor: 'pointer',
                        }}
                        title="Edit Task"
                      >
                        <Edit2 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id, task.title)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.1)',
                          border: '1px solid rgba(234, 67, 53, 0.2)',
                          color: '#FCA5A5',
                          cursor: 'pointer',
                        }}
                        title="Delete Task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE / EDIT TASK MODAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              maxWidth: '760px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(251, 188, 4, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FBBC04',
                  }}
                >
                  <FileCheck2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {editingTask ? 'Edit Task Assignment' : 'Assign New Student Task'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{course.title}</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: '0.4rem',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Task Title */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Build an Interactive Todo App with LocalStorage"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Row: Linked Lesson & Max Score */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Linked Lesson (Optional)
                  </label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">None — Standalone Assignment</option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        Lesson {l.lesson_number}: {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Max Score (Points)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(parseInt(e.target.value) || 100)}
                    required
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Task Description / Instructions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                  Instructions & Requirements
                </label>
                <textarea
                  rows={4}
                  placeholder="Detail the deliverable specifications, expected code structure, repository requirements, or evaluation criteria..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    color: '#F8FAFC',
                    fontSize: '0.86rem',
                    lineHeight: 1.6,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Due Date & Quick Presets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Submission Deadline
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => handleSetDuePreset(3)}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#93C5FD',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      +3 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDuePreset(7)}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#93C5FD',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      +1 Week
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetDuePreset(14)}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#93C5FD',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      +2 Weeks
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Row: Submission Type & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Allowed Submission Type
                  </label>
                  <select
                    value={submissionType}
                    onChange={(e) => setSubmissionType(e.target.value as any)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="link">URL / Link Submission (GitHub, deployed site, Google Doc)</option>
                    <option value="file">File Upload (PDF, ZIP, source archive)</option>
                    <option value="both">Both (Student choice)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Initial Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#F8FAFC',
                      fontSize: '0.88rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="active">Active (Students can submit immediately)</option>
                    <option value="draft">Draft (Hidden from students)</option>
                    <option value="closed">Closed (Locked for submissions)</option>
                  </select>
                </div>
              </div>

              {/* Assignment Scope (All Enrolled vs Specific Students) */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#E2E8F0' }}>
                  Assigned Target Students
                </label>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', color: '#F8FAFC' }}>
                    <input
                      type="radio"
                      name="assignedScope"
                      checked={assignedScope === 'all_enrolled'}
                      onChange={() => setAssignedScope('all_enrolled')}
                    />
                    <span>All Enrolled Students ({enrolledStudents.length})</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', color: '#F8FAFC' }}>
                    <input
                      type="radio"
                      name="assignedScope"
                      checked={assignedScope === 'specific'}
                      onChange={() => setAssignedScope('specific')}
                    />
                    <span>Specific Mentees / Students ({selectedStudentIds.length} Selected)</span>
                  </label>
                </div>

                {/* Specific Students Checklist UI */}
                {assignedScope === 'specific' && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <Search size={14} style={{ color: '#94A3B8' }} />
                        <input
                          type="text"
                          placeholder="Search enrolled students..."
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: '#F8FAFC',
                            fontSize: '0.8rem',
                            width: '100%',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={handleSelectAllStudents}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#93C5FD',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllStudents}
                          style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: 'none',
                            color: '#F87171',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      {filteredEnrolledStudents.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#64748B', padding: '0.5rem' }}>
                          No students match search.
                        </div>
                      ) : (
                        filteredEnrolledStudents.map((s) => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              onClick={() => handleToggleStudent(s.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                background: isSelected ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                                border: isSelected ? '1px solid rgba(251, 188, 4, 0.35)' : '1px solid transparent',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: '#3B82F6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    color: '#fff',
                                    fontWeight: 700,
                                  }}
                                >
                                  {(s.full_name_en || s.email)[0].toUpperCase()}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#F8FAFC' }}>
                                  {s.full_name_en || s.email}
                                </div>
                              </div>
                              {isSelected && <Check size={14} color="#FBBC04" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.2rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
                    border: 'none',
                    color: '#1E293B',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    cursor: isSaving ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(251, 188, 4, 0.3)',
                  }}
                >
                  {isSaving ? 'Saving Task...' : editingTask ? 'Save Changes' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
