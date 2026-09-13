import React from 'react';
import { Award, Plus, Search, CheckCircle2 } from 'lucide-react';

interface CertificatesSkeletonProps {
  isLeadership?: boolean;
}

export function CertificatesSkeleton({ isLeadership = false }: CertificatesSkeletonProps = {}) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={22} color="var(--google-yellow)" />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Certificates &amp; Credentials Hub
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
            Design dynamic chapter certificate templates, batch-issue attendance credentials, and manage ledger verification.
          </p>
        </div>

        {isLeadership ? (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="skeleton-pulse" style={{ height: '40px', width: '140px', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ height: '40px', width: '140px', borderRadius: '10px' }} />
          </div>
        ) : null}
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="skeleton-pulse" style={{ height: '14px', width: '110px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '32px', width: '60px', borderRadius: '6px' }} />
          </div>
        ))}
      </div>

      {/* Tabs & Search toolbar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <div className="input-field" style={{ paddingLeft: '2.4rem', height: '38px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <span style={{ opacity: 0.6 }}>Search issued credentials by recipient name or code...</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ padding: '0.45rem 1rem', borderRadius: '8px', background: 'rgba(66, 133, 244, 0.2)', color: '#93C5FD', fontWeight: 600, fontSize: '0.85rem' }}>
            Issued Credentials
          </div>
          {isLeadership ? (
            <div style={{ padding: '0.45rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
              Templates Builder
            </div>
          ) : null}
        </div>
      </div>

      {/* Certificate Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="skeleton-pulse" style={{ height: '180px', width: '100%', borderRadius: '16px 16px 0 0' }} />
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="skeleton-pulse" style={{ height: '18px', width: '75%', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '14px', width: '50%', borderRadius: '4px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="skeleton-pulse" style={{ height: '12px', width: '80px', borderRadius: '4px' }} />
                <div className="skeleton-pulse" style={{ height: '28px', width: '90px', borderRadius: '6px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
