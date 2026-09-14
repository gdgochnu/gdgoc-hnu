import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkshopRegistrationConfirmation } from '@/app/student/workshops/actions';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentWorkshopConfirmationClient } from '@/components/student/StudentWorkshopConfirmationClient';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ConfirmationPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getWorkshopRegistrationConfirmation(id);
  const title = res.workshop?.title || 'Workshop';

  return {
    title: `Registration Confirmed: ${title} — Student Portal | GDGoC HNU`,
    description: `Official registration confirmation and workshop pass for ${title} at GDGoC Helwan University.`,
  };
}

export default async function WorkshopConfirmationPage({
  params,
}: ConfirmationPageProps) {
  const { id } = await params;

  const [confirmRes, studentRes] = await Promise.all([
    getWorkshopRegistrationConfirmation(id),
    getCurrentStudentProfile(),
  ]);

  if (!confirmRes.success || !confirmRes.workshop || !confirmRes.registration || !confirmRes.student) {
    // If not registered, redirect back to workshop details
    redirect(`/student/workshops/${id}`);
  }

  const student = studentRes.student;
  const isTeamMember = studentRes.isTeamMember;

  // Wrap in StudentAppShell if active profile exists
  if (student && student.status !== 'incomplete') {
    return (
      <StudentAppShell student={student} teamRole={isTeamMember ? 'team_member' : null}>
        <StudentWorkshopConfirmationClient
          workshop={confirmRes.workshop}
          registration={confirmRes.registration}
          student={confirmRes.student}
          sessions={confirmRes.sessions}
        />
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
              href={`/student/workshops/${id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#94A3B8',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              Workshop Details
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
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF' }}>
                GDGoC HNU <span style={{ color: '#34A853', fontWeight: 600 }}>Pass</span>
              </span>
            </div>
          </div>

          <div>
            <Link
              href="/student/dashboard"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'var(--google-blue, #4285F4)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.84rem',
                textDecoration: 'none',
              }}
            >
              My Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main>
        <StudentWorkshopConfirmationClient
          workshop={confirmRes.workshop}
          registration={confirmRes.registration}
          student={confirmRes.student}
          sessions={confirmRes.sessions}
        />
      </main>
    </div>
  );
}
