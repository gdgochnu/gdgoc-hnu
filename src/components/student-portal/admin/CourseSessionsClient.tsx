'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  Youtube,
  Plus,
  ArrowLeft,
  Edit2,
  Trash2,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Upload,
  Link2,
  Eye,
  X,
  Search,
  BookOpen,
  Users,
  Layers,
  ChevronRight,
  Sparkles,
  QrCode,
  FileCheck2,
} from 'lucide-react';
import {
  CourseDetailHeader,
  CreateSessionInput,
  UpdateSessionInput,
  SessionMaterialItem,
  createCourseSession,
  updateCourseSession,
  deleteCourseSession,
  updateSessionStatus,
  addSessionMaterialItem,
  removeSessionMaterialItem,
  uploadSessionMaterialFile,
} from '@/app/student-portal/admin/courses/[id]/sessions/actions';
import { CourseSession, SessionType, SessionStatus } from '@/types/student';

interface CourseSessionsClientProps {
  course: CourseDetailHeader;
  initialSessions: CourseSession[];
  canManage: boolean;
  userRole?: string;
}

// Duration & Time calculation helpers
const computeDurationMinutes = (start: string, end: string): number => {
  try {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return diff || 60;
  } catch {
    return 120;
  }
};

const formatDurationText = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} ${h === 1 ? 'Hour' : 'Hours'}`;
  return `${m} Mins`;
};

const addMinutesToTime = (timeStr: string, minutesToAdd: number): string => {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const total = (h * 60 + m + minutesToAdd) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  } catch {
    return '18:00';
  }
};

const formatTimeRemaining = (deadlineStr: string): string => {
  try {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
  } catch {
    return 'Pending';
  }
};

export function CourseSessionsClient({
  course,
  initialSessions,
  canManage,
  userRole,
}: CourseSessionsClientProps) {
  const [sessions, setSessions] = useState<CourseSession[]>(initialSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SessionType>('all');

  // Session Modal State
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<CourseSession | null>(null);
  const [sessionNum, setSessionNum] = useState<number>(1);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [sessionDeadline, setSessionDeadline] = useState<string>('');
  const [sessionType, setSessionType] = useState<SessionType>('offline');
  const [sessionVenue, setSessionVenue] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('scheduled');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Material Modal State
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [targetSessionId, setTargetSessionId] = useState<string | null>(null);
  const [materialTab, setMaterialTab] = useState<'upload' | 'link'>('upload');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialLinkUrl, setMaterialLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  // PDF / Document Viewer Modal State
  const [previewMaterial, setPreviewMaterial] = useState<SessionMaterialItem | null>(null);

  // Calculate next session number
  const getNextSessionNumber = () => {
    if (sessions.length === 0) return 1;
    const maxNum = Math.max(...sessions.map((s) => s.session_number || 0));
    return maxNum + 1;
  };

  const openCreateModal = () => {
    setEditingSession(null);
    setSessionNum(getNextSessionNumber());
    setSessionTitle('');
    setSessionDesc('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setStartTime('16:00');
    setEndTime('18:00');
    setDurationMinutes(120);
    setSessionDeadline('');
    setSessionType('offline');
    setSessionVenue('');
    setYoutubeUrl('');
    setSessionStatus('scheduled');
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  const openEditModal = (s: CourseSession) => {
    setEditingSession(s);
    setSessionNum(s.session_number);
    setSessionTitle(s.title);
    setSessionDesc(s.description || '');
    setSessionDate(s.session_date);
    setStartTime(s.start_time.slice(0, 5));
    setEndTime(s.end_time.slice(0, 5));
    const dur = s.duration_minutes || computeDurationMinutes(s.start_time, s.end_time);
    setDurationMinutes(dur);
    setSessionDeadline(s.deadline ? new Date(s.deadline).toISOString().slice(0, 16) : '');
    setSessionType(s.type);
    setSessionVenue(s.venue || '');
    setYoutubeUrl(s.youtube_url || '');
    setSessionStatus(s.status);
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    setEndTime(addMinutesToTime(newStart, durationMinutes));
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    setDurationMinutes(computeDurationMinutes(startTime, newEnd));
  };

  const handleSelectDurationPreset = (minutes: number) => {
    setDurationMinutes(minutes);
    setEndTime(addMinutesToTime(startTime, minutes));
  };

  const handleSetDeadlineRelative = (daysAfter: number) => {
    const baseDate = sessionDate ? new Date(sessionDate) : new Date();
    baseDate.setDate(baseDate.getDate() + daysAfter);
    baseDate.setHours(23, 59, 0, 0);
    setSessionDeadline(baseDate.toISOString().slice(0, 16));
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) {
      setFormError('Session title is required.');
      return;
    }
    if (!sessionDate) {
      setFormError('Session date is required.');
      return;
    }
    if (sessionType === 'offline' && !sessionVenue.trim()) {
      setFormError('Venue is required for offline sessions (e.g. Hall 301, Lab A).');
      return;
    }
    if (sessionType === 'online' && !youtubeUrl.trim()) {
      setFormError('YouTube URL is required for online sessions.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingSession) {
        const updatePayload: UpdateSessionInput = {
          id: editingSession.id,
          course_id: course.id,
          session_number: Number(sessionNum),
          title: sessionTitle.trim(),
          description: sessionDesc.trim() || undefined,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          venue: sessionType === 'offline' ? sessionVenue.trim() : undefined,
          youtube_url: sessionType === 'online' ? youtubeUrl.trim() : undefined,
          status: sessionStatus,
          duration_minutes: durationMinutes,
          deadline: sessionDeadline ? new Date(sessionDeadline).toISOString() : null,
        };

        const res = await updateCourseSession(updatePayload);
        if (!res.success || !res.session) {
          setFormError(res.error || 'Failed to update session.');
          return;
        }

        setSessions(sessions.map((s) => (s.id === editingSession.id ? res.session! : s)));
      } else {
        const createPayload: CreateSessionInput = {
          course_id: course.id,
          session_number: Number(sessionNum),
          title: sessionTitle.trim(),
          description: sessionDesc.trim() || undefined,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          venue: sessionType === 'offline' ? sessionVenue.trim() : undefined,
          youtube_url: sessionType === 'online' ? youtubeUrl.trim() : undefined,
          status: sessionStatus,
          materials: [],
          duration_minutes: durationMinutes,
          deadline: sessionDeadline ? new Date(sessionDeadline).toISOString() : null,
        };

        const res = await createCourseSession(createPayload);
        if (!res.success || !res.session) {
          setFormError(res.error || 'Failed to create session.');
          return;
        }

        setSessions([...sessions, res.session].sort((a, b) => a.session_number - b.session_number));
      }

      setIsSessionModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete session "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await deleteCourseSession(sessionId, course.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete session');
        return;
      }
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQuickStatusChange = async (sessionId: string, newStatus: SessionStatus) => {
    try {
      const res = await updateSessionStatus(sessionId, course.id, newStatus);
      if (!res.success) {
        alert(res.error || 'Failed to update status');
        return;
      }
      setSessions(
        sessions.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Material helpers
  const openAddMaterialModal = (sessionId: string) => {
    setTargetSessionId(sessionId);
    setMaterialTitle('');
    setMaterialLinkUrl('');
    setSelectedFile(null);
    setMaterialError(null);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSessionId) return;

    try {
      setIsUploadingMaterial(true);
      setMaterialError(null);

      if (materialTab === 'upload') {
        if (!selectedFile) {
          setMaterialError('Please select a PDF or document file to upload.');
          return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', materialTitle.trim() || selectedFile.name);

        const res = await uploadSessionMaterialFile(course.id, targetSessionId, formData);
        if (!res.success || !res.material) {
          setMaterialError(res.error || 'Failed to upload material.');
          return;
        }

        const serialized = JSON.stringify(res.material);
        setSessions(
          sessions.map((s) =>
            s.id === targetSessionId
              ? { ...s, materials: [...(s.materials || []), serialized] }
              : s
          )
        );
      } else {
        if (!materialLinkUrl.trim()) {
          setMaterialError('Please enter a valid document or Drive link.');
          return;
        }

        let driveId = '';
        const driveMatch = materialLinkUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (driveMatch) driveId = driveMatch[1];

        const item: SessionMaterialItem = {
          title: materialTitle.trim() || 'Session Resource',
          url: materialLinkUrl.trim(),
          driveFileId: driveId || undefined,
          type: materialLinkUrl.includes('.pdf') || driveId ? 'pdf' : 'link',
        };

        const res = await addSessionMaterialItem(targetSessionId, course.id, item);
        if (!res.success || !res.materials) {
          setMaterialError(res.error || 'Failed to add link.');
          return;
        }

        setSessions(
          sessions.map((s) =>
            s.id === targetSessionId ? { ...s, materials: res.materials! } : s
          )
        );
      }

      setIsMaterialModalOpen(false);
    } catch (err: any) {
      setMaterialError(err.message || 'Error processing material.');
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const handleRemoveMaterial = async (sessionId: string, index: number) => {
    if (!confirm('Remove this material from session?')) return;
    try {
      const res = await removeSessionMaterialItem(sessionId, course.id, index);
      if (!res.success || !res.materials) {
        alert(res.error || 'Failed to remove material');
        return;
      }
      setSessions(
        sessions.map((s) => (s.id === sessionId ? { ...s, materials: res.materials! } : s))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to parse stored material
  const parseMaterialItem = (raw: string): SessionMaterialItem => {
    try {
      if (raw.startsWith('{')) {
        return JSON.parse(raw);
      }
      return {
        title: raw.split('/').pop() || 'Session Resource',
        url: raw,
        type: raw.includes('.pdf') ? 'pdf' : 'link',
      };
    } catch {
      return { title: 'Session Resource', url: raw, type: 'link' };
    }
  };

  // Helper for embed preview URL
  const getPreviewUrl = (material: SessionMaterialItem) => {
    if (material.driveFileId) {
      return `https://drive.google.com/file/d/${material.driveFileId}/preview`;
    }
    const match = material.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return material.url;
  };

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.venue && s.venue.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesType = typeFilter === 'all' || s.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSessions = sessions.length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length;
  const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;
  const totalCurriculumMinutes = sessions.reduce(
    (acc, s) => acc + (s.duration_minutes || computeDurationMinutes(s.start_time, s.end_time)),
    0
  );

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Breadcrumb & Navigation */}
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
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Sessions Schedule</span>
        </div>

        {/* Course Sub-Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/courses/${course.id}/lessons`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 700,
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
              background: 'rgba(251, 188, 4, 0.12)',
              border: '1px solid rgba(251, 188, 4, 0.28)',
              color: '#FDE047',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <FileCheck2 size={14} />
            <span>Tasks</span>
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
            href={`/student-portal/admin/courses/${course.id}/enrollments`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.35)',
              color: '#86EFAC',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <GraduationCap size={15} />
            <span>Enrollments Roster</span>
          </Link>

          <Link
            href={`/student-portal/admin/attendance/scan?type=course&courseId=${course.id}${sessions.length > 0 ? `&sessionId=${sessions[0].id}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(52, 168, 83, 0.2) 100%)',
              border: '1px solid rgba(66, 133, 244, 0.4)',
              color: '#60A5FA',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
            title="Scan student QR codes for this course"
          >
            <QrCode size={14} style={{ color: '#34A853' }} />
            <span>Scan Attendance</span>
          </Link>

          <Link
            href={`/student/courses/${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
            title="Preview Student LMS Classroom"
          >
            <ExternalLink size={13} />
            <span>Student View</span>
          </Link>
        </div>
      </div>

      {/* Course Hero & Quick Stats */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.06) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: course.status === 'published' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)',
                  color: course.status === 'published' ? '#34A853' : '#FBBF24',
                  border: `1px solid ${course.status === 'published' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(251, 188, 4, 0.4)'}`,
                }}
              >
                {course.status}
              </span>

              {course.department_name && (
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                  {course.department_name} ({course.department_code})
                </span>
              )}

              {course.category && (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#E2E8F0',
                  }}
                >
                  {course.category}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              {course.title}
            </h1>

            {course.description && (
              <p style={{ color: '#CBD5E1', fontSize: '0.92rem', marginTop: '0.6rem', maxWidth: '750px', lineHeight: 1.5 }}>
                {course.description}
              </p>
            )}

            {/* Instructors Avatars */}
            {course.instructors_list.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>Instructors:</span>
                {course.instructors_list.map((inst) => (
                  <span
                    key={inst.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.78rem',
                      color: '#FFFFFF',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: inst.role === 'instructor' ? '#4285F4' : '#34A853',
                      }}
                    />
                    {inst.full_name} ({inst.role})
                  </span>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <button
              onClick={openCreateModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                background: '#4285F4',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Plus size={18} />
              Schedule Session
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '1.8rem',
            paddingTop: '1.4rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Sessions
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
              {totalSessions}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#34A853', fontWeight: 600, textTransform: 'uppercase' }}>
              Completed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34A853', marginTop: '0.2rem' }}>
              {completedCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 600, textTransform: 'uppercase' }}>
              Upcoming Scheduled
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>
              {scheduledCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#EA4335', fontWeight: 600, textTransform: 'uppercase' }}>
              Cancelled
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EA4335', marginTop: '0.2rem' }}>
              {cancelledCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#FBBF24', fontWeight: 600, textTransform: 'uppercase' }}>
              Curriculum Hours
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.2rem' }}>
              {formatDurationText(totalCurriculumMinutes)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
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
              placeholder="Search session title, description, venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 1rem 0.55rem 2.4rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: '#1E293B',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="offline">Offline (In-Person)</option>
            <option value="online">Online (Stream)</option>
          </select>
        </div>
      </div>

      {/* Sessions Timeline & Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredSessions.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <Calendar size={42} style={{ color: '#64748B' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              No sessions found
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0, maxWidth: '420px' }}>
              {sessions.length === 0
                ? 'No sessions have been scheduled yet for this course. Click "Schedule Session" to create your first lecture or lab.'
                : 'No sessions match your search or filter criteria.'}
            </p>
            {canManage && sessions.length === 0 && (
              <button
                onClick={openCreateModal}
                style={{
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  background: '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                Schedule Session 1
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const materialsList = (session.materials || []).map(parseMaterialItem);

            return (
              <div
                key={session.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* Session Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '0.3rem 0.65rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        background: '#4285F4',
                        color: '#FFFFFF',
                        letterSpacing: '0.5px',
                      }}
                    >
                      SESSION {String(session.session_number).padStart(2, '0')}
                    </span>

                    {/* Type badge */}
                    {session.type === 'offline' ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          color: '#34A853',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <MapPin size={12} />
                        Offline • {session.venue || 'Campus Venue'}
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          color: '#EA4335',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <Youtube size={12} />
                        Online Stream
                      </span>
                    )}

                    {/* Date and Time */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        color: '#CBD5E1',
                      }}
                    >
                      <Calendar size={13} style={{ color: '#94A3B8' }} />
                      {new Date(session.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem',
                        color: '#94A3B8',
                      }}
                    >
                      <Clock size={13} />
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </span>

                    {/* Prominent Duration Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: session.type === 'offline' ? 'rgba(52, 168, 83, 0.12)' : 'rgba(234, 67, 53, 0.12)',
                        border: `1px solid ${session.type === 'offline' ? 'rgba(52, 168, 83, 0.28)' : 'rgba(234, 67, 53, 0.28)'}`,
                        color: session.type === 'offline' ? '#34D399' : '#F87171',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                      title="Session Duration"
                    >
                      <Clock size={11} />
                      {session.type === 'offline' ? 'Duration: ' : 'Stream: '}
                      {formatDurationText(session.duration_minutes || computeDurationMinutes(session.start_time, session.end_time))}
                    </span>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {canManage && (
                      <select
                        value={session.status}
                        onChange={(e) => handleQuickStatusChange(session.id, e.target.value as SessionStatus)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background:
                            session.status === 'completed'
                              ? 'rgba(52, 168, 83, 0.2)'
                              : session.status === 'cancelled'
                              ? 'rgba(234, 67, 53, 0.2)'
                              : 'rgba(66, 133, 244, 0.2)',
                          color:
                            session.status === 'completed'
                              ? '#34A853'
                              : session.status === 'cancelled'
                              ? '#EA4335'
                              : '#60A5FA',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    )}

                    {canManage && (
                      <>
                        <Link
                          href={`/student-portal/admin/attendance/scan?type=course&sessionId=${session.id}&courseId=${course.id}`}
                          title="Scan attendance for this session"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(52, 168, 83, 0.15)',
                            border: '1px solid rgba(52, 168, 83, 0.35)',
                            borderRadius: '6px',
                            color: '#86EFAC',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <QrCode size={13} />
                          <span>Scan</span>
                        </Link>
                        <Link
                          href={`/student-portal/admin/attendance/sessions/${session.id}`}
                          title="View Attendance Sheet & Manual Check-ins"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(66, 133, 244, 0.12)',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            borderRadius: '6px',
                            color: '#93C5FD',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <Users size={13} />
                          <span>Sheet</span>
                        </Link>
                        <button
                          onClick={() => openEditModal(session)}
                          title="Edit Session"
                          style={{
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#CBD5E1',
                            padding: '0.35rem 0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.title)}
                          title="Delete Session"
                          style={{
                            background: 'rgba(234, 67, 53, 0.1)',
                            border: '1px solid rgba(234, 67, 53, 0.25)',
                            borderRadius: '6px',
                            color: '#EA4335',
                            padding: '0.35rem 0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                    {session.title}
                  </h4>
                  {session.description && (
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
                      {session.description}
                    </p>
                  )}

                  {/* YouTube link preview if online */}
                  {session.type === 'online' && session.youtube_url && (
                    <div style={{ marginTop: '0.6rem' }}>
                      <a
                        href={session.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: '#EA4335',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        <Youtube size={14} />
                        Watch Session Broadcast / Recording
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}

                  {/* Task / Assignment Deadline Banner */}
                  {session.deadline && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        padding: '0.6rem 0.9rem',
                        borderRadius: '8px',
                        background: new Date(session.deadline).getTime() < Date.now()
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        border: `1px solid ${new Date(session.deadline).getTime() < Date.now() ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <AlertCircle
                          size={15}
                          style={{
                            color: new Date(session.deadline).getTime() < Date.now() ? '#F87171' : '#FBBF24',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: new Date(session.deadline).getTime() < Date.now() ? '#FCA5A5' : '#FDE68A',
                          }}
                        >
                          Task / Assignment Deadline:
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 600 }}>
                          {new Date(session.deadline).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: new Date(session.deadline).getTime() < Date.now() ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                          color: new Date(session.deadline).getTime() < Date.now() ? '#F87171' : '#FBBF24',
                        }}
                      >
                        {new Date(session.deadline).getTime() < Date.now()
                          ? 'Deadline Passed'
                          : `${formatTimeRemaining(session.deadline)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Materials & Attachments Section */}
                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', color: '#94A3B8', fontWeight: 700 }}>
                      MATERIALS & SLIDES ({materialsList.length}):
                    </span>

                    {materialsList.length === 0 ? (
                      <span style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                        No materials attached yet.
                      </span>
                    ) : (
                      materialsList.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '6px',
                            background: 'rgba(66, 133, 244, 0.12)',
                            border: '1px solid rgba(66, 133, 244, 0.25)',
                            fontSize: '0.78rem',
                            color: '#93C5FD',
                          }}
                        >
                          <FileText size={12} style={{ color: '#60A5FA' }} />
                          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.title}
                          </span>

                          {/* Inline Preview Trigger */}
                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(m)}
                            title="Preview PDF / Material"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#60A5FA',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Eye size={13} />
                          </button>

                          {/* External link */}
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open direct link"
                            style={{ color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                          >
                            <ExternalLink size={11} />
                          </a>

                          {/* Delete material */}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(session.id, idx)}
                              title="Remove material"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#EA4335',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {canManage && (
                    <button
                      onClick={() => openAddMaterialModal(session.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#E2E8F0',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <Plus size={13} />
                      Attach PDF / Resource
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT SESSION MODAL */}
      {isSessionModalOpen && (
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
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#0F172A',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                {editingSession ? `Edit Session #${editingSession.session_number}` : 'Schedule New Session'}
              </h3>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '0.3rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  color: '#F87171',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitSession} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Session Number & Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Session #
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sessionNum}
                    onChange={(e) => setSessionNum(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Session Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intro to Modern React & Hooks"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Description & Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Topics, exercises, or prerequisites for this session..."
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Date, Start Time, End Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => handleStartTimeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Duration Presets & Info */}
              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} style={{ color: '#60A5FA' }} />
                    Session Duration ({sessionType === 'offline' ? 'Offline Lecture' : 'Online Stream'}):
                  </label>
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: sessionType === 'offline' ? '#34D399' : '#F87171',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: sessionType === 'offline' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                    }}
                  >
                    {formatDurationText(durationMinutes)} ({durationMinutes} mins)
                  </span>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { label: '45m', min: 45 },
                    { label: '1 Hour', min: 60 },
                    { label: '1.5 Hours', min: 90 },
                    { label: '2 Hours', min: 120 },
                    { label: '2.5 Hours', min: 150 },
                    { label: '3 Hours', min: 180 },
                  ].map((preset) => (
                    <button
                      key={preset.min}
                      type="button"
                      onClick={() => handleSelectDurationPreset(preset.min)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: durationMinutes === preset.min ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: durationMinutes === preset.min ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: durationMinutes === preset.min ? '#60A5FA' : '#CBD5E1',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Task / Assignment Submission Deadline (Optional) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Calendar size={13} style={{ color: '#FBBF24' }} />
                    Task / Assignment Submission Deadline (Optional)
                  </label>
                  {sessionDeadline && (
                    <button
                      type="button"
                      onClick={() => setSessionDeadline('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#EA4335',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Clear Deadline
                    </button>
                  )}
                </div>

                <input
                  type="datetime-local"
                  value={sessionDeadline}
                  onChange={(e) => setSessionDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />

                {/* Deadline Shortcuts */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Quick set:</span>
                  <button
                    type="button"
                    onClick={() => handleSetDeadlineRelative(3)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    +3 Days (23:59)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDeadlineRelative(7)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    +1 Week (23:59)
                  </button>
                </div>
              </div>

              {/* Session Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Delivery Mode *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setSessionType('offline')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: sessionType === 'offline' ? '2px solid #34A853' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: sessionType === 'offline' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <MapPin size={16} style={{ color: '#34A853' }} />
                    Offline (In-Person)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionType('online')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: sessionType === 'online' ? '2px solid #EA4335' : '1px solid rgba(255, 255, 255, 0.12)',
                      background: sessionType === 'online' ? 'rgba(234, 67, 53, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.86rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Youtube size={16} style={{ color: '#EA4335' }} />
                    Online (YouTube Stream)
                  </button>
                </div>
              </div>

              {/* Conditional Venue vs YouTube URL */}
              {sessionType === 'offline' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Physical Venue / Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Helwan National Univ - Building B, Hall 402"
                    value={sessionVenue}
                    onChange={(e) => setSessionVenue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    YouTube Stream / Video URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Session Status
                </label>
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value as SessionStatus)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#1E293B',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#E2E8F0',
                    fontSize: '0.88rem',
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
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {isSaving ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTACH MATERIAL MODAL */}
      {isMaterialModalOpen && (
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
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '480px',
              borderRadius: '16px',
              padding: '1.75rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#0F172A',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Attach Material / Slides
              </h3>
              <button
                onClick={() => setIsMaterialModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Tabs: Upload to Drive vs Paste Link */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setMaterialTab('upload')}
                style={{
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: materialTab === 'upload' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: materialTab === 'upload' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                  color: materialTab === 'upload' ? '#60A5FA' : '#94A3B8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                Upload PDF to Drive
              </button>

              <button
                type="button"
                onClick={() => setMaterialTab('link')}
                style={{
                  padding: '0.55rem',
                  borderRadius: '8px',
                  border: materialTab === 'link' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: materialTab === 'link' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                  color: materialTab === 'link' ? '#60A5FA' : '#94A3B8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <Link2 size={14} />
                Drive / Web Link
              </button>
            </div>

            {materialError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 67, 53, 0.15)',
                  color: '#F87171',
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                }}
              >
                {materialError}
              </div>
            )}

            <form onSubmit={handleSaveMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                  Material Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Session 1 Lecture Slides (PDF)"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {materialTab === 'upload' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Select File (PDF, DOCX, Presentation) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    required
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px dashed rgba(255, 255, 255, 0.2)',
                      color: '#CBD5E1',
                      fontSize: '0.85rem',
                    }}
                  />
                  {selectedFile && (
                    <div style={{ fontSize: '0.76rem', color: '#34A853', marginTop: '0.35rem' }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.3rem' }}>
                    Resource URL / Google Drive URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/file/d/..."
                    value={materialLinkUrl}
                    onChange={(e) => setMaterialLinkUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#E2E8F0',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingMaterial}
                  style={{
                    padding: '0.6rem 1.3rem',
                    borderRadius: '8px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isUploadingMaterial ? 'not-allowed' : 'pointer',
                    opacity: isUploadingMaterial ? 0.7 : 1,
                  }}
                >
                  {isUploadingMaterial ? 'Attaching...' : 'Attach Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INLINE PDF / MATERIAL PREVIEW MODAL */}
      {previewMaterial && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1100,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              background: '#1E293B',
              borderRadius: '12px 12px 0 0',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={18} style={{ color: '#4285F4' }} />
              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>
                {previewMaterial.title}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a
                href={previewMaterial.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Open in New Tab
                <ExternalLink size={12} />
              </a>

              <button
                onClick={() => setPreviewMaterial(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: '#0F172A',
              borderRadius: '0 0 12px 12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <iframe
              src={getPreviewUrl(previewMaterial)}
              title={previewMaterial.title}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
