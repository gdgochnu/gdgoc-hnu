import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedWorkshops } from './actions';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentWorkshopsCatalogClient } from '@/components/student/StudentWorkshopsCatalogClient';
import { Sparkles, ArrowLeft, LogIn } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Workshops & Bootcamps — Student Portal | GDGoC HNU',
  description: 'Browse interactive technical bootcamps, workshops, and hands-on coding sessions at Google Developer Groups on Campus Helwan University.',
};

export default async function StudentWorkshopsPage() {
  const [workshopsRes, studentRes] = await Promise.all([
    getPublishedWorkshops(),
    getCurrentStudentProfile(),
  ]);

  const {
    workshops = [],
    categories = [],
    departments = [],
    isAuthenticated = false,
    needsOnboarding = false,
  } = workshopsRes;

  const student = studentRes.student;
  const isProfileComplete = isStudentProfileComplete(student);

  // If student profile exists and is 100% complete, render inside StudentAppShell
  if (student && isProfileComplete) {
    return (
      <StudentAppShell student={student} teamRole={studentRes.teamRole || null}>
        <StudentWorkshopsCatalogClient
          initialWorkshops={workshops}
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
                  background: 'linear-gradient(135deg, #34A853 0%, #4285F4 100%)',
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
                GDGoC HNU <span style={{ color: '#34A853', fontWeight: 600 }}>Workshops</span>
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
                  Complete Profile to Register
                </Link>
              ) : (
                <Link
                  href="/student/dashboard"
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: '#34A853',
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
                href="/student?signin=true&returnUrl=/student/workshops"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={15} />
                Student Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Catalog View */}
      <main>
        <StudentWorkshopsCatalogClient
          initialWorkshops={workshops}
          categories={categories}
          departments={departments}
          isAuthenticated={isAuthenticated}
          needsOnboarding={needsOnboarding}
        />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          color: '#64748B',
          fontSize: '0.85rem',
        }}
      >
        <p style={{ margin: 0 }}>
          Google Developer Groups on Campus — Helwan University • Empowering students through tech education
        </p>
      </footer>
    </div>
  );
}
