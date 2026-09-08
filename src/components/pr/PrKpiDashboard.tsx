'use client';

import React, { useState, useEffect } from 'react';
import {
  PrDashboardMetrics,
  PRContact,
  PrContactType,
  PrPipelineStage,
  PrInteractionType,
} from '@/types';
import { getPrDashboardMetrics } from '@/app/pr/actions';
import {
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Mail,
  Phone,
  MessageSquare,
  Building,
  Calendar,
  Award,
  RefreshCw,
  Loader2,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface PrKpiDashboardProps {
  onOpenInteractions?: (contactId: string) => void;
  contacts: PRContact[];
}

const TYPE_CONFIG: Record<PrContactType, { label: string; color: string; bg: string; emoji: string }> = {
  speaker: { label: 'Speakers', color: 'var(--google-blue, #4285F4)', bg: 'rgba(66, 133, 244, 0.15)', emoji: '🎤' },
  sponsor: { label: 'Sponsors', color: 'var(--google-yellow, #FBBC05)', bg: 'rgba(251, 188, 5, 0.15)', emoji: '💎' },
  partner: { label: 'Partners', color: 'var(--google-green, #34A853)', bg: 'rgba(52, 168, 83, 0.15)', emoji: '🤝' },
  venue: { label: 'Venues', color: '#a142f4', bg: 'rgba(161, 66, 244, 0.15)', emoji: '🏛️' },
  other: { label: 'Other', color: '#9aa0a6', bg: 'rgba(154, 160, 166, 0.15)', emoji: '📌' },
};

const CHANNEL_CONFIG: Record<PrInteractionType, { label: string; color: string; icon: React.ReactNode }> = {
  email: { label: 'Emails Sent', color: 'var(--google-blue, #4285F4)', icon: <Mail size={16} /> },
  call: { label: 'Phone Calls', color: 'var(--google-green, #34A853)', icon: <Phone size={16} /> },
  meeting: { label: 'Meetings Held', color: '#a142f4', icon: <Users size={16} /> },
  message: { label: 'Messages', color: 'var(--google-yellow, #FBBC05)', icon: <MessageSquare size={16} /> },
};

export function PrKpiDashboard({ onOpenInteractions, contacts }: PrKpiDashboardProps) {
  const [metrics, setMetrics] = useState<PrDashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await getPrDashboardMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      } else {
        setError(res.error || 'Failed to load PR metrics');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [contacts.length]);

  if (isLoading) {
    return (
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          backgroundColor: 'var(--bg-card, #13151b)',
          borderRadius: '1rem',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          color: '#9aa0a6',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--google-blue, #4285F4)', marginBottom: '0.75rem' }} />
        <span>Computing PR CRM Performance Analytics...</span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card, #13151b)',
          borderRadius: '1rem',
          border: '1px solid rgba(234, 67, 53, 0.3)',
          color: '#f28b82',
        }}
      >
        <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
        <div>{error || 'Unable to load PR metrics'}</div>
        <button
          onClick={() => fetchMetrics()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const totalContacts = metrics.totalContacts || 1;
  const stageCounts = metrics.stageBreakdown;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner: Conversion Funnel & Refresh */}
      <div
        className="glass-panel"
        style={{
          backgroundColor: 'var(--bg-card, #13151b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
          borderRadius: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              Outreach Funnel & Conversion Velocity
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#9aa0a6', margin: 0 }}>
              Progression of external leads through outreach stages to confirmed chapter agreements
            </p>
          </div>

          <button
            onClick={() => fetchMetrics(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              color: '#e8eaed',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Funnel visualization */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {/* New Leads */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(66, 133, 244, 0.08)',
              borderLeft: '4px solid var(--google-blue, #4285F4)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              1. New Leads
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
              {stageCounts.new}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#8ab4f8' }}>
              {Math.round((stageCounts.new / totalContacts) * 100)}% of pipeline
            </div>
          </div>

          {/* Contacted */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(251, 188, 5, 0.08)',
              borderLeft: '4px solid var(--google-yellow, #FBBC05)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              2. Contacted
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
              {stageCounts.contacted}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#fdd663' }}>
              {Math.round((stageCounts.contacted / totalContacts) * 100)}% outreach active
            </div>
          </div>

          {/* Negotiating */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(234, 67, 53, 0.08)',
              borderLeft: '4px solid var(--google-red, #EA4335)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              3. Negotiating
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
              {stageCounts.negotiating}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#f28b82' }}>
              {Math.round((stageCounts.negotiating / totalContacts) * 100)}% close to closing
            </div>
          </div>

          {/* Confirmed */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'rgba(52, 168, 83, 0.08)',
              borderLeft: '4px solid var(--google-green, #34A853)',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#9aa0a6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              4. Confirmed
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
              {stageCounts.confirmed}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#81c995' }}>
              {metrics.conversionRate}% conversion rate
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Two Columns: Breakdown by Contact Type & Outreach Channels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Contact Portfolio Distribution */}
        <div
          className="glass-panel"
          style={{
            backgroundColor: 'var(--bg-card, #13151b)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '1rem',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem' }}>
            <Building size={18} color="var(--google-blue, #4285F4)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              Contact Portfolio Breakdown
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(Object.keys(TYPE_CONFIG) as PrContactType[]).map((typeKey) => {
              const cfg = TYPE_CONFIG[typeKey];
              const count = metrics.typeBreakdown[typeKey] || 0;
              const pct = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;

              return (
                <div key={typeKey}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#e8eaed' }}>
                      <span>{cfg.emoji}</span>
                      <span style={{ fontWeight: 600 }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#bdc1c6' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{count}</span> ({pct}%)
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: cfg.color,
                        borderRadius: '999px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Outreach Communication Channels */}
        <div
          className="glass-panel"
          style={{
            backgroundColor: 'var(--bg-card, #13151b)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '1rem',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem' }}>
            <TrendingUp size={18} color="var(--google-green, #34A853)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              Outreach Channel Activity
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.85rem',
            }}
          >
            {(Object.keys(CHANNEL_CONFIG) as PrInteractionType[]).map((channelKey) => {
              const cfg = CHANNEL_CONFIG[channelKey];
              const count = metrics.interactionChannelBreakdown[channelKey] || 0;

              return (
                <div
                  key={channelKey}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: cfg.color, marginBottom: '0.4rem' }}>
                    {cfg.icon}
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Urgent Follow-ups Agenda & PR Team Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Urgent Follow-ups Agenda */}
        <div
          className="glass-panel"
          style={{
            backgroundColor: 'var(--bg-card, #13151b)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '1rem',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--google-yellow, #FBBC05)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Follow-ups Agenda
              </h3>
            </div>
            {metrics.overdueFollowUpsCount > 0 && (
              <span
                style={{
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(234, 67, 53, 0.15)',
                  color: '#f28b82',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {metrics.overdueFollowUpsCount} Overdue
              </span>
            )}
          </div>

          {metrics.urgentFollowUps.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9aa0a6', fontSize: '0.85rem' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--google-green, #34A853)', margin: '0 auto 0.5rem' }} />
              <div>All follow-ups are up to date!</div>
              <div style={{ fontSize: '0.75rem', color: '#5f6368', marginTop: '0.2rem' }}>
                Schedule outreach deadlines when logging interactions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {metrics.urgentFollowUps.map((item) => (
                <div
                  key={item.contactId}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '0.65rem',
                    backgroundColor: item.isOverdue
                      ? 'rgba(234, 67, 53, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    border: item.isOverdue
                      ? '1px solid rgba(234, 67, 53, 0.25)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.contactName}
                      </span>
                      {item.organization && (
                        <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>• {item.organization}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
                      <span style={{ color: item.isOverdue ? '#f28b82' : '#fdd663', fontWeight: 600 }}>
                        {item.isOverdue ? `Overdue (${Math.abs(item.diffDays)}d ago)` : `Due in ${item.diffDays}d`}
                      </span>
                      {item.assigneeName && (
                        <span style={{ color: '#5f6368' }}>• Assigned: {item.assigneeName}</span>
                      )}
                    </div>
                  </div>

                  {onOpenInteractions && (
                    <button
                      onClick={() => onOpenInteractions(item.contactId)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '0.45rem',
                        border: 'none',
                        backgroundColor: item.isOverdue ? 'rgba(234, 67, 53, 0.2)' : 'rgba(66, 133, 244, 0.15)',
                        color: item.isOverdue ? '#f28b82' : '#8ab4f8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Log Outreach
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PR Team Contribution Leaderboard */}
        <div
          className="glass-panel"
          style={{
            backgroundColor: 'var(--bg-card, #13151b)',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            borderRadius: '1rem',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.15rem' }}>
            <Award size={18} color="var(--google-blue, #4285F4)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
              PR Team Activity Leaderboard
            </h3>
          </div>

          {metrics.teamActivity.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#9aa0a6', fontSize: '0.85rem' }}>
              <Users size={24} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
              <div>No team activity recorded yet.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {metrics.teamActivity.map((member, idx) => (
                <div
                  key={member.profileId}
                  style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '0.65rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        backgroundColor:
                          idx === 0
                            ? 'rgba(251, 188, 5, 0.2)'
                            : idx === 1
                            ? 'rgba(154, 160, 166, 0.2)'
                            : idx === 2
                            ? 'rgba(234, 67, 53, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                        color:
                          idx === 0 ? '#fdd663' : idx === 1 ? '#dadce0' : idx === 2 ? '#f28b82' : '#9aa0a6',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {idx + 1}
                    </div>

                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt=""
                        style={{ width: '1.85rem', height: '1.85rem', borderRadius: '50%' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '1.85rem',
                          height: '1.85rem',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(66, 133, 244, 0.2)',
                          color: '#8ab4f8',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {member.name[0]}
                      </div>
                    )}

                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9aa0a6' }}>
                        {member.role.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--google-blue, #4285F4)' }}>
                        {member.interactionsCount}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#5f6368' }}>outreach logs</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--google-green, #34A853)' }}>
                        {member.contactsAssignedCount}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#5f6368' }}>contacts</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
