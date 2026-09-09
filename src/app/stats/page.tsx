import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getPublicChapterStats } from '@/lib/stats/chapter-stats';
import {
  Users,
  Calendar,
  UserCheck,
  GraduationCap,
  Building2,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chapter Impact & Public Statistics — GDGoC HNU',
  description:
    'Official community aggregates and chapter pride metrics for Google Developer Groups on Campus - Helwan National University.',
};

export default async function PublicStatsPage() {
  const stats = await getPublicChapterStats();

  const metrics = [
    {
      id: 'members',
      label: 'Active Members',
      value: stats.memberCount.toLocaleString(),
      sub: 'Students & chapter developers',
      icon: Users,
      color: 'var(--google-blue)',
      bgGlow: 'rgba(66, 133, 244, 0.12)',
      border: 'rgba(66, 133, 244, 0.25)',
    },
    {
      id: 'events',
      label: 'Technical Events Held',
      value: stats.eventsHeld.toLocaleString(),
      sub: 'Workshops, hackathons & bootcamps',
      icon: Calendar,
      color: 'var(--google-red)',
      bgGlow: 'rgba(234, 67, 53, 0.12)',
      border: 'rgba(234, 67, 53, 0.25)',
    },
    {
      id: 'attendance',
      label: 'Total Attendances',
      value: stats.totalAttendance.toLocaleString(),
      sub: 'Verified session check-ins',
      icon: UserCheck,
      color: 'var(--google-yellow)',
      bgGlow: 'rgba(251, 188, 4, 0.12)',
      border: 'rgba(251, 188, 4, 0.25)',
    },
    {
      id: 'certificates',
      label: 'Credentials Conferred',
      value: stats.certificatesIssued.toLocaleString(),
      sub: 'Cryptographically verifiable certificates',
      icon: GraduationCap,
      color: 'var(--google-green)',
      bgGlow: 'rgba(52, 168, 83, 0.12)',
      border: 'rgba(52, 168, 83, 0.25)',
    },
    {
      id: 'committees',
      label: 'Active Committees',
      value: stats.activeCommittees.toLocaleString(),
      sub: 'Specialized tech & management tracks',
      icon: Building2,
      color: '#a855f7',
      bgGlow: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.25)',
    },
    {
      id: 'achievement',
      label: 'Top Achievement Badge',
      value: stats.standoutAchievement.badgeName,
      sub: `Unlocked ${stats.standoutAchievement.timesEarned} times this academic term`,
      icon: Award,
      color: '#ec4899',
      bgGlow: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.25)',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #070a12 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem',
      }}
    >
      {/* Public Navigation Header */}
      <header
        style={{
          width: '100%',
          maxWidth: '1100px',
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
            gap: '0.85rem',
            textDecoration: 'none',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 900,
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
            <div style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              GDGoC HNU
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Helwan National University Chapter
            </div>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/"
            style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              textDecoration: 'none',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontSize: '0.85rem',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '0.45rem 1.1rem',
              borderRadius: '8px',
              background: 'var(--google-blue)',
            }}
          >
            Workspace
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.12)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#93c5fd',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '1rem',
            }}
          >
            <TrendingUp size={14} />
            <span>Official Chapter Ledger (§4.21)</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: '#ffffff',
              lineHeight: 1.15,
              margin: '0 0 1rem 0',
            }}
          >
            Empowering Student Developers at{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Helwan National University
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Real-time public impact metrics showcasing our student community growth, technical workshops, hands-on events, and verified student credentials.
          </p>
        </div>

        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="glass-panel"
                style={{
                  padding: '1.85rem',
                  borderRadius: '22px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: `1px solid ${m.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Glow accent */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: m.bgGlow,
                    filter: 'blur(35px)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: m.bgGlow,
                      border: `1px solid ${m.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: m.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      {m.label}
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: typeof m.value === 'string' && m.value.length > 8 ? '1.5rem' : '2.4rem',
                      fontWeight: 900,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      marginBottom: '0.35rem',
                    }}
                  >
                    {m.value}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {m.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chapter Pride & Verification Guarantee Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem 2.5rem',
            borderRadius: '24px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          {/* Google 4-Color Accent Strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background:
                'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34a853', fontWeight: 800, fontSize: '0.88rem', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              <ShieldCheck size={18} />
              <span>Zero PII &amp; Open Verifiability Guarantee</span>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.35rem', fontWeight: 800, color: '#fff' }}>
              Auditable Chapter Operations
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.6 }}>
              All statistics are pre-aggregated through a narrow public database procedure without exposing private student records, emails, or personal identifiers. Credentials issued by GDGoC HNU can be validated anytime using our official verification registry.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link
              href="/certificates"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.4rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>Verify Credential</span>
              <ArrowRight size={15} />
            </Link>

            <Link
              href="/auth/signin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.8rem 1.4rem',
                borderRadius: '12px',
                background: 'var(--google-blue)',
                color: '#fff',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
              }}
            >
              <span>Join Chapter</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '4rem',
          width: '100%',
          maxWidth: '1100px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.78rem',
          color: '#64748b',
        }}
      >
        <div>
          © 2026 Google Developer Groups on Campus — Helwan National University. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>Home</Link>
          <Link href="/stats" style={{ color: '#94a3b8', textDecoration: 'none' }}>Public Stats</Link>
          <Link href="/gamification/rules" style={{ color: '#94a3b8', textDecoration: 'none' }}>Fair Play Rules</Link>
        </div>
      </footer>
    </div>
  );
}
