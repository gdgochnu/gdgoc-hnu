'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  Award,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  GraduationCap,
} from 'lucide-react';

export default function VerifyIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) {
      setError('Please enter a certificate number or verification code.');
      return;
    }
    setError(null);
    router.push(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 100%)',
        color: '#f8fafc',
        fontFamily: 'var(--font-inter, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 1.25rem 5rem',
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
          marginBottom: '3rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: '#f8fafc',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
            }}
          >
            <img
              src="/icons/icon.svg"
              alt="GDGoC Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              GDGoC HNU
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Credential Verification Portal
            </div>
          </div>
        </Link>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#94a3b8',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <main style={{ width: '100%', maxWidth: '680px' }}>
        {/* Verification Form Card */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '24px',
            background: 'linear-gradient(180deg, rgba(19, 27, 46, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(66, 133, 244, 0.35)',
            padding: '3rem 2.25rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            textAlign: 'center',
          }}
        >
          {/* Top Google Colors Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 800,
              marginBottom: '1.25rem',
            }}
          >
            <ShieldCheck size={16} color="#60A5FA" />
            <span>Official Credential Registry</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.25,
              margin: '0 0 0.85rem',
            }}
          >
            Verify a Certificate
          </h1>

          <p
            style={{
              fontSize: '0.94rem',
              color: '#94A3B8',
              lineHeight: 1.6,
              maxWidth: '520px',
              margin: '0 auto 2.25rem',
            }}
          >
            Verify the authenticity of credentials issued by Google Developer Groups on Campus at Helwan National University.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                color="#94A3B8"
                style={{
                  position: 'absolute',
                  left: '1.1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. GDGOC-2026-..., or verification code"
                style={{
                  width: '100%',
                  padding: '1.05rem 1.25rem 1.05rem 3rem',
                  borderRadius: '14px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: error ? '1px solid #F87171' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.98rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(66, 133, 244, 0.7)')}
                onBlur={(e) => (e.target.style.borderColor = error ? '#F87171' : 'rgba(255, 255, 255, 0.15)')}
              />
            </div>

            {error && (
              <div style={{ fontSize: '0.84rem', color: '#F87171', textAlign: 'left', paddingLeft: '0.5rem' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.95rem 1.75rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(66, 133, 244, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Verify Credential</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div
            style={{
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              fontSize: '0.82rem',
              color: '#94A3B8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrCode size={14} color="#60A5FA" />
              <span>QR Code Scannable</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={14} color="#34A853" />
              <span>Cryptographically Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={14} color="#FBBC04" />
              <span>President Approved</span>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            marginTop: '2rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
              <GraduationCap size={18} color="#60A5FA" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Student Programs
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
              Issued to university students upon completing technical tracks, workshops, bootcamps, and passing evaluation benchmarks.
            </p>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '16px',
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.6rem' }}>
              <Award size={18} color="#FBBC04" />
              <h3 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Chapter & Leadership
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
              Issued to GDGoC HNU organizing team members, committee heads, and event speakers recognizing chapter contributions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
