'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sparkles,
  MapPin,
  Video,
  Play,
  ExternalLink,
  FileText,
  ShieldCheck,
  GraduationCap,
  Download,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';
import { CourseDetailResult, enrollInCourse } from '@/app/student/courses/actions';

interface StudentCourseDetailClientProps {
  initialData: CourseDetailResult;
}

function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/i
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
}

export function StudentCourseDetailClient({ initialData }: StudentCourseDetailClientProps) {
  const router = useRouter();
  const {
    course,
    instructors,
    sessions,
    myEnrollment: initialMyEnrollment,
    canEnroll: initialCanEnroll,
    needsOnboarding,
    isAuthenticated,
  } = initialData;

  const [myEnrollment, setMyEnrollment] = useState(initialMyEnrollment);
  const [canEnroll, setCanEnroll] = useState(initialCanEnroll);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    sessions.length > 0 ? sessions[0].id : null
  );

  const totalHours = Math.round((course.total_duration_minutes || 120) / 60);
  const onlineSessionsCount = sessions.filter((s) => s.type === 'online').length;
  const offlineSessionsCount = sessions.filter((s) => s.type === 'offline').length;

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/student?signin=true&returnUrl=/student/courses/${course.id}`);
      return;
    }

    if (needsOnboarding) {
      router.push('/student/onboarding');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionMessage(null);

      const res = await enrollInCourse(course.id);
      if (!res.success || !res.status) {
        setActionMessage({ type: 'error', text: res.error || 'Failed to complete enrollment.' });
        return;
      }

      setMyEnrollment({
        status: res.status,
        enrolled_at: new Date().toISOString(),
        confirmed_at: res.status === 'confirmed' ? new Date().toISOString() : null,
      });
      setCanEnroll(false);
      setActionMessage({ type: 'success', text: res.message || 'Enrollment processed successfully!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmed = myEnrollment?.status === 'confirmed';
  const isPending = myEnrollment?.status === 'pending';
  const isWaitlisted = myEnrollment?.status === 'waitlisted';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
        <Link
          href="/student/courses"
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
          Back to Courses
        </Link>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#94A3B8' }}>{course.category || 'Track'}</span>
        <span style={{ color: '#475569' }}>/</span>
        <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{course.title}</span>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background:
              actionMessage.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: actionMessage.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {actionMessage.text}
        </div>
      )}

      {/* Course Hero & Overview Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '850px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {course.category && (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  background: 'rgba(66, 133, 244, 0.2)',
                  color: '#60A5FA',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                }}
              >
                {course.category}
              </span>
            )}

            {course.department_name && (
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {course.department_name} ({course.department_code})
              </span>
            )}

            <span
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: 700,
                background:
                  course.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.18)' : 'rgba(251, 188, 4, 0.18)',
                color: course.enrollment_type === 'open' ? '#34D399' : '#FBBF24',
                border: `1px solid ${course.enrollment_type === 'open' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(251, 188, 4, 0.35)'}`,
              }}
            >
              {course.enrollment_type === 'open' ? 'Open Enrollment' : 'Gated Application'}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.9rem, 3.5vw, 2.7rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
            }}
          >
            {course.title}
          </h1>

          <p style={{ color: '#CBD5E1', fontSize: '1rem', lineHeight: 1.65, margin: 0 }}>
            {course.description ||
              'A structured learning journey developed by GDGoC technical teams to build industry-level technical competencies through interactive sessions and practical milestones.'}
          </p>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.75rem',
              flexWrap: 'wrap',
              paddingTop: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} style={{ color: '#60A5FA' }} />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {sessions.length} Sessions
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {onlineSessionsCount} Online • {offlineSessionsCount} In-Person
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: '#34D399' }} />
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                  ~{totalHours} Total Hours
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Hands-on instruction</div>
              </div>
            </div>

            {course.capacity && (
              <>
                <div style={{ width: '1px', height: '28px', background: 'rgba(255, 255, 255, 0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={18} style={{ color: '#FBBF24' }} />
                  <div>
                    <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {course.enrollment_count} / {course.capacity} Enrolled
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                      {course.is_full ? 'Capacity reached' : 'Spots available'}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Syllabus (Left 65%) + Enrollment & Staff (Right 35%) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* LEFT COLUMN: Curriculum Syllabus & Session Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#FFFFFF',
                margin: '0 0 0.4rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <BookOpen size={20} style={{ color: '#4285F4' }} />
              Course Syllabus & Sessions ({sessions.length})
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0 }}>
              Step-by-step curriculum schedule. Online sessions feature embedded video recordings, and offline
              sessions specify meeting venues.
            </p>
          </div>

          {sessions.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                borderRadius: '16px',
                color: '#94A3B8',
                fontSize: '0.9rem',
              }}
            >
              Sessions for this course will be scheduled shortly by the instructor.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {sessions.map((session) => {
                const isOnline = session.type === 'online';
                const youtubeEmbedUrl = isOnline ? getYouTubeEmbedUrl(session.youtube_url) : null;
                const isCompleted = session.status === 'completed';

                return (
                  <div
                    key={session.id}
                    className="glass-panel"
                    style={{
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      overflow: 'hidden',
                      background: 'rgba(15, 23, 42, 0.55)',
                    }}
                  >
                    {/* Session Header Bar */}
                    <div
                      style={{
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isOnline ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                            border: `1px solid ${isOnline ? 'rgba(234, 67, 53, 0.35)' : 'rgba(66, 133, 244, 0.35)'}`,
                            color: isOnline ? '#EA4335' : '#60A5FA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                          }}
                        >
                          #{session.session_number}
                        </div>

                        <div>
                          <h3
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: '#FFFFFF',
                              margin: 0,
                            }}
                          >
                            {session.title}
                          </h3>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={13} />
                              {new Date(session.session_date).toLocaleDateString(undefined, {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>

                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={13} />
                              {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                            </span>

                            {session.duration_minutes && (
                              <span
                                style={{
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#CBD5E1',
                                }}
                              >
                                {Math.floor(session.duration_minutes / 60)}h{' '}
                                {session.duration_minutes % 60 > 0 ? `${session.duration_minutes % 60}m` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Type & Status Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: isOnline ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                            color: isOnline ? '#F87171' : '#60A5FA',
                            border: `1px solid ${isOnline ? 'rgba(234, 67, 53, 0.3)' : 'rgba(66, 133, 244, 0.3)'}`,
                          }}
                        >
                          {isOnline ? <Video size={13} /> : <MapPin size={13} />}
                          {isOnline ? 'Online (YouTube)' : 'In-Person'}
                        </span>

                        {isCompleted && (
                          <span
                            style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '8px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              background: 'rgba(52, 168, 83, 0.15)',
                              color: '#34D399',
                              border: '1px solid rgba(52, 168, 83, 0.3)',
                            }}
                          >
                            Completed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Session Details Body */}
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {session.description && (
                        <p style={{ color: '#CBD5E1', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                          {session.description}
                        </p>
                      )}

                      {/* In-Person Venue Info */}
                      {!isOnline && session.venue && (
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '10px',
                            background: 'rgba(66, 133, 244, 0.08)',
                            border: '1px solid rgba(66, 133, 244, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            fontSize: '0.85rem',
                            color: '#CBD5E1',
                          }}
                        >
                          <MapPin size={16} style={{ color: '#60A5FA', flexShrink: 0 }} />
                          <div>
                            <span style={{ color: '#94A3B8', fontWeight: 600 }}>Venue: </span>
                            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{session.venue}</span>
                          </div>
                        </div>
                      )}

                      {/* YouTube Video Player Embed for Online Sessions */}
                      {isOnline && (
                        <div style={{ marginTop: '0.5rem' }}>
                          {youtubeEmbedUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div
                                style={{
                                  position: 'relative',
                                  width: '100%',
                                  paddingTop: '56.25%', // 16:9 Aspect Ratio
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: '#000000',
                                }}
                              >
                                <iframe
                                  src={youtubeEmbedUrl}
                                  title={`${session.title} Video Stream`}
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                  }}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <a
                                  href={session.youtube_url || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    color: '#EA4335',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  <ExternalLink size={13} />
                                  Watch on YouTube
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                padding: '1rem',
                                borderRadius: '10px',
                                background: 'rgba(234, 67, 53, 0.08)',
                                border: '1px solid rgba(234, 67, 53, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
                                <Video size={16} style={{ color: '#EA4335' }} />
                                <span>Online broadcast link:</span>
                              </div>
                              {session.youtube_url ? (
                                <a
                                  href={session.youtube_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: '#EA4335',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                  }}
                                >
                                  Open Stream
                                  <ExternalLink size={13} />
                                </a>
                              ) : (
                                <span style={{ color: '#94A3B8' }}>Link will be posted before start</span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Materials List */}
                      {session.materials && session.materials.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, marginBottom: '0.4rem' }}>
                            Lecture Materials & PDF Handouts:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {session.materials.map((matId, mIdx) => (
                              <div
                                key={mIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#60A5FA',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                <FileText size={13} />
                                <span>Handout Document #{mIdx + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Enrollment Action Card & Instructors Staff */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Enrollment Action Box */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>
                Enrollment Status
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', margin: '0.3rem 0 0 0' }}>
                {isConfirmed
                  ? 'You are Enrolled! 🎉'
                  : isPending
                  ? 'Request Pending Review ⏳'
                  : isWaitlisted
                  ? 'On the Waitlist 📋'
                  : course.is_full
                  ? 'Course is Currently Full'
                  : 'Join this Course Track'}
              </h3>
            </div>

            {/* Description text */}
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              {isConfirmed
                ? 'Your enrollment has been confirmed. You have full access to attend sessions and earn your certificate.'
                : isPending
                ? 'Your application is awaiting instructor confirmation. We will notify you once approved.'
                : isWaitlisted
                ? 'You are currently waitlisted. When an enrolled student withdraws, you will automatically be advanced.'
                : course.enrollment_type === 'open'
                ? 'Open admission track: click below to confirm your spot immediately.'
                : 'Gated track: requires instructor approval before enrollment is confirmed.'}
            </p>

            {/* CTA Button */}
            {isConfirmed ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  border: '1px solid rgba(52, 168, 83, 0.35)',
                  color: '#34D399',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                <CheckCircle2 size={18} />
                Enrollment Active
              </div>
            ) : isPending ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(251, 188, 4, 0.15)',
                  border: '1px solid rgba(251, 188, 4, 0.35)',
                  color: '#FBBF24',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                <Clock3 size={18} />
                Application Submitted
              </div>
            ) : isWaitlisted ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  color: '#C084FC',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                Waitlist Position Registered
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleEnroll}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  background: course.is_full ? '#A855F7' : '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                  transition: 'background 0.15s ease, transform 0.15s ease',
                }}
              >
                {isSubmitting ? (
                  'Processing Enrollment...'
                ) : course.is_full ? (
                  'Join Waitlist'
                ) : course.enrollment_type === 'open' ? (
                  <>
                    <Sparkles size={16} />
                    Enroll Now (Instant)
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Application
                  </>
                )}
              </button>
            )}

            {/* Attendance Pass Reminder */}
            <div
              style={{
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: '#94A3B8',
              }}
            >
              <ShieldCheck size={16} style={{ color: '#34A853', flexShrink: 0 }} />
              <span>
                Attendance is recorded by staff scanning your personal QR code at every session.
              </span>
            </div>
          </div>

          {/* Instructors & Mentors Panel */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <GraduationCap size={18} style={{ color: '#34A853' }} />
                Instructors & Mentors
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.82rem', margin: '0.25rem 0 0 0' }}>
                Committee leads and teaching staff for this track.
              </p>
            </div>

            {instructors.length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                Instructors are being assigned by the committee head.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {instructors.map((ins) => {
                  const isLead = ins.role === 'instructor';

                  return (
                    <div
                      key={ins.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            background: isLead ? '#4285F4' : '#34A853',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                            flexShrink: 0,
                          }}
                        >
                          {ins.avatar_url ? (
                            <img
                              src={ins.avatar_url}
                              alt={ins.full_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            ins.full_name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                            {ins.full_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            {ins.committee_role.replace('_', ' ')}
                            {ins.department_name && ` • ${ins.department_name}`}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          background: isLead ? 'rgba(66, 133, 244, 0.18)' : 'rgba(52, 168, 83, 0.18)',
                          color: isLead ? '#60A5FA' : '#34D399',
                          border: `1px solid ${isLead ? 'rgba(66, 133, 244, 0.35)' : 'rgba(52, 168, 83, 0.35)'}`,
                        }}
                      >
                        {ins.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
