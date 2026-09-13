'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User as UserIcon, LayoutGrid, Loader2 } from 'lucide-react';

interface UserAuthStatusProps {
  email: string;
  fullName?: string;
  avatarUrl?: string | null;
  role?: string;
  status?: string;
}

export function UserAuthStatus({
  email,
  fullName,
  avatarUrl,
  role,
  status,
}: UserAuthStatusProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
      setIsSigningOut(false);
    }
  };

  const displayName = fullName || email.split('@')[0];

  const roleLabel = (() => {
    switch (role) {
      case 'president':
        return '👑 President';
      case 'co_president':
        return '👑 Co-Pres';
      case 'branch_head':
        return 'Branch Head';
      case 'committee_head':
        return 'Head';
      case 'committee_co_head':
        return 'Co-Head';
      case 'member':
        return 'Member';
      default:
        return status === 'active' ? 'Member' : (status?.replace('_', ' ') || 'Member');
    }
  })();

  const roleBadgeStyle = (() => {
    if (['president', 'co_president'].includes(role || '')) {
      return {
        bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(66, 133, 244, 0.2))',
        color: '#FDE047',
        border: 'rgba(251, 188, 4, 0.5)'
      };
    }
    if (['branch_head', 'committee_head', 'committee_co_head'].includes(role || '')) {
      return {
        bg: 'rgba(52, 168, 83, 0.2)',
        color: '#86EFAC',
        border: 'rgba(52, 168, 83, 0.4)'
      };
    }
    return {
      bg: 'rgba(66, 133, 244, 0.15)',
      color: '#93C5FD',
      border: 'rgba(66, 133, 244, 0.3)'
    };
  })();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'nowrap' }}>
      {/* User Chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.09)',
          padding: '0.3rem 0.65rem',
          borderRadius: '999px',
          backdropFilter: 'blur(8px)',
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <UserIcon size={14} color="var(--google-blue)" />
          </div>
        )}

        <div
          className="user-name-label"
          style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '130px',
          }}
          title={displayName}
        >
          {displayName}
        </div>

        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            padding: '0.1rem 0.45rem',
            borderRadius: '999px',
            background: roleBadgeStyle.bg,
            color: roleBadgeStyle.color,
            border: `1px solid ${roleBadgeStyle.border}`,
            flexShrink: 0,
            letterSpacing: '0.01em',
          }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Dashboard Button */}
      {status === 'active' ? (
        <Link
          href="/dashboard"
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.42rem 0.9rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            borderRadius: '8px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 12px rgba(66, 133, 244, 0.35)',
            border: '1px solid rgba(66, 133, 244, 0.5)',
          }}
        >
          <LayoutGrid size={15} />
          <span>Dashboard</span>
        </Link>
      ) : null}

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="btn-secondary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.42rem 0.75rem',
          fontSize: '0.8rem',
          borderRadius: '8px',
          cursor: isSigningOut ? 'not-allowed' : 'pointer',
          opacity: isSigningOut ? 0.6 : 1,
          flexShrink: 0,
        }}
        title="Sign Out"
        id="sign-out-btn"
      >
        {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        <span className="sign-out-text">Sign out</span>
      </button>
    </div>
  );
}
