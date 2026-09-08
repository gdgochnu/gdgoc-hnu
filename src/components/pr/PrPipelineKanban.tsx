'use client';

import React, { useState } from 'react';
import {
  PRContact,
  PrPipelineStage,
  PrContactType,
} from '@/types';
import { updatePrContactStage } from '@/app/pr/actions';
import {
  Plus,
  Mail,
  Phone,
  Building,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Sparkles,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Users,
} from 'lucide-react';

interface PrPipelineKanbanProps {
  contacts: PRContact[];
  onContactUpdated: (contact: PRContact) => void;
  onOpenCreateModal: (stage?: PrPipelineStage) => void;
  onOpenEditModal: (contact: PRContact) => void;
}

const STAGES: Array<{
  id: PrPipelineStage;
  label: string;
  sublabel: string;
  color: string;
  badgeBg: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'new',
    label: 'New Leads',
    sublabel: 'Identified & nominated',
    color: 'var(--google-blue, #4285F4)',
    badgeBg: 'rgba(66, 133, 244, 0.15)',
    icon: <Sparkles size={16} color="#4285F4" />,
  },
  {
    id: 'contacted',
    label: 'Contacted',
    sublabel: 'Outreach sent',
    color: 'var(--google-yellow, #FBBC05)',
    badgeBg: 'rgba(251, 188, 5, 0.15)',
    icon: <Clock size={16} color="#FBBC05" />,
  },
  {
    id: 'negotiating',
    label: 'Negotiating',
    sublabel: 'Topic / dates / terms',
    color: 'var(--google-red, #EA4335)',
    badgeBg: 'rgba(234, 67, 53, 0.15)',
    icon: <AlertCircle size={16} color="#EA4335" />,
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    sublabel: 'Agreement secured',
    color: 'var(--google-green, #34A853)',
    badgeBg: 'rgba(52, 168, 83, 0.15)',
    icon: <CheckCircle2 size={16} color="#34A853" />,
  },
];

const TYPE_CONFIG: Record<PrContactType, { label: string; bg: string; color: string; emoji: string }> = {
  speaker: { label: 'Speaker', bg: 'rgba(66, 133, 244, 0.12)', color: '#8ab4f8', emoji: '🎤' },
  sponsor: { label: 'Sponsor', bg: 'rgba(251, 188, 5, 0.12)', color: '#fdd663', emoji: '💎' },
  partner: { label: 'Partner', bg: 'rgba(52, 168, 83, 0.12)', color: '#81c995', emoji: '🤝' },
  venue: { label: 'Venue', bg: 'rgba(161, 66, 244, 0.12)', color: '#d7aefb', emoji: '🏛️' },
  other: { label: 'Other', bg: 'rgba(154, 160, 166, 0.12)', color: '#dadce0', emoji: '📌' },
};

