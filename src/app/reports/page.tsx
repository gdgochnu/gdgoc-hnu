import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { canAccessReports, getAccessibleDepartments } from './actions';
import { ReportsClient } from './ReportsClient';
import { EventAnalyticsClient } from './EventAnalyticsClient';
import { BarChart3, ShieldCheck } from 'lucide-react';
import { ReportsPageTabs } from './ReportsPageTabs';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports & Analytics — GDGoC HNU OS',
  description:
    'Weekly and monthly committee performance reports, event analytics, attendance insights, feedback scores, and budget summaries.',
};

export default async function ReportsPage() {
  const [context, access] = await Promise.all([
    getUserContext(),
    canAccessReports(),
  ]);

  if (!context.user || !context.profile) {
    redirect('/auth/signin');
  }
  if (context.profile.status !== 'active') {
    redirect('/onboarding');
  }
  if (!access.hasAccess) {
    return (
      <AppShell>
        <div
          style={{ maxWidth: '720px', margin: '5rem auto', padding: '0 1.5rem', textAlign: 'center' }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              borderRadius: '24px',
              border: '1px solid rgba(234,67,53,0.3)',
              background: 'rgba(234,67,53,0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'rgba(234,67,53,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea4335',
              }}
            >
              <ShieldCheck size={30} />
            </div>
            <div>
              <h2
                style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                Access Restricted
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Reports &amp; Analytics are available to Committee Heads, Branch Heads, and
                Presidential roles only.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const { departments } = await getAccessibleDepartments();

  return (
    <AppShell>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* Page header */}
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              marginBottom: '0.5rem',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background:
                  'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(66,133,244,0.1))',
                border: '1px solid rgba(66,133,244,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4285f4',
              }}
            >
              <BarChart3 size={24} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  background:
                    'linear-gradient(135deg, var(--text-primary), var(--google-blue))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Reports &amp; Analytics
              </h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Committee performance · Event analytics · Spec §4.12
              </p>
            </div>
          </div>
        </div>

        {/* Tabbed content — client component handles tab state */}
        <ReportsPageTabs
          committeeTab={
            <ReportsClient
              departments={departments}
              initialDeptId={access.departmentId || departments[0]?.id || ''}
              isPresidential={access.isPresidential}
            />
          }
          eventTab={
            <EventAnalyticsClient
              departments={departments}
              initialDeptId={access.departmentId || departments[0]?.id || ''}
              isPresidential={access.isPresidential}
            />
          }
        />
      </div>
    </AppShell>
  );
}
