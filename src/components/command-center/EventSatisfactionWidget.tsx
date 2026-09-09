'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  EventSatisfactionSummary,
  EventSatisfactionItem,
} from '@/types/command-center';
import {
  Star,
  Sparkles,
  HeartHandshake,
  ArrowUpRight,
  MessageSquare,
  Smile,
  Calendar,
} from 'lucide-react';

interface EventSatisfactionWidgetProps {
  initialSummary: EventSatisfactionSummary;
}

export function EventSatisfactionWidget({ initialSummary }: EventSatisfactionWidgetProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const displayEvents = initialSummary.events.slice(0, 6);

  return (
    <div
      id="event-satisfaction-widget"
      className="glass-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.75rem',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBC04',
              }}
            >
              <Star size={18} fill="#FBBC04" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Event Satisfaction & Sentiment Trend
            </h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Post-event attendee survey feedback, ratings, and satisfaction trends.
          </p>
        </div>

        {/* Global Rating Score Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '999px',
            background: 'rgba(251, 188, 4, 0.15)',
            border: '1px solid rgba(251, 188, 4, 0.35)',
            color: '#FCD34D',
            fontSize: '0.8rem',
            fontWeight: 800,
          }}
        >
          <Star size={14} fill="#FBBC04" />
          <span>
            {initialSummary.overallAverageRating > 0
              ? `${initialSummary.overallAverageRating} / 5.0 (${initialSummary.satisfactionPercentage}%)`
              : 'No Reviews Yet'}
          </span>
        </div>
      </div>

      {/* Highlights Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '0.65rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Evaluated Events</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.15rem' }}>
            {initialSummary.eventsEvaluatedCount}
          </div>
        </div>
        <div
          style={{
            padding: '0.65rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Responses</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#93C5FD', marginTop: '0.15rem' }}>
            {initialSummary.totalFeedbackCount}
          </div>
        </div>
        <div
          style={{
            padding: '0.65rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Satisfaction Index</span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#86EFAC', marginTop: '0.15rem' }}>
            {initialSummary.satisfactionPercentage > 0 ? `${initialSummary.satisfactionPercentage}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '340px',
          overflowY: 'auto',
          paddingRight: '0.25rem',
        }}
      >
        {displayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            No event feedback records yet. Feedback forms are auto-sent upon event completion.
          </div>
        ) : (
          displayEvents.map((event) => (
            <div
              key={event.eventId}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.025)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {event.eventTitle}
                  </span>
                  {event.departmentCode && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {event.departmentCode}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background:
                      event.averageRating >= 4
                        ? 'rgba(52, 168, 83, 0.15)'
                        : event.averageRating >= 3
                        ? 'rgba(251, 188, 4, 0.15)'
                        : 'rgba(255, 255, 255, 0.05)',
                    color:
                      event.averageRating >= 4
                        ? '#34A853'
                        : event.averageRating >= 3
                        ? '#FBBC04'
                        : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  <Star size={12} fill="currentColor" />
                  {event.averageRating > 0 ? `${event.averageRating} ★` : 'No rating'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>Date: {new Date(event.eventDate).toLocaleDateString()}</span>
                <span>{event.totalResponses} attendee responses</span>
              </div>

              {/* Sample Comments Quote */}
              {event.sampleComments && event.sampleComments.length > 0 && (
                <div
                  style={{
                    marginTop: '0.2rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: '2px solid var(--google-blue)',
                    fontSize: '0.74rem',
                    color: '#E2E8F0',
                    fontStyle: 'italic',
                  }}
                >
                  “{event.sampleComments[0]}”
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
        <Link
          href="/events"
          style={{
            fontSize: '0.75rem',
            color: 'var(--google-blue)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontWeight: 600,
          }}
        >
          <span>View All Events & Surveys</span>
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
