'use client';

import React from 'react';
import { HrDashboardKpis } from '@/types';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface HrDashboardKpiCardsProps {
  kpis: HrDashboardKpis;
}

export function HrDashboardKpiCards({ kpis }: HrDashboardKpiCardsProps) {
  const cards = [
    {
      title: 'Total Registrations',
      value: kpis.totalRegistrations.toLocaleString(),
      subtitle: `Across ${kpis.eventsCount} chapter events`,
      icon: Users,
      accentColor: 'var(--google-blue)',
      bgGlow: 'rgba(66, 133, 244, 0.12)',
      borderColor: 'rgba(66, 133, 244, 0.25)',
    },
    {
      title: 'Checked-in Attendees',
      value: kpis.totalCheckedIn.toLocaleString(),
      subtitle: 'Verified via QR scan or walk-in',
      icon: CheckCircle2,
      accentColor: 'var(--google-green)',
      bgGlow: 'rgba(52, 168, 83, 0.12)',
      borderColor: 'rgba(52, 168, 83, 0.25)',
    },
    {
      title: 'Chapter Attendance Rate',
      value: `${kpis.attendanceRate}%`,
      subtitle:
        kpis.attendanceRate >= 75
          ? 'Strong chapter engagement'
          : kpis.attendanceRate >= 50
          ? 'Healthy turn-out rate'
          : 'Attendance optimization needed',
      icon: TrendingUp,
      accentColor: 'var(--google-yellow)',
      bgGlow: 'rgba(251, 188, 4, 0.12)',
      borderColor: 'rgba(251, 188, 4, 0.25)',
    },
    {
      title: 'Active Team Members',
      value: kpis.activeMembers.toLocaleString(),
      subtitle: 'Approved GDGoC HNU members',
      icon: ShieldCheck,
      accentColor: 'var(--google-red)',
      bgGlow: 'rgba(234, 67, 53, 0.12)',
      borderColor: 'rgba(234, 67, 53, 0.25)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.25rem',
        width: '100%',
      }}
    >
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: 'var(--bg-card)',
              border: `1px solid ${card.borderColor}`,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: card.bgGlow,
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                }}
              >
                {card.title}
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: card.bgGlow,
                  border: `1px solid ${card.borderColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.accentColor,
                }}
              >
                <Icon size={18} />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                  marginBottom: '0.5rem',
                }}
              >
                {card.value}
              </div>
              <p
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
