import { getUserContext } from '@/lib/auth/get-user-context';
import { AppNavigation } from './AppNavigation';
import Link from 'next/link';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { ShieldAlert, AlertCircle, ArrowRight } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export async function AppShell({ children }: AppShellProps) {
  const context = await getUserContext();

  // 1. Unauthenticated Visitor
  if (!context.user || !context.profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-logo-wrap">
                <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  &lt;&gt;
                </span>
              </div>
              <div>
                <div className="brand-title">GDGoC HNU OS</div>
                <div className="brand-sub">Operating System</div>
              </div>
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <ShieldAlert size={28} color="var(--google-blue)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Authentication Required</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Sign in with your Google account to enter your chapter workspace.
            </p>
            <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
          </div>
        </main>
      </div>
    );
  }

  // 2. Non-Active Account (e.g. pending_review, incomplete, suspended, etc.)
  if (context.profile.status !== 'active') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-title">GDGoC HNU OS</div>
            </Link>
          </div>
        </header>

        <main style={{ maxWidth: '600px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: context.profile.status === 'suspended' ? 'rgba(234, 67, 53, 0.15)' : 'rgba(251, 188, 4, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <AlertCircle size={28} color={context.profile.status === 'suspended' ? 'var(--google-red)' : 'var(--google-yellow)'} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Account Action Required</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your account status is currently <strong>{context.profile.status.replace('_', ' ')}</strong>. Please visit the application status portal to proceed.
            </p>
            <Link
              href="/onboarding/status"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
            >
              <span>Check Application Status</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. Active Account -> Render Role-Aware App Navigation
  return (
    <AppNavigation
      profile={context.profile}
      pendingApprovalsCount={context.pendingApprovalsCount}
      unreadNotificationsCount={context.unreadNotificationsCount}
    >
      {children}
    </AppNavigation>
  );
}
