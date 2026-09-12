import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { DriveSettingsClient } from './DriveSettingsClient';
import { redirect } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Google Drive Bridge Settings — GDGoC HNU OS',
  description: 'Manage chapter Google Drive Web App endpoint, secrets, and folder structure.',
};

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
                lineHeight: '1.6',
              }}
            >
              Google Drive Bridge settings manage core chapter storage integrations and shared secret keys. Access is restricted exclusively to Chapter Presidents.
            </p>
            <Link
              href="/dashboard"
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
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
      <DriveSettingsClient />
    </AppShell>
  );
}
