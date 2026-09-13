import React from 'react';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  Award, 
  CheckSquare, 
  ChevronRight 
} from 'lucide-react';

interface DashboardSkeletonProps {
  role?: string;
}

export function DashboardSkeleton({ role = 'member' }: DashboardSkeletonProps = {}) {
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(role);
  const isPresident = role === 'president';

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
      {/* Welcome Header Match */}
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
            {/* Circular Avatar shimmer */}
            <div
              className="skeleton-pulse"
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="skeleton-pulse" style={{ height: '28px', width: '220px', borderRadius: '6px' }} />
                <div className="skeleton-pulse" style={{ height: '22px', width: '90px', borderRadius: '999px' }} />
              </div>
              <div className="skeleton-pulse" style={{ height: '14px', width: '320px', borderRadius: '4px' }} />
            </div>
          </div>

          {/* Quick Action Button Shimmer - only for leadership */}
          {isLeadership ? (
            <div className="skeleton-pulse" style={{ height: '40px', width: '150px', borderRadius: '10px' }} />
          ) : null}
        </div>
      </div>

      {/* Metric Cards - Role-Aware exact match */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Pending Approvals (Leadership) vs My Tasks (Member) */}
        {isLeadership ? (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Approvals</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="var(--google-yellow)" style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="skeleton-pulse" style={{ height: '36px', width: '50px', borderRadius: '6px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Review new member applications</span>
              <ChevronRight size={13} />
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>My Tasks</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={20} color="var(--google-blue)" style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="skeleton-pulse" style={{ height: '36px', width: '120px', borderRadius: '6px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Track assignments &amp; evidence</span>
              <ChevronRight size={13} />
            </div>
          </div>
        )}

        {/* Card 2: Chapter Members */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chapter Members</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="var(--google-green)" style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '36px', width: '65px', borderRadius: '6px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Browse active roster</span>
            <ChevronRight size={13} />
          </div>
        </div>

        {/* Card 3: Active Committees (Leadership) vs Chapter Events (Member) */}
        {isLeadership ? (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Committees</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="var(--google-blue)" style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="skeleton-pulse" style={{ height: '36px', width: '45px', borderRadius: '6px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>Manage structure &amp; leaders</span>
              <ChevronRight size={13} />
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Chapter Events</span>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckSquare size={20} color="var(--google-red)" style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div className="skeleton-pulse" style={{ height: '36px', width: '100px', borderRadius: '6px' }} />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>View workshops &amp; hackathons</span>
              <ChevronRight size={13} />
            </div>
          </div>
        )}

        {/* Card 4: Gamification */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Gamification</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={20} color="var(--google-yellow)" style={{ opacity: 0.6 }} />
            </div>
          </div>
          <div className="skeleton-pulse" style={{ height: '36px', width: '100px', borderRadius: '6px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span>Chapter points &amp; badges</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* Chapter Workspaces & Tools Section */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
          Chapter Workspaces &amp; Tools
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Tool 1: Approvals Inbox (Leadership only) */}
          {isLeadership ? (
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="var(--google-blue)" style={{ opacity: 0.7 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Approvals Inbox</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Review pending applications</div>
              </div>
            </div>
          ) : null}

          {/* Tool 2: Committee Setup (President only) */}
          {isPresident ? (
            <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={20} color="var(--google-green)" style={{ opacity: 0.7 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Committee Setup</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assign Heads &amp; tracks</div>
              </div>
            </div>
          ) : null}

          {/* Tool 3: Member Directory */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="var(--google-yellow)" style={{ opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Member Directory</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Contacts, roles, and skills</div>
            </div>
          </div>

          {/* Tool 4: Task Boards */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckSquare size={20} color="var(--google-red)" style={{ opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>Task Boards</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kanban workflows</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
