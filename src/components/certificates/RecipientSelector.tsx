'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Filter,
  UserPlus,
  Trash2,
  Sliders,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import type { CertificateRecipientInput } from '@/types/certificates';
import {
  fetchCertificateEventsAction,
  getEventAttendeesForCertificatesAction,
  searchMemberRecipientsAction,
} from '@/lib/certificates/recipient-actions';

interface RecipientSelectorProps {
  selectedRecipients: CertificateRecipientInput[];
  onRecipientsChange: (
    recipients: CertificateRecipientInput[],
    eventId?: string,
    eventTitle?: string
  ) => void;
}

export function RecipientSelector({
  selectedRecipients,
  onRecipientsChange,
}: RecipientSelectorProps) {
  const [mode, setMode] = useState<'event' | 'manual' | 'paste'>('event');

  // Event Mode States
  const [events, setEvents] = useState<Array<{ id: string; title: string; starts_at: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [minAttendance, setMinAttendance] = useState<number>(75);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [eventAttendees, setEventAttendees] = useState<CertificateRecipientInput[]>([]);
  const [currentEventTitle, setCurrentEventTitle] = useState<string>('');

  // Manual Mode States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CertificateRecipientInput[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Paste Mode State
  const [pasteText, setPasteText] = useState('');

  // Load available events on mount
  useEffect(() => {
    fetchCertificateEventsAction().then((res) => {
      if (res.success && res.events.length > 0) {
        setEvents(res.events);
        setSelectedEventId(res.events[0].id);
      }
    });
  }, []);

  // Fetch attendees when event or minAttendance changes
  const handleLoadAttendees = async () => {
    if (!selectedEventId) return;
    setIsLoadingAttendees(true);
    try {
      const res = await getEventAttendeesForCertificatesAction(selectedEventId, minAttendance);
      if (res.success) {
        setEventAttendees(res.recipients);
        setCurrentEventTitle(res.eventTitle);
        // Automatically add qualifying attendees
        onRecipientsChange(res.recipients, selectedEventId, res.eventTitle);
      }
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  // Search members manually
  useEffect(() => {
    if (mode !== 'manual') return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMemberRecipientsAction(searchQuery);
        if (res.success) {
          setSearchResults(res.members);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const toggleRecipient = (recipient: CertificateRecipientInput) => {
    const exists = selectedRecipients.some((r) => r.email === recipient.email);
    if (exists) {
      onRecipientsChange(
        selectedRecipients.filter((r) => r.email !== recipient.email),
        selectedEventId,
        currentEventTitle
      );
    } else {
      onRecipientsChange([...selectedRecipients, recipient], selectedEventId, currentEventTitle);
    }
  };

  const removeRecipient = (email: string) => {
    onRecipientsChange(
      selectedRecipients.filter((r) => r.email !== email),
      selectedEventId,
      currentEventTitle
    );
  };

  const selectAllEventAttendees = () => {
    onRecipientsChange(eventAttendees, selectedEventId, currentEventTitle);
  };

  const clearAllRecipients = () => {
    onRecipientsChange([], undefined, undefined);
  };

  const handleApplyPasted = () => {
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: CertificateRecipientInput[] = [];

    lines.forEach((line) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length >= 2) {
        parsed.push({ name: parts[0], email: parts[1], attendancePct: 100 });
      } else if (parts[0].includes('@')) {
        parsed.push({ name: parts[0].split('@')[0], email: parts[0], attendancePct: 100 });
      }
    });

    if (parsed.length > 0) {
      // Merge uniquely by email
      const existingEmails = new Set(selectedRecipients.map((r) => r.email));
      const newItems = parsed.filter((p) => !existingEmails.has(p.email));
      onRecipientsChange([...selectedRecipients, ...newItems]);
      setPasteText('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Mode Switcher Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { id: 'event', label: 'Bulk from Event Attendees (§4.14)', icon: Calendar },
            { id: 'manual', label: 'Search Members', icon: Search },
            { id: 'paste', label: 'Paste CSV / Names', icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id as any)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  border: isActive ? '1px solid var(--google-blue)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isActive ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected count pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.4)',
              color: '#86efac',
              fontSize: '0.8rem',
              fontWeight: 800,
            }}
          >
            <CheckCircle2 size={14} />
            {selectedRecipients.length} Recipient{selectedRecipients.length === 1 ? '' : 's'} Selected
          </span>

          {selectedRecipients.length > 0 && (
            <button
              onClick={clearAllRecipients}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Bulk from Event Attendees */}
      {mode === 'event' && (
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Select Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: '#1a1d2e',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({new Date(ev.starts_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Attendance threshold slider */}
            <div style={{ minWidth: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <span>Minimum Attendance Rate</span>
                <strong style={{ color: 'var(--google-yellow)' }}>≥ {minAttendance}%</strong>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minAttendance}
                onChange={(e) => setMinAttendance(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--google-yellow)' }}
              />
            </div>

            <button
              onClick={handleLoadAttendees}
              disabled={isLoadingAttendees || !selectedEventId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--google-blue), #1d4ed8)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: isLoadingAttendees ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                alignSelf: 'flex-end',
              }}
            >
              <Users size={14} />
              <span>{isLoadingAttendees ? 'Loading Attendees...' : 'Fetch Eligible Attendees'}</span>
            </button>
          </div>

          {/* Attendees Preview List */}
          {eventAttendees.length > 0 && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Found <strong style={{ color: '#fff' }}>{eventAttendees.length}</strong> attendees with attendance ≥ {minAttendance}%
                </span>
                <button
                  onClick={selectAllEventAttendees}
                  style={{ background: 'none', border: 'none', color: 'var(--google-blue)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Select All
                </button>
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {eventAttendees.map((att) => {
                  const isChecked = selectedRecipients.some((r) => r.email === att.email);
                  return (
                    <div
                      key={att.email}
                      onClick={() => toggleRecipient(att)}
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: isChecked ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isChecked ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                            background: isChecked ? 'var(--google-blue)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                          }}
                        >
                          {isChecked && <Check size={12} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{att.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{att.email}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--google-yellow)', fontWeight: 700 }}>
                        {att.attendancePct}% attendance
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Search Members */}
      {mode === 'manual' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search active chapter members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {searchResults.map((m) => {
              const isSelected = selectedRecipients.some((r) => r.email === m.email);
              return (
                <div
                  key={m.email}
                  onClick={() => toggleRecipient(m)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: isSelected ? '1px solid var(--google-blue)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fff' }}>{m.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.email}</div>
                  </div>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {isSelected ? <Check size={14} /> : <UserPlus size={13} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 3: Paste CSV */}
      {mode === 'paste' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Paste Names and Emails (one per line, format: "Full Name, email@example.com")
            </label>
            <textarea
              rows={4}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Ahmed Mohamed, ahmed@example.com&#10;Mariam Ali, mariam@example.com"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <button
            onClick={handleApplyPasted}
            disabled={!pasteText.trim()}
            style={{
              alignSelf: 'flex-start',
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--google-blue)',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Add Parsed Recipients
          </button>
        </div>
      )}

      {/* Selected Recipients Summary Table */}
      {selectedRecipients.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Confirmed Recipient List ({selectedRecipients.length})
            </span>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {selectedRecipients.map((r) => (
              <div
                key={r.email}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontSize: '0.78rem',
                  color: '#fff',
                }}
              >
                <span>{r.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({r.email})</span>
                <button
                  onClick={() => removeRecipient(r.email)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
