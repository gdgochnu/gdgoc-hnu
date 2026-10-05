'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  BookOpen,
  ArrowLeft,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  GraduationCap,
  Building2,
  QrCode,
  Check,
  X,
  UserX,
  ExternalLink,
  MessageCircle,
  Eye,
  ShieldCheck,
  ArrowUpRight,
  Filter,
  RotateCcw,
  Trash2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import {
  CourseEnrollmentsHeader,
  EnrollmentStudentItem,
  approveCourseEnrollment,
  rejectCourseEnrollment,
  promoteWaitlistStudent,
  waitlistCourseEnrollment,
  removeCourseEnrollment,
  resetEnrollmentToPending,
} from '@/app/student-portal/admin/courses/[id]/enrollments/actions';
import { EnrollmentStatus } from '@/types/student';

interface CourseEnrollmentsClientProps {
  header: CourseEnrollmentsHeader;
  initialEnrollments: EnrollmentStudentItem[];
  canManage: boolean;
}

type TabType = 'pending' | 'confirmed' | 'waitlisted' | 'rejected';

export function CourseEnrollmentsClient({
  header,
  initialEnrollments,
  canManage,
}: CourseEnrollmentsClientProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentStudentItem[]>(initialEnrollments);
  const [activeTab, setActiveTab] = useState<TabType>(
    header.pending_count > 0 ? 'pending' : 'confirmed'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentStudentItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilterStatus, setExportFilterStatus] = useState<'confirmed' | 'all' | 'pending' | 'waitlisted'>('confirmed');
  const [exportFilterYear, setExportFilterYear] = useState<string>('all');
  const [exportFilterFaculty, setExportFilterFaculty] = useState<string>('all');
  const [exportTicketTitle, setExportTicketTitle] = useState<string>(header.title || 'General Admission');
  const [exportTicketVenue, setExportTicketVenue] = useState<string>('In-Person');

  // Grouped counts
  const pendingCount = enrollments.filter((e) => e.status === 'pending').length;
  const confirmedCount = enrollments.filter((e) => e.status === 'confirmed').length;
  const waitlistedCount = enrollments.filter((e) => e.status === 'waitlisted').length;
  const rejectedCount = enrollments.filter(
    (e) => e.status === 'rejected' || e.status === 'withdrawn'
  ).length;

  const capacity = header.capacity;
  const capacityPercent = capacity ? Math.min(Math.round((confirmedCount / capacity) * 100), 100) : 0;
  const isFull = Boolean(capacity && confirmedCount >= capacity);

  // Distinct faculties and academic years in this course roster
  const uniqueFaculties = useMemo(() => {
    const set = new Set<string>();
    enrollments.forEach((e) => {
      if (e.student.faculty?.trim()) set.add(e.student.faculty.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [enrollments]);

  const uniqueYears = useMemo(() => {
    const set = new Set<number>();
    enrollments.forEach((e) => {
      if (e.student.academic_year) set.add(Number(e.student.academic_year));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [enrollments]);

  // Filtered by tab and search query
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((item) => {
      // Tab matching
      let matchesTab = false;
      if (activeTab === 'pending') matchesTab = item.status === 'pending';
      else if (activeTab === 'confirmed') matchesTab = item.status === 'confirmed';
      else if (activeTab === 'waitlisted') matchesTab = item.status === 'waitlisted';
      else if (activeTab === 'rejected')
        matchesTab = item.status === 'rejected' || item.status === 'withdrawn';

      if (!matchesTab) return false;

      // Search matching
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const s = item.student;
      return (
        s.full_name_en?.toLowerCase().includes(q) ||
        s.full_name_ar?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.faculty?.toLowerCase().includes(q) ||
        s.qr_code?.toLowerCase().includes(q)
      );
    });
  }, [enrollments, activeTab, searchQuery]);

  // Filtered for Export Dialog
  const exportMatchingStudents = useMemo(() => {
    return enrollments.filter((item) => {
      // Status filter
      if (exportFilterStatus === 'confirmed' && item.status !== 'confirmed') return false;
      if (exportFilterStatus === 'pending' && item.status !== 'pending') return false;
      if (exportFilterStatus === 'waitlisted' && item.status !== 'waitlisted') return false;

      // Year filter
      if (exportFilterYear !== 'all') {
        const yearNum = Number(exportFilterYear);
        if (Number(item.student.academic_year) !== yearNum) return false;
      }

      // Faculty filter
      if (exportFilterFaculty !== 'all') {
        if (item.student.faculty?.trim() !== exportFilterFaculty.trim()) return false;
      }

      return true;
    });
  }, [enrollments, exportFilterStatus, exportFilterYear, exportFilterFaculty]);

  const parseStudentName = (fullName: string | null | undefined): { firstName: string; lastName: string } => {
    if (!fullName) return { firstName: '', lastName: '' };
    const trimmed = fullName.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return { firstName, lastName };
  };

  const escapeCsvCell = (value: string | number | boolean | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExecuteExportCSV = () => {
    if (exportMatchingStudents.length === 0) {
      alert('No matching students found for the selected criteria.');
      return;
    }

    // Exact requested columns:
    // first_name,last_name,email,checked_in,job_title,company,ticket_title,ticket_venue
    const headers = [
      'first_name',
      'last_name',
      'email',
      'checked_in',
      'job_title',
      'company',
      'ticket_title',
      'ticket_venue',
    ];

    const rows = exportMatchingStudents.map((item) => {
      const s = item.student;
      const { firstName, lastName } = parseStudentName(s.full_name_en || s.full_name_ar);
      const isCheckedIn = 'TRUE';
      const jobTitle = s.academic_year ? `Year ${s.academic_year} Student` : 'Student';
      const company = s.faculty || s.university || 'Helwan National University';
      const ticketTitle = exportTicketTitle.trim() || header.title || 'General Admission';
      const ticketVenue = exportTicketVenue.trim() || 'In-Person';

      return [
        escapeCsvCell(firstName),
        escapeCsvCell(lastName),
        escapeCsvCell(s.email),
        isCheckedIn,
        escapeCsvCell(jobTitle),
        escapeCsvCell(company),
        escapeCsvCell(ticketTitle),
        escapeCsvCell(ticketVenue),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (header.title || 'course')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    const yearSuffix = exportFilterYear !== 'all' ? `_year${exportFilterYear}` : '';
    const facultySuffix = exportFilterFaculty !== 'all' ? `_filtered` : '';
    link.href = url;
    link.download = `${safeTitle}_attendees_${exportFilterStatus}${yearSuffix}${facultySuffix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleApprove = async (item: EnrollmentStudentItem) => {
    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await approveCourseEnrollment(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to approve enrollment.' });
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === item.id
            ? { ...e, status: 'confirmed', confirmed_at: new Date().toISOString() }
            : e
        )
      );

      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, status: 'confirmed', confirmed_at: new Date().toISOString() } : null
        );
      }

      setFeedback({
        type: 'success',
        text: `Approved application for ${item.student.full_name_en}. Spot is now confirmed.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: EnrollmentStudentItem) => {
    if (!confirm(`Are you sure you want to reject/remove ${item.student.full_name_en}?`)) {
      return;
    }

    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await rejectCourseEnrollment(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to update enrollment.' });
        return;
      }

      // Update state, and if auto-promoted someone from waitlist, update them too!
      setEnrollments((prev) =>
        prev.map((e) => {
          if (e.id === item.id) {
            return { ...e, status: 'rejected' };
          }
          if (res.promotedWaitlistId && e.id === res.promotedWaitlistId) {
            return { ...e, status: 'confirmed', confirmed_at: new Date().toISOString() };
          }
          return e;
        })
      );

      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: 'rejected' } : null));
      }

      const autoNote = res.promotedWaitlistId
        ? ' A spot was freed and the next student on the waitlist was automatically confirmed!'
        : '';

      setFeedback({
        type: 'success',
        text: `Application for ${item.student.full_name_en} marked as rejected.${autoNote}`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handlePromote = async (item: EnrollmentStudentItem) => {
    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await promoteWaitlistStudent(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to promote student.' });
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === item.id
            ? { ...e, status: 'confirmed', confirmed_at: new Date().toISOString() }
            : e
        )
      );

      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, status: 'confirmed', confirmed_at: new Date().toISOString() } : null
        );
      }

      setFeedback({
        type: 'success',
        text: `Promoted ${item.student.full_name_en} from waitlist to confirmed!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleWaitlist = async (item: EnrollmentStudentItem) => {
    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await waitlistCourseEnrollment(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to move student to waitlist.' });
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === item.id
            ? { ...e, status: 'waitlisted', confirmed_at: null }
            : e
        )
      );

      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) =>
          prev ? { ...prev, status: 'waitlisted', confirmed_at: null } : null
        );
      }

      setFeedback({
        type: 'success',
        text: `Moved ${item.student.full_name_en} to the waitlist queue.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (item: EnrollmentStudentItem) => {
    if (
      !confirm(
        `Remove ${item.student.full_name_en} from the course roster? This will delete their record and allow the student to submit a fresh application.`
      )
    ) {
      return;
    }

    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await removeCourseEnrollment(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to remove enrollment.' });
        return;
      }

      setEnrollments((prev) => prev.filter((e) => e.id !== item.id));
      if (selectedStudent?.id === item.id) {
        setSelectedStudent(null);
      }

      setFeedback({
        type: 'success',
        text: `Removed ${item.student.full_name_en} from the rejected list. The student can now apply again!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResetToPending = async (item: EnrollmentStudentItem) => {
    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await resetEnrollmentToPending(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to reset enrollment status.' });
        return;
      }

      setEnrollments((prev) =>
        prev.map((e) => (e.id === item.id ? { ...e, status: 'pending', confirmed_at: null } : e))
      );
      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: 'pending', confirmed_at: null } : null));
      }

      setFeedback({
        type: 'success',
        text: `Application for ${item.student.full_name_en} moved back to Pending review.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 2rem 4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >


      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: '1rem 1.4rem',
            borderRadius: '12px',
            background:
              feedback.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: feedback.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {feedback.text}
        </div>
      )}

      {/* Course Hero & Capacity Monitor Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          padding: '2.25rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: header.status === 'published' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)',
                  color: header.status === 'published' ? '#34A853' : '#FBBF24',
                  border: `1px solid ${header.status === 'published' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(251, 188, 4, 0.4)'}`,
                }}
              >
                {header.status}
              </span>

              {header.department_name && (
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                  {header.department_name} ({header.department_code})
                </span>
              )}

              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background:
                    header.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(251, 188, 4, 0.15)',
                  color: header.enrollment_type === 'open' ? '#34D399' : '#FBBF24',
                  border: `1px solid ${header.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.3)' : 'rgba(251, 188, 4, 0.3)'}`,
                }}
              >
                {header.enrollment_type === 'open' ? 'Open Admission' : 'Gated Application Required'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              {header.title}
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.4rem', margin: 0 }}>
              Review student enrollment requests, approve or reject gated applications, and manage waitlists.
            </p>
          </div>

          {/* Capacity Meter */}
          {capacity && (
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Capacity Utilization
                </span>
                <span
                  style={{
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: isFull ? '#EF4444' : capacityPercent > 80 ? '#FBBF24' : '#34D399',
                  }}
                >
                  {confirmedCount} / {capacity} Seats ({capacityPercent}%)
                </span>
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
                    width: `${capacityPercent}%`,
                    height: '100%',
                    background: isFull
                      ? '#EF4444'
                      : capacityPercent > 80
                      ? 'linear-gradient(90deg, #FBBF24, #EF4444)'
                      : 'linear-gradient(90deg, #4285F4, #34A853)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94A3B8' }}>
                <span>{capacity - confirmedCount > 0 ? `${capacity - confirmedCount} spots remaining` : 'At maximum capacity'}</span>
                {waitlistedCount > 0 && <span style={{ color: '#C084FC', fontWeight: 700 }}>{waitlistedCount} waitlisted</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: Status Tabs & Live Search */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(
              [
                { key: 'pending', label: 'Pending Review', count: pendingCount, color: '#FBBF24' },
                { key: 'confirmed', label: 'Confirmed Students', count: confirmedCount, color: '#34D399' },
                { key: 'waitlisted', label: 'Waitlist Queue', count: waitlistedCount, color: '#C084FC' },
                { key: 'rejected', label: 'Rejected / Withdrawn', count: rejectedCount, color: '#94A3B8' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: isActive ? '#60A5FA' : '#94A3B8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: isActive ? 'rgba(66, 133, 244, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#FFFFFF' : tab.color,
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Search & Export CSV */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: 1, maxWidth: '360px' }}>
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
                placeholder="Search student by name, faculty, phone, QR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Export CSV Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.22) 0%, rgba(52, 168, 83, 0.22) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.45)',
                  color: '#60A5FA',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                  whiteSpace: 'nowrap',
                }}
                title="تخصيص وتصدير ملف CSV"
              >
                <Download size={15} color="#60A5FA" />
                <span>استخراج بيانات المشتركين (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Students Roster Grid / List */}
      {filteredEnrollments.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#94A3B8',
          }}
        >
          <Users size={48} style={{ color: '#475569', margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
            No Students in this Tab
          </h3>
          <p style={{ fontSize: '0.88rem', margin: 0 }}>
            {searchQuery
              ? 'No applicants match your search criteria.'
              : `There are currently no students in the "${activeTab}" list.`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {filteredEnrollments.map((item) => {
            const s = item.student;
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  background: 'rgba(15, 23, 42, 0.65)',
                  overflow: 'hidden',
                }}
              >
                {/* Student Identity Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4285F4, #34A853)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        (s.full_name_en || 'S').slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div style={{ minWidth: 0, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.full_name_en}
                      </div>
                      {s.full_name_ar && (
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#94A3B8',
                            marginTop: '0.1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          dir="rtl"
                        >
                          {s.full_name_ar}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code Pass Identifier */}
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#60A5FA',
                      border: '1px solid rgba(66, 133, 244, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    {s.qr_code}
                  </span>
                </div>

                {/* Academic & Contact Details */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: '#CBD5E1',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <GraduationCap size={14} style={{ color: '#34A853', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.faculty || 'Faculty not specified'} • Year {s.academic_year || 1}
                    </span>
                  </div>

                  {s.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={14} style={{ color: '#60A5FA', flexShrink: 0 }} />
                      <span>{s.phone}</span>
                      {s.whatsapp_number && (
                        <a
                          href={`https://wa.me/${s.whatsapp_number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginLeft: 'auto',
                            color: '#34D399',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            flexShrink: 0,
                          }}
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle size={13} />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Mail size={14} style={{ color: '#FBBC04', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.email}
                    </span>
                  </div>
                </div>

                {/* Applied / Confirmed Timestamp */}
                <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  Applied on {new Date(item.enrolled_at).toLocaleDateString()} at{' '}
                  {new Date(item.enrolled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Inspect Full Student Profile */}
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(item)}
                    style={{
                      width: '100%',
                      padding: '0.48rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Eye size={13} />
                    View Profile & Application
                  </button>

                  {/* Pending Decision Buttons */}
                  {canManage && item.status === 'pending' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(item)}
                        style={{
                          padding: '0.45rem 0.5rem',
                          borderRadius: '8px',
                          background: '#34A853',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Check size={14} />
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleWaitlist(item)}
                        style={{
                          padding: '0.45rem 0.5rem',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#FBBF24',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                        }}
                        title="Move applicant to waitlist"
                      >
                        <Clock3 size={14} />
                        Waitlist
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(item)}
                        style={{
                          padding: '0.45rem 0.5rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          color: '#F87171',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <X size={14} />
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Waitlist Promotion Button */}
                  {canManage && item.status === 'waitlisted' && (
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handlePromote(item)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: '#4285F4',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Sparkles size={14} />
                        Promote to Confirmed
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(item)}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          color: '#F87171',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Remove from Waitlist"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Confirmed Student Actions */}
                  {canManage && item.status === 'confirmed' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleWaitlist(item)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          color: '#FBBF24',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                        title="Move to Waitlist"
                      >
                        <Clock3 size={13} />
                        Waitlist
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleReject(item)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.12)',
                          border: '1px solid rgba(234, 67, 53, 0.25)',
                          color: '#EA4335',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <UserX size={13} />
                        Withdraw
                      </button>
                    </div>
                  )}

                  {/* Rejected / Withdrawn Student Actions */}
                  {canManage && (item.status === 'rejected' || item.status === 'withdrawn') && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleResetToPending(item)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(251, 188, 4, 0.12)',
                          border: '1px solid rgba(251, 188, 4, 0.3)',
                          color: '#FBBF24',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                        title="Move back to Pending review"
                      >
                        <RotateCcw size={13} />
                        Reconsider
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRemove(item)}
                        style={{
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.35)',
                          color: '#F87171',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                        }}
                        title="Delete enrollment record so student can apply again"
                      >
                        <Trash2 size={13} />
                        Remove
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
      {/* STUDENT FULL APPLICATION PROFILE MODAL */}
      {/* ========================================================================= */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
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
                padding: '1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  }}
                >
                  {(selectedStudent.student.full_name_en || 'S').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {selectedStudent.student.full_name_en}
                  </div>
                  {selectedStudent.student.full_name_ar && (
                    <div style={{ fontSize: '0.84rem', color: '#94A3B8' }} dir="rtl">
                      {selectedStudent.student.full_name_ar}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.4rem',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  fontSize: '0.84rem',
                }}
              >
                <div>
                  <div style={{ color: '#94A3B8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    University
                  </div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedStudent.student.university}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94A3B8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Faculty & Major
                  </div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, marginTop: '0.2rem' }}>
                    {selectedStudent.student.faculty || '—'}
                    {selectedStudent.student.department_major && ` (${selectedStudent.student.department_major})`}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94A3B8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Academic Year
                  </div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, marginTop: '0.2rem' }}>
                    Year {selectedStudent.student.academic_year || 1}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#94A3B8', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>
                    Permanent QR Pass
                  </div>
                  <div style={{ color: '#60A5FA', fontWeight: 700, fontFamily: 'monospace', marginTop: '0.2rem' }}>
                    {selectedStudent.student.qr_code}
                  </div>
                </div>
              </div>

              {/* Direct Communication Row */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Contact Phone
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#FFFFFF', fontWeight: 700, marginTop: '0.15rem' }}>
                    {selectedStudent.student.phone || 'No phone provided'}
                  </div>
                </div>

                {selectedStudent.student.whatsapp_number && (
                  <a
                    href={`https://wa.me/${selectedStudent.student.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      background: '#25D366',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <MessageCircle size={15} />
                    Open WhatsApp
                  </a>
                )}
              </div>

              {/* Modal Management Actions */}
              {canManage && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.65rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    flexWrap: 'wrap',
                  }}
                >
                  {selectedStudent.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleApprove(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: '#34A853',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Check size={14} />
                        Approve Application
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleWaitlist(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.18)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#FBBF24',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Clock3 size={14} />
                        Move to Waitlist
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleReject(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.35)',
                          color: '#F87171',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <X size={14} />
                        Reject Application
                      </button>
                    </>
                  )}

                  {selectedStudent.status === 'waitlisted' && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handlePromote(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: '#4285F4',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Sparkles size={14} />
                        Promote to Confirmed
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleResetToPending(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#E2E8F0',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <RotateCcw size={14} />
                        Move to Pending Review
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleReject(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.35)',
                          color: '#F87171',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <X size={14} />
                        Reject Application
                      </button>
                    </>
                  )}

                  {(selectedStudent.status === 'rejected' || selectedStudent.status === 'withdrawn') && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleResetToPending(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(251, 188, 4, 0.15)',
                          border: '1px solid rgba(251, 188, 4, 0.35)',
                          color: '#FBBF24',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <RotateCcw size={14} />
                        Move to Pending Review
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleRemove(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.18)',
                          border: '1px solid rgba(234, 67, 53, 0.4)',
                          color: '#F87171',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Trash2 size={14} />
                        Remove from Rejected & Allow Re-apply
                      </button>
                    </>
                  )}

                  {selectedStudent.status === 'confirmed' && (
                    <>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleWaitlist(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                          color: '#FBBF24',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <Clock3 size={14} />
                        Move to Waitlist
                      </button>
                      <button
                        type="button"
                        disabled={processingId === selectedStudent.id}
                        onClick={() => handleReject(selectedStudent)}
                        style={{
                          padding: '0.55rem 1.1rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.12)',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          color: '#EA4335',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        <UserX size={14} />
                        Withdraw Spot
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Export CSV Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.4rem',
              position: 'relative',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25) 0%, rgba(52, 168, 83, 0.25) 100%)',
                    border: '1px solid rgba(66, 133, 244, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <Download size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    تصدير بيانات المشتركين (CSV)
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '0.2rem 0 0 0' }}>
                    تصفية الحضور حسب الكلية والمرحلة الدراسية قبل التصدير
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  حالة التسجيل (Status)
                </label>
                <select
                  value={exportFilterStatus}
                  onChange={(e) => setExportFilterStatus(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="confirmed">المقبولين فقط (Confirmed) — {confirmedCount}</option>
                  <option value="all">جميع المسجلين (All Applicants) — {enrollments.length}</option>
                  <option value="pending">قيد المراجعة (Pending Review) — {pendingCount}</option>
                  <option value="waitlisted">قائمة الانتظار (Waitlisted) — {waitlistedCount}</option>
                </select>
              </div>

              {/* Faculty Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  الكلية (Faculty)
                </label>
                <select
                  value={exportFilterFaculty}
                  onChange={(e) => setExportFilterFaculty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">جميع الكليات (All Faculties)</option>
                  {uniqueFaculties.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Year Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  المرحلة / الفرقة الدراسية (Academic Year)
                </label>
                <select
                  value={exportFilterYear}
                  onChange={(e) => setExportFilterYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">جميع الفرق الدراسية (All Academic Years)</option>
                  <option value="1">الفرقة الأولى (Year 1)</option>
                  <option value="2">الفرقة الثانية (Year 2)</option>
                  <option value="3">الفرقة الثالثة (Year 3)</option>
                  <option value="4">الفرقة الرابعة (Year 4)</option>
                  <option value="5">الفرقة الخامسة (Year 5)</option>
                </select>
              </div>

              {/* Ticket Title Custom Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  عنوان التذكرة (Ticket Title)
                </label>
                <input
                  type="text"
                  value={exportTicketTitle}
                  onChange={(e) => setExportTicketTitle(e.target.value)}
                  placeholder="مثال: General Admission أو Flutter Bootcamp Pass"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Ticket Venue Custom Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  مقر / مكان الفعالية (Ticket Venue)
                </label>
                <input
                  type="text"
                  value={exportTicketVenue}
                  onChange={(e) => setExportTicketVenue(e.target.value)}
                  placeholder="مثال: In-Person أو Main Hall أو Online - Google Meet"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Live Count Preview Banner */}
            <div
              style={{
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                background:
                  exportMatchingStudents.length > 0
                    ? 'rgba(66, 133, 244, 0.12)'
                    : 'rgba(234, 67, 53, 0.12)',
                border: `1px solid ${
                  exportMatchingStudents.length > 0
                    ? 'rgba(66, 133, 244, 0.25)'
                    : 'rgba(234, 67, 53, 0.25)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color={exportMatchingStudents.length > 0 ? '#60A5FA' : '#F87171'} />
                <span style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 600 }}>
                  عدد الطلاب المطابقين:
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: exportMatchingStudents.length > 0 ? '#60A5FA' : '#F87171',
                }}
              >
                {exportMatchingStudents.length} طالب
              </span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94A3B8',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={exportMatchingStudents.length === 0}
                onClick={handleExecuteExportCSV}
                style={{
                  padding: '0.65rem 1.3rem',
                  borderRadius: '10px',
                  background:
                    exportMatchingStudents.length > 0
                      ? 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)'
                      : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: exportMatchingStudents.length > 0 ? '#FFFFFF' : '#64748B',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: exportMatchingStudents.length > 0 ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow:
                    exportMatchingStudents.length > 0
                      ? '0 4px 15px rgba(66, 133, 244, 0.35)'
                      : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Download size={16} />
                <span>تحميل ملف CSV ({exportMatchingStudents.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
