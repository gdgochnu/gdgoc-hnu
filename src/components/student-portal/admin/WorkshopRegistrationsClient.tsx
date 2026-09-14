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
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  WorkshopRegistrationsHeader,
  WorkshopStudentItem,
  cancelWorkshopRegistration,
  removeWorkshopRegistration,
  restoreWorkshopRegistration,
} from '@/app/student-portal/admin/workshops/[id]/registrations/actions';

interface WorkshopRegistrationsClientProps {
  header: WorkshopRegistrationsHeader;
  initialRegistrations: WorkshopStudentItem[];
  canManage: boolean;
}

type TabType = 'all' | 'registered' | 'waitlisted' | 'cancelled';

export function WorkshopRegistrationsClient({
  header,
  initialRegistrations,
  canManage,
}: WorkshopRegistrationsClientProps) {
  const [registrations, setRegistrations] = useState<WorkshopStudentItem[]>(initialRegistrations);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<WorkshopStudentItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Grouped counts
  const registeredCount = registrations.filter((r) => r.status === 'registered').length;
  const waitlistedCount = registrations.filter((r) => r.status === 'waitlisted').length;
  const cancelledCount = registrations.filter((r) => r.status === 'cancelled').length;

  const capacity = header.capacity;
  const capacityPercent = capacity ? Math.min(Math.round((registeredCount / capacity) * 100), 100) : 0;
  const isFull = Boolean(capacity && registeredCount >= capacity);

  // Filtered by tab and search
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((item) => {
      let matchesTab = true;
      if (activeTab === 'registered') matchesTab = item.status === 'registered';
      else if (activeTab === 'waitlisted') matchesTab = item.status === 'waitlisted';
      else if (activeTab === 'cancelled') matchesTab = item.status === 'cancelled';

      if (!matchesTab) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const s = item.student;
      return (
        s.full_name_en?.toLowerCase().includes(q) ||
        s.full_name_ar?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.faculty?.toLowerCase().includes(q) ||
        s.qr_code?.toLowerCase().includes(q) ||
        item.qr_code?.toLowerCase().includes(q)
      );
    });
  }, [registrations, activeTab, searchQuery]);

  const handleCancel = async (item: WorkshopStudentItem) => {
    if (!confirm(`Cancel registration spot for ${item.student.full_name_en}?`)) {
      return;
    }

    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await cancelWorkshopRegistration(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to cancel registration.' });
        return;
      }

      setRegistrations((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'cancelled' } : r))
      );
      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      }

      setFeedback({
        type: 'success',
        text: `Registration for ${item.student.full_name_en} has been cancelled.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRestore = async (item: WorkshopStudentItem) => {
    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await restoreWorkshopRegistration(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to restore registration.' });
        return;
      }

      setRegistrations((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: 'registered' } : r))
      );
      if (selectedStudent?.id === item.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, status: 'registered' } : null));
      }

      setFeedback({
        type: 'success',
        text: `Restored registration for ${item.student.full_name_en} to confirmed status.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (item: WorkshopStudentItem) => {
    if (
      !confirm(
        `Remove ${item.student.full_name_en} from the workshop roster? This deletes their registration record, allowing the student to re-register.`
      )
    ) {
      return;
    }

    try {
      setProcessingId(item.id);
      setFeedback(null);

      const res = await removeWorkshopRegistration(header.id, item.id);
      if (!res.success) {
        setFeedback({ type: 'error', text: res.error || 'Failed to delete registration.' });
        return;
      }

      setRegistrations((prev) => prev.filter((r) => r.id !== item.id));
      if (selectedStudent?.id === item.id) {
        setSelectedStudent(null);
      }

      setFeedback({
        type: 'success',
        text: `Removed ${item.student.full_name_en} from roster. The student can now re-register!`,
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
      {/* 1. Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#94A3B8' }}>
          <Link
            href="/student-portal/admin/workshops"
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
            Workshops
          </Link>
          <span>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{header.title}</span>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Registrations Roster</span>
        </div>

        {/* Sub-Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/workshops/${header.id}/sessions`}
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
            href={`/student-portal/admin/workshops/${header.id}/instructors`}
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
            <span>Instructors & Mentors</span>
          </Link>

          <Link
            href={`/student/workshops/${header.id}`}
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
          >
            <ExternalLink size={13} />
            <span>Student View</span>
          </Link>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* 2. Hero & Capacity Card */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
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
                }}
              >
                {header.status}
              </span>

              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: header.registration_open ? 'rgba(66, 133, 244, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                  color: header.registration_open ? '#60A5FA' : '#F87171',
                }}
              >
                {header.registration_open ? 'Registration Open' : 'Registration Closed'}
              </span>

              {header.category && (
                <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{header.category}</span>
              )}
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              {header.title}
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.92rem', marginTop: '0.4rem', marginBottom: 0 }}>
              Live registration roster, attendee QR check-in passes, and multi-session attendance status.
            </p>
          </div>

          {/* Capacity Progress Box */}
          <div
            style={{
              minWidth: '260px',
              padding: '1.25rem',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                Workshop Capacity
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: isFull ? '#F87171' : '#34D399',
                  background: isFull ? 'rgba(234, 67, 53, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px',
                }}
              >
                {isFull ? 'At Capacity' : `${capacityPercent}% Full`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.9rem', fontWeight: 900, color: '#FFFFFF' }}>
                {registeredCount}
              </span>
              <span style={{ fontSize: '0.95rem', color: '#94A3B8', fontWeight: 600 }}>
                / {capacity ? `${capacity} seats` : 'unlimited'}
              </span>
            </div>

            {/* Progress Bar */}
            {capacity && (
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${capacityPercent}%`,
                    height: '100%',
                    background: isFull ? '#EA4335' : 'linear-gradient(90deg, #4285F4, #34A853)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Status Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'all' ? '#4285F4' : 'transparent',
              color: activeTab === 'all' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            All Attendees ({registrations.length})
          </button>

          <button
            onClick={() => setActiveTab('registered')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'registered' ? '#34A853' : 'transparent',
              color: activeTab === 'registered' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            Confirmed ({registeredCount})
          </button>

          <button
            onClick={() => setActiveTab('waitlisted')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'waitlisted' ? '#FBBC04' : 'transparent',
              color: activeTab === 'waitlisted' ? '#0F172A' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            Waitlist ({waitlistedCount})
          </button>

          <button
            onClick={() => setActiveTab('cancelled')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'cancelled' ? '#EA4335' : 'transparent',
              color: activeTab === 'cancelled' ? '#FFFFFF' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>

        {/* Search Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1rem',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            width: '280px',
          }}
        >
          <Search size={15} style={{ color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search attendee or QR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
              width: '100%',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Registrations List / Grid */}
      {filteredRegistrations.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3.5rem 2rem',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            textAlign: 'center',
            color: '#94A3B8',
          }}
        >
          <Users size={38} style={{ color: '#475569', margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ color: '#E2E8F0', fontSize: '1.15rem', margin: 0 }}>
            {registrations.length === 0
              ? 'No registrations for this workshop yet'
              : 'No attendees match your filter/search criteria'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#94A3B8', marginTop: '0.4rem' }}>
            {registrations.length === 0
              ? 'Share the workshop page with students to receive registrations.'
              : 'Try clearing your search query or switching to another status tab.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredRegistrations.map((item) => {
            const s = item.student;
            const isProcessing = processingId === item.id;

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.4rem',
                  borderRadius: '16px',
                  border:
                    item.status === 'registered'
                      ? '1px solid rgba(52, 168, 83, 0.25)'
                      : item.status === 'cancelled'
                      ? '1px solid rgba(234, 67, 53, 0.25)'
                      : '1px solid rgba(251, 188, 4, 0.25)',
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                }}
              >
                {/* Top: Student Name + Status Badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1.5px solid rgba(66, 133, 244, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt={s.full_name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        s.full_name_en.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.98rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.full_name_en}
                      </h4>
                      {s.full_name_ar && (
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{s.full_name_ar}</div>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background:
                        item.status === 'registered'
                          ? 'rgba(52, 168, 83, 0.2)'
                          : item.status === 'cancelled'
                          ? 'rgba(234, 67, 53, 0.2)'
                          : 'rgba(251, 188, 4, 0.2)',
                      color:
                        item.status === 'registered'
                          ? '#34A853'
                          : item.status === 'cancelled'
                          ? '#F87171'
                          : '#FBBF24',
                    }}
                  >
                    {item.status}
                  </span>
                </div>

                {/* QR Code Pass Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.76rem',
                  }}
                >
                  <QrCode size={14} style={{ color: '#60A5FA' }} />
                  <span style={{ color: '#94A3B8' }}>Pass:</span>
                  <span style={{ color: '#60A5FA', fontWeight: 700, fontFamily: 'monospace' }}>
                    {item.qr_code}
                  </span>
                </div>

                {/* Academic & Contact Info */}
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
                      {s.faculty || 'Faculty not specified'} {s.academic_year ? `• Year ${s.academic_year}` : ''}
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

                {/* Registered Timestamp + Attendance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#94A3B8' }}>
                  <span>Registered: {new Date(item.registered_at).toLocaleDateString()}</span>
                  {item.total_sessions_count > 0 && (
                    <span
                      style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: 'rgba(66, 133, 244, 0.1)',
                        color: '#60A5FA',
                        fontWeight: 600,
                      }}
                    >
                      {item.attended_sessions_count} / {item.total_sessions_count} sessions attended
                    </span>
                  )}
                </div>

                {/* Card Actions Footer */}
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

                  {canManage && item.status === 'registered' && (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleCancel(item)}
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
                      Cancel Spot
                    </button>
                  )}

                  {canManage && item.status === 'cancelled' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRestore(item)}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          border: '1px solid rgba(52, 168, 83, 0.35)',
                          color: '#34D399',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <RotateCcw size={13} />
                        Restore
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleRemove(item)}
                        style={{
                          padding: '0.45rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.35)',
                          color: '#F87171',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                        title="Delete registration record so student can apply again"
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
      {/* FULL STUDENT APPLICATION PROFILE MODAL */}
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
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: '#0B1120',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60A5FA', fontWeight: 700, fontSize: '0.85rem' }}>
                <ShieldCheck size={16} />
                Student Attendee Profile
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#94A3B8',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Student Hero */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.2)',
                  border: '2px solid #4285F4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900,
                  fontSize: '1.4rem',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {selectedStudent.student.avatar_url ? (
                  <img src={selectedStudent.student.avatar_url} alt={selectedStudent.student.full_name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  selectedStudent.student.full_name_en.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {selectedStudent.student.full_name_en}
                </h3>
                {selectedStudent.student.full_name_ar && (
                  <div style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.15rem' }}>
                    {selectedStudent.student.full_name_ar}
                  </div>
                )}
                <div style={{ color: '#60A5FA', fontSize: '0.82rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {selectedStudent.qr_code}
                </div>
              </div>
            </div>

            {/* Data Attributes Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.85rem',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.84rem',
              }}
            >
              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>University</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.student.university || 'Helwan University'}</div>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Faculty</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.student.faculty || 'Not specified'}</div>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Major / Department</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.student.department_major || 'General'}</div>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Academic Year</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>Year {selectedStudent.student.academic_year || 1}</div>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Phone</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{selectedStudent.student.phone || 'None'}</div>
              </div>

              <div>
                <span style={{ color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700 }}>Email</span>
                <div style={{ color: '#FFFFFF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedStudent.student.email}</div>
              </div>
            </div>

            {/* Attendance Count Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.1)',
                border: '1px solid rgba(66, 133, 244, 0.25)',
              }}
            >
              <span style={{ fontSize: '0.84rem', color: '#CBD5E1', fontWeight: 600 }}>Sessions Attended</span>
              <span style={{ fontSize: '0.92rem', color: '#60A5FA', fontWeight: 800 }}>
                {selectedStudent.attended_sessions_count} / {selectedStudent.total_sessions_count} sessions
              </span>
            </div>

            {/* Modal Actions Footer */}
            {canManage && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                {selectedStudent.status === 'registered' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedStudent)}
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
                    <UserX size={14} />
                    Cancel Registration Spot
                  </button>
                )}

                {selectedStudent.status === 'cancelled' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleRestore(selectedStudent)}
                      style={{
                        padding: '0.55rem 1.1rem',
                        borderRadius: '8px',
                        background: 'rgba(52, 168, 83, 0.15)',
                        border: '1px solid rgba(52, 168, 83, 0.35)',
                        color: '#34D399',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <RotateCcw size={14} />
                      Restore Spot
                    </button>

                    <button
                      type="button"
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
                      Remove & Allow Re-register
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
