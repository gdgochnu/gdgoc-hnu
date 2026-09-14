'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
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
} from 'lucide-react';
import {
  CourseEnrollmentsHeader,
  EnrollmentStudentItem,
  approveCourseEnrollment,
  rejectCourseEnrollment,
  promoteWaitlistStudent,
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
      {/* Top Breadcrumbs & Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem' }}>
          <Link
            href="/student-portal/admin/courses"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#60A5FA',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Courses Management
          </Link>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{header.title}</span>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Enrollment Applications</span>
        </div>

        {/* Quick links to Sessions & Instructors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link
            href={`/student-portal/admin/courses/${header.id}/sessions`}
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
            Sessions
          </Link>

          <Link
            href={`/student-portal/admin/courses/${header.id}/instructors`}
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
            <Users size={14} style={{ color: '#34A853' }} />
            Instructors & Mentors
          </Link>
        </div>
      </div>

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

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
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
                borderRadius: '8px',
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
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: 'rgba(15, 23, 42, 0.65)',
                }}
              >
                {/* Student Identity Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {s.full_name_en}
                      </div>
                      {s.full_name_ar && (
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.1rem' }} dir="rtl">
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
                    <GraduationCap size={14} style={{ color: '#34A853' }} />
                    <span>
                      {s.faculty || 'Faculty not specified'} • Year {s.academic_year || 1}
                    </span>
                  </div>

                  {s.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Phone size={14} style={{ color: '#60A5FA' }} />
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
                    <Mail size={14} style={{ color: '#FBBC04' }} />
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

                {/* Actions Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
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
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#E2E8F0',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Eye size={13} />
                    Profile
                  </button>

                  {/* Pending Decision Buttons */}
                  {canManage && item.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleApprove(item)}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.75rem',
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
                          gap: '0.35rem',
                        }}
                      >
                        <Check size={14} />
                        Approve
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
                          gap: '0.35rem',
                        }}
                      >
                        <X size={14} />
                        Reject
                      </button>
                    </>
                  )}

                  {/* Waitlist Promotion Button */}
                  {canManage && item.status === 'waitlisted' && (
                    <>
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
                          padding: '0.45rem 0.65rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          color: '#F87171',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                        }}
                        title="Remove from Waitlist"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}

                  {/* Confirmed Student Actions */}
                  {canManage && item.status === 'confirmed' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReject(item)}
                      style={{
                        marginLeft: 'auto',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        background: 'rgba(234, 67, 53, 0.12)',
                        border: '1px solid rgba(234, 67, 53, 0.25)',
                        color: '#EA4335',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <UserX size={13} />
                      Withdraw Spot
                    </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
