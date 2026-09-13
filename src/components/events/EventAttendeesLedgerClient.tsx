'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Ticket,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  Filter,
  FileSpreadsheet,
  QrCode,
  ArrowLeft,
  UserCheck,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  Mail,
  Phone,
  Check
} from 'lucide-react';
import { recordManualCheckin } from '@/app/events/actions';

export interface TicketHolderItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  status: string; // 'registered' | 'waitlisted'
  qrCode: string;
  createdAt: string;
  profileId?: string | null;
  isCheckedIn: boolean;
  checkInTime?: string | null;
  checkInMethod?: string | null;
}

interface EventAttendeesLedgerClientProps {
  event: {
    id: string;
    slug: string;
    title: string;
    event_date: string;
    start_time?: string | null;
    capacity?: number | null;
    venue?: string | null;
  };
  initialAttendees: TicketHolderItem[];
  canManageCheckin: boolean;
}

export function EventAttendeesLedgerClient({
  event,
  initialAttendees,
  canManageCheckin,
}: EventAttendeesLedgerClientProps) {
  const [attendees, setAttendees] = useState<TicketHolderItem[]>(initialAttendees);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked_in' | 'pending' | 'waitlisted'>('all');
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Statistics calculation
  const totalRegistrations = attendees.length;
  const registeredAttendees = attendees.filter((a) => a.status === 'registered');
  const waitlistedCount = attendees.filter((a) => a.status === 'waitlisted').length;
  const checkedInCount = attendees.filter((a) => a.isCheckedIn).length;
  const pendingCount = registeredAttendees.filter((a) => !a.isCheckedIn).length;
  const capacity = event.capacity || null;
  const attendanceRate = registeredAttendees.length > 0 ? Math.round((checkedInCount / registeredAttendees.length) * 100) : 0;
  const capacityRate = capacity && capacity > 0 ? Math.round((registeredAttendees.length / capacity) * 100) : null;

  // Search and Filter
  const filteredAttendees = attendees.filter((item) => {
    // Status Filter
    if (statusFilter === 'checked_in' && !item.isCheckedIn) return false;
    if (statusFilter === 'pending' && (item.isCheckedIn || item.status === 'waitlisted')) return false;
    if (statusFilter === 'waitlisted' && item.status !== 'waitlisted') return false;

    // Search Query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      (item.phone && item.phone.toLowerCase().includes(q)) ||
      item.qrCode.toLowerCase().includes(q)
    );
  });

  // Handle Quick Manual Check-in
  const handleQuickCheckin = (registrationId: string) => {
    setCheckingInId(registrationId);
    startTransition(async () => {
      try {
        const res = await recordManualCheckin({ eventId: event.id, registrationId });
        if (res.success) {
          setAttendees((prev) =>
            prev.map((a) =>
              a.id === registrationId
                ? { ...a, isCheckedIn: true, checkInTime: new Date().toISOString(), checkInMethod: 'manual' }
                : a
            )
          );
        } else {
          alert(res.error || 'Failed to record check-in.');
        }
      } catch (err: any) {
        alert(err.message || 'Error recording check-in.');
      } finally {
        setCheckingInId(null);
      }
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const dataToExport = filteredAttendees.map((a, idx) => ({
      '#': idx + 1,
      'Attendee Name': a.fullName,
      'Email Address': a.email,
      'Phone Number': a.phone || 'N/A',
      'Ticket Code': a.qrCode,
      'Registration Status': a.status.toUpperCase(),
      'Single-Use Ticket Status': a.isCheckedIn ? 'USED (Checked In)' : 'UNUSED (Pending)',
      'Check-in Time': a.checkInTime ? new Date(a.checkInTime).toLocaleString() : 'N/A',
      'Check-in Method': a.checkInMethod || 'N/A',
      'Registration Date': new Date(a.createdAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ticket Holders');

    const cleanTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `GDGoC_Attendees_${cleanTitle}.xlsx`);
  };

  return (
    <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <Link
          href={`/events/${event.id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Event Workspace</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canManageCheckin && (
            <Link
              href={`/events/${event.id}/attendance`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.84rem',
                padding: '0.55rem 1.1rem',
                background: 'linear-gradient(135deg, #34A853, #16A34A)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(52, 168, 83, 0.3)',
              }}
            >
              <QrCode size={16} />
              <span>Live QR Scanner</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontSize: '0.84rem',
              padding: '0.55rem 1.1rem',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#60A5FA',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <FileSpreadsheet size={16} />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Title Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '20px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '2rem',
          border: '1px solid rgba(66, 133, 244, 0.25)',
        }}
      >
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(66, 133, 244, 0.15)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--google-blue)',
          }}>
            <Ticket size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
              Ticket Holders & Attendance Ledger
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
              {event.title} • {new Date(event.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Card 1: Total Tickets */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(66, 133, 244, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tickets Issued
            </span>
            <Ticket size={18} color="var(--google-blue)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF' }}>
            {registeredAttendees.length}
            {capacity && <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {capacity}</span>}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#93C5FD', marginTop: '0.25rem' }}>
            {capacityRate ? `${capacityRate}% Capacity Filled` : 'Unlimited Capacity'}
          </div>
        </div>

        {/* Card 2: Checked In (Used) */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(52, 168, 83, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Single-Use Scanned
            </span>
            <CheckCircle2 size={18} color="var(--google-green)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4ADE80' }}>
            {checkedInCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#86EFAC', marginTop: '0.25rem' }}>
            Verified entrance admissions
          </div>
        </div>

        {/* Card 3: Pending Unused */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(251, 188, 4, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Pending Unused
            </span>
            <Clock size={18} color="#FBBC04" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FDE047' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#FCD34D', marginTop: '0.25rem' }}>
            Valid passes not yet scanned
          </div>
        </div>

        {/* Card 4: Attendance Rate */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Attendance Turnout
            </span>
            <Users size={18} color="#C084FC" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#E9D5FF' }}>
            {attendanceRate}%
          </div>
          <div style={{ fontSize: '0.78rem', color: '#D8B4FE', marginTop: '0.25rem' }}>
            Turnout of registered attendees
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.5rem',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by attendee name, email, phone, or ticket code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFFFFF',
              fontSize: '0.9rem',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: statusFilter === 'all' ? '1px solid var(--google-blue)' : '1px solid transparent',
              background: statusFilter === 'all' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: statusFilter === 'all' ? '#93C5FD' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            All ({attendees.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('checked_in')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: statusFilter === 'checked_in' ? '1px solid var(--google-green)' : '1px solid transparent',
              background: statusFilter === 'checked_in' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: statusFilter === 'checked_in' ? '#86EFAC' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Checked In ({checkedInCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 700,
              border: statusFilter === 'pending' ? '1px solid #FBBC04' : '1px solid transparent',
              background: statusFilter === 'pending' ? 'rgba(251, 188, 4, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              color: statusFilter === 'pending' ? '#FDE047' : 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Pending ({pendingCount})
          </button>

          {waitlistedCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('waitlisted')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: statusFilter === 'waitlisted' ? '1px solid #F97316' : '1px solid transparent',
                background: statusFilter === 'waitlisted' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === 'waitlisted' ? '#FDBA74' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Waitlist ({waitlistedCount})
            </button>
          )}
        </div>
      </div>

      {/* Ticket Holders Table */}
      <div className="glass-panel" style={{ borderRadius: '18px', overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1.6fr 150px 140px 160px 140px',
            padding: '1rem 1.5rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.74rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            alignItems: 'center',
          }}
        >
          <span>#</span>
          <span>Attendee</span>
          <span>Ticket Code</span>
          <span>Registered On</span>
          <span>Single-Use Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {filteredAttendees.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Ticket size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
              No ticket holders found
            </div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
              {searchQuery ? 'Try changing your search keywords or active filter.' : 'No attendees have registered for this event yet.'}
            </div>
          </div>
        ) : (
          filteredAttendees.map((attendee, index) => (
            <div
              key={attendee.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1.6fr 150px 140px 160px 140px',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                fontSize: '0.88rem',
                transition: 'background 0.15s',
              }}
            >
              {/* # Index */}
              <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>
                {index + 1}
              </div>

              {/* Attendee details */}
              <div>
                <div style={{ fontWeight: 800, color: '#FFFFFF' }}>
                  {attendee.fullName}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
                  <Mail size={12} />
                  <span>{attendee.email}</span>
                  {attendee.phone && (
                    <>
                      <span>•</span>
                      <Phone size={12} />
                      <span>{attendee.phone}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Ticket Code */}
              <div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: '#60A5FA',
                    background: 'rgba(66, 133, 244, 0.1)',
                    border: '1px solid rgba(66, 133, 244, 0.25)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                  }}
                >
                  {attendee.qrCode}
                </span>
              </div>

              {/* Registered on */}
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                {new Date(attendee.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>

              {/* Single-Use Status */}
              <div>
                {attendee.isCheckedIn ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      background: 'rgba(52, 168, 83, 0.15)',
                      color: '#4ADE80',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                    }}
                    title={`Checked in on ${attendee.checkInTime ? new Date(attendee.checkInTime).toLocaleTimeString() : 'N/A'}`}
                  >
                    <CheckCircle2 size={13} />
                    <span>Used / Checked In</span>
                  </span>
                ) : attendee.status === 'waitlisted' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      background: 'rgba(251, 188, 4, 0.15)',
                      color: '#FDE047',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: '1px solid rgba(251, 188, 4, 0.3)',
                    }}
                  >
                    <AlertCircle size={13} />
                    <span>Waitlisted</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      background: 'rgba(66, 133, 244, 0.12)',
                      color: '#93C5FD',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      border: '1px solid rgba(66, 133, 244, 0.25)',
                    }}
                  >
                    <Clock size={13} />
                    <span>Ready (Unused)</span>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                {canManageCheckin && !attendee.isCheckedIn && attendee.status === 'registered' && (
                  <button
                    type="button"
                    onClick={() => handleQuickCheckin(attendee.id)}
                    disabled={checkingInId === attendee.id}
                    title="Fast Check-in"
                    style={{
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      background: 'rgba(52, 168, 83, 0.15)',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                      color: '#4ADE80',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: checkingInId === attendee.id ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Check size={13} />
                    <span>Check In</span>
                  </button>
                )}

                <a
                  href={`/events/${event.slug}/confirmation?reg=${attendee.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Official Ticket Pass"
                  style={{
                    padding: '0.45rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={14} />
                </a>

                <a
                  href={`/api/events/ticket/${attendee.id}/pdf`}
                  download
                  title="Download Ticket PDF"
                  style={{
                    padding: '0.45rem',
                    borderRadius: '8px',
                    background: 'rgba(234, 67, 53, 0.12)',
                    border: '1px solid rgba(234, 67, 53, 0.25)',
                    color: '#F87171',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
