'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  GraduationCap,
  Building2,
  Calendar,
  Clock,
  Award,
  BookOpen,
  QrCode,
  Pencil,
  Sparkles,
  CheckCircle2,
  Mail,
  Phone,
  MessageCircle,
  Linkedin,
  Facebook,
  Instagram,
  Globe,
  ExternalLink,
  ShieldCheck,
  IdCard,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Download,
} from 'lucide-react';
import { StudentProfile } from '@/types/student';
import { StudentEditProfileModal } from './StudentEditProfileModal';

interface StudentProfileViewClientProps {
  initialData: {
    student: StudentProfile;
    teamRole: string | null;
    faculties: Array<{ id: string; name_ar: string; name_en: string; sort_order?: number }>;
    stats: {
      enrolledCoursesCount: number;
      workshopsCount: number;
      certificatesCount: number;
      attendanceRate: number;
      totalSessionsAttended: number;
    };
    courses: Array<{
      id: string;
      title: string;
      category: string | null;
      status: string;
      enrollmentStatus: string;
      enrolled_at: string;
      sessions_total: number;
      sessions_attended: number;
    }>;
    workshops: Array<{
      id: string;
      title: string;
      category: string | null;
      status: string;
      registered_at: string;
      sessions_count: number;
      sessions_attended: number;
    }>;
    certificates: Array<{
      id: string;
      title: string;
      certificate_number: string;
      verification_code: string;
      issue_date: string;
      pdf_drive_url: string | null;
    }>;
  };
}

