import React from 'react';
import { GraduationCap, ChevronRight, Plus } from 'lucide-react';

export function FacultiesSkeleton() {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 4rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Breadcrumb Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span>Administration</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Faculty Options</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <div className="skeleton-pulse" style={{ height: '26px', width: '240px', borderRadius: '999px', marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.5rem', color: '#FFFFFF' }}>
              Faculty Options Management
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', lineHeight: 1.6, margin: 0 }}>
              Configure the official Helwan University faculties and colleges offered in recruitment and member profile forms.
            </p>
          </div>

          <div className="skeleton-pulse" style={{ height: '42px', width: '160px', borderRadius: '10px' }} />
        </div>
      </div>

      {/* Faculty Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="skeleton-pulse" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div className="skeleton-pulse" style={{ height: '16px', width: '220px', borderRadius: '4px' }} />
                <div className="skeleton-pulse" style={{ height: '12px', width: '140px', borderRadius: '4px' }} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="skeleton-pulse" style={{ height: '24px', width: '70px', borderRadius: '999px' }} />
              <div className="skeleton-pulse" style={{ height: '32px', width: '32px', borderRadius: '8px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
