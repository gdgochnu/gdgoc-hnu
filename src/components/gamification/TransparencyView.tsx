'use client';

import React, { useState } from 'react';
import {
  Award,
  Shield,
  Flame,
  Zap,
  Trophy,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Sparkles,
  BookOpen,
  Eye,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import type { PointRule } from '@/types/gamification';
import { TIERS } from '@/lib/gamification/levels-streaks';
import { Badge, BADGE_TIER_STYLES } from '@/lib/gamification/badges-engine';
import { TierBadge, StreakWidget } from '@/components/gamification/TierBadge';
import { updatePointRuleAction } from '@/app/gamification/actions';

interface TransparencyViewProps {
  pointRules: PointRule[];
  badges: Badge[];
  userRole?: string;
  onRuleUpdated?: () => void;
}

export function TransparencyView({
  pointRules: initialRules,
  badges,
  userRole,
  onRuleUpdated,
}: TransparencyViewProps) {
  const [rules, setRules] = useState<PointRule[]>(initialRules);
  const [activeSection, setActiveSection] = useState<
    'all' | 'rules' | 'tiers' | 'streaks' | 'badges' | 'seasons'
  >('all');

  // Editing state for President/Co-President
  const isPresidential = userRole === 'president' || userRole === 'co_president';
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEditing = (rule: PointRule) => {
    setEditingRuleId(rule.id);
    setEditPoints(rule.points);
    setEditIsActive(rule.is_active);
    setFeedbackMsg(null);
  };

  const cancelEditing = () => {
    setEditingRuleId(null);
    setFeedbackMsg(null);
  };

  const saveRule = async (ruleId: string) => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await updatePointRuleAction(ruleId, {
        points: editPoints,
        is_active: editIsActive,
      });

      if (res.success && res.rule) {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? res.rule! : r)));
        setFeedbackMsg({ type: 'success', text: `Rule "${res.rule.title}" updated successfully.` });
        setEditingRuleId(null);
        if (onRuleUpdated) onRuleUpdated();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to update rule' });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'all', label: 'All Modules', icon: Sparkles },
    { id: 'rules', label: 'Point Rules', icon: Zap },
    { id: 'tiers', label: 'Tiers & Levels', icon: Shield },
    { id: 'streaks', label: 'Streak Engine', icon: Flame },
    { id: 'badges', label: 'Badge Catalog', icon: Award },
    { id: 'seasons', label: 'Seasons & Reset', icon: Trophy },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '24px',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          background: 'radial-gradient(ellipse at top left, rgba(66, 133, 244, 0.15), rgba(26, 29, 46, 0.85) 75%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
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
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: 'var(--google-blue)',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            <BookOpen size={12} />
            Full Scoring Transparency (§4.13)
          </div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            How Points, Levels & Badges Work
          </h2>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, maxWidth: '750px' }}>
            At GDGoC Helwan University, we believe in 100% transparency. Every point earned, every tier reached,
            and every badge unlocked follows public, objective rules with zero hidden scoring.
          </p>

          {isPresidential && (
            <div
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.35)',
                color: '#fde047',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <Sliders size={14} />
              <span>Presidential Mode Active: You can tune point values and rule activation below.</span>
            </div>
          )}
        </div>

        {/* Navigation Pills */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
          {sections.map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: active ? '1px solid var(--google-blue)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: active ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.03)',
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedbackMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: feedbackMsg.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(234, 67, 53, 0.4)'}`,
            color: feedbackMsg.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.8 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: POINT RULES TABLE */}
      {(activeSection === 'all' || activeSection === 'rules') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="var(--google-yellow)" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Points Economy & Action Rules
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {rules.length} Registered Rules
            </span>
          </div>

          <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '1rem 1.25rem' }}>Action & Purpose</th>
                    <th style={{ padding: '1rem 1.25rem' }}>Action Key</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Reward</th>
                    <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Status</th>
                    {isPresidential && <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Controls</th>}
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => {
                    const isEditing = editingRuleId === rule.id;

                    return (
                      <tr
                        key={rule.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: isEditing ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 800, color: '#fff' }}>{rule.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '420px' }}>
                            {rule.description || 'Awarded on trigger completion.'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--google-blue)', background: 'rgba(66, 133, 244, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            {rule.action_key}
                          </code>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <input
                                type="number"
                                value={editPoints}
                                onChange={(e) => setEditPoints(Number(e.target.value))}
                                style={{ width: '70px', padding: '0.3rem 0.5rem', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--google-blue)', color: '#fff', textAlign: 'center', fontWeight: 800 }}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'var(--google-yellow)' }}>pts</span>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.15)', border: '1px solid rgba(251, 188, 4, 0.3)', color: 'var(--google-yellow)', fontWeight: 800, fontSize: '0.78rem' }}>
                              +{rule.points} pts
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          {isEditing ? (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              <input
                                type="checkbox"
                                checked={editIsActive}
                                onChange={(e) => setEditIsActive(e.target.checked)}
                              />
                              <span>{editIsActive ? 'Active' : 'Disabled'}</span>
                            </label>
                          ) : rule.is_active ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#86efac', fontSize: '0.78rem', fontWeight: 600 }}>
                              <CheckCircle2 size={13} /> Active
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              <X size={13} /> Inactive
                            </span>
                          )}
                        </td>

                        {isPresidential && (
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {isEditing ? (
                              <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                <button
                                  onClick={() => saveRule(rule.id)}
                                  disabled={isSaving}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: 'none', background: 'var(--google-green)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  <Check size={12} /> {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(rule)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Edit3 size={12} color="var(--google-blue)" /> Tune
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: TIERS & LEVELS */}
      {(activeSection === 'all' || activeSection === 'tiers') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--google-blue)" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Member Tiers & Level Progression
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {TIERS.map((tier) => (
              <div
                key={tier.tier}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  borderRadius: '18px',
                  border: `1px solid ${tier.borderColor}`,
                  background: `radial-gradient(ellipse at top right, ${tier.bgColor}, rgba(255, 255, 255, 0.02) 75%)`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <TierBadge tier={tier.tier} size="md" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                      Lvl {tier.level}
                    </span>
                  </div>

                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    {tier.title}
                  </h4>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: tier.color, margin: '0.25rem 0 0.5rem 0' }}>
                    {tier.minPoints}
                    {tier.maxPoints ? ` – ${tier.maxPoints} pts` : '+ pts (No Cap)'}
                  </div>

                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {tier.description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Badge theme:</span>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: tier.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: STREAK TRACKING ENGINE */}
      {(activeSection === 'all' || activeSection === 'streaks') && (
        <div
          className="glass-panel"
          style={{
            padding: '1.75rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={20} color="#ea4335" />
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Streak Engine & Habit Building
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {/* Event Attendance Streak */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                background: 'rgba(234, 67, 53, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Flame size={18} color="#ea4335" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Event Attendance Streak</span>
                </div>
                <StreakWidget eventStreak={3} />
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Earned by checking in at consecutive chapter workshops and hackathons within 60 days.
              </p>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Threshold: Check-in verified via QR or manual kiosk.
              </div>
            </div>

            {/* Task Delivery Streak */}
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                background: 'rgba(52, 168, 83, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={18} color="var(--google-green)" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>On-Time Task Delivery Streak</span>
                </div>
                <StreakWidget taskStreak={5} />
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                Earned by shipping committee tasks on or before their agreed deadline.
              </p>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Threshold: Task status reached `done` on or before deadline.
              </div>
            </div>
          </div>

          {/* Non-Punitive Guarantee Alert */}
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(66, 133, 244, 0.1)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            <Shield size={20} color="var(--google-blue)" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#fff' }}>Non-Punitive Streak Guarantee (§4.13): </strong>
              Streak breaks are visible to encourage habit building, but you will <strong>never lose points</strong> or suffer penalties when a streak resets.
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: BADGE CATALOG */}
      {(activeSection === 'all' || activeSection === 'badges') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} color="#a855f7" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Official Badge Catalog & Criteria
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
              {badges.length} Available Badges
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {badges.map((badge) => {
              const style = BADGE_TIER_STYLES[badge.tier] || BADGE_TIER_STYLES.bronze;

              return (
                <div
                  key={badge.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '18px',
                    border: `1px solid ${style.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: style.bgColor,
                            border: `1px solid ${style.borderColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: style.color,
                            flexShrink: 0,
                          }}
                        >
                          <Award size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                            {badge.name}
                          </h4>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: style.color,
                            }}
                          >
                            {style.label} Tier • {badge.category}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: 'var(--google-yellow)',
                          background: 'rgba(251, 188, 4, 0.12)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(251, 188, 4, 0.25)',
                          flexShrink: 0,
                        }}
                      >
                        +{badge.points_reward} pts
                      </span>
                    </div>

                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {badge.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Code: <code style={{ color: 'var(--google-blue)', fontFamily: 'monospace' }}>{badge.code}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 5: SEASONS & LEADERBOARD VISIBILITY */}
      {(activeSection === 'all' || activeSection === 'seasons') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Seasonal Reset */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} color="var(--google-yellow)" />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                Seasonal Fair-Play & All-Time Hall of Fame
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Every semester (Fall and Spring), the <strong>Seasonal Leaderboard</strong> resets so incoming members have an equal opportunity to compete.
            </p>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li><strong>Seasonal:</strong> Reflects points earned in the current semester.</li>
              <li><strong>All-Time Hall of Fame:</strong> Never resets! Lifetime cumulative ranking.</li>
              <li><strong>Badges & Tiers:</strong> Permanent! Once unlocked, they stay on your profile forever.</li>
            </ul>
          </div>

          {/* Privacy & Opt-in Visibility */}
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} color="var(--google-blue)" />
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                Opt-in Leaderboard Visibility
              </h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              In accordance with spec §4.13, appearing on the public leaderboard is <strong>100% opt-in</strong>.
            </p>
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <li>You can toggle your visibility anytime on the Leaderboard tab.</li>
              <li>If opt-out: points and badges accrue normally, but your name won't appear on public rankings.</li>
              <li>Your committee's aggregate team score still benefits from your contributions!</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
