import React from 'react';
import { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import {
  canAccessHrDashboard,
  getHrDashboardKpis,
  getEventAttendanceDetails,
  getAttendanceLeaderboard,
  getLowEngagementAlerts,
} from '@/app/hr/actions';
import { HrAttendanceHub } from '@/components/hr/HrAttendanceHub';
import { redirect } from 'next/navigation';
import { ShieldCheck, ShieldAlert, Sparkles, UserCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HR Dashboard & Attendance | GDGoC HNU',
  description: 'Chapter-wide attendance rates, event check-in metrics, and HR management for GDGoC Helwan National University.',
};

import { HrAttendanceSkeleton } from '@/components/skeletons/HrAttendanceSkeleton';
import { Suspense } from 'react';

async function HrAttendanceDataLoader() {
  // 2. Fetch Dashboard KPIs, Event Attendance Data, Attendance Leaderboard, and Low Engagement Alerts in parallel
  const [kpis, initialAttendance, initialLeaderboard, initialLowEngagement] = await Promise.all([
    getHrDashboardKpis(),
    getEventAttendanceDetails(),
    getAttendanceLeaderboard(),
    getLowEngagementAlerts(),
  ]);

  return (
    <HrAttendanceHub
      kpis={kpis}
      initialAttendance={initialAttendance}
      initialLeaderboard={initialLeaderboard}
      initialLowEngagement={initialLowEngagement}
    />
  );
}

export default async function HrAttendancePage() {
  // 1. Access Check (Spec §1.1 & §4.5)
  const access = await canAccessHrDashboard();

  if (!access.hasAccess) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', borderRadius: '20px' }}>
            <ShieldAlert size={42} color="var(--google-red)" style={{ margin: '0 auto 1.25rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#FFFFFF' }}>
              Access Restricted
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              The HR Dashboard and Attendance metrics are restricted to members of the Human Resources Committee, Non-Tech Branch Leadership, and Chapter President / Co-President (Spec §3.17 &amp; §4.5).
            </p>
            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                color: '#FFFFFF',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        style={{
          padding: '2.5rem 2rem',
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Top Header (renders immediately) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: 'rgba(52, 168, 83, 0.15)',
                  color: 'var(--google-green)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                }}
              >
                <ShieldCheck size={13} /> HR Committee Workspace
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Spec §4.5 &bull; Step 10.1
              </span>
            </div>

            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              HR Dashboard &amp; Attendance
            </h1>
            <p
              style={{
                fontSize: '0.92rem',
                color: 'var(--text-secondary)',
                margin: '0.35rem 0 0',
                maxWidth: '650px',
                lineHeight: 1.5,
              }}
            >
              Real-time chapter attendance analytics, turnout rates, event check-in logs, and attendee reports for GDGoC Helwan National University.
            </p>
          </div>
        </div>

        {/* HR Attendance Hub wrapped in Suspense with HrAttendanceSkeleton */}
        <Suspense fallback={<HrAttendanceSkeleton />}>
          <HrAttendanceDataLoader />
        </Suspense>
      </div>
    </AppShell>
  );
}
