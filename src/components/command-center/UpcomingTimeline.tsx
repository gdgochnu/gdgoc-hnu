'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  UpcomingFeedSummary,
  UpcomingFeedItem,
  UpcomingItemType,
} from '@/types/command-center';
import {
  Calendar,
  Clock,
  MapPin,
  CheckSquare,
  ExternalLink,
  ArrowUpRight,
  Sparkles,
  CalendarPlus,
  Radio,
  Tag,
  Users,
} from 'lucide-react';

interface UpcomingTimelineProps {
  initialSummary: UpcomingFeedSummary;
}

export function UpcomingTimeline({ initialSummary }: UpcomingTimelineProps) {
  const [selectedType, setSelectedType] = useState<'all' | UpcomingItemType>('all');

  const filteredItems = useMemo(() => {
    return initialSummary.items.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      return true;
    });
  }, [initialSummary.items, selectedType]);

  const getTimeGroupBadge = (group: UpcomingFeedItem['timeGroup'], daysUntil: number) => {
    switch (group) {
      case 'today':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(52, 168, 83, 0.2)',
              color: '#34A853',
              border: '1px solid rgba(52, 168, 83, 0.4)',
              boxShadow: '0 0 10px rgba(52, 168, 83, 0.25)',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853' }} />
            Today
          </span>
        );
      case 'tomorrow':
        return (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.2)',
              color: '#93C5FD',
              border: '1px solid rgba(66, 133, 244, 0.4)',
            }}
          >
            Tomorrow
          </span>
        );
      case 'this_week':
        return (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(251, 188, 4, 0.15)',
              color: '#FBBC04',
              border: '1px solid rgba(251, 188, 4, 0.3)',
            }}
          >
            In {daysUntil} days
          </span>
        );
      default:
        return (
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-secondary)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            In {daysUntil} days
          </span>
        );
    }
  };

  const formatDateBlock = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      return { day, month, weekday };
    } catch {
      return { day: '?', month: 'TBD', weekday: '' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                margin: 0,
              }}
            >
              <Calendar size={20} color="#4285F4" />
              &ldquo;Upcoming&rdquo; Timeline & Calendar Feed
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#93C5FD',
                border: '1px solid rgba(66, 133, 244, 0.3)',
              }}
            >
              <Radio size={10} color="#4285F4" />
              Synced with Google Calendar
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.3rem 0 0' }}>
            Next 30 days schedule: approved events, workshops, sprint milestones, and one-click Google Calendar integration.
          </p>
        </div>

        {/* Calendar Subscribe Link */}
        {initialSummary.sharedCalendarLink && (
          <a
            href={initialSummary.sharedCalendarLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#93C5FD',
              textDecoration: 'none',
              fontSize: '0.78rem',
              fontWeight: 700,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(66, 133, 244, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)';
            }}
          >
            <CalendarPlus size={14} color="#4285F4" />
            Subscribe to {initialSummary.sharedCalendarName || 'Chapter Calendar'}
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <button
          onClick={() => setSelectedType('all')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedType === 'all' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedType === 'all' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedType === 'all' ? '#93C5FD' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          All Upcoming ({initialSummary.totalUpcomingCount})
        </button>

        <button
          onClick={() => setSelectedType('event')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedType === 'event' ? '1px solid #34A853' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedType === 'event' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedType === 'event' ? '#86EFAC' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <Calendar size={13} color="#34A853" />
          Events ({initialSummary.eventsCount})
        </button>

        <button
          onClick={() => setSelectedType('task_deadline')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            border: selectedType === 'task_deadline' ? '1px solid #FBBC04' : '1px solid rgba(255, 255, 255, 0.08)',
            background: selectedType === 'task_deadline' ? 'rgba(251, 188, 4, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: selectedType === 'task_deadline' ? '#FDE047' : 'var(--text-secondary)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'all 0.2s ease',
          }}
        >
          <CheckSquare size={13} color="#FBBC04" />
          Task Milestones ({initialSummary.deadlinesCount})
        </button>
      </div>

      {/* Timeline List */}
      {filteredItems.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            borderRadius: '20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Calendar size={36} color="var(--text-secondary)" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            No Upcoming Items
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            No events or deadlines scheduled within the next 30 days.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map((item) => {
            const dateBlock = formatDateBlock(item.scheduledDate);
            const isEvent = item.type === 'event';

            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.15rem 1.4rem',
                  borderRadius: '16px',
                  border: isEvent
                    ? '1px solid rgba(52, 168, 83, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isEvent
                    ? 'linear-gradient(135deg, rgba(52, 168, 83, 0.05) 0%, rgba(19, 27, 46, 0.8) 100%)'
                    : 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isEvent
                    ? 'rgba(52, 168, 83, 0.5)'
                    : 'rgba(66, 133, 244, 0.4)';
                  e.currentTarget.style.transform = 'translateX(3px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isEvent
                    ? 'rgba(52, 168, 83, 0.25)'
                    : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Left Side: Date Block & Content */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: '280px' }}>
                  {/* Date Block */}
                  <div
                    style={{
                      width: '54px',
                      height: '56px',
                      borderRadius: '14px',
                      background: isEvent ? 'rgba(52, 168, 83, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                      border: isEvent ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isEvent ? '#34A853' : '#fff', lineHeight: 1 }}>
                      {dateBlock.day}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      {dateBlock.month}
                    </span>
                  </div>

                  {/* Main Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {/* Header Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {getTimeGroupBadge(item.timeGroup, item.daysUntil)}

                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: isEvent ? 'rgba(52, 168, 83, 0.15)' : 'rgba(251, 188, 4, 0.15)',
                          color: isEvent ? '#86EFAC' : '#FDE047',
                          border: isEvent ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(251, 188, 4, 0.3)',
                        }}
                      >
                        {isEvent ? 'Event' : 'Task Deadline'}
                      </span>

                      {item.departmentCode && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: '#fff',
                          }}
                        >
                          {item.departmentCode}
                        </span>
                      )}

                      {item.metadata?.priority && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background:
                              item.metadata.priority === 'high'
                                ? 'rgba(234, 67, 53, 0.2)'
                                : 'rgba(255, 255, 255, 0.06)',
                            color: item.metadata.priority === 'high' ? '#fca5a5' : 'var(--text-secondary)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.metadata.priority}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
                      {item.title}
                    </h4>

                    {/* Metadata Subtitle: Time & Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {item.formattedTime && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} color="#FBBC04" />
                          {item.formattedTime}
                        </span>
                      )}

                      {item.locationOrVenue && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={12} color="#4285F4" />
                          {item.locationOrVenue}
                        </span>
                      )}

                      {item.metadata?.assigneeName && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Users size={12} color="#A78BFA" />
                          {item.metadata.assigneeName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Google Calendar & Action Deep Link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* One-click Add to Google Calendar */}
                  <a
                    href={item.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Add to your personal Google Calendar"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <CalendarPlus size={13} color="#FBBC04" />
                    Add to GCal
                  </a>

                  {/* Deep Link to Item */}
                  <Link
                    href={item.actionUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '10px',
                      background: isEvent ? 'rgba(52, 168, 83, 0.18)' : 'rgba(66, 133, 244, 0.18)',
                      border: isEvent ? '1px solid rgba(52, 168, 83, 0.35)' : '1px solid rgba(66, 133, 244, 0.35)',
                      color: isEvent ? '#86EFAC' : '#93C5FD',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isEvent
                        ? 'rgba(52, 168, 83, 0.28)'
                        : 'rgba(66, 133, 244, 0.28)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isEvent
                        ? 'rgba(52, 168, 83, 0.18)'
                        : 'rgba(66, 133, 244, 0.18)';
                    }}
                  >
                    {isEvent ? 'View Event' : 'View Task'}
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
