'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  ArrowLeft,
  Award,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Upload,
  Link2,
  Eye,
  X,
  Search,
  Users,
  ChevronUp,
  ChevronDown,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Youtube,
  QrCode,
  FileCheck2,
  ListOrdered,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  CourseDetailHeader,
  CourseLessonItem,
  LessonMaterialItem,
  CreateLessonInput,
  UpdateLessonInput,
  CreateLessonTaskInput,
  CreateLessonQuizInput,
  createCourseLesson,
  updateCourseLesson,
  deleteCourseLesson,
  reorderCourseLessons,
  quickCreateTaskForLesson,
  quickCreateQuizForLesson,
  addLessonMaterialItem,
  removeLessonMaterialItem,
  uploadLessonMaterialFile,
} from '@/app/student-portal/admin/courses/[id]/lessons/actions';
import { StudentTask, Quiz } from '@/types/student';

interface CourseLessonsClientProps {
  course: CourseDetailHeader;
  initialLessons: CourseLessonItem[];
  availableSessions: Array<{ id: string; session_number: number; title: string; session_date: string }>;
  canManage: boolean;
  userRole?: string;
}

// Helper to extract YouTube video ID
function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

// Helper to parse material items
function parseMaterial(raw: string): LessonMaterialItem {
  try {
    const parsed = JSON.parse(raw);
    return {
      title: parsed.title || 'Lesson Resource',
      url: parsed.url || '#',
      driveFileId: parsed.driveFileId,
      type: parsed.type || 'link',
      size: parsed.size,
    };
  } catch {
    return {
      title: 'Resource File',
      url: raw,
      type: raw.includes('.pdf') ? 'pdf' : 'link',
    };
  }
}

