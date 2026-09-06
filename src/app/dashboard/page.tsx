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
  ArrowRight, 
  Briefcase, 
  Image as ImageIcon, 
  ClipboardList, 
  UserCheck, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const admin = createAdminClient();

  // Run stats and context in parallel
  const [context, { count: memberCount }, { count: deptCount }] = await Promise.all([
    getUserContext(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('departments')
      .select('id', { count: 'exact', head: true }),
  ]);

  const role = context.profile?.role || 'member';
  const isPresident = role === 'president';
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Welcome Header */}
        <div className="glass-panel" style={{
          padding: '2.25rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
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
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#FFFFFF',
                flexShrink: 0,
              }}>
                {context.profile?.avatar_url ? (
                  <img src={context.profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                ) : (
                  context.profile?.full_name?.charAt(0) || 'U'
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
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: isPresident ? 'rgba(66, 133, 244, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                    color: isPresident ? '#93C5FD' : '#86EFAC',
                    border: isPresident ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(52, 168, 83, 0.4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {role.replace('_', ' ')}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.35rem', marginBottom: 0 }}>
                  {context.profile?.department ? (
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
                <ShieldCheck size={18} />
                <span>Approvals Queue ({context.pendingApprovalsCount})</span>
              </Link>
            ) : null}
          </div>
        </div>

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
    </AppShell>
  );
}
