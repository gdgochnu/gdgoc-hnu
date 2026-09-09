'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  NeedsAttentionFeedSummary,
  NeedsAttentionItem,
  AttentionItemCategory,
  AttentionItemSeverity,
} from '@/types/command-center';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Users,
  DollarSign,
  Send,
  UserX,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  Flame,
  CheckSquare,
  Sparkles,
} from 'lucide-react';

interface NeedsAttentionFeedProps {
  initialSummary: NeedsAttentionFeedSummary;
}

export function NeedsAttentionFeed({ initialSummary }: NeedsAttentionFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | AttentionItemCategory>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | AttentionItemSeverity>('all');

  const filteredItems = useMemo(() => {
    return initialSummary.items.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
      return true;
    });
  }, [initialSummary.items, selectedCategory, selectedSeverity]);

  const getCategoryIcon = (category: AttentionItemCategory) => {
    switch (category) {
      case 'overdue_task':
        return <Clock size={16} color="#EA4335" />;
      case 'stalled_approval':
        return <ShieldAlert size={16} color="#FBBC04" />;
      case 'pr_follow_up':
        return <Send size={16} color="#4285F4" />;
      case 'inactive_member':
        return <UserX size={16} color="#A78BFA" />;
      case 'event_over_budget':
        return <DollarSign size={16} color="#EA4335" />;
    }
  };

  const getCategoryLabel = (category: AttentionItemCategory) => {
    switch (category) {
      case 'overdue_task':
        return 'Overdue Task';
      case 'stalled_approval':
        return 'Stalled Approval';
      case 'pr_follow_up':
        return 'PR Follow-up';
      case 'inactive_member':
        return 'Inactive Member';
      case 'event_over_budget':
        return 'Budget Overrun';
    }
  };

  const getCategoryBadgeStyle = (category: AttentionItemCategory) => {
    switch (category) {
      case 'overdue_task':
        return {
          background: 'rgba(234, 67, 53, 0.12)',
          color: '#EA4335',
          border: '1px solid rgba(234, 67, 53, 0.3)',
        };
      case 'stalled_approval':
        return {
          background: 'rgba(251, 188, 4, 0.12)',
          color: '#FBBC04',
          border: '1px solid rgba(251, 188, 4, 0.3)',
        };
      case 'pr_follow_up':
        return {
          background: 'rgba(66, 133, 244, 0.12)',
          color: '#4285F4',
          border: '1px solid rgba(66, 133, 244, 0.3)',
        };
      case 'inactive_member':
        return {
          background: 'rgba(167, 139, 250, 0.12)',
          color: '#C4B5FD',
          border: '1px solid rgba(167, 139, 250, 0.3)',
        };
      case 'event_over_budget':
        return {
          background: 'rgba(234, 67, 53, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(234, 67, 53, 0.35)',
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Feed Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                margin: 0,
              }}
            >
              <Flame size={22} color="#EA4335" />
              &ldquo;Needs Attention&rdquo; Feed
            </h2>
            {initialSummary.urgentCount > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(234, 67, 53, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(234, 67, 53, 0.4)',
                  boxShadow: '0 0 12px rgba(234, 67, 53, 0.3)',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#EA4335',
                  }}
                />
                {initialSummary.urgentCount} Urgent
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
            Automated triage of bottlenecks: overdue tasks, stalled reviews, urgent PR follow-ups, inactive members, and budget variances.
          </p>
        </div>

        {/* Severity Filter */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={() => setSelectedSeverity('all')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: selectedSeverity === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: selectedSeverity === 'all' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            All Severities ({initialSummary.totalIssuesCount})
          </button>
          <button
            onClick={() => setSelectedSeverity('urgent')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '7px',
              border: 'none',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: selectedSeverity === 'urgent' ? 'rgba(234, 67, 53, 0.25)' : 'transparent',
              color: selectedSeverity === 'urgent' ? '#fca5a5' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Urgent Only ({initialSummary.urgentCount})
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'all' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'all' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'all' ? '#93C5FD' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
        >
          All Categories ({initialSummary.totalIssuesCount})
        </button>

        <button
          onClick={() => setSelectedCategory('overdue_task')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'overdue_task' ? '1px solid #EA4335' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'overdue_task' ? 'rgba(234, 67, 53, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'overdue_task' ? '#fca5a5' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Clock size={13} color="#EA4335" />
          Overdue Tasks ({initialSummary.overdueTasksCount})
        </button>

        <button
          onClick={() => setSelectedCategory('stalled_approval')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'stalled_approval' ? '1px solid #FBBC04' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'stalled_approval' ? 'rgba(251, 188, 4, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'stalled_approval' ? '#fde047' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldAlert size={13} color="#FBBC04" />
          Stalled Approvals ({initialSummary.stalledApprovalsCount})
        </button>

        <button
          onClick={() => setSelectedCategory('pr_follow_up')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'pr_follow_up' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'pr_follow_up' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'pr_follow_up' ? '#93C5FD' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Send size={13} color="#4285F4" />
          PR Follow-ups ({initialSummary.prFollowUpsCount})
        </button>

        <button
          onClick={() => setSelectedCategory('inactive_member')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'inactive_member' ? '1px solid #A78BFA' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'inactive_member' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'inactive_member' ? '#DDD6FE' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <UserX size={13} color="#A78BFA" />
          Inactive Members ({initialSummary.inactiveMembersCount})
        </button>

        <button
          onClick={() => setSelectedCategory('event_over_budget')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedCategory === 'event_over_budget' ? '1px solid #EA4335' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedCategory === 'event_over_budget' ? 'rgba(234, 67, 53, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedCategory === 'event_over_budget' ? '#fca5a5' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <DollarSign size={13} color="#EA4335" />
          Budget Overruns ({initialSummary.eventsOverBudgetCount})
        </button>
      </div>

      {/* Feed Items Container */}
      {filteredItems.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.85rem',
            border: '1px solid rgba(52, 168, 83, 0.2)',
            background: 'rgba(52, 168, 83, 0.04)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34A853',
            }}
          >
            <CheckCircle2 size={28} />
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            All Clear in This Category!
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '440px' }}>
            No pending bottlenecks or urgent issues found. The chapter is operating within normal parameters.
          </p>

          {(selectedCategory !== 'all' || selectedSeverity !== 'all') && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSeverity('all');
              }}
              style={{
                marginTop: '0.4rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                padding: '0.45rem 0.95rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map((item) => {
            const categoryBadge = getCategoryBadgeStyle(item.category);
            const isUrgent = item.severity === 'urgent';

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.15rem 1.4rem',
                  borderRadius: '16px',
                  border: isUrgent
                    ? '1px solid rgba(234, 67, 53, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isUrgent
                    ? 'linear-gradient(135deg, rgba(234, 67, 53, 0.08) 0%, rgba(19, 27, 46, 0.8) 100%)'
                    : 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isUrgent
                    ? 'rgba(234, 67, 53, 0.6)'
                    : 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateX(3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isUrgent
                    ? 'rgba(234, 67, 53, 0.35)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Left Side: Icon & Details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: '280px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: categoryBadge.background,
                      border: categoryBadge.border,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {getCategoryIcon(item.category)}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {/* Chips Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          ...categoryBadge,
                        }}
                      >
                        {getCategoryLabel(item.category)}
                      </span>

                      {item.departmentCode && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.07)',
                            color: '#fff',
                          }}
                        >
                          {item.departmentCode}
                        </span>
                      )}

                      {isUrgent && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            background: '#EA4335',
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Urgent
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      style={{
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </h4>

                    {/* Subtitle / Details */}
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Right Side: Action Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Link
                    href={item.actionUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.55rem 1rem',
                      borderRadius: '10px',
                      background: isUrgent ? 'rgba(234, 67, 53, 0.15)' : 'rgba(66, 133, 244, 0.15)',
                      color: isUrgent ? '#fca5a5' : '#93C5FD',
                      border: isUrgent
                        ? '1px solid rgba(234, 67, 53, 0.35)'
                        : '1px solid rgba(66, 133, 244, 0.35)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isUrgent
                        ? 'rgba(234, 67, 53, 0.25)'
                        : 'rgba(66, 133, 244, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isUrgent
                        ? 'rgba(234, 67, 53, 0.15)'
                        : 'rgba(66, 133, 244, 0.15)';
                    }}
                  >
                    {item.actionLabel}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