export function PrPipelineKanban({
  contacts,
  onContactUpdated,
  onOpenCreateModal,
  onOpenEditModal,
}: PrPipelineKanbanProps) {
  const [draggedContactId, setDraggedContactId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PrPipelineStage | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Group contacts by stage
  const contactsByStage: Record<PrPipelineStage, PRContact[]> = {
    new: [],
    contacted: [],
    negotiating: [],
    confirmed: [],
  };

  contacts.forEach((c) => {
    if (contactsByStage[c.pipeline_stage]) {
      contactsByStage[c.pipeline_stage].push(c);
    } else {
      contactsByStage.new.push(c);
    }
  });

  const handleStageTransition = async (contact: PRContact, newStage: PrPipelineStage) => {
    if (contact.pipeline_stage === newStage) return;
    setUpdatingId(contact.id);

    // Optimistic update
    const updated: PRContact = {
      ...contact,
      pipeline_stage: newStage,
      updated_at: new Date().toISOString(),
    };
    onContactUpdated(updated);

    try {
      const res = await updatePrContactStage(contact.id, newStage);
      if (!res.success) {
        // Revert on error
        onContactUpdated(contact);
        alert(res.error || 'Failed to update pipeline stage');
      }
    } catch (err: any) {
      onContactUpdated(contact);
      alert(err.message || 'Stage transition failed');
    } finally {
      setUpdatingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.setData('text/plain', contactId);
    setDraggedContactId(contactId);
  };

  const handleDragOver = (e: React.DragEvent, stage: PrPipelineStage) => {
    e.preventDefault();
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: PrPipelineStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData('text/plain') || draggedContactId;
    setDraggedContactId(null);

    if (!contactId) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (contact && contact.pipeline_stage !== stage) {
      handleStageTransition(contact, stage);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        alignItems: 'start',
      }}
    >
      {STAGES.map((stageInfo, stageIdx) => {
        const stageContacts = contactsByStage[stageInfo.id] || [];
        const isDragTarget = dragOverStage === stageInfo.id;

        return (
          <div
            key={stageInfo.id}
            onDragOver={(e) => handleDragOver(e, stageInfo.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stageInfo.id)}
            className="glass-panel"
            style={{
              backgroundColor: isDragTarget
                ? 'rgba(255, 255, 255, 0.06)'
                : 'var(--bg-card, #13151b)',
              border: isDragTarget
                ? `1px dashed ${stageInfo.color}`
                : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              borderRadius: '1rem',
              padding: '1.15rem',
              minHeight: '480px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.85rem',
                borderBottom: `2px solid ${stageInfo.color}`,
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.75rem',
                    height: '1.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: stageInfo.badgeBg,
                  }}
                >
                  {stageInfo.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                      {stageInfo.label}
                    </span>
                    <span
                      style={{
                        padding: '0.1rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: stageInfo.badgeBg,
                        color: stageInfo.color,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      {stageContacts.length}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9aa0a6' }}>
                    {stageInfo.sublabel}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenCreateModal(stageInfo.id)}
                title={`Add contact to ${stageInfo.label}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                  color: '#e8eaed',
                  width: '1.85rem',
                  height: '1.85rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Cards List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                flex: 1,
              }}
            >
              {stageContacts.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2.5rem 1rem',
                    textAlign: 'center',
                    border: '1px dashed rgba(255, 255, 255, 0.07)',
                    borderRadius: '0.75rem',
                    color: '#9aa0a6',
                    fontSize: '0.82rem',
                    flex: 1,
                  }}
                >
                  <Users size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <div>No contacts in this stage</div>
                  <button
                    onClick={() => onOpenCreateModal(stageInfo.id)}
                    style={{
                      marginTop: '0.75rem',
                      background: 'none',
                      border: 'none',
                      color: stageInfo.color,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <Plus size={14} /> Add First Lead
                  </button>
                </div>
              ) : (
                stageContacts.map((contact) => {
                  const typeCfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.other;
                  const isUpdating = updatingId === contact.id;

                  return (
                    <div
                      key={contact.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, contact.id)}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.09))',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        cursor: 'grab',
                        transition: 'all 0.15s ease',
                        opacity: isUpdating ? 0.6 : 1,
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle, rgba(255, 255, 255, 0.09))';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                    >
                      {/* Top: Type badge & edit button */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: typeCfg.bg,
                            color: typeCfg.color,
                          }}
                        >
                          <span>{typeCfg.emoji}</span>
                          <span>{typeCfg.label}</span>
                        </span>

                        <button
                          onClick={() => onOpenEditModal(contact)}
                          title="Edit contact"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9aa0a6',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            borderRadius: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#9aa0a6')}
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>

                      {/* Contact Name & Role */}
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.2rem' }}>
                        {contact.name}
                      </div>

                      {(contact.role_title || contact.organization) && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.8rem',
                            color: '#bdc1c6',
                            marginBottom: '0.65rem',
                          }}
                        >
                          {contact.organization && <Building size={13} style={{ flexShrink: 0, color: '#9aa0a6' }} />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[contact.role_title, contact.organization].filter(Boolean).join(' • ')}
                          </span>
                        </div>
                      )}

                      {/* Contact Channels (Email / Phone) */}
                      {(contact.email || contact.phone) && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            marginBottom: '0.65rem',
                            paddingTop: '0.4rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                          }}
                        >
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              title={contact.email}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.73rem',
                                color: '#8ab4f8',
                                textDecoration: 'none',
                                background: 'rgba(66, 133, 244, 0.08)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '0.35rem',
                              }}
                            >
                              <Mail size={12} />
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {contact.email}
                              </span>
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              title={contact.phone}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.73rem',
                                color: '#81c995',
                                textDecoration: 'none',
                                background: 'rgba(52, 168, 83, 0.08)',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '0.35rem',
                              }}
                            >
                              <Phone size={12} />
                              <span>{contact.phone}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Notes Preview (if any) */}
                      {contact.notes && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#9aa0a6',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '0.4rem',
                            marginBottom: '0.65rem',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {contact.notes}
                        </div>
                      )}

                      {/* Footer: Assignee & Stage shift buttons */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        {/* Assignee */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {contact.assignee ? (
                            <div
                              title={`Assigned to ${contact.assignee.full_name_en}`}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              {contact.assignee.avatar_url ? (
                                <img
                                  src={contact.assignee.avatar_url}
                                  alt=""
                                  style={{ width: '1.35rem', height: '1.35rem', borderRadius: '50%' }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: '1.35rem',
                                    height: '1.35rem',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(66, 133, 244, 0.25)',
                                    color: '#8ab4f8',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {(contact.assignee.full_name_en || contact.assignee.full_name_ar || 'M')[0]}
                                </div>
                              )}
                              <span style={{ fontSize: '0.73rem', color: '#9aa0a6' }}>
                                {(contact.assignee.full_name_en || contact.assignee.full_name_ar || 'Member').split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#5f6368' }}>Unassigned</span>
                          )}
                        </div>

                        {/* Stage shift arrows */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {stageIdx > 0 && (
                            <button
                              onClick={() => handleStageTransition(contact, STAGES[stageIdx - 1].id)}
                              disabled={isUpdating}
                              title={`Move back to ${STAGES[stageIdx - 1].label}`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#9aa0a6',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '0.35rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#9aa0a6')}
                            >
                              <ArrowLeft size={12} />
                            </button>
                          )}

                          {stageIdx < STAGES.length - 1 && (
                            <button
                              onClick={() => handleStageTransition(contact, STAGES[stageIdx + 1].id)}
                              disabled={isUpdating}
                              title={`Advance to ${STAGES[stageIdx + 1].label}`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: stageInfo.color,
                                padding: '0.2rem 0.4rem',
                                borderRadius: '0.35rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                            >
                              <span>Next</span>
                              <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
