import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getAllOperationsEventsSummary } from '@/app/events/operations-actions';
import { OperationsWorkspaceClient } from '@/components/workspace/OperationsWorkspaceClient';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OperationsWorkspacePage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    return (
      <AppShell>
        <div style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Sign In Required</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Access the chapter operations workspace by signing in first.
            </p>
            <Link href="/" className="btn-primary">Return to Home</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const profile = context.profile;
  const isLeadership = ['president', 'co_president', 'branch_head'].includes(profile.role);
  const isOpsMember = profile.department?.code === 'OPS';
  const canAccess = isLeadership || isOpsMember;

  if (!canAccess) {
    return (
      <AppShell>
        <div style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-yellow)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Access Restricted</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              The Operations Workspace is designated for the Operations committee and Chapter Leadership.
            </p>
            <Link href="/dashboard" className="btn-primary">Return to Dashboard</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const canManage = isLeadership || ['committee_head', 'committee_co_head'].includes(profile.role);
  const { events, overallStats } = await getAllOperationsEventsSummary();

  return (
    <AppShell>
      <OperationsWorkspaceClient
        initialEvents={events}
        overallStats={overallStats}
        canManage={canManage}
      />
    </AppShell>
  );
}
