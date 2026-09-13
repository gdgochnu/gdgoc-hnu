import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

export default function CertificateVerificationLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 1.25rem',
      }}
    >
      {/* Top Header / Chapter Branding */}
      <header
        style={{
          width: '100%',
          maxWidth: '860px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              &lt;&gt;
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              GDGoC HNU
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Credential Verification Service
            </div>
          </div>
        </div>
      </header>

      {/* Main Verification Container */}
      <main style={{ width: '100%', maxWidth: '860px' }}>
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
          }}
        >
          {/* Google 4-Color Accent Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background:
                'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          {/* Active Verification Status Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              padding: '1.25rem 1.5rem',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12), rgba(52, 168, 83, 0.08))',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Pulsing radar icon wrap */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(66, 133, 244, 0.2)',
                border: '1.5px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <Loader2 size={28} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#93c5fd',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  letterSpacing: '0.01em',
                }}
              >
                <span>Verifying Credential Authenticity...</span>
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#e2e8f0',
                  marginTop: '0.3rem',
                  fontWeight: 600,
                }}
              >
                Cross-referencing digital signature with chapter credentials registry...
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                Querying cryptographic ledger &amp; digital signature registry
              </div>
            </div>
          </div>

          {/* Shimmering Visual Certificate Canvas Placeholder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Visual Certificate Preview
              </span>
              <span style={{ fontSize: '0.72rem', color: '#60a5fa' }}>
                Authenticating ledger record...
              </span>
            </div>

            <div
              className="skeleton"
              style={{
                width: '100%',
                aspectRatio: '842 / 595',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <ShieldCheck size={48} color="rgba(66, 133, 244, 0.4)" />
              <div
                style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontWeight: 600,
                }}
              >
                Rendering Official Credential...
              </div>
            </div>
          </div>

          {/* Credentials Meta Grid Skeleton */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
              padding: '1.25rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div
                  className="skeleton"
                  style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0 }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                  <div className="skeleton" style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
                  <div className="skeleton" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Action Button Skeleton */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem' }}>
            <div
              className="skeleton"
              style={{ width: '220px', height: '46px', borderRadius: '12px' }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
        GDGoC Helwan National University Operating System • Chapter Governance &amp; Verifications
      </footer>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
