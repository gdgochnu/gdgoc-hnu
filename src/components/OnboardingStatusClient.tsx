'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, LogOut, Loader2 } from 'lucide-react';

export function OnboardingStatusClient() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', fontSize: '0.85rem' }}
        id="refresh-status-btn"
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
      </button>

      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#FCA5A5' }}
        id="status-sign-out-btn"
      >
        {isSigningOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
        <span>Sign Out</span>
      </button>
    </div>
  );
}
