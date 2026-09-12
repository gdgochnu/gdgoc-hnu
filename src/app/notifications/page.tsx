import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { redirect } from 'next/navigation';
import { getNotifications } from './actions';
import { NotificationsClient } from './NotificationsClient';
import { Bell, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/login?redirect=/notifications');
  }

  const { summary } = await getNotifications({ limit: 100 });

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Header Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem 2.25rem',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4285F4',
                boxShadow: '0 0 25px rgba(66, 133, 244, 0.25)',
              }}
            >
              <Bell size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Notification Center
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                All chapter announcements, task assignments, approval alerts, and event updates.
              </p>
            </div>
          </div>
        </div>

        {/* Client Component */}
        <NotificationsClient initialSummary={summary} />
      </div>
    </AppShell>
  );
}
