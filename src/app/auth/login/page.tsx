import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserContext } from '@/lib/auth/get-user-context';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { ShieldCheck, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface LoginPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sParams = searchParams ? await searchParams : {};
  const redirectTarget = (typeof sParams.redirect === 'string' ? sParams.redirect : undefined)
    || (typeof sParams.next === 'string' ? sParams.next : undefined)
    || '/dashboard';
  const errorParam = typeof sParams.error === 'string' ? sParams.error : undefined;

  // If already logged in with active profile, redirect immediately
  const context = await getUserContext();
  if (context.user && context.profile && context.profile.status === 'active') {
    redirect(redirectTarget);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0F19',
      color: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Ambient Glows */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(66, 133, 244, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '20%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(52, 168, 83, 0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main Glass Panel */}
      <div className="glass-panel" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '3rem 2.25rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(66, 133, 244, 0.1)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Google 4-Color Accent Strip */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
        }} />

        {/* Chapter Emblem */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '18px',
          background: 'rgba(66, 133, 244, 0.12)',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 8px 24px rgba(66, 133, 244, 0.2)',
        }}>
          <ShieldCheck size={36} color="var(--google-blue, #4285F4)" />
        </div>

        {/* Header Titles */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(66, 133, 244, 0.1)', border: '1px solid rgba(66, 133, 244, 0.25)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', color: '#93C5FD', fontWeight: 700, marginBottom: '0.85rem' }}>
          <Sparkles size={13} color="#60A5FA" />
          <span>GDGoC HNU Chapter OS</span>
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          margin: '0 0 0.6rem',
          color: '#FFFFFF',
        }}>
          Sign in to Chapter Workspace
        </h1>

        <p style={{
          color: 'var(--text-secondary, #94A3B8)',
          fontSize: '0.92rem',
          lineHeight: 1.55,
          margin: '0 0 2rem',
        }}>
          Sign in using your Google account to access your chapter workspace, team delegations, events, and reports.
        </p>

        {/* Error notification if returned from callback */}
        {errorParam && (
          <div style={{
            background: 'rgba(234, 67, 53, 0.12)',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textAlign: 'left',
            fontSize: '0.84rem',
            color: '#FCA5A5',
          }}>
            <AlertCircle size={18} color="var(--google-red, #EA4335)" style={{ flexShrink: 0 }} />
            <span>
              {errorParam === 'auth_exchange_failed'
                ? 'Authentication session exchange failed. Please try signing in again.'
                : errorParam}
            </span>
          </div>
        )}

        {/* Google Sign In Action */}
        <div style={{ width: '100%', marginBottom: '1.75rem' }}>
          <SignInWithGoogleButton
            label="Continue with Google"
            variant="primary"
            redirectTo={redirectTarget}
          />
        </div>

        {/* Security & Terms note */}
        <p style={{
          fontSize: '0.76rem',
          color: 'var(--text-muted, #64748B)',
          margin: '0 0 1.75rem',
          lineHeight: 1.5,
        }}>
          Protected by Google Developer Groups role-based access control (RBAC). Only authenticated chapter members and leadership have access to internal workspaces.
        </p>

        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-secondary, #94A3B8)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'color 0.15s ease',
            }}
          >
            <ArrowLeft size={15} />
            <span>Return to Public Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
