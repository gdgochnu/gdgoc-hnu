'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  UserX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Send,
  ShieldAlert,
  Search,
} from 'lucide-react';
import {
  LowEngagementSummary,
  LowEngagementAlert,
  HrMemberNote,
  HrNoteType,
  HrNoteStatus,
} from '@/types';
import { createHrMemberNote, updateHrMemberNoteStatus } from '@/app/hr/actions';

interface LowEngagementAlertsViewProps {
  initialSummary: LowEngagementSummary;
}

export function LowEngagementAlertsView({ initialSummary }: LowEngagementAlertsViewProps) {
  const [summary, setSummary] = useState<LowEngagementSummary>(initialSummary);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);

  // New Note Form State
  const [activeFormProfileId, setActiveFormProfileId] = useState<string | null>(null);
  const [noteType, setNoteType] = useState<HrNoteType>('low_engagement');
  const [noteText, setNoteText] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [noteStatus, setNoteStatus] = useState<HrNoteStatus>('open');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter alerts
  const filteredAlerts = summary.alerts.filter((alert) => {
    if (filterStatus === 'open' && !alert.hasOpenFollowUp) return false;
    if (filterStatus === 'resolved' && (alert.hasOpenFollowUp || alert.notes.length === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesName = alert.fullName.toLowerCase().includes(q);
      const matchesEmail = alert.email.toLowerCase().includes(q);
      const matchesDept = alert.departmentName?.toLowerCase().includes(q);
      if (!matchesName && !matchesEmail && !matchesDept) return false;
    }
    return true;
  });

  // Handle Note Submission
  const handleSubmitNote = async (alert: LowEngagementAlert) => {
    if (!noteText.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await createHrMemberNote({
        profileId: alert.profileId,
        noteType,
        note: noteText.trim(),
        actionTaken: actionTaken.trim() || undefined,
        status: noteStatus,
        missedEventsCount: alert.missedEventsCount,
      });

      if (res.success && res.note) {
        const created = res.note;
        setSummary((prev) => {
          const updatedAlerts = prev.alerts.map((a) => {
            if (a.profileId === alert.profileId) {
              const updatedNotes = [created, ...a.notes];
              const hasOpen = updatedNotes.some((n) => n.status === 'open' || n.status === 'in_progress');
              return {
                ...a,
                notes: updatedNotes,
                hasOpenFollowUp: hasOpen,
                lastFollowUpDate: created.createdAt,
              };
            }
            return a;
          });

          return {
            ...prev,
            alerts: updatedAlerts,
            openFollowUpsCount: updatedAlerts.filter((a) => a.hasOpenFollowUp).length,
            recentNotes: [created, ...prev.recentNotes].slice(0, 10),
          };
        });

        // Reset form
        setNoteText('');
        setActionTaken('');
        setActiveFormProfileId(null);
      }
    } catch (err) {
      console.error('Failed to create HR note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Status Toggle (e.g. resolve note)
  const handleToggleNoteStatus = async (
    profileId: string,
    noteId: string,
    currentStatus: HrNoteStatus
  ) => {
    const nextStatus: HrNoteStatus = currentStatus === 'resolved' ? 'open' : 'resolved';

    try {
      await updateHrMemberNoteStatus(noteId, nextStatus);

      setSummary((prev) => {
        const updatedAlerts = prev.alerts.map((a) => {
          if (a.profileId === profileId) {
            const updatedNotes = a.notes.map((n) => (n.id === noteId ? { ...n, status: nextStatus } : n));
            const hasOpen = updatedNotes.some((n) => n.status === 'open' || n.status === 'in_progress');
            return {
              ...a,
              notes: updatedNotes,
              hasOpenFollowUp: hasOpen,
            };
          }
          return a;
        });

        return {
          ...prev,
          alerts: updatedAlerts,
          openFollowUpsCount: updatedAlerts.filter((a) => a.hasOpenFollowUp).length,
          resolvedFollowUpsCount:
            nextStatus === 'resolved'
              ? prev.resolvedFollowUpsCount + 1
              : Math.max(0, prev.resolvedFollowUpsCount - 1),
        };
      });
    } catch (err) {
      console.error('Failed to update note status:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Top Alerts & Stats Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'rgba(234, 67, 53, 0.15)',
                color: 'var(--google-red)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
              }}
            >
              <AlertTriangle size={13} /> Low-Engagement Trigger Matrix
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Spec §4.5 &bull; §4.11 &bull; Step 10.3
            </span>
          </div>

          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 0.25rem 0',
              letterSpacing: '-0.01em',
            }}
          >
            Engagement Alerts &amp; HR Follow-up Log
          </h2>
          <p
            style={{
              fontSize: '0.88rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '650px',
            }}
          >
            Automatic alerts for members who missed 3+ chapter events, with dedicated HR intervention notes and follow-up logging feeding directly into reviews.
          </p>
        </div>

        {/* Quick Stat Counter Cards */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            className="glass-panel"
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              background: 'rgba(234, 67, 53, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <ShieldAlert size={20} color="var(--google-red)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Flagged Members
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--google-red)' }}>
                {summary.totalAlerts}
              </div>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1px solid rgba(251, 188, 5, 0.3)',
              background: 'rgba(251, 188, 5, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Clock size={20} color="var(--google-yellow)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Action Needed
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--google-yellow)' }}>
                {summary.openFollowUpsCount}
              </div>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: '12px',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              background: 'rgba(52, 168, 83, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <CheckCircle2 size={20} color="var(--google-green)" />
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                Resolved Notes
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--google-green)' }}>
                {summary.resolvedFollowUpsCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter */}
      <div
        className="glass-panel"
        style={{
          padding: '1.1rem 1.5rem',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search flagged members by name, email, or committee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.5rem',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(0, 0, 0, 0.25)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Tab Filter buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterStatus === 'all' ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.12)',
              background: filterStatus === 'all' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
              color: filterStatus === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All Alerts ({summary.alerts.length})
          </button>
          <button
            onClick={() => setFilterStatus('open')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterStatus === 'open' ? 'var(--google-yellow)' : 'rgba(255, 255, 255, 0.12)',
              background: filterStatus === 'open' ? 'rgba(251, 188, 5, 0.15)' : 'transparent',
              color: filterStatus === 'open' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open / Pending ({summary.openFollowUpsCount})
          </button>
          <button
            onClick={() => setFilterStatus('resolved')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: filterStatus === 'resolved' ? 'var(--google-green)' : 'rgba(255, 255, 255, 0.12)',
              background: filterStatus === 'resolved' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
              color: filterStatus === 'resolved' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* 3. Alerts Cards List */}
      {filteredAlerts.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            borderRadius: '16px',
            color: 'var(--text-muted)',
          }}
        >
          <CheckCircle2 size={42} color="var(--google-green)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            No Low-Engagement Alerts
          </h3>
          <p style={{ margin: '0.5rem auto 0', fontSize: '0.88rem', maxWidth: '480px' }}>
            All active chapter members are meeting regular attendance standards and no open follow-up actions are pending.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredAlerts.map((alert) => {
            const isExpanded = expandedProfileId === alert.profileId;
            const isFormOpen = activeFormProfileId === alert.profileId;

            return (
              <div
                key={alert.profileId}
                className="glass-panel"
                style={{
                  borderRadius: '16px',
                  border: alert.hasOpenFollowUp
                    ? '1px solid rgba(234, 67, 53, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  background: alert.hasOpenFollowUp
                    ? 'linear-gradient(135deg, rgba(234, 67, 53, 0.05), transparent)'
                    : 'var(--bg-card)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  {/* Member info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        color: '#FFFFFF',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {alert.avatarUrl ? (
                        <img
                          src={alert.avatarUrl}
                          alt={alert.fullName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        alert.fullName.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Link
                          href={`/members/${alert.profileId}`}
                          style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          {alert.fullName}
                          {alert.fullNameAr && (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                              ({alert.fullNameAr})
                            </span>
                          )}
                          <ExternalLink size={13} style={{ opacity: 0.6 }} />
                        </Link>

                        {/* Status Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: alert.hasOpenFollowUp
                              ? 'rgba(234, 67, 53, 0.18)'
                              : 'rgba(52, 168, 83, 0.15)',
                            color: alert.hasOpenFollowUp ? 'var(--google-red)' : 'var(--google-green)',
                            border: `1px solid ${
                              alert.hasOpenFollowUp
                                ? 'rgba(234, 67, 53, 0.35)'
                                : 'rgba(52, 168, 83, 0.35)'
                            }`,
                          }}
                        >
                          {alert.hasOpenFollowUp ? 'Action Required' : 'Monitored / OK'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {alert.position || alert.role} &bull; {alert.departmentName || 'No Committee'}
                        {alert.branch && ` (${alert.branch === 'tech' ? 'Tech' : 'Non-Tech'})`} &bull;{' '}
                        {alert.email}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Badges & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* Missed Events Badge */}
                    <div
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '10px',
                        background: 'rgba(234, 67, 53, 0.12)',
                        border: '1px solid rgba(234, 67, 53, 0.3)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Missed Events
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--google-red)' }}>
                        {alert.missedEventsCount} / {alert.totalEligibleEvents}
                      </div>
                    </div>

                    {/* Attendance Rate */}
                    <div
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Rate
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--google-yellow)' }}>
                        {alert.attendanceRate}%
                      </div>
                    </div>

                    {/* Add Note CTA */}
                    <button
                      onClick={() => {
                        setActiveFormProfileId(isFormOpen ? null : alert.profileId);
                        if (!isExpanded) setExpandedProfileId(alert.profileId);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.55rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(66, 133, 244, 0.4)',
                        background: 'rgba(66, 133, 244, 0.15)',
                        color: 'var(--google-blue)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Log Follow-up
                    </button>

                    {/* Expand/Collapse Toggle */}
                    <button
                      onClick={() => setExpandedProfileId(isExpanded ? null : alert.profileId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.55rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      History ({alert.notes.length})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Log Note Form Modal/Inline */}
                {isFormOpen && (
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Record HR Follow-up Note for {alert.fullName}
                      </div>
                      <button
                        onClick={() => setActiveFormProfileId(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          Note Type
                        </label>
                        <select
                          value={noteType}
                          onChange={(e) => setNoteType(e.target.value as any)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <option value="low_engagement">Low Engagement Alert (3+ Missed)</option>
                          <option value="attendance_follow_up">Attendance Follow-up</option>
                          <option value="performance">Performance Review Note</option>
                          <option value="general">General HR Note</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          Status
                        </label>
                        <select
                          value={noteStatus}
                          onChange={(e) => setNoteStatus(e.target.value as any)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <option value="open">Open (Follow-up needed)</option>
                          <option value="in_progress">In Progress (Contacted / Waiting)</option>
                          <option value="resolved">Resolved (Excused / Re-engaged)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                          Action Taken (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. WhatsApp message sent, phone check-in"
                          value={actionTaken}
                          onChange={(e) => setActionTaken(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            background: 'rgba(0, 0, 0, 0.5)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        Note &amp; Findings (feeds into monthly performance review)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Detail the circumstances, reason for absence, member response, or agreed plan..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(0, 0, 0, 0.5)',
                          color: 'var(--text-primary)',
                          fontSize: '0.84rem',
                          resize: 'vertical',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                      <button
                        onClick={() => setActiveFormProfileId(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitNote(alert)}
                        disabled={isSubmitting || !noteText.trim()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 1.25rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                          color: '#FFFFFF',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: isSubmitting || !noteText.trim() ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting || !noteText.trim() ? 0.6 : 1,
                        }}
                      >
                        <Send size={13} /> {isSubmitting ? 'Saving...' : 'Save HR Note'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Follow-up History Log Accordion */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1.25rem 1.5rem',
                      background: 'rgba(0, 0, 0, 0.25)',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 800,
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <MessageSquare size={14} color="var(--google-blue)" />
                      HR Follow-up History ({alert.notes.length})
                    </div>

                    {alert.notes.length === 0 ? (
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          padding: '0.75rem 0',
                          fontStyle: 'italic',
                        }}
                      >
                        No previous HR follow-up notes logged for this member. Click "Log Follow-up" above to record an action.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {alert.notes.map((note) => (
                          <div
                            key={note.id}
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '1rem',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    background:
                                      note.status === 'resolved'
                                        ? 'rgba(52, 168, 83, 0.15)'
                                        : 'rgba(251, 188, 5, 0.15)',
                                    color:
                                      note.status === 'resolved'
                                        ? 'var(--google-green)'
                                        : 'var(--google-yellow)',
                                  }}
                                >
                                  {note.status.toUpperCase()}
                                </span>

                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                  Logged by <strong>{note.authorName}</strong> &bull;{' '}
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                                {note.note}
                              </p>

                              {note.actionTaken && (
                                <div
                                  style={{
                                    marginTop: '0.4rem',
                                    fontSize: '0.76rem',
                                    color: 'var(--google-blue)',
                                    fontWeight: 600,
                                  }}
                                >
                                  Action taken: {note.actionTaken}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleToggleNoteStatus(alert.profileId, note.id, note.status)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: note.status === 'resolved' ? 'var(--text-muted)' : 'var(--google-green)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {note.status === 'resolved' ? 'Reopen' : 'Mark Resolved'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
