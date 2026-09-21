import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedCourses } from './actions';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentCoursesCatalogClient } from '@/components/student/StudentCoursesCatalogClient';
import { Sparkles, ArrowLeft, LogIn } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tracks & Courses — Student Portal | GDGoC HNU',
  description: 'Browse official learning tracks, multi-session bootcamps, and courses at GDGoC Helwan University.',
};

export default async function StudentCoursesPage() {
  const [coursesRes, studentRes] = await Promise.all([
    getPublishedCourses(),
    getCurrentStudentProfile(),
  ]);

  const {
    courses = [],
    categories = [],
    departments = [],
    isAuthenticated = false,
    needsOnboarding = false,
  } = coursesRes;

  const student = studentRes.student;
  const isProfileComplete = isStudentProfileComplete(student);

  // If student profile exists and is 100% complete, render inside StudentAppShell
  if (student && isProfileComplete) {
    return (
      <StudentAppShell student={student} teamRole={studentRes.teamRole || null}>
        <StudentCoursesCatalogClient
          initialCourses={courses}
          categories={categories}
          departments={departments}
          isAuthenticated={isAuthenticated}
          needsOnboarding={needsOnboarding || !isProfileComplete}
        />
      </StudentAppShell>
    );
  }

  // If visitor or incomplete profile, render with clean standalone portal shell
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
              href="/student"
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
              Student Portal
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
                GDGoC HNU <span style={{ color: '#60A5FA', fontWeight: 600 }}>Courses</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isAuthenticated ? (
              needsOnboarding || !isProfileComplete ? (
                <Link
                  href="/student/onboarding"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #EA4335 0%, #D93025 100%)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(234, 67, 53, 0.35)',
                  }}
                >
                  Complete Profile to Enroll
                </Link>
              ) : (
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
                  Go to Dashboard
                </Link>
              )
            ) : (
              <Link
                href="/student?signin=true"
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
        <StudentCoursesCatalogClient
          initialCourses={courses}
          categories={categories}
          departments={departments}
          isAuthenticated={isAuthenticated}
          needsOnboarding={needsOnboarding}
        />
      </main>
    </div>
  );
}
