'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CommitteeHealthScorecard,
  CommitteeHealthSummary,
  CommitteeHealthStatus,
} from '@/types/command-center';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckSquare,
  Clock,
  UserCheck,
  Search,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface CommitteeHealthGridProps {
  initialSummary: CommitteeHealthSummary;
}

export function CommitteeHealthGrid({ initialSummary }: CommitteeHealthGridProps) {
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'tech' | 'non_tech'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | CommitteeHealthStatus>('all');

  const filteredScorecards = useMemo(() => {
    return initialSummary.scorecards.filter((card) => {
      // Branch filter
      if (selectedBranch !== 'all' && card.branch !== selectedBranch) return false;
      // Status filter
      if (selectedStatus !== 'all' && card.healthStatus !== selectedStatus) return false;
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = card.name.toLowerCase().includes(query);
        const matchesCode = card.code.toLowerCase().includes(query);
        const matchesHead =
          card.head?.fullName.toLowerCase().includes(query) ||
          card.coHead?.fullName.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesHead) return false;
      }
      return true;
    });
  }, [initialSummary.scorecards, selectedBranch, selectedStatus, searchQuery]);

  const getStatusBadge = (status: CommitteeHealthStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(52, 168, 83, 0.12)',
              color: '#34A853',
              border: '1px solid rgba(52, 168, 83, 0.3)',
            }}
          >
            <ShieldCheck size={13} color="#34A853" />
            Healthy
          </span>
        );
      case 'needs_attention':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(251, 188, 4, 0.12)',
              color: '#FBBC04',
              border: '1px solid rgba(251, 188, 4, 0.3)',
            }}
          >
            <AlertTriangle size={13} color="#FBBC04" />
            Needs Attention
          </span>
        );
      case 'critical':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'rgba(234, 67, 53, 0.12)',
              color: '#EA4335',
              border: '1px solid rgba(234, 67, 53, 0.3)',
            }}
          >
            <ShieldAlert size={13} color="#EA4335" />
            Critical
          </span>
        );
    }
  };

  const getScoreBadgeStyle = (score: number) => {
    if (score >= 80) {
      return {
        color: '#34A853',
        background: 'rgba(52, 168, 83, 0.1)',
        borderColor: 'rgba(52, 168, 83, 0.35)',
      };
    }
    if (score >= 60) {
      return {
        color: '#FBBC04',
        background: 'rgba(251, 188, 4, 0.1)',
        borderColor: 'rgba(251, 188, 4, 0.35)',
      };
    }
    return {
      color: '#EA4335',
      background: 'rgba(234, 67, 53, 0.1)',
      borderColor: 'rgba(234, 67, 53, 0.35)',
    };
  };

  const getProgressBarBg = (rate: number) => {
    if (rate >= 80) return 'linear-gradient(90deg, #34A853, #46d16d)';
    if (rate >= 60) return 'linear-gradient(90deg, #FBBC04, #fdd663)';
    return 'linear-gradient(90deg, #EA4335, #f87171)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Chapter Avg Health */}
        <div
          className="glass-panel"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Avg Chapter Health
            </span>
            <Sparkles size={16} color="#FBBC04" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>
              {initialSummary.avgHealthScore}%
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              composite index
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${initialSummary.avgHealthScore}%`,
                height: '100%',
                background: getProgressBarBg(initialSummary.avgHealthScore),
                borderRadius: '999px',
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Total Committees (Clickable to reset all filters) */}
        <div
          onClick={() => {
            setSelectedStatus('all');
            setSelectedBranch('all');
            setSearchQuery('');
          }}
          className="glass-panel"
          title="Click to reset filters and view all committees"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: selectedStatus === 'all' && selectedBranch === 'all' && !searchQuery
              ? '1px solid rgba(66, 133, 244, 0.4)'
              : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedStatus === 'all' && selectedBranch === 'all' && !searchQuery
              ? 'rgba(66, 133, 244, 0.1)'
              : 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Committees
            </span>
            <Users size={16} color="#4285F4" />
          </div>
          <div>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff' }}>
              {initialSummary.totalCommittees}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: selectedStatus === 'all' && selectedBranch === 'all' ? '#93C5FD' : 'var(--text-secondary)' }}>
            {selectedStatus !== 'all' || selectedBranch !== 'all' || searchQuery ? 'Click to show all' : 'Tech & Non-Tech branches'}
          </span>
        </div>

        {/* Healthy Card */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'healthy' ? 'all' : 'healthy')}
          className="glass-panel"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: selectedStatus === 'healthy' ? '1px solid #34A853' : '1px solid rgba(52, 168, 83, 0.2)',
            background: selectedStatus === 'healthy' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(52, 168, 83, 0.05)',
            boxShadow: selectedStatus === 'healthy' ? '0 0 20px rgba(52, 168, 83, 0.25)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#34A853', textTransform: 'uppercase' }}>
              Healthy
            </span>
            <ShieldCheck size={16} color="#34A853" />
          </div>
          <div>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34A853' }}>
              {initialSummary.healthyCount}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(52, 168, 83, 0.8)' }}>
            ≥ 80% Performance Score
          </span>
        </div>

        {/* Needs Attention Card */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'needs_attention' ? 'all' : 'needs_attention')}
          className="glass-panel"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: selectedStatus === 'needs_attention' ? '1px solid #FBBC04' : '1px solid rgba(251, 188, 4, 0.2)',
            background: selectedStatus === 'needs_attention' ? 'rgba(251, 188, 4, 0.15)' : 'rgba(251, 188, 4, 0.05)',
            boxShadow: selectedStatus === 'needs_attention' ? '0 0 20px rgba(251, 188, 4, 0.25)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#FBBC04', textTransform: 'uppercase' }}>
              Needs Attention
            </span>
            <AlertTriangle size={16} color="#FBBC04" />
          </div>
          <div>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#FBBC04' }}>
              {initialSummary.needsAttentionCount}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(251, 188, 4, 0.8)' }}>
            60% – 79% Performance Score
          </span>
        </div>

        {/* Critical Card */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'critical' ? 'all' : 'critical')}
          className="glass-panel"
          style={{
            padding: '1.35rem 1.5rem',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: selectedStatus === 'critical' ? '1px solid #EA4335' : '1px solid rgba(234, 67, 53, 0.2)',
            background: selectedStatus === 'critical' ? 'rgba(234, 67, 53, 0.15)' : 'rgba(234, 67, 53, 0.05)',
            boxShadow: selectedStatus === 'critical' ? '0 0 20px rgba(234, 67, 53, 0.25)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#EA4335', textTransform: 'uppercase' }}>
              Critical
            </span>
            <ShieldAlert size={16} color="#EA4335" />
          </div>
          <div>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#EA4335' }}>
              {initialSummary.criticalCount}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'rgba(234, 67, 53, 0.8)' }}>
            &lt; 60% Urgent Intervention
          </span>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Branch Tabs */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {(['all', 'tech', 'non_tech'] as const).map((branch) => {
            const isActive = selectedBranch === branch;
            const label =
              branch === 'all'
                ? `All Committees (${initialSummary.totalCommittees})`
                : branch === 'tech'
                ? 'Tech Branch'
                : 'Non-Tech Branch';
            return (
              <button
                key={branch}
                onClick={() => setSelectedBranch(branch)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: isActive ? '#4285F4' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  boxShadow: isActive ? '0 2px 8px rgba(66, 133, 244, 0.4)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search committee or Head..."
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '0.55rem 0.9rem 0.55rem 2.25rem',
              color: '#fff',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4285F4';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(66, 133, 244, 0.25)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Active Filter Bar (if any filter is applied) */}
      {(selectedStatus !== 'all' || selectedBranch !== 'all' || searchQuery.trim()) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            background: 'rgba(66, 133, 244, 0.08)',
            border: '1px solid rgba(66, 133, 244, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Filtered by:</span>
            {selectedStatus !== 'all' && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background:
                    selectedStatus === 'healthy'
                      ? 'rgba(52, 168, 83, 0.2)'
                      : selectedStatus === 'needs_attention'
                      ? 'rgba(251, 188, 4, 0.2)'
                      : 'rgba(234, 67, 53, 0.2)',
                  color:
                    selectedStatus === 'healthy'
                      ? '#34A853'
                      : selectedStatus === 'needs_attention'
                      ? '#FBBC04'
                      : '#EA4335',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'capitalize',
                }}
              >
                Status: {selectedStatus.replace('_', ' ')}
              </span>
            )}
            {selectedBranch !== 'all' && (
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                Branch: {selectedBranch === 'tech' ? 'Tech' : 'Non-Tech'}
              </span>
            )}
            {searchQuery.trim() && (
              <span
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  fontSize: '0.75rem',
                }}
              >
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              ({filteredScorecards.length} result{filteredScorecards.length !== 1 ? 's' : ''})
            </span>
          </div>

          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedBranch('all');
              setSearchQuery('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#93C5FD',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              textDecoration: 'underline',
            }}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* 3. Cards Grid */}
      {filteredScorecards.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3.5rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            background: 'rgba(19, 27, 46, 0.4)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(66, 133, 244, 0.1)',
              border: '1px solid rgba(66, 133, 244, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4285F4',
            }}
          >
            <Info size={28} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              No Committees Match Current Filter
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: '480px', lineHeight: 1.5 }}>
              {selectedStatus === 'healthy' ? (
                <>
                  You filtered by <strong style={{ color: '#34A853' }}>Healthy (0)</strong>. There are{' '}
                  <strong style={{ color: '#fff' }}>{initialSummary.totalCommittees}</strong> committees currently in{' '}
                  <strong style={{ color: '#EA4335' }}>Critical ({initialSummary.criticalCount})</strong> status.
                </>
              ) : selectedStatus === 'needs_attention' ? (
                <>
                  You filtered by <strong style={{ color: '#FBBC04' }}>Needs Attention (0)</strong>.
                </>
              ) : (
                'No committees matched your search or branch selection.'
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedStatus('all');
              setSelectedBranch('all');
              setSearchQuery('');
            }}
            style={{
              marginTop: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.4rem',
              borderRadius: '12px',
              background: '#4285F4',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(66, 133, 244, 0.35)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3b78e7')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4285F4')}
          >
            Show All Committees ({initialSummary.totalCommittees})
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredScorecards.map((card) => {
            const scoreStyle = getScoreBadgeStyle(card.overallHealthScore);

            return (
              <div
                key={card.departmentId}
                className="glass-panel"
                style={{
                  padding: '1.65rem',
                  borderRadius: '22px',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                  e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            letterSpacing: '0.05em',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                            textTransform: 'uppercase',
                          }}
                        >
                          {card.code}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {card.branch === 'tech' ? 'Tech Branch' : 'Non-Tech'}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          margin: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {card.name}
                      </h3>
                    </div>

                    {/* Overall Score & Status */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                      {getStatusBadge(card.healthStatus)}
                      <div
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '12px',
                          border: `1px solid ${scoreStyle.borderColor}`,
                          background: scoreStyle.background,
                          color: scoreStyle.color,
                          fontSize: '1.05rem',
                          fontWeight: 900,
                        }}
                      >
                        {card.overallHealthScore}%
                      </div>
                    </div>
                  </div>

                  {/* 4 Core Health Metrics Section */}
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '1rem',
                      borderRadius: '14px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    {/* Metric 1: Task Completion */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <CheckSquare size={13} color="#4285F4" />
                          Task Completion
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {card.taskCompletionRate}%{' '}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            ({card.completedTasks}/{card.totalTasks})
                          </span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${card.taskCompletionRate}%`,
                            height: '100%',
                            background: getProgressBarBg(card.taskCompletionRate),
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric 2: Deadline Adherence */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Clock size={13} color="#FBBC04" />
                          Deadline Adherence
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {card.deadlineAdherenceRate}%{' '}
                          {card.overdueTasks > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 600 }}>
                              ({card.overdueTasks} late)
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${card.deadlineAdherenceRate}%`,
                            height: '100%',
                            background: getProgressBarBg(card.deadlineAdherenceRate),
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric 3: Member Attendance */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Users size={13} color="#34A853" />
                          Member Attendance
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {card.avgMemberAttendanceRate}%{' '}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            ({card.activeMembersCount} members)
                          </span>
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${card.avgMemberAttendanceRate}%`,
                            height: '100%',
                            background: getProgressBarBg(card.avgMemberAttendanceRate),
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric 4: Head Attendance */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <UserCheck size={13} color="#EA4335" />
                          Head Attendance
                        </span>
                        <span style={{ fontWeight: 700, color: '#fff' }}>
                          {card.headAttendanceRate !== null ? (
                            `${card.headAttendanceRate}%`
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              Not Assigned
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${card.headAttendanceRate ?? 0}%`,
                            height: '100%',
                            background:
                              card.headAttendanceRate !== null
                                ? getProgressBarBg(card.headAttendanceRate)
                                : 'rgba(255, 255, 255, 0.15)',
                            borderRadius: '999px',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leadership Info Bar */}
                  <div
                    style={{
                      marginTop: '1.15rem',
                      paddingTop: '0.9rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      {card.head?.avatarUrl ? (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            flexShrink: 0,
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={card.head.avatarUrl}
                            alt={card.head.fullName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {card.head?.fullName ? card.head.fullName.charAt(0) : '?'}
                        </div>
                      )}
                      <div>
                        <p style={{ fontWeight: 700, color: '#fff', margin: 0 }}>
                          {card.head?.fullName || 'No Head Assigned'}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '0.1rem 0 0' }}>
                          {card.head ? 'Committee Head' : 'Vacancy'}
                        </p>
                      </div>
                    </div>

                    {card.head && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {card.head.attendanceRate}% Attendance
                      </span>
                    )}
                  </div>

                  {/* Alerts (if any) */}
                  {card.alerts.length > 0 && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {card.alerts.map((alert, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(234, 67, 53, 0.1)',
                            color: '#fca5a5',
                            border: '1px solid rgba(234, 67, 53, 0.25)',
                          }}
                        >
                          <AlertTriangle size={11} color="#fca5a5" />
                          {alert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    marginTop: '0.5rem',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                    {card.activeMembersCount} active member{card.activeMembersCount !== 1 ? 's' : ''}
                  </span>

                  <Link
                    href={`/tasks?departmentId=${card.departmentId}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#4285F4',
                      textDecoration: 'none',
                      transition: 'color 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#93c5fd')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#4285F4')}
                  >
                    View Tasks
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
