'use client';

import React from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { generatePersonalCalendarUrl } from '@/lib/calendar/calendar-client';

interface AddToCalendarButtonProps {
  taskTitle: string;
  deadline: string | Date; // ISO date string or Date object
  description?: string;
  location?: string;
  /** Optional variant: 'button' (default) | 'link' | 'icon-only' */
  variant?: 'button' | 'link' | 'icon-only';
  className?: string;
  style?: React.CSSProperties;
}

/**
 * One-click "Add to my Google Calendar" for task deadlines.
 * Uses the standard Google Calendar event template URL — no OAuth needed.
 * Spec §4.17 Step 14.4
 */
export function AddToCalendarButton({
  taskTitle,
  deadline,
  description,
  location,
  variant = 'button',
  style,
}: AddToCalendarButtonProps) {
  const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;

  // All-day event: start at midnight, end the next day at midnight
  const startOfDay = new Date(deadlineDate);
  startOfDay.setHours(9, 0, 0, 0); // 9 AM on deadline day
  const endOfDay = new Date(deadlineDate);
  endOfDay.setHours(10, 0, 0, 0); // 10 AM (1-hour placeholder)

  const calUrl = generatePersonalCalendarUrl({
    title: `[Task Deadline] ${taskTitle}`,
    description: description
      ? `${description}\n\n— GDGoC HNU Chapter OS`
      : `Task deadline reminder for: ${taskTitle}\n\n— GDGoC HNU Chapter OS`,
    location,
    startDate: startOfDay,
    endDate: endOfDay,
  });

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  };

  if (variant === 'link') {
    return (
      <a
        id={`add-to-gcal-btn-${taskTitle.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`}
        href={calUrl}
        target="_blank"
        rel="noreferrer"
        title="Add task deadline to Google Calendar"
        style={{
          ...baseStyles,
          fontSize: '0.8rem',
          color: '#8ab4f8',
          fontWeight: 500,
          ...style,
        }}
      >
        <Calendar size={13} />
        <span>Add to Calendar</span>
        <ExternalLink size={11} style={{ opacity: 0.7 }} />
      </a>
    );
  }

  if (variant === 'icon-only') {
    return (
      <a
        id={`add-to-gcal-btn-${taskTitle.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`}
        href={calUrl}
        target="_blank"
        rel="noreferrer"
        title={`Add "${taskTitle}" deadline to Google Calendar`}
        style={{
          ...baseStyles,
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(66, 133, 244, 0.12)',
          border: '1px solid rgba(66, 133, 244, 0.25)',
          justifyContent: 'center',
          color: '#8ab4f8',
          ...style,
        }}
      >
        <Calendar size={15} />
      </a>
    );
  }

  // Default: 'button' variant
  return (
    <a
      id={`add-to-gcal-btn-${taskTitle.replace(/\s+/g, '-').toLowerCase().slice(0, 30)}`}
      href={calUrl}
      target="_blank"
      rel="noreferrer"
      title="Add task deadline to Google Calendar"
      style={{
        ...baseStyles,
        fontSize: '0.82rem',
        fontWeight: 600,
        padding: '0.45rem 0.9rem',
        borderRadius: '8px',
        background: 'rgba(66, 133, 244, 0.12)',
        border: '1px solid rgba(66, 133, 244, 0.3)',
        color: '#8ab4f8',
        ...style,
      }}
    >
      <Calendar size={14} />
      <span>Add Deadline to Calendar</span>
      <ExternalLink size={12} style={{ opacity: 0.7 }} />
    </a>
  );
}
