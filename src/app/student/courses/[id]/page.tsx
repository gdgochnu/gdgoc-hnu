import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCourseDetail } from '../actions';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentCourseDetailClient } from '@/components/student/StudentCourseDetailClient';
import { ArrowLeft, LogIn, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getCourseDetail(id);

  if (!res.success || !res.data?.course) {
    return {
      title: 'Course Not Found — Student Portal',
    };
  }

  const c = res.data.course;
  return {
    title: `${c.title} — Tracks & Courses | GDGoC HNU`,
    description: c.description || `Course syllabus and curriculum for ${c.title} at GDGoC Helwan University.`,
  };
}

export default async function StudentCourseDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [courseRes, studentRes] = await Promise.all([
    getCourseDetail(id),
    getCurrentStudentProfile(),
  ]);

  if (!courseRes.success || !courseRes.data) {
    notFound();
  }

  const student = studentRes.student;
  const isTeamMember = studentRes.isTeamMember;

  // If student profile exists and active, wrap in StudentAppShell
  if (student && student.status !== 'incomplete') {
    return (
      <StudentAppShell student={student} teamRole={isTeamMember ? 'team_member' : null}>
        <StudentCourseDetailClient initialData={courseRes.data} />
      </StudentAppShell>
    );
  }

  // Standalone public portal wrapper
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main, #070B14)',
        color: '#F8FAFC',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(7, 11, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link
              href="/student/courses"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#94A3B8',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'color 0.15s ease',
              }}
            >
              <ArrowLeft size={16} />
              All Courses
            </Link>

            <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.15)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                }}
              >
                G
              </div>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                GDGoC HNU <span style={{ color: '#60A5FA', fontWeight: 600 }}>Curriculum</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {courseRes.data.isAuthenticated ? (
              <Link
                href="/student/dashboard"
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                }}
              >
                My Dashboard
              </Link>
            ) : (
              <Link
                href={`/student?signin=true&returnUrl=/student/courses/${id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  color: '#60A5FA',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={15} />
                Sign In to Enroll
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ minHeight: 'calc(100vh - 64px)' }}>
        <StudentCourseDetailClient initialData={courseRes.data} />
      </main>
    </div>
  );
}
