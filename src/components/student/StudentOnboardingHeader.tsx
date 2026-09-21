'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  LogOut,
  Loader2,
  AlertCircle,
  User,
  ShieldAlert,
} from 'lucide-react';

interface StudentOnboardingHeaderProps {
  isEditMode: boolean;
  email: string;
  avatarUrl?: string | null;
  displayName?: string | null;
}

export function StudentOnboardingHeader({
  isEditMode,
  email,
  avatarUrl,
  displayName,
}: StudentOnboardingHeaderProps) {
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

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Left Side: Back button ONLY in edit mode */}
        {isEditMode ? (
          <Link
            href="/student/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#94A3B8',
              fontSize: '0.86rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#F87171',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.25rem 0.65rem',
                borderRadius: '999px',
              }}
            >
              <ShieldAlert size={13} color="#F87171" />
              <span>Mandatory Registration</span>
            </span>
            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              Complete the form below to access the student portal
            </span>
          </div>
        )}

        {/* Right Side: Authenticated Account & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={13} color="#60A5FA" />
              </div>
            )}
            <span
              style={{
                fontSize: '0.82rem',
                color: '#E2E8F0',
                fontWeight: 600,
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={email}
            >
              {displayName || email}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#FCA5A5',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isSigningOut ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
            title="Sign out of this Google account"
          >
            {isSigningOut ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {!isEditMode && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            background: 'rgba(234, 67, 53, 0.08)',
            border: '1px solid rgba(234, 67, 53, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.84rem',
            color: '#FCA5A5',
            lineHeight: 1.5,
          }}
        >
          <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
          <span>
            <strong>Portal Access Locked:</strong> As a student at Helwan National University, your profile details must be completed and saved before you can view the dashboard, enroll in tracks, or receive your attendance QR pass.
          </span>
        </div>
      )}
    </div>
  );
}