export function CourseLessonsClient({
  course,
  initialLessons,
  availableSessions,
  canManage,
}: CourseLessonsClientProps) {
  const [lessons, setLessons] = useState<CourseLessonItem[]>(initialLessons);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [contentFilter, setContentFilter] = useState('all');

  // Modal States
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<CourseLessonItem | null>(null);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [lessonFormError, setLessonFormError] = useState<string | null>(null);

  // Form Fields
  const [lessonNum, setLessonNum] = useState(1);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [contentTab, setContentTab] = useState<'write' | 'preview'>('write');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lessonMaterials, setLessonMaterials] = useState<string[]>([]);

  // Material upload state inside lesson modal
  const [materialTitleInput, setMaterialTitleInput] = useState('');
  const [materialLinkInput, setMaterialLinkInput] = useState('');
  const [materialTab, setMaterialTab] = useState<'upload' | 'link'>('upload');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  // Lesson Preview Modal State
  const [previewLesson, setPreviewLesson] = useState<CourseLessonItem | null>(null);

  // Quick Task Creation Modal State
  const [taskModalLesson, setTaskModalLesson] = useState<CourseLessonItem | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskSubmissionType, setTaskSubmissionType] = useState<'link' | 'file' | 'both'>('link');
  const [taskMaxScore, setTaskMaxScore] = useState(100);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Quick Quiz Creation Modal State
  const [quizModalLesson, setQuizModalLesson] = useState<CourseLessonItem | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState<number>(20);
  const [quizPassingScore, setQuizPassingScore] = useState<number>(60);
  const [quizQuestions, setQuizQuestions] = useState<
    Array<{
      question_text: string;
      type: 'multiple_choice';
      options: string[];
      correct_answer: number;
      points: number;
    }>
  >([
    {
      question_text: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 10,
    },
  ]);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // ----------------------------------------------------------------------------
  // Open Modals
  // ----------------------------------------------------------------------------
  const getNextLessonNumber = () => {
    if (lessons.length === 0) return 1;
    return Math.max(...lessons.map((l) => l.lesson_number)) + 1;
  };

  const openCreateLessonModal = () => {
    setEditingLesson(null);
    setLessonNum(getNextLessonNumber());
    setLessonTitle('');
    setLessonContent('');
    setContentTab('write');
    setSelectedSessionId('');
    setYoutubeUrl('');
    setLessonMaterials([]);
    setLessonFormError(null);
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (lesson: CourseLessonItem) => {
    setEditingLesson(lesson);
    setLessonNum(lesson.lesson_number);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || '');
    setContentTab('write');
    setSelectedSessionId(lesson.session_id || '');
    setYoutubeUrl(lesson.youtube_url || '');
    setLessonMaterials(lesson.materials || []);
    setLessonFormError(null);
    setIsLessonModalOpen(true);
  };

  // ----------------------------------------------------------------------------
  // Save Lesson Handler
  // ----------------------------------------------------------------------------
  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setLessonFormError('Lesson title is required.');
      return;
    }

    try {
      setIsSavingLesson(true);
      setLessonFormError(null);

      if (editingLesson) {
        const updatePayload: UpdateLessonInput = {
          id: editingLesson.id,
          course_id: course.id,
          lesson_number: lessonNum,
          title: lessonTitle,
          content: lessonContent,
          session_id: selectedSessionId || null,
          youtube_url: youtubeUrl.trim() || null,
          materials: lessonMaterials,
        };

        const res = await updateCourseLesson(updatePayload);
        if (!res.success || !res.lesson) {
          setLessonFormError(res.error || 'Failed to update lesson.');
          return;
        }

        setLessons(
          lessons
            .map((l) =>
              l.id === editingLesson.id
                ? {
                    ...res.lesson!,
                    tasks: l.tasks,
                    quizzes: l.quizzes,
                    tasks_count: l.tasks_count,
                    quizzes_count: l.quizzes_count,
                  }
                : l
            )
            .sort((a, b) => a.lesson_number - b.lesson_number)
        );
      } else {
        const createPayload: CreateLessonInput = {
          course_id: course.id,
          lesson_number: lessonNum,
          title: lessonTitle,
          content: lessonContent,
          session_id: selectedSessionId || null,
          youtube_url: youtubeUrl.trim() || null,
          materials: lessonMaterials,
        };

        const res = await createCourseLesson(createPayload);
        if (!res.success || !res.lesson) {
          setLessonFormError(res.error || 'Failed to create lesson.');
          return;
        }

        setLessons([...lessons, res.lesson].sort((a, b) => a.lesson_number - b.lesson_number));
      }

      setIsLessonModalOpen(false);
    } catch (err: any) {
      setLessonFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSavingLesson(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Delete Lesson Handler
  // ----------------------------------------------------------------------------
  const handleDeleteLesson = async (lessonId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete lesson "${title}"? Attached tasks and quizzes will be unlinked.`)) {
      return;
    }

    try {
      const res = await deleteCourseLesson(lessonId, course.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete lesson.');
        return;
      }
      setLessons(lessons.filter((l) => l.id !== lessonId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ----------------------------------------------------------------------------
  // Reorder Lessons (Move Up / Move Down)
  // ----------------------------------------------------------------------------
  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;

    // Recalculate lesson_number based on new order
    const updatedWithNumbers = newLessons.map((l, i) => ({
      ...l,
      lesson_number: i + 1,
    }));

    setLessons(updatedWithNumbers);

    // Save to DB
    const orderedIds = updatedWithNumbers.map((l) => l.id);
    const res = await reorderCourseLessons(course.id, orderedIds);
    if (!res.success) {
      alert(res.error || 'Failed to update lesson order on server.');
    }
  };

  // ----------------------------------------------------------------------------
  // Materials handlers inside modal
  // ----------------------------------------------------------------------------
  const handleAddMaterialToForm = async () => {
    if (materialTab === 'link') {
      if (!materialLinkInput.trim()) {
        setMaterialError('Please enter a valid URL.');
        return;
      }
      const item: LessonMaterialItem = {
        title: materialTitleInput.trim() || 'Lesson Resource',
        url: materialLinkInput.trim(),
        type: materialLinkInput.includes('.pdf') ? 'pdf' : 'link',
      };
      setLessonMaterials([...lessonMaterials, JSON.stringify(item)]);
      setMaterialTitleInput('');
      setMaterialLinkInput('');
      setMaterialError(null);
    } else {
      if (!materialFile) {
        setMaterialError('Please choose a file to upload.');
        return;
      }

      try {
        setIsUploadingMaterial(true);
        setMaterialError(null);

        const formData = new FormData();
        formData.append('file', materialFile);
        formData.append('title', materialTitleInput.trim() || materialFile.name);

        if (editingLesson) {
          const res = await uploadLessonMaterialFile(course.id, editingLesson.id, formData);
          if (!res.success || !res.material) {
            setMaterialError(res.error || 'Failed to upload material.');
            return;
          }
          setLessonMaterials([...lessonMaterials, JSON.stringify(res.material)]);
        } else {
          // Pre-save staging for new lesson
          const item: LessonMaterialItem = {
            title: materialTitleInput.trim() || materialFile.name,
            url: `https://drive.google.com/file/d/pending-upload-${Date.now()}/view`,
            type: 'pdf',
          };
          setLessonMaterials([...lessonMaterials, JSON.stringify(item)]);
        }

        setMaterialFile(null);
        setMaterialTitleInput('');
      } catch (err: any) {
        setMaterialError(err.message || 'Upload failed.');
      } finally {
        setIsUploadingMaterial(false);
      }
    }
  };

  const handleRemoveMaterialFromForm = (idx: number) => {
    setLessonMaterials(lessonMaterials.filter((_, i) => i !== idx));
  };

  // ----------------------------------------------------------------------------
  // Quick Task Creation Handlers
  // ----------------------------------------------------------------------------
  const openTaskModal = (lesson: CourseLessonItem) => {
    setTaskModalLesson(lesson);
    setTaskTitle(`Task for Lesson ${lesson.lesson_number}: ${lesson.title}`);
    setTaskDescription('');
    setTaskDueDate('');
    setTaskSubmissionType('link');
    setTaskMaxScore(100);
    setTaskError(null);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModalLesson) return;
    if (!taskTitle.trim()) {
      setTaskError('Task title is required.');
      return;
    }

    try {
      setIsSavingTask(true);
      setTaskError(null);

      const input: CreateLessonTaskInput = {
        course_id: course.id,
        lesson_id: taskModalLesson.id,
        title: taskTitle.trim(),
        description: taskDescription.trim(),
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        submission_type: taskSubmissionType,
        max_score: taskMaxScore,
        assigned_to: 'all_enrolled',
      };

      const res = await quickCreateTaskForLesson(input);
      if (!res.success || !res.task) {
        setTaskError(res.error || 'Failed to create task.');
        return;
      }

      setLessons(
        lessons.map((l) =>
          l.id === taskModalLesson.id
            ? {
                ...l,
                tasks: [...(l.tasks || []), res.task!],
                tasks_count: l.tasks_count + 1,
              }
            : l
        )
      );

      setTaskModalLesson(null);
    } catch (err: any) {
      setTaskError(err.message || 'Failed to create task.');
    } finally {
      setIsSavingTask(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Quick Quiz Creation Handlers
  // ----------------------------------------------------------------------------
  const openQuizModal = (lesson: CourseLessonItem) => {
    setQuizModalLesson(lesson);
    setQuizTitle(`Quiz: Lesson ${lesson.lesson_number} Knowledge Check`);
    setQuizDescription(`Quick check on key concepts covered in Lesson ${lesson.lesson_number}.`);
    setQuizTimeLimit(15);
    setQuizPassingScore(60);
    setQuizQuestions([
      {
        question_text: 'What is the primary topic introduced in this lesson?',
        type: 'multiple_choice',
        options: ['Fundamentals & Architecture', 'Deployment Pipelines', 'Database Normalization', 'None of the above'],
        correct_answer: 0,
        points: 10,
      },
    ]);
    setQuizError(null);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizModalLesson) return;
    if (!quizTitle.trim()) {
      setQuizError('Quiz title is required.');
      return;
    }

    const invalidQ = quizQuestions.find((q) => !q.question_text.trim() || q.options.some((opt) => !opt.trim()));
    if (invalidQ) {
      setQuizError('Please fill out all question texts and option fields.');
      return;
    }

    try {
      setIsSavingQuiz(true);
      setQuizError(null);

      const input: CreateLessonQuizInput = {
        course_id: course.id,
        lesson_id: quizModalLesson.id,
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        time_limit_minutes: quizTimeLimit,
        passing_score_percentage: quizPassingScore,
        questions: quizQuestions,
        allow_retakes: false,
        max_attempts: 1,
        status: 'published',
      };

      const res = await quickCreateQuizForLesson(input);
      if (!res.success || !res.quiz) {
        setQuizError(res.error || 'Failed to create quiz.');
        return;
      }

      setLessons(
        lessons.map((l) =>
          l.id === quizModalLesson.id
            ? {
                ...l,
                quizzes: [...(l.quizzes || []), res.quiz!],
                quizzes_count: l.quizzes_count + 1,
              }
            : l
        )
      );

      setQuizModalLesson(null);
    } catch (err: any) {
      setQuizError(err.message || 'Failed to create quiz.');
    } finally {
      setIsSavingQuiz(false);
    }
  };

  // Add Question to Quiz builder
  const handleAddQuizQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        question_text: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: 0,
        points: 10,
      },
    ]);
  };

  const handleRemoveQuizQuestion = (qIdx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== qIdx));
  };

  // ----------------------------------------------------------------------------
  // Filtered Lessons
  // ----------------------------------------------------------------------------
  const filteredLessons = lessons.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.content && l.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.session?.title && l.session.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSession =
      sessionFilter === 'all' ||
      (sessionFilter === 'standalone' && !l.session_id) ||
      (sessionFilter === 'linked' && !!l.session_id) ||
      l.session_id === sessionFilter;

    const matchesContent =
      contentFilter === 'all' ||
      (contentFilter === 'video' && !!l.youtube_url) ||
      (contentFilter === 'materials' && l.materials && l.materials.length > 0) ||
      (contentFilter === 'tasks' && l.tasks_count > 0) ||
      (contentFilter === 'quizzes' && l.quizzes_count > 0);

    return matchesSearch && matchesSession && matchesContent;
  });

  const totalLessons = lessons.length;
  const linkedToSessionCount = lessons.filter((l) => !!l.session_id).length;
  const standaloneCount = totalLessons - linkedToSessionCount;
  const totalTasks = lessons.reduce((acc, l) => acc + l.tasks_count, 0);
  const totalQuizzes = lessons.reduce((acc, l) => acc + l.quizzes_count, 0);

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
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Lessons & Curriculum</span>
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
              background: 'rgba(66, 133, 244, 0.12)',
              border: '1px solid rgba(66, 133, 244, 0.28)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Calendar size={14} />
            <span>Sessions</span>
          </Link>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.28), rgba(168, 85, 247, 0.28))',
              border: '1px solid rgba(66, 133, 244, 0.5)',
              color: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}
          >
            <BookOpen size={14} style={{ color: '#93C5FD' }} />
            <span>Lessons ({totalLessons})</span>
          </div>

          <Link
            href={`/student-portal/admin/courses/${course.id}/tasks`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(251, 188, 4, 0.12)',
              border: '1px solid rgba(251, 188, 4, 0.28)',
              color: '#FDE047',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <FileCheck2 size={14} />
            <span>Tasks ({totalTasks})</span>
          </Link>

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
            <span>Submissions & Grading</span>
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
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #4285F4 0%, #A855F7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(66, 133, 244, 0.4)',
              flexShrink: 0,
            }}
          >
            <BookOpen size={30} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: 'rgba(66, 133, 244, 0.18)',
                  color: '#93C5FD',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                }}
              >
                {course.department_name || course.category || 'Curriculum'}
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '6px',
                  background: course.status === 'published' ? 'rgba(52, 168, 83, 0.18)' : 'rgba(234, 67, 53, 0.18)',
                  color: course.status === 'published' ? '#86EFAC' : '#FCA5A5',
                  border: course.status === 'published' ? '1px solid rgba(52, 168, 83, 0.35)' : '1px solid rgba(234, 67, 53, 0.35)',
                }}
              >
                {course.status}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F8FAFC', margin: 0, lineHeight: 1.25 }}>
              {course.title}
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '650px' }}>
              {course.description || 'Build syllabus modules, rich text lectures, attach assignments and tests.'}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={openCreateLessonModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1.4rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={18} />
            <span>Add New Lesson</span>
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
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#60A5FA',
            }}
          >
            <ListOrdered size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{totalLessons}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Total Lessons</div>
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
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{linkedToSessionCount}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Session Linked</div>
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
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Attached Tasks</div>
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
            <HelpCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>{totalQuizzes}</div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 500 }}>Attached Quizzes</div>
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
            placeholder="Search lessons by title, notes, or session..."
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
          {/* Session Link Filter */}
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
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
            <option value="all">All Sessions / Modules</option>
            <option value="linked">Session Linked Only</option>
            <option value="standalone">Standalone Lessons Only</option>
            {availableSessions.map((s) => (
              <option key={s.id} value={s.id}>
                Session {s.session_number}: {s.title}
              </option>
            ))}
          </select>

          {/* Content Type Filter */}
          <select
            value={contentFilter}
            onChange={(e) => setContentFilter(e.target.value)}
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
            <option value="all">All Content Types</option>
            <option value="video">Has YouTube Video</option>
            <option value="materials">Has PDF/Drive Materials</option>
            <option value="tasks">Has Attached Tasks</option>
            <option value="quizzes">Has Attached Quizzes</option>
          </select>
        </div>
      </div>

      {/* 5. Lessons List */}
      {filteredLessons.length === 0 ? (
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
          <BookOpen size={44} style={{ color: '#64748B' }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#E2E8F0' }}>
            {searchQuery || sessionFilter !== 'all' || contentFilter !== 'all'
              ? 'No lessons match the selected filters'
              : 'No lessons created yet'}
          </div>
          <p style={{ fontSize: '0.86rem', color: '#94A3B8', maxWidth: '460px', margin: 0 }}>
            {searchQuery || sessionFilter !== 'all' || contentFilter !== 'all'
              ? 'Try resetting the search terms or dropdown filters.'
              : 'Add your first syllabus lesson, attach video lectures, reference PDFs, and challenge students with tasks & quizzes.'}
          </p>
          {canManage && (
            <button
              onClick={openCreateLessonModal}
              style={{
                marginTop: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                background: '#4285F4',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Create Lesson 1</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredLessons.map((lesson, idx) => {
            const ytEmbed = getYouTubeEmbedUrl(lesson.youtube_url);
            const materialsList = (lesson.materials || []).map(parseMaterial);

            return (
              <div
                key={lesson.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Top Row: Reorder, Number, Title, Session Pill, Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '280px' }}>
                    {/* Reorder Buttons */}
                    {canManage && (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '8px',
                          padding: '0.25rem',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(idx, 'up')}
                          disabled={idx === 0}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: idx === 0 ? 'rgba(255, 255, 255, 0.2)' : '#93C5FD',
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move Lesson Up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveLesson(idx, 'down')}
                          disabled={idx === lessons.length - 1}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: idx === lessons.length - 1 ? 'rgba(255, 255, 255, 0.2)' : '#93C5FD',
                            cursor: idx === lessons.length - 1 ? 'not-allowed' : 'pointer',
                            padding: '0.2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move Lesson Down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    )}

                    {/* Lesson Main Heading */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.65rem',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(168, 85, 247, 0.2))',
                            border: '1px solid rgba(66, 133, 244, 0.4)',
                            color: '#93C5FD',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          LESSON {lesson.lesson_number}
                        </span>

                        {lesson.session ? (
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(52, 168, 83, 0.14)',
                              border: '1px solid rgba(52, 168, 83, 0.3)',
                              color: '#86EFAC',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Calendar size={12} />
                            Session {lesson.session.session_number}: {lesson.session.title}
                          </span>
                        ) : (
                          <span
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#94A3B8',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                            }}
                          >
                            Standalone Module
                          </span>
                        )}

                        {lesson.youtube_url && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: 'rgba(234, 67, 53, 0.14)',
                              border: '1px solid rgba(234, 67, 53, 0.3)',
                              color: '#FCA5A5',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Youtube size={12} />
                            Video
                          </span>
                        )}

                        {materialsList.length > 0 && (
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              background: 'rgba(251, 188, 4, 0.14)',
                              border: '1px solid rgba(251, 188, 4, 0.3)',
                              color: '#FDE047',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <FileText size={12} />
                            {materialsList.length} {materialsList.length === 1 ? 'Doc' : 'Docs'}
                          </span>
                        )}
                      </div>

                      <h2 style={{ fontSize: '1.22rem', fontWeight: 700, color: '#F8FAFC', margin: '0.2rem 0 0 0' }}>
                        {lesson.title}
                      </h2>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewLesson(lesson)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.8rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#CBD5E1',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Preview lesson full details"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => openTaskModal(lesson)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '8px',
                            background: 'rgba(251, 188, 4, 0.12)',
                            border: '1px solid rgba(251, 188, 4, 0.28)',
                            color: '#FDE047',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Attach a new task to this lesson"
                        >
                          <Plus size={13} />
                          <span>Task ({lesson.tasks_count})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openQuizModal(lesson)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '8px',
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.28)',
                            color: '#E9D5FF',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Attach a new quiz to this lesson"
                        >
                          <Plus size={13} />
                          <span>Quiz ({lesson.quizzes_count})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditLessonModal(lesson)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.45rem 0.8rem',
                            borderRadius: '8px',
                            background: 'rgba(66, 133, 244, 0.12)',
                            border: '1px solid rgba(66, 133, 244, 0.28)',
                            color: '#93C5FD',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Edit Lesson"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.45rem',
                            borderRadius: '8px',
                            background: 'rgba(234, 67, 53, 0.1)',
                            border: '1px solid rgba(234, 67, 53, 0.2)',
                            color: '#FCA5A5',
                            cursor: 'pointer',
                          }}
                          title="Delete Lesson"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Content Excerpt / Summary */}
                {lesson.content && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.86rem',
                      color: '#94A3B8',
                      lineHeight: 1.6,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {lesson.content.replace(/[#*`_\[\]]/g, '')}
                  </p>
                )}

                {/* Video & Materials row */}
                {(ytEmbed || materialsList.length > 0) && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {ytEmbed && (
                      <a
                        href={lesson.youtube_url!}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.78rem',
                          color: '#F87171',
                          textDecoration: 'none',
                          background: 'rgba(234, 67, 53, 0.08)',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(234, 67, 53, 0.2)',
                          fontWeight: 600,
                        }}
                      >
                        <Youtube size={14} />
                        <span>Watch Video Lecture</span>
                        <ExternalLink size={12} />
                      </a>
                    )}

                    {materialsList.map((mat, mIdx) => (
                      <a
                        key={mIdx}
                        href={mat.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.78rem',
                          color: '#93C5FD',
                          textDecoration: 'none',
                          background: 'rgba(66, 133, 244, 0.08)',
                          padding: '0.35rem 0.7rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(66, 133, 244, 0.2)',
                          fontWeight: 500,
                        }}
                      >
                        <FileText size={13} />
                        <span>{mat.title}</span>
                        <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}

                {/* Attached Tasks & Quizzes Badges */}
                {((lesson.tasks && lesson.tasks.length > 0) || (lesson.quizzes && lesson.quizzes.length > 0)) && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      paddingTop: '0.5rem',
                    }}
                  >
                    {lesson.tasks?.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(251, 188, 4, 0.1)',
                          border: '1px solid rgba(251, 188, 4, 0.25)',
                          color: '#FDE047',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <FileCheck2 size={13} />
                        <span>{task.title}</span>
                        <span style={{ opacity: 0.7 }}>({task.max_score} pts)</span>
                      </div>
                    ))}

                    {lesson.quizzes?.map((quiz) => (
                      <div
                        key={quiz.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          background: 'rgba(168, 85, 247, 0.1)',
                          border: '1px solid rgba(168, 85, 247, 0.25)',
                          color: '#E9D5FF',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <HelpCircle size={13} />
                        <span>{quiz.title}</span>
                        <span style={{ opacity: 0.7 }}>({quiz.passing_score_percentage}% pass)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE / EDIT LESSON MODAL */}
      {/* ========================================================================= */}
      {isLessonModalOpen && (
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
              maxWidth: '840px',
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
                    background: 'rgba(66, 133, 244, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC' }}>
                    {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{course.title}</div>
                </div>
              </div>
              <button
                onClick={() => setIsLessonModalOpen(false)}
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

            {lessonFormError && (
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
                <span>{lessonFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLesson} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Row: Lesson Number & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Lesson #</label>
                  <input
                    type="number"
                    min={1}
                    value={lessonNum}
                    onChange={(e) => setLessonNum(parseInt(e.target.value) || 1)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Lesson Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Advanced State Management with React Context"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
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

              {/* Row: Link to Course Session & YouTube URL */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Linked Course Session (Optional)
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
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
                    <option value="">None — Standalone Lesson Unit</option>
                    {availableSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        Session {s.session_number}: {s.title} ({s.session_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    YouTube Video URL (Optional)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Youtube size={16} style={{ position: 'absolute', left: '0.8rem', top: '0.75rem', color: '#F87171' }} />
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                        color: '#F8FAFC',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* YouTube Live Embed Preview */}
              {getYouTubeEmbedUrl(youtubeUrl) && (
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}>
                  <iframe
                    src={getYouTubeEmbedUrl(youtubeUrl)!}
                    title="Lesson Video Preview"
                    style={{ width: '100%', height: '260px', border: 'none' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Lesson Content: Markdown Editor with Tabs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Lesson Content (Markdown / Lecture Notes)
                  </label>
                  <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setContentTab('write')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        background: contentTab === 'write' ? '#4285F4' : 'transparent',
                        color: contentTab === 'write' ? '#ffffff' : '#94A3B8',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentTab('preview')}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '4px',
                        background: contentTab === 'preview' ? '#4285F4' : 'transparent',
                        color: contentTab === 'preview' ? '#ffffff' : '#94A3B8',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {contentTab === 'write' ? (
                  <textarea
                    rows={7}
                    placeholder="## Introduction&#10;In this lesson, we will explore...&#10;&#10;- Concept 1&#10;- Concept 2&#10;&#10;```javascript&#10;console.log('Hello GDGoC');&#10;```"
                    value={lessonContent}
                    onChange={(e) => setLessonContent(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '0.86rem',
                      fontFamily: 'monospace',
                      lineHeight: 1.6,
                      outline: 'none',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: '170px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '1rem',
                      color: '#E2E8F0',
                      fontSize: '0.86rem',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {lessonContent ? lessonContent : <span style={{ color: '#64748B' }}>Nothing to preview yet.</span>}
                  </div>
                )}
              </div>

              {/* Lesson Materials Section */}
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={15} style={{ color: '#FDE047' }} />
                    <span>Attached Materials & Reading PDFs</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '0.2rem' }}>
                    <button
                      type="button"
                      onClick={() => setMaterialTab('upload')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: materialTab === 'upload' ? 'rgba(66, 133, 244, 0.3)' : 'transparent',
                        color: materialTab === 'upload' ? '#93C5FD' : '#94A3B8',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaterialTab('link')}
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '4px',
                        background: materialTab === 'link' ? 'rgba(66, 133, 244, 0.3)' : 'transparent',
                        color: materialTab === 'link' ? '#93C5FD' : '#94A3B8',
                        border: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Drive Link
                    </button>
                  </div>
                </div>

                {materialError && (
                  <div style={{ color: '#FCA5A5', fontSize: '0.76rem' }}>{materialError}</div>
                )}

                {/* Input row for material */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Material Title (e.g. Lecture Slides PDF)"
                    value={materialTitleInput}
                    onChange={(e) => setMaterialTitleInput(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.75rem',
                      color: '#F8FAFC',
                      fontSize: '0.8rem',
                      outline: 'none',
                    }}
                  />

                  {materialTab === 'link' ? (
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={materialLinkInput}
                      onChange={(e) => setMaterialLinkInput(e.target.value)}
                      style={{
                        flex: 2,
                        minWidth: '220px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        color: '#F8FAFC',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.zip,.ppt,.pptx"
                      onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                      style={{
                        flex: 2,
                        minWidth: '220px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        color: '#94A3B8',
                        fontSize: '0.8rem',
                        outline: 'none',
                      }}
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleAddMaterialToForm}
                    disabled={isUploadingMaterial}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '6px',
                      background: 'rgba(66, 133, 244, 0.25)',
                      border: '1px solid rgba(66, 133, 244, 0.5)',
                      color: '#93C5FD',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: isUploadingMaterial ? 'wait' : 'pointer',
                    }}
                  >
                    {isUploadingMaterial ? 'Uploading...' : 'Attach'}
                  </button>
                </div>

                {/* List of currently attached materials */}
                {lessonMaterials.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                    {lessonMaterials.map((matRaw, mIdx) => {
                      const parsed = parseMaterial(matRaw);
                      return (
                        <div
                          key={mIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(15, 23, 42, 0.8)',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#E2E8F0' }}>
                            <FileText size={14} style={{ color: '#93C5FD' }} />
                            <span>{parsed.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialFromForm(mIdx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#F87171',
                              cursor: 'pointer',
                              padding: '0.2rem',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
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
                  disabled={isSavingLesson}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: isSavingLesson ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  {isSavingLesson ? 'Saving Lesson...' : editingLesson ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. QUICK TASK CREATION MODAL */}
      {/* ========================================================================= */}
      {taskModalLesson && (
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
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
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
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
                    Assign Task for Lesson {taskModalLesson.lesson_number}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{taskModalLesson.title}</div>
                </div>
              </div>
              <button
                onClick={() => setTaskModalLesson(null)}
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

            {taskError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                }}
              >
                {taskError}
              </div>
            )}

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Task Title *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                  Task Description / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain requirements, what students need to deliver, submission format..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#F8FAFC',
                    fontSize: '0.86rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Max Score (Pts)</label>
                  <input
                    type="number"
                    min={1}
                    value={taskMaxScore}
                    onChange={(e) => setTaskMaxScore(parseInt(e.target.value) || 100)}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Allowed Submission Type</label>
                <select
                  value={taskSubmissionType}
                  onChange={(e) => setTaskSubmissionType(e.target.value as any)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="link">URL / Link Submission (GitHub, deployed app, Google Doc)</option>
                  <option value="file">File Upload (PDF, ZIP, source archive)</option>
                  <option value="both">Both (Student choice)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setTaskModalLesson(null)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTask}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
                    border: 'none',
                    color: '#1E293B',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: isSavingTask ? 'wait' : 'pointer',
                  }}
                >
                  {isSavingTask ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. QUICK QUIZ CREATION MODAL */}
      {/* ========================================================================= */}
      {quizModalLesson && (
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
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(168, 85, 247, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C084FC',
                  }}
                >
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
                    Attach Quiz for Lesson {quizModalLesson.lesson_number}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{quizModalLesson.title}</div>
                </div>
              </div>
              <button
                onClick={() => setQuizModalLesson(null)}
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

            {quizError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                }}
              >
                {quizError}
              </div>
            )}

            <form onSubmit={handleSaveQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>
                    Time Limit (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={quizTimeLimit}
                    onChange={(e) => setQuizTimeLimit(parseInt(e.target.value) || 20)}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1' }}>Passing Score %</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quizPassingScore}
                    onChange={(e) => setQuizPassingScore(parseInt(e.target.value) || 60)}
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

              {/* Questions Builder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Questions ({quizQuestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddQuizQuestion}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      color: '#E9D5FF',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Question</span>
                  </button>
                </div>

                {quizQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#C084FC' }}>
                        Question {qIdx + 1}
                      </span>
                      {quizQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuizQuestion(qIdx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#F87171',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="e.g. Which hook is used to perform side effects in React?"
                      value={q.question_text}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIdx].question_text = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      style={{
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        color: '#F8FAFC',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correct_answer === optIdx}
                            onChange={() => {
                              const updated = [...quizQuestions];
                              updated[qIdx].correct_answer = optIdx;
                              setQuizQuestions(updated);
                            }}
                            title="Mark as correct answer"
                            style={{ cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            placeholder={`Option ${optIdx + 1}`}
                            value={opt}
                            onChange={(e) => {
                              const updated = [...quizQuestions];
                              updated[qIdx].options[optIdx] = e.target.value;
                              setQuizQuestions(updated);
                            }}
                            style={{
                              flex: 1,
                              background: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '0.4rem 0.65rem',
                              color: '#F8FAFC',
                              fontSize: '0.8rem',
                              outline: 'none',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setQuizModalLesson(null)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuiz}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    cursor: isSavingQuiz ? 'wait' : 'pointer',
                  }}
                >
                  {isSavingQuiz ? 'Publishing...' : 'Save & Publish Quiz'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. LESSON PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewLesson && (
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
              maxWidth: '840px',
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(168, 85, 247, 0.25))',
                      color: '#93C5FD',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                    }}
                  >
                    LESSON {previewLesson.lesson_number}
                  </span>
                  {previewLesson.session && (
                    <span style={{ fontSize: '0.76rem', color: '#86EFAC', fontWeight: 600 }}>
                      • Session {previewLesson.session.session_number}: {previewLesson.session.title}
                    </span>
                  )}
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC' }}>
                  {previewLesson.title}
                </h2>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
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

            {/* Video Player */}
            {getYouTubeEmbedUrl(previewLesson.youtube_url) && (
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#000' }}>
                <iframe
                  src={getYouTubeEmbedUrl(previewLesson.youtube_url)!}
                  title={previewLesson.title}
                  style={{ width: '100%', height: '340px', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Rendered Content */}
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '1.5rem',
                color: '#E2E8F0',
                lineHeight: 1.7,
                fontSize: '0.92rem',
                whiteSpace: 'pre-wrap',
              }}
            >
              {previewLesson.content || 'No lecture notes provided for this lesson.'}
            </div>

            {/* Materials List */}
            {previewLesson.materials && previewLesson.materials.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#F8FAFC' }}>Attached Study Materials</h4>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {previewLesson.materials.map(parseMaterial).map((m, idx) => (
                    <a
                      key={idx}
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(66, 133, 244, 0.12)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        color: '#93C5FD',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <FileText size={14} />
                      <span>{m.title}</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#F8FAFC',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
