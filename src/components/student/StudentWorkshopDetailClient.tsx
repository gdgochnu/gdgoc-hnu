'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Play,
  ArrowLeft,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
  ExternalLink,
  FileText,
  ShieldCheck,
  GraduationCap,
  Download,
  AlertTriangle,
  QrCode,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  X,
  Radio,
  FileCode,
  Share2,
} from 'lucide-react';
import {
  WorkshopDetailResult,
  WorkshopSessionDetail,
  registerForWorkshop,
} from '@/app/student/workshops/actions';

interface StudentWorkshopDetailClientProps {
  initialData: WorkshopDetailResult;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/i
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function StudentWorkshopDetailClient({ initialData }: StudentWorkshopDetailClientProps) {
  const router = useRouter();
  const {
    workshop,
    instructors,
    sessions,
    myRegistration: initialMyRegistration,
    canRegister: initialCanRegister,
    needsOnboarding,
    isAuthenticated,
    isStaff,
    adminManageUrl,
  } = initialData;

  const [myRegistration, setMyRegistration] = useState(initialMyRegistration);
  const [canRegister, setCanRegister] = useState(initialCanRegister);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active modular session selection
  const [activeSessionId, setActiveSessionId] = useState<string>(
    sessions.length > 0 ? sessions[0].id : ''
  );

  // File preview modal state
  const [previewFile, setPreviewFile] = useState<{ id: string; name: string; url?: string } | null>(null);

  // QR Modal state
  const [showQrModal, setShowQrModal] = useState(false);

  const activeSessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
  const activeSession = sessions[activeSessionIndex] || sessions[0] || null;

  const totalHours = Math.max(1, Math.round(workshop.total_duration_minutes / 60));
  const isRegistered = Boolean(myRegistration && myRegistration.status === 'registered');
  const isWaitlisted = Boolean(myRegistration && myRegistration.status === 'waitlisted');

  // Attendance stats
  const attendedCount = sessions.filter((s) => s.is_attended).length;
  const attendanceRate = sessions.length > 0 ? Math.round((attendedCount / sessions.length) * 100) : 0;

  const handleRegister = async () => {
    if (!isAuthenticated) {
      router.push(`/student?signin=true&returnUrl=/student/workshops/${workshop.id}`);
      return;
    }

    if (needsOnboarding) {
      router.push('/student/onboarding');
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await registerForWorkshop(workshop.id);
      if (res.success && res.registration) {
        setMyRegistration({
          id: res.registration.id,
          status: res.registration.status,
          qr_code: res.registration.qr_code,
          registered_at: new Date().toISOString(),
        });
        setCanRegister(false);
        setActionMessage({
          type: 'success',
          text: 'Registration successful! Your workshop pass has been generated.',
        });
        router.push(`/student/workshops/${workshop.id}/confirmation`);
        router.refresh();
      } else {
        setActionMessage({
          type: 'error',
          text: res.error || 'Failed to register for workshop.',
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred during registration.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: '2.5rem 2rem',
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        paddingBottom: '5rem',
      }}
    >
      {/* Top Bar: Back link + Staff Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <Link
          href="/student/workshops"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#94A3B8',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'color 0.15s ease',
          }}
        >
          <ArrowLeft size={16} /> Back to Workshops Catalog
        </Link>

        {isStaff && adminManageUrl && (
          <Link
            href={adminManageUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#60A5FA',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ShieldCheck size={16} />
            Instructor & Sessions Control
          </Link>
        )}
      </div>

      {/* Hero Banner Card */}
      <div
        style={{
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Cover Graphic Header */}
        <div
          style={{
            height: '240px',
            position: 'relative',
            background: workshop.cover_image_url
              ? `url(${workshop.cover_image_url}) center/cover no-repeat`
              : 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '2rem',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to bottom, rgba(15, 23, 42, 0.2) 0%, rgba(15, 23, 42, 0.95) 100%)',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            {workshop.department_code && (
              <span
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(66, 133, 244, 0.4)',
                  color: '#60A5FA',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {workshop.department_name} ({workshop.department_code})
              </span>
            )}
            {workshop.category && (
              <span
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#E2E8F0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {workshop.category}
              </span>
            )}
            <span
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                color: '#4ADE80',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <Sparkles size={14} /> Interactive Bootcamp
            </span>
          </div>
        </div>

        {/* Hero Details Body */}
        <div
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '2rem',
            }}
          >
            <div style={{ flex: '1 1 500px' }}>
              <h1
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {workshop.title}
              </h1>
              <p
                style={{
                  color: '#CBD5E1',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                  marginTop: '0.85rem',
                  whiteSpace: 'pre-line',
                }}
              >
                {workshop.description ||
                  'Join this hands-on workshop to master modern engineering workflows and build practical projects with chapter instructors.'}
              </p>
            </div>

            {/* Quick Registration / Status Card */}
            <div
              style={{
                flex: '0 0 340px',
                padding: '1.5rem',
                borderRadius: '18px',
                background: isRegistered
                  ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isRegistered
                  ? '1px solid rgba(52, 168, 83, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
              }}
            >
              {/* Status Header */}
              {isRegistered ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={20} style={{ color: '#34A853' }} />
                    <span style={{ fontWeight: 700, color: '#34A853', fontSize: '1rem' }}>
                      You are Registered! 🎉
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(52, 168, 83, 0.2)',
                      border: '1px solid rgba(52, 168, 83, 0.4)',
                      color: '#4ADE80',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <QrCode size={14} /> View QR
                  </button>
                </div>
              ) : isWaitlisted ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock3 size={20} style={{ color: '#FBBF24' }} />
                  <span style={{ fontWeight: 700, color: '#FBBF24', fontSize: '0.95rem' }}>
                    On Waitlist
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 600 }}>
                    Enrollment Status
                  </span>
                  {workshop.is_full ? (
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#EF4444',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      Workshop Full
                    </span>
                  ) : workshop.registration_open ? (
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(52, 168, 83, 0.2)',
                        color: '#34A853',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      Registration Open
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#94A3B8',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      Closed
                    </span>
                  )}
                </div>
              )}

              {/* Action Message Feedback */}
              {actionMessage && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    background:
                      actionMessage.type === 'success'
                        ? 'rgba(52, 168, 83, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border:
                      actionMessage.type === 'success'
                        ? '1px solid rgba(52, 168, 83, 0.3)'
                        : '1px solid rgba(239, 68, 68, 0.3)',
                    color: actionMessage.type === 'success' ? '#4ADE80' : '#F87171',
                  }}
                >
                  {actionMessage.text}
                </div>
              )}

              {/* Capacity / Deadline Meter */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                  <span>Confirmed Attendees:</span>
                  <span style={{ color: '#F8FAFC', fontWeight: 600 }}>
                    {workshop.capacity
                      ? `${workshop.registration_count} / ${workshop.capacity}`
                      : `${workshop.registration_count} Students`}
                  </span>
                </div>
                {workshop.registration_deadline && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8' }}>
                    <span>Deadline:</span>
                    <span style={{ color: '#CBD5E1', fontWeight: 500 }}>
                      {new Date(workshop.registration_deadline).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              {isRegistered ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Link
                    href={`/student/workshops/${workshop.id}/confirmation`}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.25) 0%, rgba(66, 133, 244, 0.2) 100%)',
                      border: '1px solid rgba(52, 168, 83, 0.5)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle2 size={18} style={{ color: '#4ADE80' }} /> View Official Pass & Invite
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#CBD5E1',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <QrCode size={16} /> Quick QR Pop-up
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={!canRegister || isSubmitting || workshop.is_full}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    background:
                      workshop.is_full || !workshop.registration_open
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'linear-gradient(135deg, var(--google-blue, #4285F4) 0%, #2563EB 100%)',
                    border: 'none',
                    color: workshop.is_full || !workshop.registration_open ? '#64748B' : '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: workshop.is_full || !workshop.registration_open || isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: canRegister && !workshop.is_full ? '0 4px 14px rgba(66, 133, 244, 0.3)' : 'none',
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? (
                    'Processing Registration...'
                  ) : workshop.is_full ? (
                    'Workshop is Full'
                  ) : !workshop.registration_open ? (
                    'Registration Closed'
                  ) : !isAuthenticated ? (
                    'Sign In to Register'
                  ) : needsOnboarding ? (
                    'Complete Profile to Register'
                  ) : (
                    'Register for Workshop — Free'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Calendar size={18} style={{ color: 'var(--google-blue)' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Total Sessions
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {workshop.sessions_count ?? sessions.length} Sessions
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={18} style={{ color: '#FBBF24' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Duration
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                  ~{totalHours} Hours Total
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <MapPin size={18} style={{ color: '#34A853' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                  Format Breakdown
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {workshop.offline_sessions_count} Offline • {workshop.online_sessions_count} Online
                </div>
              </div>
            </div>

            {isRegistered && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <CheckCircle2 size={18} style={{ color: '#34A853' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    My Attendance
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#34A853' }}>
                    {attendedCount} / {sessions.length} attended ({attendanceRate}%)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructors Showcase */}
          {instructors.length > 0 && (
            <div
              style={{
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.75rem' }}>
                Workshop Instructors & Mentors
              </div>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                {instructors.map((ins) => (
                  <div
                    key={ins.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.6rem 0.9rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                      }}
                    >
                      {ins.avatar_url ? (
                        <img
                          src={ins.avatar_url}
                          alt={ins.full_name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        ins.full_name.charAt(0)
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>
                        {ins.full_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#60A5FA' }}>
                        {ins.role === 'mentor' ? 'Technical Mentor' : 'Lead Instructor'}
                        {ins.department_name && ` • ${ins.department_name}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modular Session Breakdown Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Calendar size={22} style={{ color: 'var(--google-blue)' }} />
            Workshop Sessions & Curriculum
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.95rem', marginTop: '0.4rem' }}>
            Select any session below to view scheduled timings, delivery format (offline venue or live online stream), and study materials.
          </p>
        </div>

        {sessions.length === 0 ? (
          <div
            style={{
              padding: '3rem 2rem',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              color: '#94A3B8',
            }}
          >
            <Calendar size={32} style={{ color: '#64748B', marginBottom: '0.75rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>
              Sessions Schedule Pending
            </div>
            <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>
              The detailed schedule and dates for this bootcamp will be announced soon.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 360px) 1fr',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Session Selector List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {sessions.map((s, index) => {
                const isSelected = s.id === activeSession?.id;
                const isPast = new Date(`${s.session_date}T${s.end_time || '23:59:59'}`) < new Date();

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSessionId(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      padding: '1rem',
                      borderRadius: '14px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.18) 0%, rgba(15, 23, 42, 0.8) 100%)'
                        : 'rgba(15, 23, 42, 0.5)',
                      border: isSelected
                        ? '1px solid rgba(66, 133, 244, 0.45)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    {/* Session Number Pill */}
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isSelected
                          ? 'var(--google-blue, #4285F4)'
                          : 'rgba(255, 255, 255, 0.06)',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {s.session_number}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: isSelected ? '#F8FAFC' : '#E2E8F0',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.title}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginTop: '0.35rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                          {s.session_date}
                        </span>
                        <span style={{ color: '#475569' }}>•</span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: s.type === 'offline' ? '#4ADE80' : '#60A5FA',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          {s.type === 'offline' ? (
                            <>
                              <MapPin size={11} /> Offline
                            </>
                          ) : (
                            <>
                              <Video size={11} /> Online
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {s.is_attended && (
                      <CheckCircle2
                        size={16}
                        style={{ color: '#34A853', flexShrink: 0, marginTop: '0.2rem' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Active Session Deep-Dive Viewer */}
            {activeSession && (
              <div
                style={{
                  borderRadius: '18px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(12px)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.5rem',
                }}
              >
                {/* Active Session Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--google-blue)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Session {activeSession.session_number} of {sessions.length}
                    </div>
                    <h3
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#F8FAFC',
                        marginTop: '0.35rem',
                        margin: 0,
                      }}
                    >
                      {activeSession.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {activeSession.type === 'offline' ? (
                      <span
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: '8px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                          color: '#4ADE80',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <MapPin size={13} /> On-Campus Venue
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '0.35rem 0.8rem',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          color: '#60A5FA',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Video size={13} /> Online Live Stream
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Description */}
                {activeSession.description && (
                  <p
                    style={{
                      color: '#CBD5E1',
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {activeSession.description}
                  </p>
                )}

                {/* Logistics Info Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Date</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginTop: '0.2rem' }}>
                      {activeSession.session_date}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Time</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginTop: '0.2rem' }}>
                      {activeSession.start_time} — {activeSession.end_time}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Duration</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginTop: '0.2rem' }}>
                      {activeSession.duration_minutes ? `${activeSession.duration_minutes} mins` : '120 mins'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Attendance</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: activeSession.is_attended ? '#34A853' : '#94A3B8', marginTop: '0.2rem' }}>
                      {activeSession.is_attended ? 'Checked In' : 'Not Recorded Yet'}
                    </div>
                  </div>
                </div>

                {/* Location / Meeting Viewer */}
                {activeSession.type === 'offline' ? (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderRadius: '14px',
                      background: 'rgba(52, 168, 83, 0.06)',
                      border: '1px solid rgba(52, 168, 83, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(52, 168, 83, 0.15)',
                        color: '#4ADE80',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#4ADE80', fontWeight: 700 }}>
                        Physical Venue Location
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginTop: '0.2rem' }}>
                        {activeSession.venue || 'Campus Lab / Hall (Helwan University)'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        Scan your Student ID Pass or Workshop QR code at the door for HR check-in.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    {/* Embedded YouTube Player if available */}
                    {activeSession.youtube_url && getYouTubeEmbedUrl(activeSession.youtube_url) ? (
                      <div
                        style={{
                          borderRadius: '14px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: '#000',
                          position: 'relative',
                          paddingTop: '56.25%', // 16:9 ratio
                        }}
                      >
                        <iframe
                          src={getYouTubeEmbedUrl(activeSession.youtube_url)!}
                          title={activeSession.title}
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
                    ) : null}

                    {/* Google Meet / Zoom direct button */}
                    {activeSession.online_meeting_url && (
                      <div
                        style={{
                          padding: '1.25rem',
                          borderRadius: '14px',
                          background: 'rgba(66, 133, 244, 0.08)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <Video size={24} style={{ color: 'var(--google-blue)' }} />
                          <div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC' }}>
                              Live Meeting Room
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                              {activeSession.online_meeting_url.includes('meet.google.com')
                                ? 'Google Meet Live Stream'
                                : 'Live Meeting Call'}
                            </div>
                          </div>
                        </div>

                        <a
                          href={activeSession.online_meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.65rem 1.25rem',
                            borderRadius: '10px',
                            background: 'var(--google-blue, #4285F4)',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                          }}
                        >
                          Join Live Stream <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Session Materials & PDFs */}
                {activeSession.materials && activeSession.materials.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={16} style={{ color: 'var(--google-blue)' }} />
                      Session Resources & Slides
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {activeSession.materials.map((matStr, mIdx) => {
                        let parsedMat: { title?: string; url?: string; driveFileId?: string } = {};
                        try {
                          parsedMat = JSON.parse(matStr);
                        } catch {
                          parsedMat = { title: `Resource #${mIdx + 1}`, url: matStr };
                        }

                        const matTitle = parsedMat.title || `Resource #${mIdx + 1}`;
                        const matUrl = parsedMat.url || '#';
                        const isPdf = matUrl.toLowerCase().includes('.pdf') || matUrl.includes('drive.google.com');

                        return (
                          <div
                            key={mIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              gap: '1rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <FileText size={16} style={{ color: '#60A5FA' }} />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#E2E8F0' }}>
                                {matTitle}
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {isPdf && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewFile({
                                      id: parsedMat.driveFileId || `${mIdx}`,
                                      name: matTitle,
                                      url: matUrl,
                                    })
                                  }
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.4rem 0.75rem',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#E2E8F0',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Eye size={13} /> Preview
                                </button>
                              )}
                              <a
                                href={matUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.4rem 0.75rem',
                                  borderRadius: '8px',
                                  background: 'rgba(66, 133, 244, 0.15)',
                                  border: '1px solid rgba(66, 133, 244, 0.3)',
                                  color: '#60A5FA',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                }}
                              >
                                <ExternalLink size={13} /> Open
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workshop Pass QR Modal */}
      {showQrModal && myRegistration && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              borderRadius: '20px',
              background: '#0F172A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.25rem',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34A853',
              }}
            >
              <QrCode size={30} />
            </div>

            <div>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#34A853',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Official Workshop Pass
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC', margin: '0.3rem 0 0 0' }}>
                {workshop.title}
              </h3>
            </div>

            {/* QR Code graphic container */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '14px',
                background: '#FFFFFF',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                  myRegistration.qr_code
                )}`}
                alt="Workshop Registration QR"
                style={{ width: '200px', height: '200px' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#0F172A', fontWeight: 700, letterSpacing: '0.05em' }}>
                {myRegistration.qr_code}
              </span>
            </div>

            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Show this QR code upon arrival at campus venues for quick check-in by chapter organizers.
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

      {/* PDF Document Preview Modal */}
      {previewFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem 2rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={20} style={{ color: 'var(--google-blue)' }} />
              <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '1rem' }}>
                {previewFile.name}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {previewFile.url && (
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#F8FAFC',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
              )}
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                style={{
                  padding: '0.4rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, paddingTop: '1rem' }}>
            <iframe
              src={
                previewFile.url?.includes('drive.google.com')
                  ? previewFile.url.replace('/view', '/preview')
                  : previewFile.url
              }
              title={previewFile.name}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: '#FFFFFF',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
