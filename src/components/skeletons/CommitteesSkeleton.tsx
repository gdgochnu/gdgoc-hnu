import React from 'react';
import { Building2, ChevronRight, Plus, Users } from 'lucide-react';

export function CommitteesSkeleton() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Breadcrumb & Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span>Administration</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)' }}>Committees</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.35rem', color: '#FFFFFF' }}>
              Chapter Committees &amp; Departments
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Manage the chapter's organizational chart, create new technical/non-technical tracks, and appoint Committee Heads and Co-Heads.
            </p>
          </div>
          <div className="skeleton-pulse" style={{ height: '32px', width: '120px', borderRadius: '999px' }} />
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-pulse" style={{ height: '18px', width: '150px', borderRadius: '4px' }} />
        <div className="skeleton-pulse" style={{ height: '38px', width: '150px', borderRadius: '10px' }} />
      </div>

      {/* Committee Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} color="var(--google-blue)" />
                </div>
                <div className="skeleton-pulse" style={{ height: '18px', width: '120px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton-pulse" style={{ height: '22px', width: '65px', borderRadius: '999px' }} />
            </div>

            {/* Leadership Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="skeleton-pulse" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                  <div className="skeleton-pulse" style={{ height: '14px', width: '110px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '11px', width: '70px', borderRadius: '4px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="skeleton-pulse" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '30px', width: '90px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
