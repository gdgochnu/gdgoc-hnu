'use client';

import React, { useState, useTransition } from 'react';
import { EventAttendanceSummary, EventAttendanceRecord } from '@/types';
import { getEventAttendanceDetails } from '@/app/hr/actions';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Download,
  Filter,
  AlertTriangle,
  QrCode,
  UserCheck,
  Clock,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
  Building2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

interface EventAttendanceViewProps {
  initialData: EventAttendanceSummary;
}

export function EventAttendanceView({ initialData }: EventAttendanceViewProps) {
  const [data, setData] = useState<EventAttendanceSummary>(initialData);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialData.event?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attended' | 'absent'>('all');
  const [showDuplicateLog, setShowDuplicateLog] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Handle event dropdown change
  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    startTransition(async () => {
      const updated = await getEventAttendanceDetails(eventId);
      setData(updated);
    });
  };

  // Filter attendees
  const filteredAttendees = data.attendees.filter((att) => {
    // Status filter
    if (statusFilter === 'attended' && !att.isAttended) return false;
    if (statusFilter === 'absent' && att.isAttended) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = att.fullName.toLowerCase().includes(q);
      const matchEmail = att.email.toLowerCase().includes(q);
      const matchPhone = att.phone ? att.phone.toLowerCase().includes(q) : false;
      if (!matchName && !matchEmail && !matchPhone) return false;
    }

    return true;
  });

  // Client-side CSV export
  const handleExportCsv = () => {
    if (!data.event) return;

    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Registration Status',
      'Attendance Status',
      'Check-in Time',
      'Check-in Method',
      'Checked-in By Officer',
    ];

    const rows = data.attendees.map((att) => [
      `"${att.fullName.replace(/"/g, '""')}"`,
      `"${att.email.replace(/"/g, '""')}"`,
      `"${(att.phone || '').replace(/"/g, '""')}"`,
      `"${att.registrationStatus}"`,
      `"${att.isAttended ? 'Attended' : 'Absent'}"`,
      `"${att.checkInTime ? new Date(att.checkInTime).toLocaleString() : ''}"`,
      `"${att.method ? att.method.toUpperCase() : ''}"`,
      `"${(att.checkedInBy || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `attendance-${data.event.slug || data.event.id}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data.event) {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          borderRadius: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
          No Events Found
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
          Publish an event to begin tracking attendee check-ins and attendance rates.
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Top Google 4-color accent bar */}
      <div
        style={{
          height: '4px',
          width: '100%',
          background:
            'linear-gradient(90deg, #4285F4 0% 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75% 100%)',
        }}
      />

      <div style={{ padding: '1.75rem 2rem' }}>
        {/* Header & Event Selector */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.25rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: '#93C5FD',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                }}
              >
                <UserCheck size={12} /> Event Attendance Inspector
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                (Spec §4.5)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                {data.event.title}
              </h2>

              <Link
                href={`/events/${data.event.slug || data.event.id}`}
                style={{
                  fontSize: '0.78rem',
                  color: '#93C5FD',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  textDecoration: 'none',
                }}
              >
                <span>View Event</span>
                <ExternalLink size={12} />
              </Link>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginTop: '0.4rem',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} color="var(--google-blue)" /> {data.event.event_date}
              </span>
              {data.event.venue && <span>• {data.event.venue}</span>}
              <span style={{ textTransform: 'capitalize' }}>• Status: {data.event.status}</span>
            </div>
          </div>

          {/* Event Dropdown & Export Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Event Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                disabled={isPending}
                id="hr-event-selector"
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '0.55rem 2rem 0.55rem 0.85rem',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                }}
              >
                {data.eventsList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.event_date})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-muted)',
                }}
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              id="export-attendance-csv-btn"
              disabled={data.attendees.length === 0}
              style={{
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                color: 'var(--google-green)',
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: data.attendees.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease',
              }}
              title="Export attendees to CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Attendance Summary Stat Badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            margin: '1.5rem 0',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Registered
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFFFFF', margin: '0.2rem 0' }}>
              {data.totalRegistered}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total RSVP</span>
          </div>

          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Attended
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--google-green)', margin: '0.2rem 0' }}>
              {data.totalAttended}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Checked in</span>
          </div>

          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Absent
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: '#F87171', margin: '0.2rem 0' }}>
              {data.totalAbsent}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Did not attend</span>
          </div>

          <div
            style={{
              padding: '1rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
              Turnout Rate
            </span>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--google-yellow)', margin: '0.2rem 0' }}>
              {data.attendanceRate}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Attended / Registered</span>
          </div>
        </div>

        {/* Visual Attendance Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              height: '8px',
              width: '100%',
              borderRadius: '999px',
              background: 'rgba(234, 67, 53, 0.3)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${data.attendanceRate}%`,
                background: 'linear-gradient(90deg, #34A853, #10B981)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Duplicate Scan Warnings Pill */}
        {data.duplicateScans.length > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '0.85rem 1.25rem',
              borderRadius: '12px',
              background: 'rgba(251, 188, 4, 0.12)',
              border: '1px solid rgba(251, 188, 4, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <AlertTriangle size={18} color="var(--google-yellow)" />
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FDE047' }}>
                  {data.duplicateScans.length} Duplicate Scan Attempt{data.duplicateScans.length > 1 ? 's' : ''} Blocked
                </span>
                <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#CBD5E1' }}>
                  Attendees attempted to re-scan already checked-in passes (Spec §4.4 duplicate prevention).
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowDuplicateLog(!showDuplicateLog)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                color: '#FDE047',
                padding: '0.3rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {showDuplicateLog ? 'Hide Details' : 'View Log'}
            </button>
          </div>
        )}

        {/* Duplicate Scans Details Log */}
        {showDuplicateLog && data.duplicateScans.length > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
              Duplicate Scan Prevention Audit Log
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {data.duplicateScans.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#FFFFFF' }}>{d.attendeeName} ({d.attendeeEmail})</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(d.attemptedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Filter Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search by attendee name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="hr-attendee-search"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '0.55rem 0.85rem 0.55rem 2.25rem',
                fontSize: '0.82rem',
                color: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === 'all' ? 'var(--google-blue)' : 'var(--border-subtle)',
                background: statusFilter === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              All ({data.totalRegistered})
            </button>

            <button
              onClick={() => setStatusFilter('attended')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === 'attended' ? 'var(--google-green)' : 'var(--border-subtle)',
                background: statusFilter === 'attended' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === 'attended' ? 'var(--google-green)' : 'var(--text-secondary)',
              }}
            >
              Attended ({data.totalAttended})
            </button>

            <button
              onClick={() => setStatusFilter('absent')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: statusFilter === 'absent' ? '#EF4444' : 'var(--border-subtle)',
                background: statusFilter === 'absent' ? 'rgba(234, 67, 53, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === 'absent' ? '#F87171' : 'var(--text-secondary)',
              }}
            >
              Absent ({data.totalAbsent})
            </button>
          </div>
        </div>

        {/* Attendees List Table */}
        {filteredAttendees.length === 0 ? (
          <div
            style={{
              padding: '2.5rem',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.015)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            No attendees matching the filter or search query.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  <th style={{ padding: '0.75rem 1rem' }}>Attendee</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Contact</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Registration</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Attendance Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Check-in Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((att) => (
                  <tr
                    key={att.registrationId}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Attendee Name */}
                    <td style={{ padding: '0.85rem 1rem', color: '#FFFFFF', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: att.isAttended
                              ? 'rgba(52, 168, 83, 0.2)'
                              : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: att.isAttended ? 'var(--google-green)' : 'var(--text-muted)',
                          }}
                        >
                          {att.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>{att.fullName}</div>
                      </div>
                    </td>

                    {/* Email & Phone */}
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <div>{att.email}</div>
                      {att.phone && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{att.phone}</div>}
                    </td>

                    {/* Registration Status */}
                    <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background:
                            att.registrationStatus === 'registered'
                              ? 'rgba(66, 133, 244, 0.12)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color:
                            att.registrationStatus === 'registered' ? '#93C5FD' : 'var(--text-muted)',
                        }}
                      >
                        {att.registrationStatus}
                      </span>
                    </td>

                    {/* Attendance Status */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {att.isAttended ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(52, 168, 83, 0.15)',
                            color: 'var(--google-green)',
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Attended ({att.method === 'manual' ? 'Walk-in' : 'QR'})</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <XCircle size={12} />
                          <span>Absent</span>
                        </span>
                      )}
                    </td>

                    {/* Check-in Details */}
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {att.checkInTime ? (
                        <div>
                          <div style={{ color: 'var(--text-secondary)' }}>
                            {new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {att.checkedInBy && <div>by {att.checkedInBy}</div>}
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
