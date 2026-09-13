import React from 'react';
import { HardDrive, RefreshCw, CheckCircle2 } from 'lucide-react';

export function DriveSettingsSkeleton() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem 5rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HardDrive size={24} color="var(--google-green)" />
        </div>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            Google Drive Bridge &amp; Storage Settings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.3rem 0 0' }}>
            Manage chapter Google Drive Web App endpoint, secrets, and automated folder structure mapping.
          </p>
        </div>
      </div>

      {/* Bridge Status Card */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-pulse" style={{ height: '20px', width: '180px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '24px', width: '90px', borderRadius: '999px' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div className="skeleton-pulse" style={{ height: '12px', width: '90px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ height: '16px', width: '150px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Folder Structure Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton-pulse" style={{ height: '18px', width: '160px', borderRadius: '4px' }} />
          <div className="skeleton-pulse" style={{ height: '34px', width: '120px', borderRadius: '8px' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3, 4].map((r) => (
            <div key={r} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                <div className="skeleton-pulse" style={{ height: '15px', width: '160px', borderRadius: '4px' }} />
              </div>
              <div className="skeleton-pulse" style={{ height: '14px', width: '120px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
