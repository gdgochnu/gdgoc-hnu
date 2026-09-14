'use client';

import React, { useState } from 'react';
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
  CheckSquare,
  Users,
  MapPin,
  Video,
  FileText,
  UserCheck,
  ArrowRight,
  Download,
} from 'lucide-react';
import { StudentDashboardData } from '@/types/student';

interface StudentDashboardClientProps {
  initialData: StudentDashboardData;
}

export function StudentDashboardClient({ initialData }: StudentDashboardClientProps) {
  const { student, teamProfile, stats, courses, workshops, tasks, quizzes, attendance, certificates } = initialData;

  const [activeTab, setActiveTab] = useState<'courses' | 'workshops' | 'tasks' | 'quizzes' | 'attendance' | 'certificates'>('courses');

  const getYearLabel = (year: number | null) => {
    if (!year) return 'Student Member';
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
        padding: '2.5rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. WELCOME HEADER (MATCHES TEAM DASHBOARD EXACTLY) */}
      {/* ========================================================================= */}
      <div
        className="glass-panel"
        style={{
          padding: '2.25rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: teamProfile
            ? 'radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.12) 0%, rgba(66, 133, 244, 0.08) 50%, var(--surface-primary, #13151b) 100%)'
            : 'radial-gradient(ellipse at top left, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.06) 50%, var(--surface-primary, #13151b) 100%)',
          border: teamProfile ? '1px solid rgba(16, 185, 129, 0.35)' : undefined,
        }}
      >
        {/* Top Google 4-Color Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            {/* Avatar */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: teamProfile
                  ? 'linear-gradient(135deg, #10B981, #4285F4)'
                  : 'linear-gradient(135deg, rgba(66, 133, 244, 0.4), rgba(52, 168, 83, 0.4))',
                border: teamProfile ? '2.5px solid #10B981' : '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: teamProfile ? '0 0 16px rgba(16, 185, 129, 0.35)' : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {student.avatar_url ? (
                <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (student.full_name_en || 'S').charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
                  Welcome, {student.full_name_en || 'Student'}!
                </h1>

                {/* Status Badges */}
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 168, 83, 0.2)',
                    color: '#86EFAC',
                    border: '1px solid rgba(52, 168, 83, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Active Student
                </span>

                {teamProfile && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(66, 133, 244, 0.25))',
                      color: '#6EE7B7',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    👑 Chapter Team Member
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.92rem', marginTop: '0.35rem', marginBottom: 0 }}>
                {student.faculty ? (
                  <span>
                    <strong>{student.faculty}</strong> • {student.university} • {getYearLabel(student.academic_year)}
                  </span>
                ) : (
                  <span>Helwan National University • Student Operating Space</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              href="/student/my-qr"
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <QrCode size={16} />
              <span>View Attendance Pass</span>
              <ChevronRight size={16} />
            </Link>

            {teamProfile && (
              <Link
                href="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34D399',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                <ShieldCheck size={16} />
                <span>Switch to Chapter OS</span>
                <ExternalLink size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. METRIC CARDS (MATCHES TEAM DASHBOARD KPI GRID) */}
      {/* ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Enrolled Courses */}
        <div
          onClick={() => setActiveTab('courses')}
          className="glass-panel"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
              Enrolled Courses
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BookOpen size={20} color="var(--google-blue, #4285F4)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#93C5FD' }}>
            {stats.enrolledCoursesCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Active learning curricula</span>
            <ChevronRight size={13} />
          </div>
        </div>

        {/* Card 2: Workshops */}
        <div
          onClick={() => setActiveTab('workshops')}
          className="glass-panel"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
              Workshops & Bootcamps
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} color="var(--google-green, #34A853)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#86EFAC' }}>
            {stats.workshopsCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Hands-on intensive sessions</span>
            <ChevronRight size={13} />
          </div>
        </div>

        {/* Card 3: Attendance Summary */}
        <Link href="/student/my-qr" style={{ textDecoration: 'none' }}>
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              height: '100%',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
                Attendance Sessions
              </span>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(251, 188, 4, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserCheck size={20} color="var(--google-yellow, #FBBC04)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FDE047' }}>
              {stats.totalSessionsAttended}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Scanned via permanent QR</span>
              <ChevronRight size={13} />
            </div>
          </div>
        </Link>

        {/* Card 4: Deliverables & Tasks */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="glass-panel"
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            height: '100%',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
              Tasks & Deliverables
            </span>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckSquare size={20} color="var(--google-red, #EA4335)" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FCA5A5' }}>
            {stats.pendingTasksCount} Pending
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Review assignments & scores</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. STUDENT WORKSPACES & TOOLS (MATCHES LAUNCHPAD ON TEAM DASHBOARD) */}
      {/* ========================================================================= */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
          Learning Workspaces & Tools
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Tool 1: Permanent Attendance Pass */}
          <Link
            href="/student/my-qr"
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              textDecoration: 'none',
              color: 'inherit',
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
                flexShrink: 0,
              }}
            >
              <QrCode size={22} color="var(--google-blue, #4285F4)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#FFFFFF' }}>
                My Attendance Pass
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginTop: '0.15rem' }}>
                Digital pass for HR event scanning
              </div>
            </div>
          </Link>

          {/* Tool 2: Tracks & Syllabus */}
          <Link
            href="/student#tracks"
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              textDecoration: 'none',
              color: 'inherit',
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
                flexShrink: 0,
              }}
            >
              <BookOpen size={22} color="var(--google-green, #34A853)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#FFFFFF' }}>
                Curriculum & Tracks
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginTop: '0.15rem' }}>
                Browse Web, Mobile, AI/ML, Cloud
              </div>
            </div>
          </Link>

          {/* Tool 3: Certificates */}
          <div
            onClick={() => setActiveTab('certificates')}
            className="glass-panel"
            style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
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
                flexShrink: 0,
              }}
            >
              <Award size={22} color="var(--google-yellow, #FBBC04)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#FFFFFF' }}>
                Verified Certificates
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginTop: '0.15rem' }}>
                President-approved completion credentials
              </div>
            </div>
          </div>

          {/* Tool 4: Dual-Role OS Link (if team member) */}
          {teamProfile && (
            <Link
              href="/dashboard"
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={22} color="#34D399" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#FFFFFF' }}>
                  Chapter Operations OS
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginTop: '0.15rem' }}>
                  Committee tasks, meetings & reviews
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACADEMIC HUB & ACTIVITY TABS */}
      {/* ========================================================================= */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Tab Headers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.75rem',
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
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                  border: isActive ? '1px solid rgba(66, 133, 244, 0.35)' : '1px solid transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary, #94A3B8)',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
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
                      borderRadius: '999px',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div>
          {/* TAB 1: COURSES */}
          {activeTab === 'courses' && (
            <div>
              {courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <BookOpen size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                      No Course Enrollments Yet
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      Browse track offerings by chapter committees (Web, Mobile, AI, Cloud, Cybersecurity) to register for upcoming courses.
                    </p>
                  </div>
                  <Link
                    href="/student#tracks"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.86rem',
                      marginTop: '0.5rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Browse Curriculum Tracks</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="glass-panel"
                      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 700, textTransform: 'uppercase' }}>
                          {course.committee_name || 'Technical Track'}
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0.25rem 0 0.5rem 0' }}>
                          {course.title}
                        </h4>
                        {course.description && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, lineHeight: 1.4 }}>
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted, #64748B)', marginBottom: '0.35rem' }}>
                          <span>Attendance Progress</span>
                          <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                            {course.sessions_attended} / {course.sessions_total} sessions
                          </span>
                        </div>
                        <div style={{ height: '6px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${course.sessions_total > 0 ? (course.sessions_attended / course.sessions_total) * 100 : 0}%`,
                              background: '#3B82F6',
                              borderRadius: '999px',
                            }}
                          />
                        </div>
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
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(52, 168, 83, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34D399',
                    }}
                  >
                    <Calendar size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                      No Registered Workshops
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      Intensive weekend bootcamps and specialized workshops will appear here once announced.
                    </p>
                  </div>
                  <Link
                    href="/student#how-it-works"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.86rem',
                      marginTop: '0.5rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Workshop Overview</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {workshops.map((ws) => (
                    <div key={ws.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 700 }}>{ws.status}</div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0.4rem 0' }}>
                        {ws.title}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                        Attended: {ws.sessions_attended} / {ws.sessions_count} sessions
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
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(168, 85, 247, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C084FC',
                    }}
                  >
                    <FileCheck size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                      No Pending Deliverables
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      When course instructors assign practical exercises or projects, they will be listed here for submission and mentor feedback.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="glass-panel"
                      style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 700 }}>{task.course_title}</div>
                        <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0' }}>{task.title}</h4>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>Deadline: {task.deadline}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '999px',
                          background: 'rgba(251, 188, 4, 0.15)',
                          color: '#FBBF24',
                          textTransform: 'uppercase',
                        }}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(251, 188, 4, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FBBF24',
                }}
              >
                <FileText size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                  No Active Quizzes
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                  Knowledge assessments will appear here when scheduled by instructors.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: ATTENDANCE HISTORY */}
          {activeTab === 'attendance' && (
            <div>
              {attendance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <UserCheck size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                      No Attendance Check-Ins Yet
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      When you attend campus sessions, have an HR officer or Mentor scan your permanent QR pass ({student.qr_code}) to log your arrival.
                    </p>
                  </div>
                  <Link
                    href="/student/my-qr"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.65rem 1.25rem',
                      fontSize: '0.86rem',
                      marginTop: '0.5rem',
                      textDecoration: 'none',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Open Attendance Pass</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {attendance.map((att) => (
                    <div
                      key={att.id}
                      className="glass-panel"
                      style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckCircle2 size={18} color="#34D399" />
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>{att.event_title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)' }}>{att.session_title}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)' }}>
                        {att.date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CERTIFICATES */}
          {activeTab === 'certificates' && (
            <div>
              {certificates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '14px',
                      background: 'rgba(234, 67, 53, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F87171',
                    }}
                  >
                    <Award size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                      No Certificates Earned Yet
                    </h3>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                      Official credentials are issued automatically upon meeting attendance criteria (≥75%) and deliverable completion approved by the Chapter President.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="glass-panel"
                      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
                    >
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Award size={14} />
                          <span>Official Chapter Certificate</span>
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0.35rem 0 0.2rem 0' }}>
                          {cert.title}
                        </h4>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #64748B)', fontFamily: 'monospace' }}>
                          Cert #{cert.certificate_number}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Link
                          href={`/verify/${cert.verification_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{
                            padding: '0.45rem 0.85rem',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textDecoration: 'none',
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>Verify</span>
                        </Link>
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
