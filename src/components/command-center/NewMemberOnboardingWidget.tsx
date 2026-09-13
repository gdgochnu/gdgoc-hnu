'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  OnboardingOverviewSummary,
  MemberOnboardingProgress,
} from '@/types/command-center';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';

interface NewMemberOnboardingWidgetProps {
  initialSummary: OnboardingOverviewSummary;
}

export function NewMemberOnboardingWidget({ initialSummary }: NewMemberOnboardingWidgetProps) {
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const filteredMembers = initialSummary.members.filter((m) => {
    if (filter === 'completed') return m.isFullyOnboarded;
    if (filter === 'in_progress') return !m.isFullyOnboarded;
    return true;
  });

  return (
    <div
      id="new-member-onboarding-widget"
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.75rem',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34A853',
              }}
            >
              <UserCheck size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              New-Member Onboarding Overview
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Checklist progression for active chapter members and committee recruits.
          </p>
        </div>

        {/* Global Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.12)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#93C5FD',
            }}
          >
            Avg: {initialSummary.averageProgressPercentage}%
          </div>
          <div
            style={{
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#86EFAC',
            }}
          >
            {initialSummary.fullyCompletedCount} Ready
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            border: 'none',
            background: filter === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.06)',
            color: filter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          All ({initialSummary.members.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('in_progress')}
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            border: 'none',
            background: filter === 'in_progress' ? 'rgba(251, 188, 4, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            color: filter === 'in_progress' ? '#FCD34D' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          In Progress ({initialSummary.members.length - initialSummary.fullyCompletedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('completed')}
          style={{
            padding: '0.25rem 0.65rem',
            borderRadius: '999px',
            border: 'none',
            background: filter === 'completed' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.06)',
            color: filter === 'completed' ? '#86EFAC' : 'var(--text-secondary)',
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          100% Completed ({initialSummary.fullyCompletedCount})
        </button>
      </div>

      {/* Member Progress List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '380px',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}
      >
        {filteredMembers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No members found in this filter category.
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.profileId}
              style={{
                padding: '0.75rem 0.95rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.fullName}
                      style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: 'rgba(52, 168, 83, 0.2)',
                        color: '#86EFAC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      {member.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                      {member.fullName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {member.departmentName || 'General Chapter'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {member.isFullyOnboarded ? (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '999px',
                        background: 'rgba(52, 168, 83, 0.15)',
                        color: '#34A853',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                      }}
                    >
                      <CheckCircle2 size={11} />
                      Completed
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FCD34D' }}>
                      {member.completedChecklistItems}/{member.totalChecklistItems || '—'} items ({member.progressPercentage}%)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(member.progressPercentage, 4)}%`,
                    borderRadius: '999px',
                    background: member.isFullyOnboarded
                      ? 'linear-gradient(90deg, #34A853, #4285F4)'
                      : member.progressPercentage >= 50
                      ? 'linear-gradient(90deg, #FBBC04, #34A853)'
                      : 'linear-gradient(90deg, #EA4335, #FBBC04)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
        <Link
          href="/approvals"
          style={{
            fontSize: '0.75rem',
            color: 'var(--google-blue)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600,
          }}
        >
          <span>Manage Approvals & Onboarding</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
