'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MANDATORY_SOCIAL_CHANNELS,
  SocialChannelConfig,
} from '@/config/social-gate';
import { recordPlatformFollowAction } from '@/app/student/social-gate/actions';
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react';

interface Props {
  initialFollowedPlatforms: string[];
  studentName?: string | null;
  onAllCompleted?: () => void;
}

function renderChannelIcon(type: SocialChannelConfig['iconType'], size = 28) {
  switch (type) {
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
          <path
            d="M12 7.027c2.404 0 2.688.009 3.637.052.877.04 1.354.187 1.67.31.421.163.72.358 1.036.673.315.315.51.615.673 1.036.123.316.27.793.31 1.67.043.95.052 1.233.052 3.637s-.009 2.688-.052 3.637c-.04.877-.187 1.354-.31 1.67-.163.421-.358.72-.673 1.036-.315.315-.615.51-1.036.673-.316.123-.793.27-1.67.31-.95.043-1.233.052-3.637.052s-2.688-.009-3.637-.052c-.877-.04-1.354-.187-1.67-.31a2.789 2.789 0 0 1-1.036-.673 2.789 2.789 0 0 1-.673-1.036c-.123-.316-.27-.793-.31-1.67-.043-.95-.052-1.233-.052-3.637s.009-2.688.052-3.637c.04-.877.187-1.354.31-1.67.163-.421.358-.72.673-1.036.315-.315.615-.51 1.036-.673.316-.123.793-.27 1.67-.31.95-.043 1.233-.052 3.637-.052zM12 5.25c-2.444 0-2.75.01-3.71.054-.957.044-1.61.196-2.182.419a4.593 4.593 0 0 0-1.66 1.08 4.593 4.593 0 0 0-1.08 1.66c-.223.572-.375 1.225-.419 2.182C4.01 11.605 4 11.91 4 14.355s.01 2.75.054 3.71c.044.957.196 1.61.419 2.182.227.585.53 1.08 1.08 1.66.55.58 1.045.883 1.66 1.08.572.223 1.225.375 2.182.419.96.044 1.266.054 3.71.054s2.75-.01 3.71-.054c.957-.044 1.61-.196 2.182-.419.585-.227 1.08-.53 1.66-1.08.58-.55.883-1.045 1.08-1.66.223-.572.375-1.225.419-2.182.044-.96.054-1.266.054-3.71s-.01-2.75-.054-3.71c-.044-.957-.196-1.61-.419-2.182a4.593 4.593 0 0 0-1.08-1.66 4.593 4.593 0 0 0-1.66-1.08c-.572-.223-1.225-.375-2.182-.419-.96-.044-1.266-.054-3.71-.054zM12 9.5a4.855 4.855 0 1 0 0 9.71 4.855 4.855 0 0 0 0-9.71zm0 8a3.145 3.145 0 1 1 0-6.29 3.145 3.145 0 0 1 0 6.29zm6.182-8.318a1.136 1.136 0 1 1-2.272 0 1.136 1.136 0 0 1 2.272 0z"
            fill="#FFFFFF"
          />
          <defs>
            <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FD1D1D" />
              <stop offset="50%" stopColor="#833AB4" />
              <stop offset="100%" stopColor="#FCB045" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.16 1.18 2.09 2.35 2.28.64.11 1.3.04 1.9-.19 1.07-.42 1.8-1.44 1.88-2.58.05-3.67.02-7.34.02-11.01z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );
  }
}

