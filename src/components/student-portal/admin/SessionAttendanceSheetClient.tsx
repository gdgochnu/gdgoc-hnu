'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Users,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Download,
  QrCode,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  UserCheck,
  UserX,
  AlertCircle,
  Sparkles,
  Layers,
  GraduationCap,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  SessionAttendanceSheetData,
  SessionStudentAttendanceItem,
  toggleStudentAttendance,
  bulkMarkSessionAttendance,
} from '@/app/student-portal/admin/attendance/sessions/[sessionId]/actions';

interface SessionAttendanceSheetClientProps {
  initialData: SessionAttendanceSheetData;
}

export function SessionAttendanceSheetClient({ initialData }: SessionAttendanceSheetClientProps) {
  const router = useRouter();
  const { session, parent, siblingSessions, userCanManage, currentOfficerName } = initialData;

  const [students, setStudents] = useState<SessionStudentAttendanceItem[]>(initialData.students);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // studentId currently toggling
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Compute live statistics based on current local state
  const totalEnrolled = students.length;
  const totalPresent = students.filter((s) => s.is_present).length;
  const totalAbsent = totalEnrolled - totalPresent;
  const attendanceRate = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      // Status filter
      if (filterStatus === 'present' && !s.is_present) return false;
      if (filterStatus === 'absent' && s.is_present) return false;

      // Search query
      if (!q) return true;
      return (
        s.full_name_en.toLowerCase().includes(q) ||
        (s.full_name_ar && s.full_name_ar.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.faculty && s.faculty.toLowerCase().includes(q)) ||
        s.qr_code.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery, filterStatus]);

  // Handle single student attendance toggle
  const handleToggleAttendance = async (student: SessionStudentAttendanceItem) => {
    if (!userCanManage) return;
    const nextPresentState = !student.is_present;

    try {
      setIsUpdating(student.student_id);

      // Optimistic update
      setStudents((prev) =>
        prev.map((s) => {
          if (s.student_id !== student.student_id) return s;
          return {
            ...s,
            is_present: nextPresentState,
            check_in_time: nextPresentState ? new Date().toISOString() : null,
            check_in_method: nextPresentState ? 'manual' : null,
            checked_in_by_name: nextPresentState ? currentOfficerName : null,
          };
        })
      );

      const res = await toggleStudentAttendance({
        sessionId: session.id,
        studentId: student.student_id,
        targetType: parent.target_type,
        isPresent: nextPresentState,
      });

      if (!res.success) {
        // Rollback
        setStudents((prev) =>
          prev.map((s) => (s.student_id === student.student_id ? student : s))
        );
        showToast(res.error || 'Failed to update attendance.', 'error');
      } else {
        showToast(
          nextPresentState
            ? `Marked ${student.full_name_en} as Present`
            : `Removed check-in for ${student.full_name_en}`,
          'success'
        );
      }
    } catch (err: any) {
      // Rollback
      setStudents((prev) =>
        prev.map((s) => (s.student_id === student.student_id ? student : s))
      );
      showToast(err.message || 'An unexpected error occurred.', 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  // Bulk selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(filteredStudents.map((s) => s.student_id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectOne = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // Bulk Action Execution
  const handleBulkAction = async (action: 'mark_present' | 'mark_absent') => {
    if (selectedStudentIds.length === 0 || isBulkUpdating || !userCanManage) return;

    try {
      setIsBulkUpdating(true);
      const isPresent = action === 'mark_present';
      const now = new Date().toISOString();

      // Optimistic update
      setStudents((prev) =>
        prev.map((s) => {
          if (!selectedStudentIds.includes(s.student_id)) return s;
          return {
            ...s,
            is_present: isPresent,
            check_in_time: isPresent ? now : null,
            check_in_method: isPresent ? 'manual' : null,
            checked_in_by_name: isPresent ? currentOfficerName : null,
          };
        })
      );

      const res = await bulkMarkSessionAttendance({
        sessionId: session.id,
        studentIds: selectedStudentIds,
        targetType: parent.target_type,
        action,
      });

      if (!res.success) {
        showToast(res.error || 'Bulk update failed.', 'error');
        router.refresh();
      } else {
        showToast(
          action === 'mark_present'
            ? `Successfully marked ${selectedStudentIds.length} students Present`
            : `Successfully marked ${selectedStudentIds.length} students Absent`,
          'success'
        );
        setSelectedStudentIds([]);
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected error occurred.', 'error');
      router.refresh();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Export Attendance Sheet to CSV
  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'Full Name (EN)',
      'Full Name (AR)',
      'Email',
      'Phone',
      'Faculty',
      'Academic Year',
      'Enrollment Status',
      'Attendance Status',
      'Check-in Timestamp',
      'Check-in Method',
      'Checked-in By',
      'Notes',
    ];

    const rows = students.map((s) => [
      `"${s.student_id}"`,
      `"${s.full_name_en}"`,
      `"${s.full_name_ar || ''}"`,
      `"${s.email}"`,
      `"${s.phone || ''}"`,
      `"${s.faculty || ''}"`,
      `"${s.academic_year || ''}"`,
      `"${s.enrollment_status}"`,
      `"${s.is_present ? 'PRESENT' : 'ABSENT'}"`,
      `"${s.check_in_time ? new Date(s.check_in_time).toLocaleString() : ''}"`,
      `"${s.check_in_method || ''}"`,
      `"${s.checked_in_by_name || ''}"`,
      `"${s.notes || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Attendance_${parent.title.replace(/\s+/g, '_')}_Session_${session.session_number}_${session.session_date}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '2.5rem 2rem 5rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            padding: '0.85rem 1.35rem',
            borderRadius: '10px',
            background: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {toastMessage.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. Header & Breadcrumbs Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
        <div>
          {/* Breadcrumb links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href={parent.target_type === 'course' ? '/student-portal/admin/courses' : '/student-portal/admin/workshops'}
              style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
            >
              {parent.target_type === 'course' ? 'Courses Admin' : 'Workshops Admin'}
            </Link>
            <span>/</span>
            <Link
              href={
                parent.target_type === 'course'
                  ? `/student-portal/admin/courses/${parent.id}/sessions`
                  : `/student-portal/admin/workshops/${parent.id}/sessions`
              }
              style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
            >
              {parent.title}
            </Link>
            <span>/</span>
            <span style={{ color: '#F8FAFC', fontWeight: 700 }}>
              Session {session.session_number} Attendance Sheet
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              Session {session.session_number}: {session.title}
            </h1>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                background:
                  session.status === 'completed'
                    ? 'rgba(52, 168, 83, 0.15)'
                    : session.status === 'cancelled'
                    ? 'rgba(234, 67, 53, 0.15)'
                    : 'rgba(66, 133, 244, 0.15)',
                color:
                  session.status === 'completed'
                    ? '#86EFAC'
                    : session.status === 'cancelled'
                    ? '#FCA5A5'
                    : '#93C5FD',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {session.status}
            </span>
          </div>
          {session.description && (
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0.5rem 0 0 0', maxWidth: '750px' }}>
              {session.description}
            </p>
          )}
        </div>

        {/* Action Controls in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {/* Sibling Session Switcher */}
          {siblingSessions.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                value={session.id}
                onChange={(e) => router.push(`/student-portal/admin/attendance/sessions/${e.target.value}`)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  color: '#CBD5E1',
                  padding: '0.55rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
                title="Switch Session"
              >
                {siblingSessions.map((sib) => (
                  <option key={sib.id} value={sib.id} style={{ background: '#181B20' }}>
                    Session {sib.session_number}: {sib.title} ({sib.session_date})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#CBD5E1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Download CSV attendance report"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Launch Scanner Button */}
          <Link
            href={`/student-portal/admin/attendance/scan?type=${parent.target_type}&sessionId=${session.id}&${
              parent.target_type === 'course' ? `courseId=${parent.id}` : `workshopId=${parent.id}`
            }`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.05rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(66, 133, 244, 0.25)',
              transition: 'all 0.15s ease',
            }}
            title="Open camera QR scanner for this session"
          >
            <QrCode size={15} />
            <span>Open QR Scanner</span>
          </Link>
        </div>
      </div>

      {/* 2. Session Logistics Strip & KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Logistics Panel */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '0.65rem',
          }}
        >
          <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Session Logistics
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 600 }}>
            <Calendar size={15} color="#4285F4" />
            <span>{new Date(session.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94A3B8', fontSize: '0.84rem' }}>
            <Clock size={14} color="#34A853" />
            <span>
              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94A3B8', fontSize: '0.84rem' }}>
            {session.type === 'online' ? <Video size={14} color="#EA4335" /> : <MapPin size={14} color="#FBBC04" />}
            <span>{session.type === 'online' ? 'Online Session' : session.venue || 'In-Person Venue'}</span>
          </div>
        </div>

        {/* Total Enrolled */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Roster
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFFFFF', marginTop: '0.35rem' }}>
            {totalEnrolled}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Confirmed students registered
          </div>
        </div>

        {/* Present Check-ins */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', color: '#34A853', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attended / Present
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#86EFAC', marginTop: '0.35rem' }}>
            {totalPresent}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            {totalAbsent} students absent
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attendance Rate
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#60A5FA', marginTop: '0.35rem' }}>
            {attendanceRate}%
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              marginTop: '0.5rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${attendanceRate}%`,
                background: 'linear-gradient(90deg, #4285F4 0%, #34A853 100%)',
                borderRadius: '999px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. Search, Filter Bar & Bulk Actions */}
      <div
        className="glass-panel"
        style={{
          padding: '1.15rem 1.35rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              width: '100%',
            }}
          >
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, phone, QR..."
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                outline: 'none',
                width: '100%',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Center: Status Tabs Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: filterStatus === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              color: filterStatus === 'all' ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All ({totalEnrolled})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('present')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: filterStatus === 'present' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
              color: filterStatus === 'present' ? '#86EFAC' : '#94A3B8',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Present ({totalPresent})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('absent')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              background: filterStatus === 'absent' ? 'rgba(234, 67, 53, 0.15)' : 'transparent',
              color: filterStatus === 'absent' ? '#FCA5A5' : '#94A3B8',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Absent ({totalAbsent})
          </button>
        </div>

        {/* Right: Bulk Actions Strip */}
        {selectedStudentIds.length > 0 && userCanManage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(66, 133, 244, 0.12)', border: '1px solid rgba(66, 133, 244, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#93C5FD', fontWeight: 700 }}>
              {selectedStudentIds.length} Selected:
            </span>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkAction('mark_present')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                background: '#34A853',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <UserCheck size={13} />
              <span>Mark Present</span>
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => handleBulkAction('mark_absent')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <UserX size={13} />
              <span>Mark Absent</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Main Students Attendance Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {userCanManage && (
                  <th style={{ padding: '0.95rem 1rem', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedStudentIds.includes(s.student_id))
                      }
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                )}
                <th style={{ padding: '0.95rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Student
                </th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Faculty / Year
                </th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Enrollment
                </th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Attendance Status
                </th>
                <th style={{ padding: '0.95rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Check-in Details
                </th>
                {userCanManage && (
                  <th style={{ padding: '0.95rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Action
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3.5rem 2rem', textAlign: 'center', color: '#94A3B8' }}>
                    <Users size={36} color="rgba(255, 255, 255, 0.2)" style={{ margin: '0 auto 0.75rem auto' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>No students found</div>
                    <div style={{ fontSize: '0.84rem', marginTop: '0.35rem' }}>
                      {searchQuery ? 'Try adjusting your search criteria.' : 'No students enrolled or registered yet.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudentIds.includes(student.student_id);
                  const isBusy = isUpdating === student.student_id;

                  return (
                    <tr
                      key={student.student_id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: isSelected
                          ? 'rgba(66, 133, 244, 0.06)'
                          : student.is_present
                          ? 'rgba(52, 168, 83, 0.02)'
                          : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      {userCanManage && (
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(student.student_id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                      )}

                      {/* Student Info */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: student.is_present ? 'rgba(52, 168, 83, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                              border: student.is_present ? '1px solid rgba(52, 168, 83, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: student.is_present ? '#86EFAC' : '#CBD5E1',
                              fontWeight: 700,
                              fontSize: '0.86rem',
                              flexShrink: 0,
                            }}
                          >
                            {student.full_name_en.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {student.full_name_en}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                              {student.email}
                              {student.phone ? ` • ${student.phone}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Faculty / Year */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 600 }}>
                          {student.faculty || '—'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                          {student.academic_year ? `Year ${student.academic_year}` : 'Student'}
                        </div>
                      </td>

                      {/* Enrollment Badge */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            background:
                              student.enrollment_status === 'confirmed' || student.enrollment_status === 'registered'
                                ? 'rgba(52, 168, 83, 0.12)'
                                : student.enrollment_status === 'walk_in'
                                ? 'rgba(168, 85, 247, 0.15)'
                                : 'rgba(251, 188, 4, 0.15)',
                            color:
                              student.enrollment_status === 'confirmed' || student.enrollment_status === 'registered'
                                ? '#86EFAC'
                                : student.enrollment_status === 'walk_in'
                                ? '#C084FC'
                                : '#FDE047',
                            textTransform: 'capitalize',
                          }}
                        >
                          {student.enrollment_status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Attendance Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {student.is_present ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(52, 168, 83, 0.15)',
                              border: '1px solid rgba(52, 168, 83, 0.35)',
                              color: '#86EFAC',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} color="#34A853" />
                            <span>Present</span>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#94A3B8',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <XCircle size={13} color="#94A3B8" />
                            <span>Absent</span>
                          </div>
                        )}
                      </td>

                      {/* Check-in Details */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {student.is_present && student.check_in_time ? (
                          <div>
                            <div style={{ fontSize: '0.78rem', color: '#CBD5E1', fontWeight: 600 }}>
                              {new Date(student.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span
                                style={{
                                  marginLeft: '0.4rem',
                                  fontSize: '0.68rem',
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '3px',
                                  background: student.check_in_method === 'qr' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                  color: student.check_in_method === 'qr' ? '#60A5FA' : '#CBD5E1',
                                  textTransform: 'uppercase',
                                  fontWeight: 700,
                                }}
                              >
                                {student.check_in_method || 'manual'}
                              </span>
                            </div>
                            {student.checked_in_by_name && (
                              <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                                By {student.checked_in_by_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>—</span>
                        )}
                      </td>

                      {/* Action Button */}
                      {userCanManage && (
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleAttendance(student)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '6px',
                              background: student.is_present
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(52, 168, 83, 0.15)',
                              border: student.is_present
                                ? '1px solid rgba(239, 68, 68, 0.25)'
                                : '1px solid rgba(52, 168, 83, 0.35)',
                              color: student.is_present ? '#F87171' : '#86EFAC',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: isBusy ? 'wait' : 'pointer',
                              transition: 'all 0.15s ease',
                              opacity: isBusy ? 0.6 : 1,
                            }}
                            title={student.is_present ? 'Revoke check-in (Mark Absent)' : 'Manually check-in (Mark Present)'}
                          >
                            {student.is_present ? (
                              <>
                                <UserX size={12} />
                                <span>Mark Absent</span>
                              </>
                            ) : (
                              <>
                                <UserCheck size={12} />
                                <span>Mark Present</span>
                              </>
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
