import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { DriveSettingsClient } from './DriveSettingsClient';
import { DriveSettingsSkeleton } from '@/components/skeletons/DriveSettingsSkeleton';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Google Drive Bridge Settings — GDGoC HNU OS',
  description: 'Manage chapter Google Drive Web App endpoint, secrets, and folder structure.',
};

function DriveSettingsDataLoader() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem 5rem', width: '100%' }}>
      <DriveSettingsClient />
    </div>
  );
}

export default async function DriveSettingsPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/login?redirect=/settings/drive');
  }

  const isPresident = context.profile.role === 'president' || context.profile.role === 'co_president';

  if (!isPresident) {
    return (
      <AppShell>
        <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem' }}>
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              borderRadius: '16px',
              background: 'rgba(234, 67, 53, 0.05)',
              border: '1px solid rgba(234, 67, 53, 0.2)',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(234, 67, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                color: '#F28B82',
              }}
            >
              <ShieldAlert size={32} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.75rem' }}>
              President-Only Restricted Area
            </h1>
            <p
              style={{
                color: 'var(--text-secondary, #9AA0A6)',
                fontSize: '0.95rem',
                maxWidth: '520px',
                margin: '0 auto 2rem',
                lineHeight: 1.6,
              }}
            >
              Google Drive Bridge infrastructure, API endpoints, and root folder tokens can only be viewed and modified by Chapter Presidents.
            </p>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<DriveSettingsSkeleton />}>
        <DriveSettingsDataLoader />
      </Suspense>
    </AppShell>
  );
}