export function StudentProfileViewClient({ initialData }: StudentProfileViewClientProps) {
  const [student, setStudent] = useState<StudentProfile>(initialData.student);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'workshops' | 'certificates' | 'qr'>('overview');
  const [copiedCode, setCopiedCode] = useState(false);

  const { teamRole, faculties, stats, courses, workshops, certificates } = initialData;

  const handleCopyQr = () => {
    if (student.qr_code) {
      navigator.clipboard.writeText(student.qr_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleProfileUpdated = (updated: Partial<StudentProfile>) => {
    setStudent((prev) => ({ ...prev, ...updated }));
  };

  // Masked National ID for safe display
  const maskedNationalId = student.national_id
    ? `${student.national_id.slice(0, 3)}•••••••${student.national_id.slice(-4)}`
    : 'Not Registered';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        maxWidth: '1240px',
        margin: '0 auto',
        padding: 'clamp(1.25rem, 2.5vw, 2rem) clamp(1rem, 3vw, 2rem) 4rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. HERO COVER & PROFILE IDENTITY HEADER */}
      {/* ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6)',
        }}
      >
        {/* Top Google 4-Color Accent Strip */}
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Hero Body */}
        <div style={{ padding: '2.5rem 2rem 2rem 2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.75rem',
            }}
          >
            {/* Left: Avatar & Identity Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', minWidth: 0 }}>
              {/* Avatar Box */}
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                    border: '3px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '2.4rem',
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (student.full_name_en || 'S').charAt(0).toUpperCase()
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '-6px',
                    background: '#4285F4',
                    border: '2px solid #0F172A',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  }}
                  title="Edit Avatar & Profile"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Names & University Bio */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      letterSpacing: '-0.5px',
                    }}
                  >
                    {student.full_name_en || 'Student Member'}
                  </h1>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '20px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      background: 'rgba(52, 168, 83, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(52, 168, 83, 0.4)',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Verified Student
                  </span>

                  {teamRole && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        background: 'rgba(66, 133, 244, 0.2)',
                        color: '#60A5FA',
                        border: '1px solid rgba(66, 133, 244, 0.4)',
                      }}
                    >
                      <ShieldCheck size={13} />
                      Chapter {teamRole.toUpperCase()}
                    </span>
                  )}
                </div>

                {student.full_name_ar && (
                  <div style={{ color: '#93C5FD', fontSize: '1rem', fontWeight: 600 }} dir="rtl">
                    {student.full_name_ar}
                  </div>
                )}

                {/* Badges / Academic Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem', fontSize: '0.84rem', color: '#CBD5E1' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={15} style={{ color: '#60A5FA' }} />
                    <span>{student.faculty || 'Faculty of Computers & AI'}</span>
                  </span>

                  <span style={{ color: '#475569' }}>•</span>

                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <GraduationCap size={15} style={{ color: '#34D399' }} />
                    <span>Academic Year {student.academic_year || 1}</span>
                  </span>

                  {student.department_major && (
                    <>
                      <span style={{ color: '#475569' }}>•</span>
                      <span style={{ color: '#FBBF24', fontWeight: 600 }}>{student.department_major}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Action Buttons & QR Pill */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '12px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Pencil size={15} />
                  <span>Edit Profile</span>
                </button>

                <Link
                  href="/student/my-qr"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.15rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <QrCode size={16} style={{ color: '#34D399' }} />
                  <span>My QR Pass</span>
                </Link>
              </div>

              {/* Student Identifier Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <IdCard size={14} style={{ color: '#60A5FA' }} />
                <span>Student ID: <strong style={{ color: '#FFFFFF' }}>{student.qr_code}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyQr}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedCode ? '#34D399' : '#60A5FA',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title="Copy Student ID"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATS OVERVIEW CARDS */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(66, 133, 244, 0.25)',
            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(66, 133, 244, 0.2)',
              color: '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {stats.enrolledCoursesCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              Enrolled Tracks
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(251, 188, 4, 0.25)',
            background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(251, 188, 4, 0.2)',
              color: '#FBBF24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calendar size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {stats.workshopsCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              Workshops & Bootcamps
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(52, 168, 83, 0.25)',
            background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.2)',
              color: '#34D399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {stats.attendanceRate}%
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              Attendance Rate ({stats.totalSessionsAttended} Sessions)
            </div>
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.7) 100%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.2)',
              color: '#C084FC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {stats.certificatesCount}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              Accreditations Earned
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PROFILE WORKSPACE TABS */}
      {/* ========================================================================= */}
      <div
        className="student-scroll-tabs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'overview', label: 'Academic & Profile Details', icon: User, count: undefined },
          { id: 'courses', label: 'My Enrolled Tracks', icon: BookOpen, count: courses.length },
          { id: 'workshops', label: 'Workshops & Events', icon: Calendar, count: workshops.length },
          { id: 'certificates', label: 'Certificates & Accreditations', icon: Award, count: certificates.length },
          { id: 'qr', label: 'Attendance Pass (QR)', icon: QrCode, count: undefined },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '12px',
                border: isActive ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(30, 41, 59, 0.9) 100%)'
                  : 'rgba(255, 255, 255, 0.03)',
                color: isActive ? '#60A5FA' : '#94A3B8',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: isActive ? '#4285F4' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#FFFFFF' : '#CBD5E1',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT 1: ACADEMIC & PROFILE DETAILS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Card 1: Academic Identity */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={20} color="#4285F4" />
                <span>Academic Record</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#60A5FA',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.65rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Pencil size={12} />
                Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#94A3B8' }}>University:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{student.university || 'Helwan National University'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#94A3B8' }}>Faculty / College:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{student.faculty || 'Engineering / Computing'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#94A3B8' }}>Academic Year:</span>
                <span style={{ color: '#34D399', fontWeight: 800 }}>Year {student.academic_year || 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: '#94A3B8' }}>Department / Track:</span>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{student.department_major || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94A3B8' }}>National ID (Encrypted):</span>
                <span style={{ color: '#CBD5E1', fontFamily: 'monospace', fontWeight: 600 }}>{maskedNationalId}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Official Communications */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={20} color="#34A853" />
                <span>Contact Channels</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#60A5FA',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.65rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Pencil size={12} />
                Edit
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                  <Mail size={16} />
                  <span>Student Email:</span>
                </div>
                <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{student.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                  <Phone size={16} />
                  <span>Mobile Phone:</span>
                </div>
                <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{student.phone || 'Not provided'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8' }}>
                  <MessageCircle size={16} style={{ color: '#25D366' }} />
                  <span>WhatsApp Channel:</span>
                </div>
                {student.whatsapp_number ? (
                  <a
                    href={`https://wa.me/2${student.whatsapp_number.replace(/^0/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: '#34D399',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {student.whatsapp_number}
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span style={{ color: '#94A3B8' }}>Not provided</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8' }}>Account Status:</span>
                <span style={{ color: '#34D399', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.78rem' }}>
                  ● Active Scholar
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Certificate Accreditation Identity */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="#FBBC04" />
              <span>Certificate Accreditation Identity</span>
            </h3>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.6 }}>
              These official 4-part names are strictly validated and printed on your Google Developer Groups certificates of completion.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: '#60A5FA', fontWeight: 700 }}>Full English Name (Accredited)</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  {student.full_name_en || 'Ahmed Mohamed Ali Hassan'}
                </div>
              </div>

              <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'right' }} dir="rtl">
                <div style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 700 }}>الاسم الرباعي المعتمد بالشهادات</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  {student.full_name_ar || 'أحمد محمد علي حسن'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Social & Public Links */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="#60A5FA" />
              <span>Social Profiles & Portfolios</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {student.linkedin_url ? (
                <a
                  href={student.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(10, 102, 194, 0.12)',
                    border: '1px solid rgba(10, 102, 194, 0.3)',
                    color: '#93C5FD',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Linkedin size={18} color="#0A66C2" />
                    <span>LinkedIn Profile</span>
                  </div>
                  <ExternalLink size={14} />
                </a>
              ) : (
                <div style={{ fontSize: '0.84rem', color: '#94A3B8' }}>No LinkedIn linked yet.</div>
              )}

              {student.facebook_url && (
                <a
                  href={student.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(24, 119, 242, 0.12)',
                    border: '1px solid rgba(24, 119, 242, 0.3)',
                    color: '#93C5FD',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Facebook size={18} color="#1877F2" />
                    <span>Facebook Profile</span>
                  </div>
                  <ExternalLink size={14} />
                </a>
              )}

              {student.instagram_url && (
                <a
                  href={student.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(228, 64, 95, 0.12)',
                    border: '1px solid rgba(228, 64, 95, 0.3)',
                    color: '#F472B6',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Instagram size={18} color="#E4405F" />
                    <span>Instagram Profile</span>
                  </div>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 2: ENROLLED COURSES */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {courses.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3.5rem 2rem',
                borderRadius: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <BookOpen size={42} style={{ color: '#60A5FA' }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 800 }}>
                No Enrolled Tracks Yet
              </h3>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.9rem', maxWidth: '420px' }}>
                Explore GDGoC technical tracks and courses catalog to apply and start learning.
              </p>
              <Link
                href="/student/courses"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  background: '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                }}
              >
                Browse Course Tracks
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {courses.map((c) => {
                const attRate = c.sessions_total > 0 ? Math.round((c.sessions_attended / c.sessions_total) * 100) : 0;
                return (
                  <div
                    key={c.id}
                    className="glass-panel"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '18px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'rgba(15, 23, 42, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1.25rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: 'rgba(66, 133, 244, 0.18)',
                            color: '#60A5FA',
                          }}
                        >
                          {c.category || 'Track'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            color: c.enrollmentStatus === 'confirmed' ? '#34D399' : '#FBBF24',
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.enrollmentStatus === 'confirmed' ? '✓ Enrolled' : 'Pending Review'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                        {c.title}
                      </h4>

                      {/* Progress Bar */}
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94A3B8', marginBottom: '0.35rem' }}>
                          <span>Attendance Progress</span>
                          <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{c.sessions_attended} / {c.sessions_total} Sessions ({attRate}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${attRate}%`, height: '100%', background: 'linear-gradient(90deg, #4285F4, #34A853)', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/student/courses/${c.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        padding: '0.65rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        color: '#60A5FA',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <span>Open Course Workspace</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 3: WORKSHOPS & BOOTCAMPS */}
      {/* ========================================================================= */}
      {activeTab === 'workshops' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {workshops.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3.5rem 2rem',
                borderRadius: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <Calendar size={42} style={{ color: '#FBBF24' }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 800 }}>
                No Workshops Registered
              </h3>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.9rem', maxWidth: '420px' }}>
                Join upcoming workshops and hands-on bootcamps organized by GDGoC teams.
              </p>
              <Link
                href="/student/workshops"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  marginTop: '0.5rem',
                }}
              >
                Explore Workshops
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {workshops.map((w) => (
                <div
                  key={w.id}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '18px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(251, 188, 4, 0.18)',
                          color: '#FBBF24',
                        }}
                      >
                        {w.category || 'Bootcamp'}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700 }}>
                        ● Confirmed Spot
                      </span>
                    </div>

                    <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {w.title}
                    </h4>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                      Attended: {w.sessions_attended} of {w.sessions_count} sessions
                    </div>
                  </div>

                  <Link
                    href={`/student/workshops/${w.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      padding: '0.65rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(251, 188, 4, 0.15)',
                      border: '1px solid rgba(251, 188, 4, 0.3)',
                      color: '#FBBF24',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Workshop Details</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 4: CERTIFICATES */}
      {/* ========================================================================= */}
      {activeTab === 'certificates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {certificates.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3.5rem 2rem',
                borderRadius: '20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <Award size={42} style={{ color: '#C084FC' }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#FFFFFF', fontWeight: 800 }}>
                No Certificates Earned Yet
              </h3>
              <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.9rem', maxWidth: '420px' }}>
                Complete your course sessions, tasks, and quizzes to earn official verified Google Developer Groups certificates.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    borderRadius: '18px',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: 'rgba(52, 168, 83, 0.2)',
                          color: '#34D399',
                        }}
                      >
                        ✓ Verified Accreditation
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {cert.title}
                    </h4>

                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                      Code: {cert.verification_code}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link
                      href={`/verify/${cert.verification_code}`}
                      target="_blank"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      <ShieldCheck size={14} style={{ color: '#34D399' }} />
                      <span>Verify Online</span>
                    </Link>

                    {cert.pdf_drive_url && (
                      <a
                        href={cert.pdf_drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '10px',
                          background: '#4285F4',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <Download size={14} />
                        <span>PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT 5: QR ATTENDANCE PASS */}
      {/* ========================================================================= */}
      {activeTab === 'qr' && (
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: '24px',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '1.5rem',
            maxWidth: '520px',
            margin: '0 auto',
          }}
        >
          <div>
            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 800,
                background: 'rgba(52, 168, 83, 0.2)',
                color: '#34D399',
              }}
            >
              Permanent Student ID
            </span>
            <h3 style={{ margin: '0.75rem 0 0.25rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
              Digital Attendance Pass
            </h3>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#94A3B8' }}>
              Scan this pass with session organizers to log instant verified attendance.
            </p>
          </div>

          <div
            style={{
              padding: '1.25rem',
              borderRadius: '20px',
              background: '#FFFFFF',
              boxShadow: '0 12px 35px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(student.qr_code)}`}
              alt="Student QR Code Pass"
              style={{ width: '220px', height: '220px', display: 'block' }}
            />
          </div>

          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '1px' }}>
              {student.qr_code}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.2rem' }}>
              {student.full_name_en} • {student.faculty}
            </div>
          </div>

          <Link
            href="/student/my-qr"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: '#34A853',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(52, 168, 83, 0.4)',
            }}
          >
            <QrCode size={18} />
            <span>Open Fullscreen ID Pass Card</span>
          </Link>
        </div>
      )}

      {/* Edit Profile Modal */}
      <StudentEditProfileModal
        student={student}
        faculties={faculties}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}
