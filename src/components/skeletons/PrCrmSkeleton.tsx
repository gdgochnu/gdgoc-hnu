import React from 'react';
import { 
  Users, 
  Building2, 
  Search, 
  Mail, 
  Phone, 
  Plus, 
  ExternalLink 
} from 'lucide-react';

export function PrCrmSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            PR CRM &amp; Outreach Pipeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Manage external speakers, chapter sponsors, venue partners, and outreach communication.
          </p>
        </div>

        <div
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            opacity: 0.8,
          }}
        >
          <Plus size={16} />
          <span>New Contact</span>
        </div>
      </div>

      {/* KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="skeleton-pulse" style={{ height: '14px', width: '90px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '28px', width: '50px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>

      {/* Search & Tabs Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <div
            className="input-field"
            style={{ paddingLeft: '2.4rem', height: '38px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}
          >
            <span style={{ opacity: 0.6 }}>Search contacts by name, organization, or role...</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ padding: '0.45rem 1rem', borderRadius: '8px', background: 'rgba(66, 133, 244, 0.2)', color: '#93C5FD', fontWeight: 600, fontSize: '0.85rem' }}>
            All Contacts
          </div>
          <div style={{ padding: '0.45rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
            Sponsors
          </div>
          <div style={{ padding: '0.45rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
            Speakers
          </div>
        </div>
      </div>

      {/* Contacts Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="skeleton-pulse" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div className="skeleton-pulse" style={{ height: '16px', width: '130px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '12px', width: '90px', borderRadius: '4px' }} />
                </div>
              </div>
              <div className="skeleton-pulse" style={{ height: '22px', width: '65px', borderRadius: '999px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={13} color="var(--text-muted)" />
                <div className="skeleton-pulse" style={{ height: '13px', width: '140px', borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={13} color="var(--text-muted)" />
                <div className="skeleton-pulse" style={{ height: '13px', width: '100px', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
