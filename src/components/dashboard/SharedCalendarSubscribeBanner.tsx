'use client';

import React, { useState } from 'react';
import { SharedCalendarInfo } from '@/lib/calendar/calendar-client';
import { Calendar, ExternalLink, Copy, Check, Sparkles, Smartphone, Download } from 'lucide-react';

interface SharedCalendarSubscribeBannerProps {
  calendarInfo?: Partial<SharedCalendarInfo> | null;
}

export function SharedCalendarSubscribeBanner({ calendarInfo }: SharedCalendarSubscribeBannerProps) {
  const [copied, setCopied] = useState(false);

  const subLink =
    calendarInfo?.subscribableLink ||
    'https://calendar.google.com/calendar/render?cid=mock-gdgoc-hnu-calendar-id%40group.calendar.google.com';

  const icalUrl =
    calendarInfo?.icalUrl ||
    'https://calendar.google.com/calendar/ical/mock-gdgoc-hnu-calendar-id%40group.calendar.google.com/public/basic.ics';

  const handleCopy = () => {
    navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="glass-panel"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '1.75rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(52, 168, 83, 0.05) 100%)',
        border: '1px solid rgba(66, 133, 244, 0.25)',
      }}
    >
      {/* Accent strip */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '4px',
          background: 'linear-gradient(180deg, #4285F4, #34A853)',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        {/* Left: Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', minWidth: '280px', flex: '1' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Calendar size={26} color="#8ab4f8" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                GDGoC HNU Chapter Calendar
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  color: '#81c995',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sparkles size={10} /> Live Sync
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary, #9AA0A6)', lineHeight: '1.4' }}>
              Subscribe once to automatically sync all published workshops, hackathons, and deadlines to your personal Google Calendar app.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            id="subscribe-google-calendar-btn"
            href={subLink}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--google-blue, #4285F4)',
              color: '#FFFFFF',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(66, 133, 244, 0.25)',
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Smartphone size={16} />
            <span>Add to Google Calendar</span>
            <ExternalLink size={14} />
          </a>

          <button
            id="copy-ical-calendar-btn"
            type="button"
            onClick={handleCopy}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-secondary, #9AA0A6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            title="Copy iCal subscription feed URL"
          >
            {copied ? <Check size={15} color="#81c995" /> : <Copy size={15} />}
            <span>{copied ? 'iCal Copied!' : 'Copy iCal Feed'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
