'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  ListChecks, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { OnboardingChecklistItem } from '@/types';

interface OnboardingProgress {
  total: number;
  completed: number;
  percentage: number;
  isComplete: boolean;
  hasOnboardedBadge: boolean;
  items: OnboardingChecklistItem[];
}

interface OnboardingChecklistWidgetProps {
  initialProgress?: OnboardingProgress;
  profileId?: string;
  className?: string;
}

export function OnboardingChecklistWidget({
  initialProgress,
  profileId,
  className = '',
}: OnboardingChecklistWidgetProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(initialProgress || null);
  const [loading, setLoading] = useState(!initialProgress);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);

  // Fetch progress if not passed initially
  useEffect(() => {
    if (!initialProgress) {
      fetchProgress();
    }
  }, [initialProgress, profileId]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const url = profileId
        ? `/api/onboarding/checklist?mock_user_id=${profileId}`
        : '/api/onboarding/checklist';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.progress) {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('Failed to load onboarding checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (item: OnboardingChecklistItem) => {
    if (togglingId) return;

    const newDone = !item.is_done;
    setTogglingId(item.id);

    // Optimistic update
    if (progress) {
      const updatedItems = progress.items.map((i) =>
        i.id === item.id ? { ...i, is_done: newDone } : i
      );
      const newCompleted = updatedItems.filter((i) => i.is_done).length;
      const newPercentage = Math.round((newCompleted / progress.total) * 100);
      const newIsComplete = progress.total > 0 && newCompleted === progress.total;

      setProgress({
        ...progress,
        items: updatedItems,
        completed: newCompleted,
        percentage: newPercentage,
        isComplete: newIsComplete,
        hasOnboardedBadge: newIsComplete ? true : progress.hasOnboardedBadge,
      });

      if (newIsComplete && !progress.isComplete) {
        setJustCompleted(true);
      }
    }

    try {
      const url = profileId
        ? `/api/onboarding/checklist?mock_user_id=${profileId}`
        : '/api/onboarding/checklist';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, isDone: newDone }),
      });

      const data = await res.json();
      if (res.ok && data.progress) {
        setProgress(data.progress);
        if (data.badgeAwarded) {
          setJustCompleted(true);
        }
      } else {
        // Revert on failure
        fetchProgress();
      }
    } catch (err) {
      console.error('Failed to toggle checklist item:', err);
      fetchProgress();
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div
        className={`glass-panel ${className}`}
        style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Loader2 size={20} className="animate-spin" color="var(--google-blue)" />
        <span style={{ fontSize: '0.9rem' }}>Loading onboarding checklist...</span>
      </div>
    );
  }

  if (!progress || progress.total === 0) {
    return null;
  }

  return (
    <div
      id="onboarding-checklist-widget"
      className={`glass-panel ${className}`}
      style={{
        padding: '1.75rem',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        border: progress.isComplete
          ? '1px solid rgba(52, 168, 83, 0.35)'
          : '1px solid rgba(66, 133, 244, 0.3)',
        background: progress.isComplete
          ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.08), rgba(26, 32, 44, 0.85))'
          : 'linear-gradient(135deg, rgba(66, 133, 244, 0.08), rgba(26, 32, 44, 0.85))',
        boxShadow: progress.isComplete
          ? '0 8px 32px rgba(52, 168, 83, 0.12)'
          : '0 8px 32px rgba(66, 133, 244, 0.12)',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Top Accent Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: progress.isComplete
            ? 'linear-gradient(90deg, #34A853, #FBBC04)'
            : 'linear-gradient(90deg, #4285F4, #34A853)',
        }}
      />

      {/* Widget Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: progress.isComplete ? 'rgba(52, 168, 83, 0.2)' : 'rgba(66, 133, 244, 0.2)',
              border: progress.isComplete ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(66, 133, 244, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {progress.isComplete ? (
              <Award size={22} color="var(--google-green)" />
            ) : (
              <ListChecks size={22} color="var(--google-blue)" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                {progress.isComplete ? '🎉 Chapter Onboarding Complete!' : 'New Member Onboarding Checklist'}
              </h3>
              {progress.isComplete && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 168, 83, 0.2)',
                    color: '#86EFAC',
                    border: '1px solid rgba(52, 168, 83, 0.4)',
                  }}
                >
                  ONBOARDED
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {progress.isComplete
                ? 'You earned the "Official Chapter Member" badge and completed setup.'
                : `${progress.completed} of ${progress.total} tasks completed (${progress.percentage}%) — finish all to unlock your badge!`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.4rem 0.75rem',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <span>{isExpanded ? 'Hide Items' : 'Show Items'}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginTop: '1.25rem' }}>
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${progress.percentage}%`,
              height: '100%',
              background: progress.isComplete
                ? 'linear-gradient(90deg, #34A853, #86EFAC)'
                : 'linear-gradient(90deg, #4285F4, #34A853)',
              borderRadius: '999px',
              transition: 'width 0.4s ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Just Completed Badge Celebration Toast */}
      {justCompleted && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(52, 168, 83, 0.15)',
            border: '1px solid rgba(52, 168, 83, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <Sparkles size={24} color="#86EFAC" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#86EFAC' }}>
              Badge Unlocked: Official Chapter Member 🏅
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              +10 Chapter Points awarded to your profile! Welcome to full active participation.
            </div>
          </div>
        </div>
      )}

      {/* Checklist Items List */}
      {isExpanded && (
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
          }}
        >
          {progress.items.map((item) => {
            const isToggling = togglingId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleItem(item);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: item.is_done
                    ? 'rgba(52, 168, 83, 0.07)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: item.is_done
                    ? '1px solid rgba(52, 168, 83, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  cursor: isToggling ? 'wait' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isToggling ? 0.7 : 1,
                }}
              >
                {/* Checkbox Icon */}
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  {item.is_done ? (
                    <CheckCircle2 size={20} color="var(--google-green)" />
                  ) : (
                    <Circle size={20} color="rgba(255, 255, 255, 0.35)" />
                  )}
                </div>

                {/* Item Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: item.is_done ? 'rgba(255, 255, 255, 0.55)' : '#FFFFFF',
                      textDecoration: item.is_done ? 'line-through' : 'none',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {item.label}
                  </span>
                  {item.completed_at && (
                    <span
                      style={{
                        marginLeft: '0.65rem',
                        fontSize: '0.72rem',
                        color: 'rgba(52, 168, 83, 0.8)',
                        fontWeight: 500,
                      }}
                    >
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
