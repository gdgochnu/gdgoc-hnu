'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RefreshCw, LogOut, Loader2 } from 'lucide-react';

interface OnboardingStatusClientProps {
  userId?: string;
  initialStatus?: string;
}

export function OnboardingStatusClient({ userId, initialStatus }: OnboardingStatusClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Hard refresh to immediately bypass all client router caches and fetch the fresh status from server
    window.location.reload();
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // Real-time listener: automatically reload the page when the profile status changes in Supabase
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    // 1. Supabase Realtime channel
    const channel = supabase
      .channel(`profile-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new && payload.new.status !== initialStatus) {
            window.location.reload();
          }
        }
      )
      .subscribe();

    // 2. Periodic polling fallback every 6 seconds while review is pending
    let interval: NodeJS.Timeout | null = null;
    if (initialStatus === 'pending_review' || !initialStatus) {
      interval = setInterval(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', userId)
          .maybeSingle();

        if (data && data.status && data.status !== 'pending_review') {
          window.location.reload();
        }
      }, 6000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (interval) clearInterval(interval);
    };
  }, [userId, initialStatus]);

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
