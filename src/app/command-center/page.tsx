import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  canAccessCommandCenter,
  getCommitteeHealthScorecards,
  getNeedsAttentionFeed,
  getUpcomingLeadershipFeed,
  getWeeklyReviewsFeed,
  getUnifiedApprovalsQueue,
  getNewMemberOnboardingOverview,
  getEventSatisfactionTrend,
} from './actions';
import { CommitteeHealthGrid } from '@/components/command-center/CommitteeHealthGrid';
import { NeedsAttentionFeed } from '@/components/command-center/NeedsAttentionFeed';
import { UpcomingTimeline } from '@/components/command-center/UpcomingTimeline';
import { WeeklyReviewsWidget } from '@/components/command-center/WeeklyReviewsWidget';
import { UnifiedApprovalsQueue } from '@/components/command-center/UnifiedApprovalsQueue';
import { NewMemberOnboardingWidget } from '@/components/command-center/NewMemberOnboardingWidget';
import { EventSatisfactionWidget } from '@/components/command-center/EventSatisfactionWidget';
import { redirect } from 'next/navigation';
import { ShieldCheck, Activity, Compass, AlertCircle, MessageSquareQuote, Star, UserCheck } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CommandCenterPage() {
  const [context, access] = await Promise.all([
    getUserContext(),
    canAccessCommandCenter(),
  ]);

  if (!context.user || !context.profile) {
    redirect('/auth/signin');
  }

  if (context.profile.status !== 'active') {
    redirect('/onboarding');
  }

  if (!access.hasAccess) {
    return (
      <AppShell>
        <div style={{ maxWidth: '720px', margin: '5rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              borderRadius: '24px',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              background: 'rgba(234, 67, 53, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EA4335',
              }}
            >
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
              Access Restricted
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6, margin: 0 }}>
              The Command Center is reserved for Chapter Leadership (President, Co-President, Branch Heads, and Committee Heads).
            </p>
            <Link
              href="/dashboard"
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Fetch committee health scorecards (16.1), Needs Attention (16.2), Upcoming feed (16.3), Weekly Reviews (16.4), Unified Approvals (16.5), Onboarding & Event Satisfaction (16.6)
  const [
    scorecardsRes,
    needsAttentionRes,
    upcomingRes,
    weeklyReviewsRes,
    unifiedApprovalsRes,
    onboardingRes,
    eventSatisfactionRes,
  ] = await Promise.all([
    getCommitteeHealthScorecards(),
    getNeedsAttentionFeed(),
    getUpcomingLeadershipFeed(),
    getWeeklyReviewsFeed(),
    getUnifiedApprovalsQueue(),
    getNewMemberOnboardingOverview(),
    getEventSatisfactionTrend(),
  ]);

  const isPresident = context.profile.role === 'president';
  const isCoPresident = context.profile.role === 'co_president';

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '1380px',
          margin: '0 auto',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2.25rem',
        }}
      >
        {/* Executive Header Banner */}
        <div
          className="glass-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '2.25rem 2.5rem',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Top Google 4-Color Accent Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'rgba(66, 133, 244, 0.15)',
                    border: '1px solid rgba(66, 133, 244, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4285F4',
                    boxShadow: '0 0 25px rgba(66, 133, 244, 0.25)',
                  }}
                >
                  <Activity size={24} />
                </div>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#93C5FD',
                      background: 'rgba(66, 133, 244, 0.15)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '999px',
                    }}
                  >
                    {isPresident
                      ? 'Presidential Command Center'
                      : isCoPresident
                      ? 'Co-President Command Center'
                      : 'Leadership Command Center'}
                  </span>
                  <h1
                    style={{
                      fontSize: '2rem',
                      fontWeight: 900,
                      letterSpacing: '-0.03em',
                      color: '#FFFFFF',
                      margin: '0.35rem 0 0',
                    }}
                  >
                    Command Center & Health Scorecards
                  </h1>
                </div>
              </div>

              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '750px',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Real-time executive oversight across all chapter committees. Monitor task completion, deadline adherence, member engagement, and leadership attendance.
              </p>
            </div>

            {/* Quick action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <Link
                href="/approvals"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  transition: 'all 0.2s ease',
                }}
              >
                <ShieldCheck size={16} color="#FBBC04" />
                Approvals Queue
              </Link>
              <Link
                href="/workspace/operations"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: '12px',
                  background: 'rgba(66, 133, 244, 0.18)',
                  color: '#93C5FD',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  border: '1px solid rgba(66, 133, 244, 0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Compass size={16} color="#4285F4" />
                Operations Checklist
              </Link>
            </div>
          </div>
        </div>

        {/* Urgent Needs Attention Feed (Step 16.2) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <NeedsAttentionFeed initialSummary={needsAttentionRes.summary} />
        </section>

        {/* Unified Pending-Approvals Queue (Step 16.5) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <UnifiedApprovalsQueue initialSummary={unifiedApprovalsRes.summary} />
        </section>

        {/* Committee Health Scorecards Grid (Step 16.1) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
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
                <Activity size={20} color="#34A853" />
                Committee Health Scorecards
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                Composite performance index (%) based on task execution, deadlines, and member & head attendance.
              </p>
            </div>
          </div>

          <CommitteeHealthGrid initialSummary={scorecardsRes.summary} />
        </section>

        {/* Weekly 5-Question Reviews Pulse (Step 16.4) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <WeeklyReviewsWidget initialSummary={weeklyReviewsRes.summary} />
        </section>

        {/* Onboarding Overview & Event Satisfaction Trends (Step 16.6) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <NewMemberOnboardingWidget initialSummary={onboardingRes.summary} />
          <EventSatisfactionWidget initialSummary={eventSatisfactionRes.summary} />
        </section>

        {/* Upcoming Events & Task Deadlines Timeline (Step 16.3) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <UpcomingTimeline initialSummary={upcomingRes.summary} />
        </section>
      </div>
    </AppShell>
  );
}
