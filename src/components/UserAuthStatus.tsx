'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';

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

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border-subtle)' }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={fullName || email}
            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserIcon size={14} color="var(--google-blue)" />
          </div>
        )}
        <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
          {fullName || email.split('@')[0]}
        </div>
        {status && (
          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD' }}>
            {status}
          </span>
        )}
      </div>

      {status === 'active' ? (
        <a
          href="/dashboard"
          className="btn-primary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', textDecoration: 'none' }}
        >
          Dashboard
        </a>
      ) : null}

      <button
        onClick={handleSignOut}
        className="btn-secondary"
        style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
        title="Sign Out"
        id="sign-out-btn"
      >
        <LogOut size={14} />
        <span>Sign out</span>
      </button>
    </div>
  );
}
