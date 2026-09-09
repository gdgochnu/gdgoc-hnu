'use client';

import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Heart,
  Crown,
  Send,
  MessageSquare,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import type {
  RecognitionWallData,
  RecognitionFeedItem,
  MemberOfTheMonth,
} from '@/lib/gamification/recognition-engine';
import { sendShoutOutAction } from '@/app/gamification/actions';

interface RecognitionWallWidgetProps {
  data: RecognitionWallData;
  membersList?: Array<{ id: string; full_name: string; role: string }>;
  currentUserId?: string;
  onRefresh?: () => void;
  compact?: boolean;
}

export function RecognitionWallWidget({
  data,
  membersList = [],
  currentUserId,
  onRefresh,
  compact = false,
}: RecognitionWallWidgetProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'badge_earned' | 'shoutout'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetMemberId, setTargetMemberId] = useState('');
  const [shoutoutMessage, setShoutoutMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const motm = data.memberOfTheMonth;

  const filteredFeed = data.feed.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const handleSendShoutOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberId || !shoutoutMessage.trim()) return;

    setIsSending(true);
    setStatusMsg(null);

    try {
      const res = await sendShoutOutAction({
        targetProfileId: targetMemberId,
        message: shoutoutMessage.trim(),
        points: 15,
      });

      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: `Shout-out sent! Awarded +${res.pointsAwarded || 15} points to your peer.`,
        });
        setShoutoutMessage('');
        setTargetMemberId('');
        setIsModalOpen(false);
        if (onRefresh) onRefresh();
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to send shout-out' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSending(false);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Banner & Header */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              color: '#f472b6',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            <Sparkles size={12} />
            Live Recognition Wall (§4.13)
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Peer Appreciation & Standout Honors
          </h2>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Celebrating standout contributors, newly unlocked badges, and community shout-outs.
          </div>
        </div>

        {membersList.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            <Heart size={16} fill="currentColor" />
            <span>Send a Shout-out (+15 pts)</span>
          </button>
        )}
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: statusMsg.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(234, 67, 53, 0.4)'}`,
            color: statusMsg.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.8 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero: Member of the Month Spotlight */}
      {motm && (
        <div
          className="glass-panel"
          style={{
            padding: '2rem',
            borderRadius: '24px',
            border: '1px solid rgba(251, 188, 4, 0.35)',
            background: 'radial-gradient(ellipse at top left, rgba(251, 188, 4, 0.15), rgba(26, 29, 46, 0.85) 75%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #fbbc04, #f59e0b)',
                  padding: '3px',
                  boxShadow: '0 8px 24px rgba(251, 188, 4, 0.25)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '17px',
                    background: '#1a1d2e',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: '#fbbc04',
                  }}
                >
                  {motm.avatarUrl ? (
                    <img src={motm.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    motm.fullName.charAt(0)
                  )}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'linear-gradient(135deg, #fbbc04, #ea4335)',
                  color: '#fff',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                }}
              >
                👑
              </div>
            </div>

            {/* Info */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.15rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(251, 188, 4, 0.2)',
                  color: '#fde047',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginBottom: '0.35rem',
                }}
              >
                <Trophy size={12} /> Member of the Month • {motm.monthName}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>
                {motm.fullName}
              </h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {motm.departmentName} ({motm.departmentCode}) •{' '}
                <strong style={{ color: 'var(--google-yellow)' }}>{motm.tier} Tier</strong>
              </div>

              {/* Achievements */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {motm.achievements.map((ach, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    ⭐ {ach}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Points Pill */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '16px',
              background: 'rgba(251, 188, 4, 0.1)',
              border: '1px solid rgba(251, 188, 4, 0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Monthly Impact
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--google-yellow)', lineHeight: 1.2 }}>
              +{motm.monthlyPoints > 0 ? motm.monthlyPoints : motm.totalPoints} pts
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 600 }}>
              {motm.monthlyPoints > 0 ? 'Earned this month' : 'Lifetime leader'}
            </div>
          </div>
        </div>
      )}

      {/* Live Feed Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={18} color="#a855f7" />
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
            Live Recognition Stream
          </h3>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34a853', display: 'inline-block' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: '12px' }}>
          {(['all', 'badge_earned', 'shoutout'] as const).map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setActiveFilter(filterKey)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: activeFilter === filterKey ? 'var(--google-blue)' : 'transparent',
                color: activeFilter === filterKey ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {filterKey === 'all' ? 'All Activity' : filterKey === 'badge_earned' ? 'Badges' : 'Shout-outs'}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredFeed.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem',
              borderRadius: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}
          >
            No recognition entries match this filter yet. Be the first to give a shout-out!
          </div>
        ) : (
          filteredFeed.map((item) => {
            const isBadge = item.type === 'badge_earned';
            const isShoutout = item.type === 'shoutout';

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.15rem 1.25rem',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  transition: 'transform 0.15s ease',
                }}
              >
                {/* Icon box */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: isBadge
                      ? 'rgba(168, 85, 247, 0.15)'
                      : isShoutout
                      ? 'rgba(236, 72, 153, 0.15)'
                      : 'rgba(66, 133, 244, 0.15)',
                    color: isBadge ? '#c084fc' : isShoutout ? '#f472b6' : 'var(--google-blue)',
                    border: `1px solid ${isBadge ? 'rgba(168, 85, 247, 0.3)' : isShoutout ? 'rgba(236, 72, 153, 0.3)' : 'rgba(66, 133, 244, 0.3)'}`,
                  }}
                >
                  {isBadge ? <Award size={22} /> : isShoutout ? <Heart size={22} fill="currentColor" /> : <Zap size={22} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                        {item.recipient.name}
                      </span>
                      {item.recipient.tierTitle && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-secondary)',
                            fontWeight: 700,
                          }}
                        >
                          {item.recipient.tierTitle}
                        </span>
                      )}
                      {item.author && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          recognized by <strong style={{ color: 'var(--text-primary)' }}>{item.author.name}</strong>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {item.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{item.title}</span>
                    {item.points && (
                      <span
                        style={{
                          fontWeight: 800,
                          color: 'var(--google-yellow)',
                          background: 'rgba(251, 188, 4, 0.12)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(251, 188, 4, 0.25)',
                        }}
                      >
                        +{item.points} pts
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Sending a Shout-out */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: '24px',
              border: '1px solid rgba(236, 72, 153, 0.3)',
              background: '#141724',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6' }}>
                  <Heart size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>Send Peer Shout-out</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awards +15 bonus points to your teammate</div>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendShoutOut} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Select Teammate
                </label>
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="" style={{ background: '#141724' }}>Choose member...</option>
                  {membersList
                    .filter((m) => m.id !== currentUserId)
                    .map((m) => (
                      <option key={m.id} value={m.id} style={{ background: '#141724' }}>
                        {m.full_name} ({m.role.replace(/_/g, ' ')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Your Appreciation Message
                </label>
                <textarea
                  value={shoutoutMessage}
                  onChange={(e) => setShoutoutMessage(e.target.value)}
                  placeholder="e.g. Outstanding dedication and support during yesterday's event setup!"
                  rows={3}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending || !targetMemberId || !shoutoutMessage.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    opacity: isSending ? 0.6 : 1,
                  }}
                >
                  <Send size={14} />
                  <span>{isSending ? 'Sending...' : 'Publish Shout-out (+15 pts)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
