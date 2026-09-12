'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Event } from '@/types';
import { EditEventModal } from './EditEventModal';

interface EditEventButtonProps {
  event: Event;
  departments: { id: string; name: string; code?: string; branch?: string }[];
  variant?: 'primary' | 'secondary';
  label?: string;
}

export function EditEventButton({
  event,
  departments,
  variant = 'secondary',
  label = 'Edit Event Details',
}: EditEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        id="btn-edit-event-details"
        onClick={() => setIsOpen(true)}
        className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontSize: '0.82rem',
          padding: '0.45rem 0.9rem',
          cursor: 'pointer',
          borderRadius: '8px',
          fontWeight: 600,
          background: variant === 'secondary' ? 'rgba(255, 255, 255, 0.05)' : undefined,
          border: variant === 'secondary' ? '1px solid var(--border-subtle)' : undefined,
          color: '#FFFFFF',
          transition: 'all 0.15s ease',
        }}
        title="Edit Event Details (Title, Description, Date, Venue, Questions)"
      >
        <Pencil size={14} color="var(--google-yellow)" />
        <span>{label}</span>
      </button>

      {isOpen && (
        <EditEventModal
          event={event}
          departments={departments}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
