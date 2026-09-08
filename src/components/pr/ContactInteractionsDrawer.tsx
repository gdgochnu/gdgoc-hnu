'use client';

import React, { useState, useEffect } from 'react';
import {
  PRContact,
  PRInteraction,
  PrInteractionType,
  PrPipelineStage,
  PrContactType,
} from '@/types';
import {
  getPrInteractions,
  createPrInteraction,
  deletePrInteraction,
  updatePrContactStage,
} from '@/app/pr/actions';
import {
  X,
  Mail,
  Phone,
  Calendar,
  Clock,
  Send,
  Loader2,
  Trash2,
  AlertTriangle,
  Building,
  CheckCircle2,
  MessageSquare,
  Users,
  Sparkles,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';

interface ContactInteractionsDrawerProps {
  isOpen: boolean;
  contact: PRContact | null;
  onClose: () => void;
  onContactUpdated: (updatedContact: PRContact) => void;
}

const TYPE_CONFIG: Record<PrContactType, { label: string; bg: string; color: string; emoji: string }> = {
  speaker: { label: 'Speaker', bg: 'rgba(66, 133, 244, 0.12)', color: '#8ab4f8', emoji: '🎤' },
  sponsor: { label: 'Sponsor', bg: 'rgba(251, 188, 5, 0.12)', color: '#fdd663', emoji: '💎' },
  partner: { label: 'Partner', bg: 'rgba(52, 168, 83, 0.12)', color: '#81c995', emoji: '🤝' },
  venue: { label: 'Venue', bg: 'rgba(161, 66, 244, 0.12)', color: '#d7aefb', emoji: '🏛️' },
  other: { label: 'Other', bg: 'rgba(154, 160, 166, 0.12)', color: '#dadce0', emoji: '📌' },
};

const STAGE_CONFIG: Record<PrPipelineStage, { label: string; color: string; bg: string }> = {
  new: { label: 'New Lead', color: 'var(--google-blue, #4285F4)', bg: 'rgba(66, 133, 244, 0.12)' },
  contacted: { label: 'Contacted', color: 'var(--google-yellow, #FBBC05)', bg: 'rgba(251, 188, 5, 0.12)' },
  negotiating: { label: 'Negotiating', color: 'var(--google-red, #EA4335)', bg: 'rgba(234, 67, 53, 0.12)' },
  confirmed: { label: 'Confirmed', color: 'var(--google-green, #34A853)', bg: 'rgba(52, 168, 83, 0.12)' },
};

const INTERACTION_CONFIG: Record<
  PrInteractionType,
  { label: string; icon: React.ReactNode; color: string; bg: string }
> = {
  email: {
    label: 'Email',
    icon: <Mail size={15} />,
    color: '#8ab4f8',
    bg: 'rgba(66, 133, 244, 0.15)',
  },
  call: {
    label: 'Phone Call',
    icon: <Phone size={15} />,
    color: '#81c995',
    bg: 'rgba(52, 168, 83, 0.15)',
  },
  meeting: {
    label: 'Meeting',
    icon: <Users size={15} />,
    color: '#d7aefb',
    bg: 'rgba(161, 66, 244, 0.15)',
  },
  message: {
    label: 'Message',
    icon: <MessageSquare size={15} />,
    color: '#fdd663',
    bg: 'rgba(251, 188, 5, 0.15)',
  },
};

export function ContactInteractionsDrawer({
  isOpen,
  contact,
  onClose,
  onContactUpdated,
}: ContactInteractionsDrawerProps) {
  const [interactions, setInteractions] = useState<PRInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New interaction form state
  const [interactionType, setInteractionType] = useState<PrInteractionType>('email');
  const [summary, setSummary] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [updateStageTo, setUpdateStageTo] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch interactions when modal opens for a contact
  useEffect(() => {
    if (isOpen && contact) {
      setIsLoading(true);
      setError(null);
      setSummary('');
      setNextFollowUpDate('');
      setUpdateStageTo('');

      getPrInteractions(contact.id)
        .then((res) => {
          if (res.success) {
            setInteractions(res.data);
          } else {
            setError(res.error || 'Failed to load interactions');
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, contact]);

  if (!isOpen || !contact) return null;

  const typeCfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.other;
  const stageCfg = STAGE_CONFIG[contact.pipeline_stage] || STAGE_CONFIG.new;

  // Determine follow-up status (overdue vs upcoming)
  const latestFollowUp = contact.next_follow_up || interactions.find((i) => i.next_follow_up)?.next_follow_up;
  let followUpStatus: 'overdue' | 'today' | 'upcoming' | 'none' = 'none';
  let followUpDiffDays = 0;

  if (latestFollowUp) {
    const fDate = new Date(latestFollowUp);
    const now = new Date();
    const diffMs = fDate.getTime() - now.getTime();
    followUpDiffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0 && Math.abs(diffMs) > 1000 * 60 * 60 * 12) {
      followUpStatus = 'overdue';
    } else if (Math.abs(diffMs) <= 1000 * 60 * 60 * 12) {
      followUpStatus = 'today';
    } else {
      followUpStatus = 'upcoming';
    }
  }

  const handleStageChange = async (newStage: PrPipelineStage) => {
    if (contact.pipeline_stage === newStage) return;
    const updated = { ...contact, pipeline_stage: newStage, updated_at: new Date().toISOString() };
    onContactUpdated(updated);

    try {
      await updatePrContactStage(contact.id, newStage);
    } catch (err: any) {
      onContactUpdated(contact); // revert
    }
  };

  const handleLogInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createPrInteraction({
        contact_id: contact.id,
        interaction_type: interactionType,
        summary: summary.trim(),
        next_follow_up: nextFollowUpDate || null,
        update_stage: (updateStageTo as PrPipelineStage) || undefined,
      });

      if (res.success && res.data) {
        setInteractions((prev) => [res.data!, ...prev]);
        setSummary('');
        setNextFollowUpDate('');
        setUpdateStageTo('');

        // Notify parent contact update
        const updatedContact: PRContact = {
          ...contact,
          pipeline_stage: (updateStageTo as PrPipelineStage) || contact.pipeline_stage,
          interactions_count: (contact.interactions_count || 0) + 1,
          latest_interaction: res.data,
          next_follow_up: nextFollowUpDate ? new Date(nextFollowUpDate).toISOString() : contact.next_follow_up,
          updated_at: new Date().toISOString(),
        };
        onContactUpdated(updatedContact);
      } else {
        setError(res.error || 'Failed to log interaction');
      }
    } catch (err: any) {
      setError(err.message || 'Error logging interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    setDeletingId(interactionId);
    try {
      const res = await deletePrInteraction(interactionId);
      if (res.success) {
        const remaining = interactions.filter((i) => i.id !== interactionId);
        setInteractions(remaining);
        const newNextFollowUp = remaining.find((i) => i.next_follow_up)?.next_follow_up || null;
        onContactUpdated({
          ...contact,
          interactions_count: Math.max(0, (contact.interactions_count || 1) - 1),
          next_follow_up: newNextFollowUp,
          latest_interaction: remaining[0] || null,
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-card, #13151b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          color: '#fff',
        }}
      >
        {/* Contact Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.4rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: typeCfg.bg,
                  color: typeCfg.color,
                }}
              >
                <span>{typeCfg.emoji}</span>
                <span>{typeCfg.label}</span>
              </span>

              {/* Stage selector dropdown */}
              <select
                value={contact.pipeline_stage}
                onChange={(e) => handleStageChange(e.target.value as PrPipelineStage)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: stageCfg.bg,
                  color: stageCfg.color,
                  border: `1px solid ${stageCfg.color}40`,
                  cursor: 'pointer',
                }}
              >
                <option value="new">🔵 New Lead</option>
                <option value="contacted">🟡 Contacted</option>
                <option value="negotiating">🔴 Negotiating</option>
                <option value="confirmed">🟢 Confirmed</option>
              </select>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#fff' }}>
              {contact.name}
            </h2>

            {(contact.role_title || contact.organization) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#bdc1c6', marginBottom: '0.5rem' }}>
                {contact.organization && <Building size={14} style={{ color: '#9aa0a6' }} />}
                <span>{[contact.role_title, contact.organization].filter(Boolean).join(' • ')}</span>
              </div>
            )}

            {/* Quick Contact Links */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#8ab4f8',
                    textDecoration: 'none',
                    background: 'rgba(66, 133, 244, 0.08)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                  }}
                >
                  <Mail size={13} />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#81c995',
                    textDecoration: 'none',
                    background: 'rgba(52, 168, 83, 0.08)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '0.4rem',
                  }}
                >
                  <Phone size={13} />
                  <span>{contact.phone}</span>
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: '#9aa0a6',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Follow-up Status Banner */}
          {latestFollowUp && (
            <div
              style={{
                padding: '0.85rem 1.15rem',
                borderRadius: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor:
                  followUpStatus === 'overdue'
                    ? 'rgba(234, 67, 53, 0.12)'
                    : followUpStatus === 'today'
                    ? 'rgba(251, 188, 5, 0.12)'
                    : 'rgba(66, 133, 244, 0.12)',
                border:
                  followUpStatus === 'overdue'
                    ? '1px solid rgba(234, 67, 53, 0.35)'
                    : followUpStatus === 'today'
                    ? '1px solid rgba(251, 188, 5, 0.35)'
                    : '1px solid rgba(66, 133, 244, 0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {followUpStatus === 'overdue' ? (
                  <AlertTriangle size={20} color="var(--google-red, #ea4335)" />
                ) : (
                  <Calendar size={20} color="var(--google-blue, #4285F4)" />
                )}
                <div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color:
                        followUpStatus === 'overdue'
                          ? '#f28b82'
                          : followUpStatus === 'today'
                          ? '#fdd663'
                          : '#8ab4f8',
                    }}
                  >
                    {followUpStatus === 'overdue'
                      ? `Follow-up Overdue (${Math.abs(followUpDiffDays)} days ago)`
                      : followUpStatus === 'today'
                      ? 'Follow-up Due Today'
                      : `Upcoming Follow-up (in ${followUpDiffDays} days)`}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#bdc1c6' }}>
                    Scheduled for {new Date(latestFollowUp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                borderRadius: '0.75rem',
                color: '#f28b82',
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Log New Interaction Form */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.09))',
              borderRadius: '1rem',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <PlusCircle size={18} color="var(--google-blue, #4285F4)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Log New Interaction
              </h3>
            </div>

            <form onSubmit={handleLogInteraction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Interaction Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#bdc1c6', marginBottom: '0.4rem' }}>
                  Channel Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {(['email', 'call', 'meeting', 'message'] as PrInteractionType[]).map((t) => {
                    const cfg = INTERACTION_CONFIG[t];
                    const isSelected = interactionType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setInteractionType(t)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem',
                          borderRadius: '0.5rem',
                          border: isSelected ? `1px solid ${cfg.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                          backgroundColor: isSelected ? cfg.bg : 'rgba(255, 255, 255, 0.03)',
                          color: isSelected ? cfg.color : '#bdc1c6',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {cfg.icon}
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Note */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#bdc1c6', marginBottom: '0.4rem' }}>
                  Summary / Discussion Notes <span style={{ color: 'var(--google-red, #ea4335)' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="What was discussed? Any decisions made, topics pitched, or next action items?"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.6rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                    color: '#fff',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Follow-up date & optional stage upgrade */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#bdc1c6', marginBottom: '0.4rem' }}>
                    Schedule Next Follow-up
                  </label>
                  <input
                    type="datetime-local"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.6rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      color: '#fff',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#bdc1c6', marginBottom: '0.4rem' }}>
                    Update Stage (Optional)
                  </label>
                  <select
                    value={updateStageTo}
                    onChange={(e) => setUpdateStageTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.6rem',
                      backgroundColor: '#1e212b',
                      border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))',
                      color: '#fff',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Keep current stage ({stageCfg.label})</option>
                    <option value="new">🔵 New Lead</option>
                    <option value="contacted">🟡 Contacted</option>
                    <option value="negotiating">🔴 Negotiating</option>
                    <option value="confirmed">🟢 Confirmed</option>
                  </select>
                </div>
              </div>

              {/* Submit button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || !summary.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    borderRadius: '0.6rem',
                    border: 'none',
                    backgroundColor: 'var(--google-blue, #4285F4)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSubmitting || !summary.trim() ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting || !summary.trim() ? 0.6 : 1,
                    boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>Record Interaction</span>
                </button>
              </div>
            </form>
          </div>

          {/* Interaction History Timeline */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Clock size={16} color="#9aa0a6" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#e8eaed' }}>
                  Interaction History & Logs
                </h3>
                <span
                  style={{
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#bdc1c6',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {interactions.length}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#9aa0a6' }}>
                <Loader2 size={20} className="animate-spin" style={{ marginRight: '0.5rem' }} />
                <span>Loading interactions...</span>
              </div>
            ) : interactions.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '0.75rem',
                  color: '#9aa0a6',
                  fontSize: '0.85rem',
                }}
              >
                <MessageSquare size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <div>No interactions recorded yet.</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                  Use the form above to log the first email, call, or meeting with this contact.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {interactions.map((item) => {
                  const cfg = INTERACTION_CONFIG[item.interaction_type] || INTERACTION_CONFIG.email;
                  const isDeleting = deletingId === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        opacity: isDeleting ? 0.4 : 1,
                      }}
                    >
                      {/* Header row: Icon, Type, Author, Date & Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              width: '1.75rem',
                              height: '1.75rem',
                              borderRadius: '0.5rem',
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {cfg.icon}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                              {cfg.label}
                            </span>
                            {item.author && (
                              <span style={{ fontSize: '0.75rem', color: '#9aa0a6', marginLeft: '0.4rem' }}>
                                by {item.author.full_name_en}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#9aa0a6' }}>
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => handleDeleteInteraction(item.id)}
                            disabled={isDeleting}
                            title="Delete entry"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#5f6368',
                              cursor: 'pointer',
                              padding: '0.2rem',
                              borderRadius: '0.3rem',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--google-red, #ea4335)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#5f6368')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Summary Note */}
                      <div style={{ fontSize: '0.85rem', color: '#e8eaed', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {item.summary}
                      </div>

                      {/* Next follow-up tag if scheduled in this entry */}
                      {item.next_follow_up && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.73rem',
                            color: '#8ab4f8',
                            backgroundColor: 'rgba(66, 133, 244, 0.08)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.35rem',
                            width: 'fit-content',
                          }}
                        >
                          <Calendar size={12} />
                          <span>
                            Next follow-up set for {new Date(item.next_follow_up).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