export function SocialFollowGateModal({
  initialFollowedPlatforms,
  studentName,
  onAllCompleted,
}: Props) {
  const [followedSet, setFollowedSet] = useState<Set<string>>(
    new Set(initialFollowedPlatforms)
  );

  // Find first uncompleted step
  const firstUncompletedIndex = MANDATORY_SOCIAL_CHANNELS.findIndex(
    (c) => !followedSet.has(c.id)
  );

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    firstUncompletedIndex >= 0 ? firstUncompletedIndex : 0
  );

  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [openedTimestamp, setOpenedTimestamp] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(
    firstUncompletedIndex === -1
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentChannel = MANDATORY_SOCIAL_CHANNELS[currentStepIndex];

  // If all are already followed at mount, don't show modal
  if (
    followedSet.size >= MANDATORY_SOCIAL_CHANNELS.length &&
    !showSuccessScreen
  ) {
    return null;
  }

  // Handle countdown interval
  useEffect(() => {
    if (hasOpenedLink && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasOpenedLink, countdown]);

  // Click to open social link
  const handleOpenLink = () => {
    setErrorMessage(null);
    setHasOpenedLink(true);
    const now = Date.now();
    setOpenedTimestamp(now);
    setCountdown(currentChannel.requiredWaitSeconds);

    // Open link in new tab
    window.open(currentChannel.url, '_blank', 'noopener,noreferrer');
  };

  // Click to confirm follow
  const handleVerifyFollow = async () => {
    if (!hasOpenedLink || !openedTimestamp) {
      triggerError('Please click the follow button to visit the channel first! 🚀');
      return;
    }

    const elapsedSeconds = (Date.now() - openedTimestamp) / 1000;

    // Check if elapsed time is less than required wait
    if (elapsedSeconds < currentChannel.requiredWaitSeconds) {
      const remaining = Math.ceil(
        currentChannel.requiredWaitSeconds - elapsedSeconds
      );
      triggerError(`Please follow the page first (${remaining}s remaining).`);
      return;
    }

    // Call server action to verify and save in Supabase
    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await recordPlatformFollowAction(
        currentChannel.id,
        elapsedSeconds
      );

      if (!res.success) {
        triggerError(res.error || 'Verification failed. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Mark this step as completed
      const nextSet = new Set(followedSet);
      nextSet.add(currentChannel.id);
      setFollowedSet(nextSet);

      // Check if all finished
      if (res.completedAll || nextSet.size >= MANDATORY_SOCIAL_CHANNELS.length) {
        setShowSuccessScreen(true);
        if (onAllCompleted) onAllCompleted();
      } else {
        // Advance to next uncompleted channel
        setHasOpenedLink(false);
        setOpenedTimestamp(null);
        setCountdown(0);
        const nextIndex = MANDATORY_SOCIAL_CHANNELS.findIndex(
          (c) => !nextSet.has(c.id)
        );
        if (nextIndex >= 0) {
          setCurrentStepIndex(nextIndex);
        }
      }
    } catch (err: any) {
      triggerError(err?.message || 'Connection error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const completedCount = followedSet.size;
  const totalCount = MANDATORY_SOCIAL_CHANNELS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 8, 15, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
          padding: '1.5rem',
          background: '#0B1120',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow:
            '0 20px 50px -10px rgba(0, 0, 0, 0.9), 0 0 40px -10px rgba(66, 133, 244, 0.25)',
          position: 'relative',
          overflow: 'hidden',
          animation: shake ? 'shakeAnimation 0.5s ease' : undefined,
        }}
      >
        {/* Google Accent Strip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background:
              'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {showSuccessScreen ? (
          /* SUCCESS SCREEN */
          <div style={{ textAlign: 'center', padding: '1rem 0.25rem' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '2px solid rgba(52, 168, 83, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 0 25px rgba(52, 168, 83, 0.35)',
              }}
            >
              <CheckCircle2 size={34} color="#34A853" />
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: 999,
                background: 'rgba(52, 168, 83, 0.15)',
                color: '#86EFAC',
                fontSize: '0.72rem',
                fontWeight: 800,
                marginBottom: '0.5rem',
              }}
            >
              <Sparkles size={12} color="#86EFAC" />
              Verified Community Scholar
            </div>

            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 0.4rem',
              }}
            >
              You're All Set! 🚀
            </h2>

            <p
              style={{
                color: '#94A3B8',
                fontSize: '0.82rem',
                lineHeight: 1.5,
                margin: '0 auto 1.25rem',
              }}
            >
              All 6 channels followed. Welcome to the GDGoC HNU portal.
            </p>

            <button
              onClick={() => {
                setShowSuccessScreen(false);
                window.location.reload();
              }}
              style={{
                width: '100%',
                padding: '0.8rem 1.25rem',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 20px rgba(66, 133, 244, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Enter Portal</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* STEPPER SCREEN */
          <div>
            {/* Compact Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.1rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: 999,
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  color: '#60A5FA',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '0.4rem',
                }}
              >
                <ShieldCheck size={12} color="#60A5FA" />
                Community Setup
              </div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Connect With GDGoC HNU
              </h2>
              <p
                style={{
                  color: '#94A3B8',
                  fontSize: '0.78rem',
                  marginTop: '0.25rem',
                }}
              >
                Follow our official channels to unlock the portal.
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div style={{ marginBottom: '1.1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                  color: '#CBD5E1',
                }}
              >
                <span>
                  Step {currentStepIndex + 1} of {totalCount}:{' '}
                  <strong style={{ color: currentChannel.brandColor }}>
                    {currentChannel.name}
                  </strong>
                </span>
                <span style={{ color: '#60A5FA' }}>
                  {completedCount}/{totalCount}
                </span>
              </div>

              {/* Step Badges Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem' }}>
                {MANDATORY_SOCIAL_CHANNELS.map((ch, idx) => {
                  const isDone = followedSet.has(ch.id);
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div
                      key={ch.id}
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: isDone
                          ? '#34A853'
                          : isCurrent
                          ? ch.brandColor
                          : 'rgba(255, 255, 255, 0.1)',
                        boxShadow: isCurrent
                          ? `0 0 8px ${ch.brandColor}`
                          : isDone
                          ? '0 0 6px rgba(52, 168, 83, 0.4)'
                          : 'none',
                        transition: 'all 0.3s ease',
                      }}
                      title={ch.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Active Channel Card */}
            <div
              style={{
                borderRadius: 16,
                padding: '1.15rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${currentChannel.brandColor}35`,
                boxShadow: `0 6px 24px -6px ${currentChannel.brandColor}20`,
                marginBottom: '1rem',
                textAlign: 'center',
              }}
            >
              {/* Channel Icon Header */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${currentChannel.brandColor}15`,
                  border: `1px solid ${currentChannel.brandColor}35`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.65rem',
                  boxShadow: `0 3px 12px ${currentChannel.brandColor}25`,
                }}
              >
                {renderChannelIcon(currentChannel.iconType, 24)}
              </div>

              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  margin: '0 0 0.85rem',
                }}
              >
                {currentChannel.name}
              </h3>

              {/* Action 1: Follow Button */}
              <button
                type="button"
                onClick={handleOpenLink}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 12,
                  background: currentChannel.gradient,
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: `0 4px 14px ${currentChannel.brandColor}35`,
                  transition: 'all 0.2s ease',
                  marginBottom: '0.55rem',
                }}
              >
                <span>{currentChannel.actionText}</span>
                <ExternalLink size={14} />
              </button>

              {/* Action 2: Verify Button */}
              <button
                type="button"
                onClick={handleVerifyFollow}
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: 10,
                  background:
                    hasOpenedLink && countdown === 0
                      ? 'rgba(52, 168, 83, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                  border:
                    hasOpenedLink && countdown === 0
                      ? '1px solid #34A853'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                  color:
                    hasOpenedLink && countdown === 0 ? '#86EFAC' : '#94A3B8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: isVerifying ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                }}
              >
                {isVerifying ? (
                  <span>Verifying...</span>
                ) : countdown > 0 ? (
                  <>
                    <Clock size={13} color="#FBBC04" />
                    <span>Wait ({countdown}s)...</span>
                  </>
                ) : hasOpenedLink ? (
                  <>
                    <CheckCircle2 size={14} color="#34A853" />
                    <span>Confirm Follow & Next ✅</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} color="#94A3B8" />
                    <span>1. Click Follow above</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 10,
                  background: 'rgba(234, 67, 53, 0.12)',
                  border: '1px solid rgba(234, 67, 53, 0.25)',
                  color: '#FCA5A5',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                }}
              >
                <AlertCircle size={14} color="#EA4335" style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Bottom Footer Note */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.68rem',
                color: '#64748B',
              }}
            >
              🔒 Required to unlock student portal
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shakeAnimation {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
