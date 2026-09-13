import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  CheckSquare, 
  Calendar, 
  Award, 
  ChevronRight
} from 'lucide-react';
import { OnboardingChecklistWidget } from '@/components/dashboard/OnboardingChecklistWidget';
import { getProfileOnboardingProgress, generateOnboardingChecklistForProfile } from '@/lib/onboarding/checklist';
import { SharedCalendarSubscribeBanner } from '@/components/dashboard/SharedCalendarSubscribeBanner';
import { getSharedCalendarInfo } from '@/lib/calendar/calendar-client';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';

export const dynamic = 'force-dynamic';

async function DashboardDataLoader() {
  const admin = createAdminClient();

  // Run stats, context, and calendar info in parallel
  const [context, { count: memberCount }, { count: deptCount }, calendarInfo] = await Promise.all([
    getUserContext(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('departments')
      .select('id', { count: 'exact', head: true }),
    getSharedCalendarInfo().catch(() => null),
  ]);

  const role = context.profile?.role || 'member';
  const isPresident = role === 'president';
  const isCoPresident = role === 'co_president';
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);

  // Fetch onboarding progress for member
  let onboardingProgress = null;
  if (context.profile?.id) {
    try {
      onboardingProgress = await getProfileOnboardingProgress(context.profile.id);
      if (onboardingProgress.total === 0 && context.profile.status === 'active') {
        await generateOnboardingChecklistForProfile(context.profile.id, context.profile.department_id);
        onboardingProgress = await getProfileOnboardingProgress(context.profile.id);
      }
    } catch {
      onboardingProgress = null;
    }
  }

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Welcome Header */}
      <div className="glass-panel" style={{
        padding: '2.25rem',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: isPresident 
          ? 'radial-gradient(ellipse at top left, rgba(251, 188, 4, 0.12) 0%, rgba(66, 133, 244, 0.08) 50%, var(--surface-primary, #13151b) 100%)'
          : undefined,
        border: isPresident ? '1px solid rgba(251, 188, 4, 0.35)' : undefined,
      }}>
        {/* Top Google 4-Color Strip */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isPresident
                ? 'linear-gradient(135deg, #FBBC04, #4285F4)'
                : 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: isPresident ? '2.5px solid #FBBC04' : '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: isPresident ? '0 0 16px rgba(251, 188, 4, 0.4)' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#FFFFFF',
              flexShrink: 0,
              position: 'relative',
            }}>
              {context.profile?.avatar_url ? (
                <img src={context.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                context.profile?.full_name?.charAt(0) || 'U'
              )}
              {isPresident && (
                <div style={{ position: 'absolute', top: '-6px', right: '-4px', fontSize: '1rem' }}>
                  👑
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                  Welcome, {context.profile?.full_name || 'Member'}!
                </h1>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  background: isPresident 
                    ? 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(66, 133, 244, 0.25))' 
                    : isCoPresident
                    ? 'linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(52, 168, 83, 0.2))'
                    : 'rgba(52, 168, 83, 0.2)',
                  color: isPresident || isCoPresident ? '#FDE047' : '#86EFAC',
                  border: isPresident ? '1px solid rgba(251, 188, 4, 0.65)' : '1px solid rgba(52, 168, 83, 0.4)',
                  boxShadow: isPresident ? '0 0 12px rgba(251, 188, 4, 0.3)' : undefined,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {isPresident ? '👑 Chapter President' : isCoPresident ? '👑 Co-President' : role.replace('_', ' ')}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem', marginBottom: 0 }}>
                {isPresident ? (
                  <span style={{ color: '#FDE047', fontWeight: 600 }}>
                    Executive Chapter Oversight • Governing All Branches, Operations &amp; Committees
                  </span>
                ) : isCoPresident ? (
                  <span style={{ color: '#FDE047', fontWeight: 600 }}>
                    Executive Chapter Board • Co-Leading All Branches &amp; Operations
                  </span>
                ) : context.profile?.department ? (
                  <span>Assigned to <strong>{context.profile.department.name}</strong> • {context.profile.department.branch === 'tech' ? 'Tech Branch' : 'Non-Tech Branch'}</span>
                ) : (
                  <span>Google Developer Groups on Campus • Helwan National University</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          {isLeadership ? (
            <Link
              href="/approvals"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              <span>Review Approvals</span>
              <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Onboarding Checklist Widget (Spec §4.15) */}
      {onboardingProgress && (
        <OnboardingChecklistWidget
          initialProgress={onboardingProgress}
          profileId={context.profile?.id}
        />
      )}

      {/* Shared Calendar Subscribe Banner (Spec §4.17) */}
      <SharedCalendarSubscribeBanner
        calendarInfo={
          calendarInfo && calendarInfo.calendarId
            ? {
                calendarId: calendarInfo.calendarId,
                calendarName: calendarInfo.calendarName,
                timeZone: calendarInfo.timeZone,
                subscribableLink: calendarInfo.subscribableLink,
                icalUrl: calendarInfo.icalUrl,
              }
            : null
        }
      />

      {/* Role-Specific Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Approvals or Tasks */}
        {isLeadership ? (
          <Link href="/approvals" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Approvals</span>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color="var(--google-yellow)" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FDE047' }}>
                {context.pendingApprovalsCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Review new member applications</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/tasks" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>My Tasks</span>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={20} color="var(--google-blue)" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#93C5FD' }}>
                Active Board
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Track assignments & evidence</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </Link>
        )}

        {/* Card 2: Committees or Directory */}
        <Link href="/members" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chapter Members</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} color="var(--google-green)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#86EFAC' }}>
              {memberCount || 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Browse active roster</span>
              <ChevronRight size={13} />
            </div>
          </div>
        </Link>

        {/* Card 3: Committees Structure */}
        {isPresident ? (
          <Link href="/settings/committees" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Committees</span>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="var(--google-blue)" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>
                {deptCount || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Manage structure & leaders</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/events" style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chapter Events</span>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="var(--google-red)" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FFFFFF' }}>
                Upcoming
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>View workshops & hackathons</span>
                <ChevronRight size={13} />
              </div>
            </div>
          </Link>
        )}

        {/* Card 4: Leaderboard */}
        <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Gamification</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={20} color="var(--google-yellow)" />
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FDE047' }}>
              Top Points
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Chapter points & badges</span>
              <ChevronRight size={13} />
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Launchpad Section */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
          Chapter Workspaces & Tools
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {isLeadership ? (
            <Link href="/approvals" className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="var(--google-blue)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Approvals Inbox</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Review pending applications</div>
              </div>
            </Link>
          ) : null}

          {isPresident ? (
            <Link href="/settings/committees" className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="var(--google-green)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Committee Setup</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign Heads & tracks</div>
              </div>
            </Link>
          ) : null}

          <Link href="/members" className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="var(--google-yellow)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Member Directory</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contacts, roles, and skills</div>
            </div>
          </Link>

          <Link href="/tasks" className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={20} color="var(--google-red)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Task Boards</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kanban workflows</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const context = await getUserContext();

  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton role={context.profile?.role} />}>
        <DashboardDataLoader />
      </Suspense>
    </AppShell>
  );
}
