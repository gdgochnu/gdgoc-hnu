'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
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
  Users,
  Layers,
  ChevronRight,
  Sparkles,
  QrCode,
  GraduationCap,
  Video,
  Play,
} from 'lucide-react';
import {
  WorkshopDetailHeader,
  CreateWorkshopSessionInput,
  UpdateWorkshopSessionInput,
  SessionMaterialItem,
  createWorkshopSession,
  updateWorkshopSession,
  deleteWorkshopSession,
  updateWorkshopSessionStatus,
  addWorkshopSessionMaterialItem,
  removeWorkshopSessionMaterialItem,
  uploadWorkshopSessionMaterialFile,
} from '@/app/student-portal/admin/workshops/[id]/sessions/actions';
import { WorkshopSession, SessionType, SessionStatus } from '@/types/student';

interface WorkshopSessionsClientProps {
  workshop: WorkshopDetailHeader;
  initialSessions: WorkshopSession[];
  canManage: boolean;
  userRole?: string;
}

export function WorkshopSessionsClient({
  workshop,
  initialSessions,
  canManage,
  userRole,
}: WorkshopSessionsClientProps) {
  const [sessions, setSessions] = useState<WorkshopSession[]>(initialSessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SessionStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | SessionType>('all');

  // Modal State for Session
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<WorkshopSession | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [sessionNum, setSessionNum] = useState<number>(1);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [sessionType, setSessionType] = useState<SessionType>('offline');
  const [sessionVenue, setSessionVenue] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('scheduled');
  const [durationMinutes, setDurationMinutes] = useState<number | null>(120);

  // Material Upload / Add Modal State
  const [materialModalSessionId, setMaterialModalSessionId] = useState<string | null>(null);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewMaterial, setPreviewMaterial] = useState<SessionMaterialItem | null>(null);

  // Auto calculate duration from start and end time
  const computeDurationMinutes = (start: string, end: string) => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const totalStart = sh * 60 + sm;
      const totalEnd = eh * 60 + em;
      return totalEnd > totalStart ? totalEnd - totalStart : 120;
    } catch {
      return 120;
    }
  };

  const openCreateModal = () => {
    setEditingSession(null);
    const nextNum = sessions.length > 0 ? Math.max(...sessions.map((s) => s.session_number)) + 1 : 1;
    setSessionNum(nextNum);
    setSessionTitle('');
    setSessionDesc('');
    setSessionDate(new Date().toISOString().slice(0, 10));
    setStartTime('18:00');
    setEndTime('20:00');
    setSessionType('offline');
    setSessionVenue('HNU Tech Hall 201');
    setYoutubeUrl('');
    setOnlineMeetingUrl('');
    setSessionStatus('scheduled');
    setDurationMinutes(120);
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  const openEditModal = (s: WorkshopSession) => {
    setEditingSession(s);
    setSessionNum(s.session_number);
    setSessionTitle(s.title);
    setSessionDesc(s.description || '');
    setSessionDate(s.session_date);
    setStartTime(s.start_time ? s.start_time.slice(0, 5) : '18:00');
    setEndTime(s.end_time ? s.end_time.slice(0, 5) : '20:00');
    setSessionType(s.type);
    setSessionVenue(s.venue || '');
    setYoutubeUrl(s.youtube_url || '');
    setOnlineMeetingUrl(s.online_meeting_url || '');
    setSessionStatus(s.status);
    setDurationMinutes(s.duration_minutes || computeDurationMinutes(s.start_time, s.end_time));
    setFormError(null);
    setIsSessionModalOpen(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
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
      setFormError('Venue is required for offline in-person sessions.');
      return;
    }
    if (sessionType === 'online' && !youtubeUrl.trim() && !onlineMeetingUrl.trim()) {
      setFormError('Either YouTube URL or Online Meeting Link is required for online sessions.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingSession) {
        const payload: UpdateWorkshopSessionInput = {
          id: editingSession.id,
          workshop_id: workshop.id,
          session_number: Number(sessionNum),
          title: sessionTitle.trim(),
          description: sessionDesc.trim() || undefined,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          venue: sessionType === 'offline' ? sessionVenue.trim() : undefined,
          youtube_url: sessionType === 'online' ? youtubeUrl.trim() : undefined,
          online_meeting_url: sessionType === 'online' ? onlineMeetingUrl.trim() : undefined,
          status: sessionStatus,
          duration_minutes: durationMinutes,
        };

        const res = await updateWorkshopSession(payload);
        if (!res.success || !res.session) {
          setFormError(res.error || 'Failed to update session.');
          return;
        }

        setSessions(sessions.map((s) => (s.id === editingSession.id ? res.session! : s)));
      } else {
        const payload: CreateWorkshopSessionInput = {
          workshop_id: workshop.id,
          session_number: Number(sessionNum),
          title: sessionTitle.trim(),
          description: sessionDesc.trim() || undefined,
          session_date: sessionDate,
          start_time: startTime,
          end_time: endTime,
          type: sessionType,
          venue: sessionType === 'offline' ? sessionVenue.trim() : undefined,
          youtube_url: sessionType === 'online' ? youtubeUrl.trim() : undefined,
          online_meeting_url: sessionType === 'online' ? onlineMeetingUrl.trim() : undefined,
          status: sessionStatus,
          duration_minutes: durationMinutes,
          materials: [],
        };

        const res = await createWorkshopSession(payload);
        if (!res.success || !res.session) {
          setFormError(res.error || 'Failed to create session.');
          return;
        }

        setSessions([...sessions, res.session]);
      }

      setIsSessionModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (session: WorkshopSession) => {
    if (!confirm(`Are you sure you want to delete Session #${session.session_number}: "${session.title}"?`)) {
      return;
    }
    const res = await deleteWorkshopSession(workshop.id, session.id);
    if (!res.success) {
      alert(res.error || 'Failed to delete session.');
      return;
    }
    setSessions(sessions.filter((s) => s.id !== session.id));
  };

  const handleStatusChange = async (sessionId: string, newStatus: SessionStatus) => {
    setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, status: newStatus } : s)));
    const res = await updateWorkshopSessionStatus(workshop.id, sessionId, newStatus);
    if (!res.success) {
      alert(res.error || 'Failed to update session status.');
    }
  };

  // Material Item Helpers
  const parseMaterial = (raw: string): SessionMaterialItem => {
    try {
      return JSON.parse(raw);
    } catch {
      return { title: 'Session Resource', url: raw, type: 'link' };
    }
  };

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

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialModalSessionId) return;

    try {
      setIsUploadingMaterial(true);
      setMaterialError(null);

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', materialTitle || selectedFile.name);

        const res = await uploadWorkshopSessionMaterialFile(workshop.id, materialModalSessionId, formData);
        if (!res.success || !res.session) {
          setMaterialError(res.error || 'Failed to upload resource.');
          return;
        }

        setSessions(sessions.map((s) => (s.id === materialModalSessionId ? res.session! : s)));
      } else if (materialUrl) {
        if (!materialTitle.trim()) {
          setMaterialError('Resource title is required.');
          return;
        }

        const res = await addWorkshopSessionMaterialItem(
          workshop.id,
          materialModalSessionId,
          materialTitle,
          materialUrl
        );

        if (!res.success || !res.session) {
          setMaterialError(res.error || 'Failed to attach link.');
          return;
        }

        setSessions(sessions.map((s) => (s.id === materialModalSessionId ? res.session! : s)));
      } else {
        setMaterialError('Please select a file or enter a web URL.');
        return;
      }

      setMaterialModalSessionId(null);
      setMaterialTitle('');
      setMaterialUrl('');
      setSelectedFile(null);
    } catch (err: any) {
      setMaterialError(err.message || 'An error occurred.');
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const handleRemoveMaterial = async (sessionId: string, itemUrl: string) => {
    if (!confirm('Remove this learning material from session?')) return;
    const res = await removeWorkshopSessionMaterialItem(workshop.id, sessionId, itemUrl);
    if (!res.success || !res.session) {
      alert(res.error || 'Failed to remove material.');
      return;
    }
    setSessions(sessions.map((s) => (s.id === sessionId ? res.session! : s)));
  };

  // Filter sessions
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
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Breadcrumbs & Sub-Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', color: '#94A3B8' }}>
          <Link
            href="/student-portal/admin/workshops"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Workshops
          </Link>
          <span>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{workshop.title}</span>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Sessions Schedule</span>
        </div>

        {/* Workshop Sub-Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/workshops/${workshop.id}/instructors`}
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
            href={`/student-portal/admin/workshops/${workshop.id}/registrations`}
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
            <QrCode size={14} />
            <span>Registrations Roster</span>
          </Link>

          <Link
            href={`/student-portal/admin/attendance/scan?type=workshop&workshopId=${workshop.id}${sessions.length > 0 ? `&sessionId=${sessions[0].id}` : ''}`}
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
            title="Scan student QR codes for this workshop"
          >
            <QrCode size={14} style={{ color: '#34A853' }} />
            <span>Scan Attendance</span>
          </Link>

          <Link
            href={`/student/workshops/${workshop.id}`}
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

      {/* 2. Workshop Hero & Quick Stats */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(234, 67, 53, 0.12) 0%, rgba(66, 133, 244, 0.06) 100%)',
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
                  background: workshop.status === 'published' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)',
                  color: workshop.status === 'published' ? '#34A853' : '#FBBF24',
                  border: `1px solid ${workshop.status === 'published' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(251, 188, 4, 0.4)'}`,
                }}
              >
                {workshop.status}
              </span>

              {workshop.department_name && (
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                  {workshop.department_name} ({workshop.department_code})
                </span>
              )}

              {workshop.category && (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#E2E8F0',
                  }}
                >
                  {workshop.category}
                </span>
              )}

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: workshop.registration_open ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: workshop.registration_open ? '#86EFAC' : '#FCA5A5',
                  border: `1px solid ${workshop.registration_open ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: workshop.registration_open ? '#10B981' : '#EF4444' }} />
                {workshop.registration_open ? 'Registration Open' : 'Registration Closed'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              {workshop.title}
            </h1>

            {workshop.description && (
              <p style={{ color: '#CBD5E1', fontSize: '0.92rem', margin: '0.6rem 0 0 0', maxWidth: '780px', lineHeight: 1.5 }}>
                {workshop.description}
              </p>
            )}
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.4rem',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(234, 67, 53, 0.25)',
              }}
            >
              <Plus size={18} />
              <span>Schedule New Session</span>
            </button>
          )}
        </div>

        {/* Hero KPI Numbers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>TOTAL SESSIONS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
              {totalSessions}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>SCHEDULED</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.2rem' }}>
              {scheduledCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>COMPLETED</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34A853', marginTop: '0.2rem' }}>
              {completedCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>TOTAL DURATION</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>
              {Math.floor(totalCurriculumMinutes / 60)}h {totalCurriculumMinutes % 60}m
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>CAPACITY</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#CBD5E1', marginTop: '0.2rem' }}>
              {workshop.capacity ? workshop.capacity : '∞ Seats'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderRadius: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              flex: 1,
            }}
          >
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search sessions by title, description or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#181B20' }}>All Statuses</option>
            <option value="scheduled" style={{ background: '#181B20' }}>Scheduled</option>
            <option value="completed" style={{ background: '#181B20' }}>Completed</option>
            <option value="cancelled" style={{ background: '#181B20' }}>Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
            }}
          >
            <option value="all" style={{ background: '#181B20' }}>All Types</option>
            <option value="offline" style={{ background: '#181B20' }}>In-Person (Offline)</option>
            <option value="online" style={{ background: '#181B20' }}>Online (Meeting/Stream)</option>
          </select>
        </div>
      </div>

      {/* 4. Sessions Timeline / List */}
      {filteredSessions.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(234, 67, 53, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}
          >
            <Calendar size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            No Workshop Sessions Found
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
            No sessions match your search or filter. Schedule the first session to build out your workshop curriculum.
          </p>
          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.86rem',
                marginTop: '0.5rem',
              }}
            >
              <Plus size={16} />
              <span>Schedule Session #1</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredSessions.map((session) => {
            const materialsList: SessionMaterialItem[] = (session.materials || []).map(parseMaterial);
            const duration = session.duration_minutes || computeDurationMinutes(session.start_time, session.end_time);

            return (
              <div
                key={session.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Header row: Number, Title, Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: session.type === 'online' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                        border: `1px solid ${session.type === 'online' ? 'rgba(66, 133, 244, 0.35)' : 'rgba(52, 168, 83, 0.35)'}`,
                        color: session.type === 'online' ? '#60A5FA' : '#34D399',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        flexShrink: 0,
                      }}
                    >
                      <span>S#{session.session_number}</span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                          {session.title}
                        </h3>

                        {/* Status Badge */}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            background:
                              session.status === 'completed'
                                ? 'rgba(52, 168, 83, 0.15)'
                                : session.status === 'cancelled'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(251, 188, 4, 0.15)',
                            color:
                              session.status === 'completed'
                                ? '#86EFAC'
                                : session.status === 'cancelled'
                                ? '#FCA5A5'
                                : '#FDE047',
                            border: `1px solid ${
                              session.status === 'completed'
                                ? 'rgba(52, 168, 83, 0.3)'
                                : session.status === 'cancelled'
                                ? 'rgba(239, 68, 68, 0.3)'
                                : 'rgba(251, 188, 4, 0.3)'
                            }`,
                          }}
                        >
                          {session.status}
                        </span>

                        {/* Type Badge */}
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            background: session.type === 'online' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                            color: session.type === 'online' ? '#93C5FD' : '#86EFAC',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {session.type === 'online' ? <Video size={12} /> : <MapPin size={12} />}
                          {session.type === 'online' ? 'Online Session' : 'In-Person Venue'}
                        </span>
                      </div>

                      {session.description && (
                        <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
                          {session.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick Status / Actions */}
                  {canManage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <select
                        value={session.status}
                        onChange={(e) => handleStatusChange(session.id, e.target.value as any)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '6px',
                          padding: '0.35rem 0.6rem',
                          color: '#CBD5E1',
                          fontSize: '0.76rem',
                          outline: 'none',
                        }}
                      >
                        <option value="scheduled" style={{ background: '#181B20' }}>Status: Scheduled</option>
                        <option value="completed" style={{ background: '#181B20' }}>Status: Completed</option>
                        <option value="cancelled" style={{ background: '#181B20' }}>Status: Cancelled</option>
                      </select>

                      <Link
                        href={`/student-portal/admin/attendance/scan?type=workshop&sessionId=${session.id}&workshopId=${workshop.id}`}
                        title="Scan attendance for this workshop session"
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

                      <button
                        type="button"
                        onClick={() => openEditModal(session)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          padding: '0.4rem',
                          color: '#CBD5E1',
                          cursor: 'pointer',
                        }}
                        title="Edit Session Details"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '6px',
                          padding: '0.4rem',
                          color: '#F87171',
                          cursor: 'pointer',
                        }}
                        title="Delete Session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Logistics Strip: Date, Time, Duration, Venue / Meeting */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.82rem',
                    color: '#E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Calendar size={14} color="#60A5FA" />
                    <span>
                      {new Date(session.session_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} color="#FBBF24" />
                    <span>
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)} ({duration} mins)
                    </span>
                  </div>

                  {session.type === 'offline' && session.venue && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} color="#34D399" />
                      <span>{session.venue}</span>
                    </div>
                  )}

                  {session.type === 'online' && session.online_meeting_url && (
                    <a
                      href={session.online_meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#93C5FD',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Video size={14} />
                      <span>Live Meeting Link</span>
                      <ExternalLink size={12} />
                    </a>
                  )}

                  {session.type === 'online' && session.youtube_url && (
                    <a
                      href={session.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#F87171',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Youtube size={14} />
                      <span>YouTube Stream / Recording</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Materials & Resources Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      HANDOUTS & SLIDES ({materialsList.length})
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setMaterialModalSessionId(session.id);
                          setMaterialTitle('');
                          setMaterialUrl('');
                          setSelectedFile(null);
                          setMaterialError(null);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          padding: '0.25rem 0.65rem',
                          color: '#CBD5E1',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Upload size={12} />
                        <span>Upload PDF / Link</span>
                      </button>
                    )}
                  </div>

                  {materialsList.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic' }}>
                      No handouts or PDF slides attached yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {materialsList.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <FileText size={14} color="#60A5FA" />
                          <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{item.title}</span>

                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(item)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#93C5FD',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              padding: '2px',
                            }}
                            title="Preview PDF Handout"
                          >
                            <Eye size={13} />
                          </button>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                            title="Open Link"
                          >
                            <ExternalLink size={13} />
                          </a>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(session.id, item.url)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '2px',
                              }}
                              title="Remove Material"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Create / Edit Session Modal */}
      {isSessionModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '16px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                {editingSession ? `Edit Session #${sessionNum}` : 'Schedule New Workshop Session'}
              </h2>
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  padding: '0.4rem',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    SESSION # *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sessionNum}
                    onChange={(e) => setSessionNum(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    SESSION TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Management with Bloc & Clean Architecture"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  DESCRIPTION / AGENDA
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of topics covered in this workshop session..."
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Date, Start Time, End Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    SESSION DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    START TIME *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setDurationMinutes(computeDurationMinutes(e.target.value, endTime));
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    END TIME *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setDurationMinutes(computeDurationMinutes(startTime, e.target.value));
                    }}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Duration & Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    DURATION (MINUTES)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="120"
                    value={durationMinutes || ''}
                    onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    SESSION TYPE *
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setSessionType('offline')}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        borderRadius: '8px',
                        background: sessionType === 'offline' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${sessionType === 'offline' ? '#34D399' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: sessionType === 'offline' ? '#86EFAC' : '#CBD5E1',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <MapPin size={14} />
                      <span>In-Person</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionType('online')}
                      style={{
                        flex: 1,
                        padding: '0.65rem',
                        borderRadius: '8px',
                        background: sessionType === 'online' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${sessionType === 'online' ? '#60A5FA' : 'rgba(255, 255, 255, 0.1)'}`,
                        color: sessionType === 'online' ? '#93C5FD' : '#CBD5E1',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Video size={14} />
                      <span>Online</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional: Venue for Offline, URLs for Online */}
              {sessionType === 'offline' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    PHYSICAL VENUE / HALL *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HNU Building C - Hall 301, Electronics Lab"
                    value={sessionVenue}
                    onChange={(e) => setSessionVenue(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                      ONLINE MEETING URL (GOOGLE MEET / ZOOM)
                    </label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={onlineMeetingUrl}
                      onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                      YOUTUBE URL (LIVE STREAM OR RECORDING)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.65rem 0.85rem',
                        color: '#FFFFFF',
                        fontSize: '0.88rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  SESSION STATUS
                </label>
                <select
                  value={sessionStatus}
                  onChange={(e) => setSessionStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  <option value="scheduled" style={{ background: '#181B20' }}>Scheduled</option>
                  <option value="completed" style={{ background: '#181B20' }}>Completed</option>
                  <option value="cancelled" style={{ background: '#181B20' }}>Cancelled</option>
                </select>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSessionModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary"
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
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

      {/* 6. Upload / Add Materials Modal */}
      {materialModalSessionId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '520px',
              width: '100%',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Attach Workshop Materials
              </h3>
              <button
                type="button"
                onClick={() => setMaterialModalSessionId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {materialError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                }}
              >
                {materialError}
              </div>
            )}

            <form onSubmit={handleAddMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  RESOURCE TITLE *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workshop Slide Deck (PDF) / GitHub Repo"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Option 1: File upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  OPTION A: UPLOAD PDF FILE
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '0.82rem',
                  }}
                />
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.76rem', color: '#64748B', fontWeight: 700 }}>
                — OR —
              </div>

              {/* Option 2: Link */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  OPTION B: WEB LINK / GOOGLE DRIVE URL
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={materialUrl}
                  onChange={(e) => setMaterialUrl(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setMaterialModalSessionId(null)}
                  style={{
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#CBD5E1',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploadingMaterial}
                  className="btn-primary"
                  style={{
                    padding: '0.6rem 1.35rem',
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: isUploadingMaterial ? 'not-allowed' : 'pointer',
                    opacity: isUploadingMaterial ? 0.7 : 1,
                  }}
                >
                  {isUploadingMaterial ? 'Uploading...' : 'Attach Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. PDF Viewer Preview Modal */}
      {previewMaterial && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '960px',
              width: '100%',
              height: '85vh',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="#60A5FA" />
                <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1rem' }}>
                  {previewMaterial.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <a
                  href={previewMaterial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: '#93C5FD',
                    fontSize: '0.82rem',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open in Tab</span>
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewMaterial(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    padding: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#0F172A', position: 'relative' }}>
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
        </div>
      )}
    </div>
  );
}
