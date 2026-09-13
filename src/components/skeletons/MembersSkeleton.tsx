import React from 'react';
import { 
  Users, 
  Building2, 
  Sparkles, 
  Search, 
  Filter, 
  ArrowUpDown, 
  GraduationCap, 
  Mail, 
  Phone, 
  ChevronRight 
} from 'lucide-react';

export function MembersSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* 3 Stat Cards Bar - exact match */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Stat 1 */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="var(--google-blue)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Visible Members</div>
            <div className="skeleton-pulse" style={{ height: '24px', width: '40px', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={20} color="var(--google-green)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Departments</div>
            <div className="skeleton-pulse" style={{ height: '24px', width: '35px', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--google-yellow)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Leadership Roster</div>
            <div className="skeleton-pulse" style={{ height: '24px', width: '30px', borderRadius: '4px' }} />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar - exact match */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Search Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <div
            className="input-field"
            style={{ paddingLeft: '3rem', height: '48px', width: '100%', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.95rem' }}
          >
            <span style={{ opacity: 0.6 }}>Search by member name, email, student ID, position, or skills...</span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Department Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={15} color="var(--google-blue)" />
              <div className="input-field" style={{ height: '40px', minWidth: '150px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                All Departments
              </div>
            </div>

            {/* Branch Filter */}
            <div className="input-field" style={{ height: '40px', minWidth: '120px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              All Branches
            </div>

            {/* Role Filter */}
            <div className="input-field" style={{ height: '40px', minWidth: '110px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              All Roles
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpDown size={15} color="var(--text-muted)" />
            <div className="input-field" style={{ height: '40px', minWidth: '160px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Sort by Name (A-Z)
            </div>
          </div>
        </div>
      </div>

      {/* Exact Member Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((idx) => {
          const isTech = idx % 2 === 1;
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top Accent Strip */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: isTech ? 'var(--google-blue)' : 'var(--google-green)',
                }}
              />

              {/* Profile Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    className="skeleton-pulse"
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="skeleton-pulse" style={{ height: '18px', width: '140px', borderRadius: '4px' }} />
                    <div className="skeleton-pulse" style={{ height: '13px', width: '90px', borderRadius: '4px' }} />
                  </div>
                </div>

                {/* Role Badge */}
                <div
                  className="skeleton-pulse"
                  style={{
                    height: '24px',
                    width: '65px',
                    borderRadius: '6px',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Department Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  background: isTech ? 'rgba(66, 133, 244, 0.08)' : 'rgba(52, 168, 83, 0.08)',
                  border: isTech ? '1px solid rgba(66, 133, 244, 0.2)' : '1px solid rgba(52, 168, 83, 0.2)',
                }}
              >
                <Building2 size={14} color={isTech ? '#93C5FD' : '#86EFAC'} />
                <div className="skeleton-pulse" style={{ height: '14px', width: '110px', borderRadius: '4px' }} />
                <span style={{ opacity: 0.6, fontSize: '0.75rem', color: isTech ? '#93C5FD' : '#86EFAC' }}>
                  • {isTech ? 'Tech' : 'Non-Tech'}
                </span>
              </div>

              {/* University Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={15} color="var(--google-yellow)" />
                <div className="skeleton-pulse" style={{ height: '14px', width: '160px', borderRadius: '4px' }} />
              </div>

              {/* Skills Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="skeleton-pulse"
                    style={{
                      height: '20px',
                      width: s === 1 ? '55px' : s === 2 ? '70px' : '45px',
                      borderRadius: '6px',
                    }}
                  />
                ))}
              </div>

              {/* Contacts & External Links Footer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  marginTop: 'auto',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <Mail size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <Phone size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--google-blue)', fontSize: '0.82rem', fontWeight: 700 }}>
                  <span>View Profile</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
