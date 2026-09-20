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
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { StudentDashboardData } from '@/types/student';

interface StudentDashboardClientProps {
  initialData: StudentDashboardData;
}

export function StudentDashboardClient({ initialData }: StudentDashboardClientProps) {
  const { student, teamProfile, stats, courses, workshops, tasks, quizzes, attendance, certificates } = initialData;

  const [activeTab, setActiveTab] = useState<'courses' | 'workshops' | 'tasks' | 'quizzes' | 'attendance' | 'certificates'>('courses');
  const [workshopFilter, setWorkshopFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'needs_revision');
  const availableQuizzes = quizzes.filter((q) => q.status === 'available');
  const recentFeedbackList = initialData.recent_feedback || [];

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
        <div
          onClick={() => setActiveTab('attendance')}
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
              Attendance Rate
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FDE047' }}>
              {stats.attendanceRate}%
            </div>
            <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 600 }}>
              ({stats.totalSessionsAttended} / {stats.totalSessionsExpected || stats.totalSessionsAttended} Attended)
            </span>
          </div>
          <div
            style={{
              height: '5px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '-0.2rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${stats.attendanceRate}%`,
                background: 'linear-gradient(90deg, #FBBC04 0%, #34A853 100%)',
                borderRadius: '999px',
              }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748B)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
            <span>View Attendance History</span>
            <ChevronRight size={13} />
          </div>
        </div>

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
      {/* 3.5 ACTIVE ACADEMIC SIGNALS: PENDING TASKS, QUIZZES & RECENT FEEDBACK */}
      {/* ========================================================================= */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              Academic Signals & Active Deliverables
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #94A3B8)', margin: '0.2rem 0 0 0' }}>
              Deadlines, interactive knowledge checks, and instructor evaluations
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {/* Widget 1: Pending Deliverables */}
          <div
            className="glass-panel"
            style={{
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderRadius: '16px',
              border: pendingTasks.some((t) => t.is_due_soon || t.is_overdue)
                ? '1px solid rgba(234, 67, 53, 0.35)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              background: pendingTasks.some((t) => t.is_due_soon || t.is_overdue)
                ? 'radial-gradient(ellipse at top right, rgba(234, 67, 53, 0.08) 0%, rgba(19, 21, 27, 0.8) 70%)'
                : undefined,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(234, 67, 53, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F87171',
                    }}
                  >
                    <CheckSquare size={17} />
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Pending Deliverables
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: pendingTasks.length > 0 ? 'rgba(234, 67, 53, 0.2)' : 'rgba(52, 168, 83, 0.15)',
                    color: pendingTasks.length > 0 ? '#FCA5A5' : '#86EFAC',
                    border: pendingTasks.length > 0 ? '1px solid rgba(234, 67, 53, 0.35)' : '1px solid rgba(52, 168, 83, 0.3)',
                  }}
                >
                  {pendingTasks.length} Due
                </span>
              </div>

              {pendingTasks.length === 0 ? (
                <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={28} color="#34A853" />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                    All Tasks Submitted!
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', maxWidth: '280px' }}>
                    Great momentum. You have completed all assignments assigned by your course instructors.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {pendingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: task.is_overdue
                          ? '1px solid rgba(234, 67, 53, 0.4)'
                          : task.is_due_soon
                          ? '1px solid rgba(251, 188, 4, 0.35)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60A5FA' }}>
                          {task.course_title}
                        </span>
                        {task.is_overdue ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        ) : task.is_due_soon ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={11} /> Due Soon
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #94A3B8)' }}>
                            Due: {task.deadline}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {task.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94A3B8)' }}>
                          Max: {task.max_score} pts • {task.submission_type === 'link' ? 'Link Submission' : 'File Upload'}
                        </span>
                        <Link
                          href={task.course_id ? `/student/courses/${task.course_id}` : '/student/courses'}
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: '#F87171',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Submit</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.55rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #94A3B8)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <span>View All Tasks & History</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Widget 2: Quizzes Available */}
          <div
            className="glass-panel"
            style={{
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderRadius: '16px',
              border: availableQuizzes.length > 0 ? '1px solid rgba(251, 188, 4, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: availableQuizzes.length > 0
                ? 'radial-gradient(ellipse at top right, rgba(251, 188, 4, 0.07) 0%, rgba(19, 21, 27, 0.8) 70%)'
                : undefined,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(251, 188, 4, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FBBF24',
                    }}
                  >
                    <FileText size={17} />
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Quizzes Available
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: availableQuizzes.length > 0 ? 'rgba(251, 188, 4, 0.2)' : 'rgba(52, 168, 83, 0.15)',
                    color: availableQuizzes.length > 0 ? '#FDE047' : '#86EFAC',
                    border: availableQuizzes.length > 0 ? '1px solid rgba(251, 188, 4, 0.35)' : '1px solid rgba(52, 168, 83, 0.3)',
                  }}
                >
                  {availableQuizzes.length} Open
                </span>
              </div>

              {availableQuizzes.length === 0 ? (
                <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={28} color="#FBBC04" />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                    No Pending Quizzes
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', maxWidth: '280px' }}>
                    Check back when instructors publish checkpoint quizzes for upcoming lectures.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {availableQuizzes.slice(0, 3).map((quiz) => (
                    <div
                      key={quiz.id}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(251, 188, 4, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60A5FA' }}>
                          {quiz.course_title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#FBBF24', fontWeight: 700 }}>
                          Pass: {quiz.passing_score_percentage}%
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                        {quiz.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94A3B8)' }}>
                          {quiz.total_questions || 0} Questions • {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} mins` : 'No limit'}
                        </span>
                        <Link
                          href={quiz.course_id ? `/student/courses/${quiz.course_id}/quizzes/${quiz.id}/take` : `/student/courses`}
                          style={{
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: '#FDE047',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                          }}
                        >
                          <span>Take Quiz</span>
                          <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('quizzes')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.55rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #94A3B8)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <span>View Quizzes History</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Widget 3: Recent Mentor Feedback Feed */}
          <div
            className="glass-panel"
            style={{
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderRadius: '16px',
              border: recentFeedbackList.length > 0 ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: recentFeedbackList.length > 0
                ? 'radial-gradient(ellipse at top right, rgba(168, 85, 247, 0.07) 0%, rgba(19, 21, 27, 0.8) 70%)'
                : undefined,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#C084FC',
                    }}
                  >
                    <MessageSquare size={17} />
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Recent Mentor Feedback
                  </h3>
                </div>
                {recentFeedbackList.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: 'rgba(168, 85, 247, 0.2)',
                      color: '#E9D5FF',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                    }}
                  >
                    {recentFeedbackList.length} Graded
                  </span>
                )}
              </div>

              {recentFeedbackList.length === 0 ? (
                <div style={{ padding: '1.5rem 0.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck size={28} color="#C084FC" />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                    No Reviews Yet
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', maxWidth: '280px' }}>
                    Constructive comments and scores from mentors will appear here as submissions are evaluated.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {recentFeedbackList.slice(0, 3).map((fb) => (
                    <div
                      key={fb.id}
                      style={{
                        padding: '0.75rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#C084FC' }}>
                          {fb.task_title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: fb.status === 'needs_revision' ? 'rgba(251, 188, 4, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                            color: fb.status === 'needs_revision' ? '#FBBF24' : '#4ADE80',
                          }}
                        >
                          {fb.score !== null ? `${fb.score} / ${fb.max_score || 10}` : fb.status}
                        </span>
                      </div>

                      {fb.feedback_comment && (
                        <p
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary, #CBD5E1)',
                            fontStyle: 'italic',
                            margin: '0.15rem 0',
                            lineHeight: 1.4,
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            borderLeft: '2.5px solid #A855F7',
                          }}
                        >
                          "{fb.feedback_comment}"
                        </p>
                      )}

                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748B)', marginTop: '0.1rem' }}>
                        Reviewed by {fb.mentor_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.55rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-secondary, #94A3B8)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              <span>Open Deliverables Dashboard</span>
              <ChevronRight size={13} />
            </button>
          </div>
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
                <div style={{ textAlign: 'center', padding: '3.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#60A5FA',
                    }}
                  >
                    <BookOpen size={30} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
                      No Course Enrollments Yet
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '460px', lineHeight: 1.5 }}>
                      Browse open courses offered by chapter technical tracks (Web, Mobile, AI, Cloud, Cybersecurity) to kickstart your learning journey.
                    </p>
                  </div>
                  <Link
                    href="/student/courses"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.4rem',
                      fontSize: '0.9rem',
                      marginTop: '0.5rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Explore All Courses</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                  {courses.map((course) => {
                    const attendancePercent = course.sessions_total > 0
                      ? Math.round((course.sessions_attended / course.sessions_total) * 100)
                      : 0;

                    return (
                      <div
                        key={course.id}
                        className="glass-panel"
                        style={{
                          padding: '1.5rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          borderRadius: '16px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'transform 0.2s ease, border-color 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                          {/* Header: Committee badge + Enrolled status */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#60A5FA',
                                background: 'rgba(66, 133, 244, 0.12)',
                                padding: '0.2rem 0.65rem',
                                borderRadius: '6px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {course.committee_name || 'Technical Track'}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                color: '#34D399',
                                background: 'rgba(16, 185, 129, 0.12)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                              Enrolled
                            </span>
                          </div>

                          {/* Course Title & Description */}
                          <div>
                            <h4 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0', lineHeight: 1.3 }}>
                              {course.title}
                            </h4>
                            {course.description && (
                              <p
                                style={{
                                  fontSize: '0.84rem',
                                  color: 'var(--text-secondary, #94A3B8)',
                                  margin: 0,
                                  lineHeight: 1.45,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {course.description}
                              </p>
                            )}
                          </div>

                          {/* Progress Bar: Attendance */}
                          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginBottom: '0.45rem' }}>
                              <span style={{ fontWeight: 600 }}>Attendance Record</span>
                              <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                                {course.sessions_attended} of {course.sessions_total} sessions ({attendancePercent}%)
                              </span>
                            </div>
                            <div style={{ height: '7px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${attendancePercent}%`,
                                  background: 'linear-gradient(90deg, #4285F4, #34A853)',
                                  borderRadius: '999px',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                          </div>

                          {/* Next Upcoming Session Info Card */}
                          {course.next_session ? (
                            <div
                              style={{
                                background: 'rgba(66, 133, 244, 0.04)',
                                border: '1px solid rgba(66, 133, 244, 0.15)',
                                borderRadius: '10px',
                                padding: '0.85rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.45rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Clock size={12} />
                                  Next Session
                                </span>
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    background: course.next_session.type === 'online' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                                    color: course.next_session.type === 'online' ? '#93C5FD' : '#86EFAC',
                                  }}
                                >
                                  {course.next_session.type === 'online' ? <Video size={11} /> : <MapPin size={11} />}
                                  {course.next_session.type === 'online' ? 'Online Session' : 'In-Person Venue'}
                                </span>
                              </div>

                              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.15rem' }}>
                                {course.next_session.title}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Calendar size={13} color="#60A5FA" />
                                  {new Date(course.next_session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {course.next_session.start_time && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Clock size={13} color="#FBBF24" />
                                    {course.next_session.start_time.slice(0, 5)}
                                    {course.next_session.duration_minutes ? ` (${course.next_session.duration_minutes} mins)` : ''}
                                  </span>
                                )}
                                {course.next_session.venue && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <MapPin size={13} color="#34D399" />
                                    {course.next_session.venue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '10px',
                                padding: '0.75rem 0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.78rem',
                                color: 'var(--text-muted, #64748B)',
                              }}
                            >
                              <CheckCircle2 size={14} color="#34D399" />
                              <span>All scheduled sessions completed or upcoming date TBA</span>
                            </div>
                          )}
                        </div>

                        {/* Action Footer: Link to Course LMS */}
                        <div style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Link
                            href={`/student/courses/${course.id}`}
                            className="btn-primary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '0.7rem 1rem',
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              borderRadius: '8px',
                            }}
                          >
                            <BookOpen size={16} />
                            <span>Open Course LMS</span>
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WORKSHOPS */}
          {activeTab === 'workshops' && (() => {
            const filteredWorkshops = workshops.filter((ws) => {
              if (workshopFilter === 'upcoming') return ws.status === 'upcoming' || ws.status === 'in_progress';
              if (workshopFilter === 'past') return ws.status === 'completed';
              return true;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Sub-filter bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '0.25rem', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <button
                      type="button"
                      onClick={() => setWorkshopFilter('all')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: workshopFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                        color: workshopFilter === 'all' ? '#FFFFFF' : 'var(--text-muted, #94A3B8)',
                        fontWeight: workshopFilter === 'all' ? 700 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      All ({workshops.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkshopFilter('upcoming')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: workshopFilter === 'upcoming' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                        color: workshopFilter === 'upcoming' ? '#60A5FA' : 'var(--text-muted, #94A3B8)',
                        fontWeight: workshopFilter === 'upcoming' ? 700 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Upcoming
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkshopFilter('past')}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: workshopFilter === 'past' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                        color: workshopFilter === 'past' ? '#4ADE80' : 'var(--text-muted, #94A3B8)',
                        fontWeight: workshopFilter === 'past' ? 700 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Past / Completed
                    </button>
                  </div>

                  <Link
                    href="/student/workshops"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--google-blue, #4285F4)',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Explore More Bootcamps <ArrowRight size={14} />
                  </Link>
                </div>

                {filteredWorkshops.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
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
                        No Workshops in this View
                      </h3>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                        Browse upcoming hands-on bootcamps, workshops, and technical deep-dives to claim your seat.
                      </p>
                    </div>
                    <Link
                      href="/student/workshops"
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
                      <span>Explore Bootcamps Catalog</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                    {filteredWorkshops.map((ws) => {
                      const attendancePercent = ws.sessions_count > 0 ? Math.round((ws.sessions_attended / ws.sessions_count) * 100) : 0;
                      return (
                        <div
                          key={ws.id}
                          className="glass-panel"
                          style={{
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.25rem',
                            justifyContent: 'space-between',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Top Header: Badge & Status */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {ws.committee_name && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '0.2rem 0.6rem',
                                      borderRadius: '6px',
                                      background: 'rgba(66, 133, 244, 0.15)',
                                      color: '#93C5FD',
                                    }}
                                  >
                                    {ws.committee_name}
                                  </span>
                                )}
                                {ws.category && (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.6rem',
                                      borderRadius: '6px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      color: 'var(--text-secondary, #CBD5E1)',
                                    }}
                                  >
                                    {ws.category}
                                  </span>
                                )}
                              </div>

                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  padding: '0.2rem 0.6rem',
                                  borderRadius: '6px',
                                  background:
                                    ws.status === 'completed'
                                      ? 'rgba(52, 168, 83, 0.15)'
                                      : ws.status === 'in_progress'
                                      ? 'rgba(251, 188, 4, 0.15)'
                                      : 'rgba(66, 133, 244, 0.15)',
                                  color:
                                    ws.status === 'completed'
                                      ? '#4ADE80'
                                      : ws.status === 'in_progress'
                                      ? '#FBBF24'
                                      : '#60A5FA',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                {ws.status === 'completed' ? 'Completed' : ws.status === 'in_progress' ? 'In Progress' : 'Upcoming'}
                              </span>
                            </div>

                            {/* Title & Description */}
                            <div>
                              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
                                {ws.title}
                              </h4>
                              {ws.description && (
                                <p
                                  style={{
                                    fontSize: '0.84rem',
                                    color: 'var(--text-secondary, #94A3B8)',
                                    marginTop: '0.4rem',
                                    marginBottom: 0,
                                    lineHeight: 1.5,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {ws.description}
                                </p>
                              )}
                            </div>

                            {/* Attendance Progress */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', marginBottom: '0.45rem' }}>
                                <span style={{ fontWeight: 600 }}>Attendance Record</span>
                                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>
                                  {ws.sessions_attended} of {ws.sessions_count} sessions ({attendancePercent}%)
                                </span>
                              </div>
                              <div style={{ height: '7px', width: '100%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${attendancePercent}%`,
                                    background: 'linear-gradient(90deg, #34A853, #4285F4)',
                                    borderRadius: '999px',
                                    transition: 'width 0.4s ease',
                                  }}
                                />
                              </div>
                            </div>

                            {/* Next Upcoming Session or Last Completed */}
                            {ws.next_session ? (
                              <div
                                style={{
                                  background: 'rgba(52, 168, 83, 0.04)',
                                  border: '1px solid rgba(52, 168, 83, 0.2)',
                                  borderRadius: '10px',
                                  padding: '0.85rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.45rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Clock size={12} />
                                    Next Session #{ws.next_session.session_number}
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '0.15rem 0.5rem',
                                      borderRadius: '6px',
                                      background: ws.next_session.type === 'online' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                                      color: ws.next_session.type === 'online' ? '#93C5FD' : '#86EFAC',
                                    }}
                                  >
                                    {ws.next_session.type === 'online' ? <Video size={11} /> : <MapPin size={11} />}
                                    {ws.next_session.type === 'online' ? 'Online Stream' : 'On-Campus'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.15rem' }}>
                                  {ws.next_session.title}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary, #94A3B8)', flexWrap: 'wrap' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Calendar size={13} color="#60A5FA" />
                                    {new Date(ws.next_session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  {ws.next_session.start_time && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <Clock size={13} color="#FBBF24" />
                                      {ws.next_session.start_time.slice(0, 5)}
                                    </span>
                                  )}
                                  {ws.next_session.venue && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <MapPin size={13} color="#34D399" />
                                      {ws.next_session.venue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  background: 'rgba(255, 255, 255, 0.02)',
                                  border: '1px solid rgba(255, 255, 255, 0.05)',
                                  borderRadius: '10px',
                                  padding: '0.75rem 0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted, #64748B)',
                                }}
                              >
                                <CheckCircle2 size={14} color="#34D399" />
                                <span>All workshop sessions completed</span>
                              </div>
                            )}

                            {/* Sessions Attendance Breakdown */}
                            {ws.sessions && ws.sessions.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748B)', textTransform: 'uppercase' }}>
                                  Sessions Attendance Breakdown
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  {ws.sessions.map((s) => (
                                    <span
                                      key={s.id}
                                      style={{
                                        fontSize: '0.72rem',
                                        padding: '0.25rem 0.55rem',
                                        borderRadius: '6px',
                                        background: s.is_attended
                                          ? 'rgba(52, 168, 83, 0.2)'
                                          : 'rgba(255, 255, 255, 0.04)',
                                        border: s.is_attended
                                          ? '1px solid rgba(52, 168, 83, 0.4)'
                                          : '1px solid rgba(255, 255, 255, 0.08)',
                                        color: s.is_attended ? '#4ADE80' : '#94A3B8',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                      }}
                                      title={`Session ${s.session_number}: ${s.title} (${s.is_attended ? 'Attended' : 'Scheduled'})`}
                                    >
                                      {s.is_attended ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                                      S{s.session_number}: {s.is_attended ? 'Present' : 'Upcoming'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Footer */}
                          <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <Link
                              href={`/student/workshops/${ws.id}`}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                color: '#FFFFFF',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                textDecoration: 'none',
                              }}
                            >
                              <span>LMS & Sessions</span>
                              <ChevronRight size={14} />
                            </Link>

                            <Link
                              href={`/student/workshops/${ws.id}/confirmation`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.35rem',
                                padding: '0.65rem 0.85rem',
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                color: '#4ADE80',
                                background: 'rgba(52, 168, 83, 0.15)',
                                border: '1px solid rgba(52, 168, 83, 0.35)',
                                borderRadius: '8px',
                                textDecoration: 'none',
                              }}
                            >
                              <QrCode size={15} />
                              <span>Pass</span>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: TASKS */}
          {activeTab === 'tasks' && (() => {
            const filteredTasks = tasks.filter((t) => {
              if (taskFilter === 'all') return true;
              if (taskFilter === 'pending') return t.status === 'pending' || t.status === 'needs_revision';
              if (taskFilter === 'submitted') return t.status === 'submitted';
              if (taskFilter === 'graded') return t.status === 'graded';
              return true;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Filter Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    {(['all', 'pending', 'submitted', 'graded'] as const).map((filter) => {
                      const isActive = taskFilter === filter;
                      const count =
                        filter === 'all'
                          ? tasks.length
                          : filter === 'pending'
                          ? tasks.filter((t) => t.status === 'pending' || t.status === 'needs_revision').length
                          : filter === 'submitted'
                          ? tasks.filter((t) => t.status === 'submitted').length
                          : tasks.filter((t) => t.status === 'graded').length;

                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setTaskFilter(filter)}
                          style={{
                            padding: '0.4rem 0.85rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isActive ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                            color: isActive ? '#93C5FD' : 'var(--text-muted, #94A3B8)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{filter}</span>
                          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94A3B8)' }}>
                    Total Deliverables: <strong style={{ color: '#FFFFFF' }}>{tasks.length}</strong>
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
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
                      <CheckSquare size={26} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.35rem 0' }}>
                        No Tasks Found in this View
                      </h3>
                      <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                        There are no deliverables currently matching the selected status filter.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="glass-panel"
                        style={{
                          padding: '1.35rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          borderRadius: '14px',
                          border: task.is_overdue
                            ? '1px solid rgba(234, 67, 53, 0.35)'
                            : task.is_due_soon
                            ? '1px solid rgba(251, 188, 4, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                color: '#60A5FA',
                                background: 'rgba(66, 133, 244, 0.12)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: '6px',
                              }}
                            >
                              {task.course_title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.6rem',
                                borderRadius: '999px',
                                background:
                                  task.status === 'graded'
                                    ? 'rgba(52, 168, 83, 0.15)'
                                    : task.status === 'submitted'
                                    ? 'rgba(66, 133, 244, 0.15)'
                                    : task.status === 'needs_revision'
                                    ? 'rgba(251, 188, 4, 0.15)'
                                    : 'rgba(234, 67, 53, 0.15)',
                                color:
                                  task.status === 'graded'
                                    ? '#4ADE80'
                                    : task.status === 'submitted'
                                    ? '#60A5FA'
                                    : task.status === 'needs_revision'
                                    ? '#FBBF24'
                                    : '#FCA5A5',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {task.status === 'needs_revision' ? 'Needs Revision' : task.status}
                            </span>
                          </div>

                          <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.25rem 0' }}>
                              {task.title}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', flexWrap: 'wrap' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Clock size={12} color="#FBBF24" />
                                Deadline: {task.deadline}
                              </span>
                              <span>Max Score: {task.max_score} pts</span>
                            </div>
                          </div>

                          {/* Score and feedback if graded */}
                          {task.score !== null && task.score !== undefined && (
                            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(52, 168, 83, 0.08)', border: '1px solid rgba(52, 168, 83, 0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#4ADE80' }}>
                                <span>Mentor Grade</span>
                                <span>{task.score} / {task.max_score} pts</span>
                              </div>
                              {task.feedback && (
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #CBD5E1)', margin: '0.35rem 0 0 0', fontStyle: 'italic' }}>
                                  "{task.feedback}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <Link
                            href={task.course_id ? `/student/courses/${task.course_id}` : '/student/courses'}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              padding: '0.6rem',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              borderRadius: '8px',
                              textDecoration: 'none',
                              color: task.status === 'pending' || task.status === 'needs_revision' ? '#FFFFFF' : 'var(--text-secondary, #CBD5E1)',
                              background: task.status === 'pending' || task.status === 'needs_revision' ? 'rgba(234, 67, 53, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: task.status === 'pending' || task.status === 'needs_revision' ? '1px solid rgba(234, 67, 53, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <span>{task.status === 'pending' || task.status === 'needs_revision' ? 'Submit Solution' : 'View Assignment & Details'}</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: QUIZZES */}
          {activeTab === 'quizzes' && (
            <div>
              {quizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
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
                      Knowledge assessments and lecture quizzes will appear here when scheduled by instructors.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="glass-panel"
                      style={{
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        borderRadius: '14px',
                        border: quiz.status === 'completed'
                          ? '1px solid rgba(52, 168, 83, 0.3)'
                          : '1px solid rgba(251, 188, 4, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#60A5FA',
                              background: 'rgba(66, 133, 244, 0.12)',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                            }}
                          >
                            {quiz.course_title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: quiz.status === 'completed' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(251, 188, 4, 0.15)',
                              color: quiz.status === 'completed' ? '#4ADE80' : '#FBBF24',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                            }}
                          >
                            {quiz.status === 'completed' ? 'Completed' : 'Available'}
                          </span>
                        </div>

                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.25rem 0' }}>
                            {quiz.title}
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)', flexWrap: 'wrap' }}>
                            <span>{quiz.total_questions || 0} Questions</span>
                            <span>Time: {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : 'Untimed'}</span>
                            <span>Pass Mark: {quiz.passing_score_percentage}%</span>
                          </div>
                        </div>

                        {quiz.score !== null && quiz.score !== undefined && (
                          <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(52, 168, 83, 0.08)', border: '1px solid rgba(52, 168, 83, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary, #CBD5E1)' }}>
                              Latest Score
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#4ADE80' }}>
                                {quiz.score}%
                              </span>
                              {quiz.passed !== null && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '4px',
                                    background: quiz.passed ? 'rgba(52, 168, 83, 0.2)' : 'rgba(234, 67, 53, 0.2)',
                                    color: quiz.passed ? '#86EFAC' : '#FCA5A5',
                                  }}
                                >
                                  {quiz.passed ? 'PASSED' : 'RETRY'}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <Link
                          href={quiz.course_id ? `/student/courses/${quiz.course_id}/quizzes/${quiz.id}/take` : '/student/courses'}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: quiz.status === 'available' ? '#000000' : '#FFFFFF',
                            background: quiz.status === 'available' ? '#FBBF24' : 'rgba(255, 255, 255, 0.06)',
                            border: quiz.status === 'available' ? '1px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <span>{quiz.status === 'available' ? 'Take Quiz Now' : 'Retake or Review'}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATTENDANCE HISTORY */}
          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Tab Header Summary Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Sessions Attended
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#86EFAC', marginTop: '0.2rem' }}>
                    {stats.totalSessionsAttended}
                    <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600, marginLeft: '0.35rem' }}>
                      / {stats.totalSessionsExpected || stats.totalSessionsAttended} Expected
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Attendance Rate
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FDE047', marginTop: '0.2rem' }}>
                    {stats.attendanceRate}%
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <Link
                    href="/student/my-qr"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.6rem 1.1rem',
                      borderRadius: '8px',
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      color: '#93C5FD',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Open Attendance Pass</span>
                  </Link>
                </div>
              </div>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {attendance.map((att) => (
                    <div
                      key={att.id}
                      className="glass-panel"
                      style={{
                        padding: '1rem 1.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'rgba(52, 168, 83, 0.15)',
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34A853',
                            flexShrink: 0,
                          }}
                        >
                          <CheckCircle2 size={20} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: att.type === 'course' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                                color: att.type === 'course' ? '#93C5FD' : '#FCA5A5',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {att.type === 'course' ? 'Course Track' : 'Workshop'}
                            </span>
                            <span style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF' }}>
                              {att.event_title}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginTop: '0.2rem', fontWeight: 600 }}>
                            {att.session_title}
                            {att.venue ? ` • ${att.venue}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {new Date(att.scanned_at || att.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          at{' '}
                          {new Date(att.scanned_at || att.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.35rem',
                              borderRadius: '3px',
                              background: att.method === 'qr' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                              color: att.method === 'qr' ? '#60A5FA' : '#CBD5E1',
                              textTransform: 'uppercase',
                            }}
                          >
                            {att.method === 'qr' ? 'QR Code Pass' : 'Manual Entry'}
                          </span>
                          {att.checked_in_by_name && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748B)' }}>
                              by {att.checked_in_by_name}
                            </span>
                          )}
                        </div>
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
