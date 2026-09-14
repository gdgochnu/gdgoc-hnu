'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  QrCode,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  Copy,
  Check,
  Sparkles,
  MapPin,
  Video,
  FileText,
  UserCheck,
  ArrowRight,
  Download,
} from 'lucide-react';
import { StudentDashboardData } from '@/types/student';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';
import QRCode from 'qrcode';

interface StudentDashboardClientProps {
  initialData: StudentDashboardData;
}

export function StudentDashboardClient({ initialData }: StudentDashboardClientProps) {
  const { student, teamProfile, stats, courses, workshops, tasks, quizzes, attendance, certificates } = initialData;

  const [activeTab, setActiveTab] = useState<'courses' | 'workshops' | 'tasks' | 'quizzes' | 'attendance' | 'certificates'>('courses');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedQr, setCopiedQr] = useState(false);

  // Generate QR data url
  useEffect(() => {
    if (!student?.qr_code) return;
    let isMounted = true;

    generateStyledQRDataURL(student.qr_code, 220)
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        QRCode.toDataURL(student.qr_code, { width: 220, margin: 2 })
          .then((url) => {
            if (isMounted) setQrDataUrl(url);
          })
          .catch((err) => console.error('QR generation fallback error:', err));
      });

    return () => {
      isMounted = false;
    };
  }, [student?.qr_code]);

  const handleCopyQr = () => {
    if (!student?.qr_code) return;
    navigator.clipboard.writeText(student.qr_code);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  const getYearLabel = (year: number | null) => {
    if (!year) return 'Student';
    switch (year) {
      case 1:
        return '1st Year Student';
      case 2:
        return '2nd Year Student';
      case 3:
        return '3rd Year Student';
      case 4:
        return '4th Year Student';
      case 5:
        return '5th Year Student';
      default:
        return `Year ${year} Student`;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#F8FAFC',
        fontFamily: 'var(--font-inter, sans-serif)',
        paddingBottom: '5rem',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Dual-Role Chapter Member Notice Banner */}
        {teamProfile && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34D399',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Dual-Role Active: GDGoC Chapter Team Member</span>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#6EE7B7',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {teamProfile.role.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                  {teamProfile.department?.name ? `${teamProfile.department.name} — ` : ''}
                  Your chapter profile is linked. You can attend educational tracks as a student while managing chapter operations.
                </div>
              </div>
            </div>

            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 1rem',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                fontSize: '0.84rem',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Go to Chapter OS</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        )}

        {/* Top Profile Hero & Permanent QR Widget Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'stretch',
          }}
        >
          {/* Profile Overview Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1.5rem',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div>
              {/* Profile Top Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt={student.full_name_en || 'Student'}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '18px',
                        objectFit: 'cover',
                        border: '2px solid rgba(66, 133, 244, 0.5)',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '18px',
                        background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        border: '2px solid rgba(66, 133, 244, 0.5)',
                      }}
                    >
                      {(student.full_name_en || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
                        {student.full_name_en || 'Student Member'}
                      </h1>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(52, 168, 83, 0.15)',
                          color: '#34D399',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '9999px',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                        <span>Active Student</span>
                      </div>
                    </div>
                    {student.full_name_ar && (
                      <div style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                        {student.full_name_ar}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Academic & Contact Details */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.85rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    University & Faculty
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#E2E8F0', fontWeight: 600, marginTop: '0.2rem' }}>
                    {student.faculty || 'Unspecified Faculty'}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                    {student.university}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Academic Level
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#E2E8F0', fontWeight: 600, marginTop: '0.2rem' }}>
                    {getYearLabel(student.academic_year)}
                  </div>
                  {student.department_major && (
                    <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                      {student.department_major}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    Official Email
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#E2E8F0', fontWeight: 600, marginTop: '0.2rem', wordBreak: 'break-all' }}>
                    {student.email}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                    WhatsApp / Phone
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#E2E8F0', fontWeight: 600, marginTop: '0.2rem' }}>
                    {student.whatsapp_number || student.phone || '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Permanent ID: <span style={{ color: '#94A3B8', fontFamily: 'monospace', fontWeight: 700 }}>{student.qr_code}</span>
              </div>
              <Link
                href="/student/onboarding"
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#60A5FA',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>Edit Profile Info</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Quick Permanent QR Pass Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(66, 133, 244, 0.25)',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top decorative gradient glow */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
              }}
            />

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <QrCode size={18} color="#60A5FA" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Permanent Student QR Pass
                </span>
              </div>

              {/* QR Image Container */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '160px',
                  height: '160px',
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Student QR ${student.qr_code}`}
                    style={{ width: '144px', height: '144px', display: 'block' }}
                  />
                ) : (
                  <div style={{ color: '#0F172A', fontSize: '0.8rem', fontWeight: 600 }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* QR Code String with Copy button */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.4rem 0.8rem',
                  marginBottom: '0.85rem',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#60A5FA', letterSpacing: '0.05em' }}>
                  {student.qr_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyQr}
                  title="Copy QR Code"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedQr ? '#34D399' : '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                >
                  {copiedQr ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>

              <p style={{ fontSize: '0.76rem', color: '#94A3B8', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                Present this single permanent QR code at the door of any offline session or workshop for instant attendance check-in.
              </p>
            </div>

            {/* Link to Full Pass Page */}
            <Link
              href="/student/my-qr"
              style={{
                marginTop: '1.25rem',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>View & Download Digital Pass</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Stats Summary Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Card 1: Courses */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
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
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.enrolledCoursesCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                Enrolled Courses
              </div>
            </div>
          </div>

          {/* Card 2: Workshops */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(52, 168, 83, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.workshopsCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                Workshops
              </div>
            </div>
          </div>

          {/* Card 3: Attendance */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(251, 188, 4, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
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
                background: 'rgba(251, 188, 4, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.totalSessionsAttended}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                Sessions Attended
              </div>
            </div>
          </div>

          {/* Card 4: Tasks */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
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
                background: 'rgba(168, 85, 247, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#C084FC',
              }}
            >
              <FileCheck size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.pendingTasksCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                Pending Tasks
              </div>
            </div>
          </div>

          {/* Card 5: Certificates */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(234, 67, 53, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
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
                background: 'rgba(234, 67, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171',
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1 }}>
                {stats.certificatesCount}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                Earned Certificates
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.5rem',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'courses', label: 'My Courses', count: courses.length },
            { id: 'workshops', label: 'My Workshops', count: workshops.length },
            { id: 'tasks', label: 'Tasks & Deliverables', count: tasks.length },
            { id: 'quizzes', label: 'Quizzes', count: quizzes.length },
            { id: 'attendance', label: 'Attendance History', count: attendance.length },
            { id: 'certificates', label: 'Certificates', count: certificates.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.1rem',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(66, 133, 244, 0.35)' : '1px solid transparent',
                  color: isActive ? '#60A5FA' : '#94A3B8',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      background: isActive ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '9999px',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div style={{ minHeight: '320px' }}>
          {/* TAB 1: COURSES */}
          {activeTab === 'courses' && (
            <div>
              {courses.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <BookOpen size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Course Enrollments Yet
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      Explore chapter tracks designed by our specialized committees (Web, Mobile, AI/ML, Cloud, Cyber, Core Tech).
                    </p>
                  </div>
                  <Link
                    href="/student#tracks"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.3rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      marginTop: '0.5rem',
                      boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                    }}
                  >
                    <span>Browse Tracks & Curriculum</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.76rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                          {course.committee_name || 'Technical Track'}
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0.25rem 0 0.5rem 0' }}>
                          {course.title}
                        </h4>
                        {course.description && (
                          <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div>
                        {/* Attendance progress */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          <span>Attendance Progress</span>
                          <span style={{ fontWeight: 700, color: '#E2E8F0' }}>
                            {course.sessions_attended} / {course.sessions_total} sessions
                          </span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${course.sessions_total > 0 ? (course.sessions_attended / course.sessions_total) * 100 : 0}%`,
                              background: '#3B82F6',
                              borderRadius: '9999px',
                            }}
                          />
                        </div>

                        {course.next_session && (
                          <div
                            style={{
                              marginTop: '0.85rem',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '8px',
                              background: 'rgba(30, 41, 59, 0.6)',
                              fontSize: '0.78rem',
                              color: '#CBD5E1',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            {course.next_session.type === 'online' ? <Video size={14} color="#F87171" /> : <MapPin size={14} color="#34D399" />}
                            <span>Next: {course.next_session.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORKSHOPS */}
          {activeTab === 'workshops' && (
            <div>
              {workshops.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(52, 168, 83, 0.12)',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34D399',
                    }}
                  >
                    <Calendar size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Registered Workshops
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      Multi-session bootcamps and intensive technical workshops will be announced throughout the academic semester.
                    </p>
                  </div>
                  <Link
                    href="/student"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.3rem',
                      borderRadius: '12px',
                      background: 'rgba(52, 168, 83, 0.2)',
                      border: '1px solid rgba(52, 168, 83, 0.4)',
                      color: '#34D399',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      marginTop: '0.5rem',
                    }}
                  >
                    <span>Explore Workshop Schedule</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {workshops.map((ws) => (
                    <div
                      key={ws.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: ws.status === 'upcoming' ? '#60A5FA' : '#94A3B8',
                              textTransform: 'uppercase',
                            }}
                          >
                            {ws.status}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>{ws.date}</span>
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0.5rem 0' }}>
                          {ws.title}
                        </h4>
                        {ws.venue && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                            <MapPin size={14} color="#34D399" />
                            <span>{ws.venue}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#CBD5E1' }}>
                        Sessions Attended: {ws.sessions_attended} / {ws.sessions_count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TASKS */}
          {activeTab === 'tasks' && (
            <div>
              {tasks.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C084FC',
                    }}
                  >
                    <FileCheck size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Pending Deliverables
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      When course instructors assign practical exercises, coding tasks, or capstone projects, they will show up here for submission and mentor feedback.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 700 }}>
                          {task.course_title}
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0' }}>
                          {task.title}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                          Deadline: {task.deadline}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span
                          style={{
                            padding: '0.3rem 0.7rem',
                            borderRadius: '9999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background:
                              task.status === 'graded'
                                ? 'rgba(52, 168, 83, 0.15)'
                                : task.status === 'submitted'
                                ? 'rgba(66, 133, 244, 0.15)'
                                : 'rgba(251, 188, 4, 0.15)',
                            color:
                              task.status === 'graded'
                                ? '#34D399'
                                : task.status === 'submitted'
                                ? '#60A5FA'
                                : '#FBBF24',
                            textTransform: 'uppercase',
                          }}
                        >
                          {task.status}
                        </span>
                        {task.score !== null && task.score !== undefined && (
                          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#FFFFFF' }}>
                            {task.score} / {task.max_score || 100}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div>
              {quizzes.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(251, 188, 4, 0.12)',
                      border: '1px solid rgba(251, 188, 4, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FBBF24',
                    }}
                  >
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Active Quizzes
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      Automated concept checks and module assessments will appear here once published by course instructors.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '1.25rem',
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: '#FBBF24', fontWeight: 700 }}>
                        {quiz.course_title}
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', margin: '0.3rem 0' }}>
                        {quiz.title}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                        Status: <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{quiz.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATTENDANCE HISTORY */}
          {activeTab === 'attendance' && (
            <div>
              {attendance.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <UserCheck size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Check-In Records Yet
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      When you attend campus sessions, have an HR officer or Mentor scan your permanent QR pass ({student.qr_code}) to log your check-in.
                    </p>
                  </div>
                  <Link
                    href="/student/my-qr"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.3rem',
                      borderRadius: '12px',
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      color: '#60A5FA',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      marginTop: '0.5rem',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Open My Permanent QR Pass</span>
                  </Link>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      Session Check-In History
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {attendance.map((att) => (
                      <div
                        key={att.id}
                        style={{
                          padding: '1rem 1.5rem',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <CheckCircle2 size={18} color="#34D399" />
                          <div>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {att.event_title}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                              {att.session_title}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.82rem', color: '#E2E8F0', fontWeight: 600 }}>
                            {att.date}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {att.scanned_at ? new Date(att.scanned_at).toLocaleTimeString() : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              {certificates.length === 0 ? (
                <div
                  style={{
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    borderRadius: '20px',
                    padding: '3.5rem 2rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      background: 'rgba(234, 67, 53, 0.12)',
                      border: '1px solid rgba(234, 67, 53, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F87171',
                    }}
                  >
                    <Award size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Certificates Earned Yet
                    </h3>
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
                      Official chapter certificates are President-gated and issued automatically upon meeting attendance criteria (≥75%) and passing course assessments.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(234, 67, 53, 0.25)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F87171', fontSize: '0.76rem', fontWeight: 700 }}>
                          <Award size={16} />
                          <span>Official Chapter Certificate</span>
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: '0.4rem 0 0.2rem 0' }}>
                          {cert.title}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                          Cert #{cert.certificate_number}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '0.2rem' }}>
                          Issued on {cert.issue_date}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Link
                          href={`/verify/${cert.verification_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.55rem 0.9rem',
                            borderRadius: '8px',
                            background: 'rgba(66, 133, 244, 0.15)',
                            color: '#60A5FA',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>Verify</span>
                        </Link>
                        {cert.pdf_drive_url && (
                          <a
                            href={cert.pdf_drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.55rem 0.9rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: '#E2E8F0',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                            }}
                          >
                            <Download size={14} />
                            <span>Download PDF</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
