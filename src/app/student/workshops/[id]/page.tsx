import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkshopDetail } from '../actions';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentWorkshopDetailClient } from '@/components/student/StudentWorkshopDetailClient';
import { ArrowLeft, LogIn } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getWorkshopDetail(id);

  if (!res.success || !res.data?.workshop) {
    return {
      title: 'Workshop Not Found — Student Portal',
    };
  }

  const w = res.data.workshop;
  return {
    title: `${w.title} — Workshops & Bootcamps | GDGoC HNU`,
    description: w.description || `Interactive bootcamp and sessions schedule for ${w.title} at GDGoC Helwan University.`,
  };
}

export default async function StudentWorkshopDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [workshopRes, studentRes] = await Promise.all([
    getWorkshopDetail(id),
    getCurrentStudentProfile(),
  ]);

  if (!workshopRes.success || !workshopRes.data) {
    notFound();
  }

  const student = studentRes.student;
  const isTeamMember = studentRes.isTeamMember;

  // If student profile exists and active, wrap in StudentAppShell
  if (student && student.status !== 'incomplete') {
    return (
      <StudentAppShell student={student} teamRole={isTeamMember ? 'team_member' : null}>
        <StudentWorkshopDetailClient initialData={workshopRes.data} />
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
              href="/student/workshops"
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
              All Workshops
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
            {workshopRes.data.isAuthenticated ? (
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
                Dashboard
              </Link>
            ) : (
              <Link
                href={`/student?signin=true&returnUrl=/student/workshops/${id}`}
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

      {/* Workshop Detail Body */}
      <main>
        <StudentWorkshopDetailClient initialData={workshopRes.data} />
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
          Google Developer Groups on Campus — Helwan University • All rights reserved
        </p>
      </footer>
    </div>
  );
}
