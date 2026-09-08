'use client';

import React, { useState } from 'react';
import { Trophy, CalendarCheck2, Users, Sparkles } from 'lucide-react';
import {
  HrDashboardKpis,
  EventAttendanceSummary,
  AttendanceLeaderboardSummary,
} from '@/types';
import { HrDashboardKpiCards } from './HrDashboardKpiCards';
import { EventAttendanceView } from './EventAttendanceView';
import { AttendanceLeaderboard } from './AttendanceLeaderboard';

interface HrAttendanceHubProps {
  kpis: HrDashboardKpis;
  initialAttendance: EventAttendanceSummary;
  initialLeaderboard: AttendanceLeaderboardSummary;
}

export function HrAttendanceHub({
  kpis,
  initialAttendance,
  initialLeaderboard,
}: HrAttendanceHubProps) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'events'>('leaderboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Global HR KPI Cards */}
      <HrDashboardKpiCards kpis={kpis} />

      {/* 2. Modern Tab Navigation Switcher */}
      <div
        className="glass-panel"
        style={{
          padding: '0.45rem',
          borderRadius: '14px',
          display: 'inline-flex',
          gap: '0.45rem',
          alignSelf: 'flex-start',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <button
          onClick={() => setActiveTab('leaderboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.35rem',
            borderRadius: '10px',
            border: activeTab === 'leaderboard' ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid transparent',
            background:
              activeTab === 'leaderboard'
                ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(66, 133, 244, 0.1))'
                : 'transparent',
            color: activeTab === 'leaderboard' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Trophy
            size={16}
            color={activeTab === 'leaderboard' ? 'var(--google-blue)' : 'currentColor'}
          />
          Org-wide Attendance Leaderboard
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background:
                activeTab === 'leaderboard'
                  ? 'var(--google-blue)'
                  : 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
            }}
          >
            {initialLeaderboard.totalProfiles}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.35rem',
            borderRadius: '10px',
            border: activeTab === 'events' ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid transparent',
            background:
              activeTab === 'events'
                ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.25), rgba(52, 168, 83, 0.1))'
                : 'transparent',
            color: activeTab === 'events' ? '#FFFFFF' : 'var(--text-secondary)',
            fontSize: '0.86rem',
            fontWeight: 800,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <CalendarCheck2
            size={16}
            color={activeTab === 'events' ? 'var(--google-green)' : 'currentColor'}
          />
          Event Attendance Inspector
          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background:
                activeTab === 'events'
                  ? 'var(--google-green)'
                  : 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
            }}
          >
            {initialAttendance.eventsList.length}
          </span>
        </button>
      </div>

      {/* 3. Tab Content */}
      {activeTab === 'leaderboard' ? (
        <AttendanceLeaderboard initialSummary={initialLeaderboard} />
      ) : (
        <EventAttendanceView initialData={initialAttendance} />
      )}
    </div>
  );
}
