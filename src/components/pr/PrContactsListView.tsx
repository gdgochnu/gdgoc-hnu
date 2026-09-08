'use client';

import React from 'react';
import {
  PRContact,
  PrContactType,
  PrPipelineStage,
} from '@/types';
import {
  Mail,
  Phone,
  Building,
  Edit2,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface PrContactsListViewProps {
  contacts: PRContact[];
  onOpenEditModal: (contact: PRContact) => void;
}

const STAGE_CONFIG: Record<PrPipelineStage, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  new: {
    label: 'New Lead',
    color: 'var(--google-blue, #4285F4)',
    bg: 'rgba(66, 133, 244, 0.12)',
    icon: <Sparkles size={12} />,
  },
  contacted: {
    label: 'Contacted',
    color: 'var(--google-yellow, #FBBC05)',
    bg: 'rgba(251, 188, 5, 0.12)',
    icon: <Clock size={12} />,
  },
  negotiating: {
    label: 'Negotiating',
    color: 'var(--google-red, #EA4335)',
    bg: 'rgba(234, 67, 53, 0.12)',
    icon: <AlertCircle size={12} />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'var(--google-green, #34A853)',
    bg: 'rgba(52, 168, 83, 0.12)',
    icon: <CheckCircle2 size={12} />,
  },
};

const TYPE_CONFIG: Record<PrContactType, { label: string; bg: string; color: string; emoji: string }> = {
  speaker: { label: 'Speaker', bg: 'rgba(66, 133, 244, 0.12)', color: '#8ab4f8', emoji: '🎤' },
  sponsor: { label: 'Sponsor', bg: 'rgba(251, 188, 5, 0.12)', color: '#fdd663', emoji: '💎' },
  partner: { label: 'Partner', bg: 'rgba(52, 168, 83, 0.12)', color: '#81c995', emoji: '🤝' },
  venue: { label: 'Venue', bg: 'rgba(161, 66, 244, 0.12)', color: '#d7aefb', emoji: '🏛️' },
  other: { label: 'Other', bg: 'rgba(154, 160, 166, 0.12)', color: '#dadce0', emoji: '📌' },
};

export function PrContactsListView({
  contacts,
  onOpenEditModal,
}: PrContactsListViewProps) {
  const exportToCsv = () => {
    if (contacts.length === 0) return;

    const headers = ['Name', 'Role Title', 'Organization', 'Type', 'Pipeline Stage', 'Email', 'Phone', 'Assignee', 'Notes', 'Created At'];
    const rows = contacts.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${(c.role_title || '').replace(/"/g, '""')}"`,
      `"${(c.organization || '').replace(/"/g, '""')}"`,
      c.type,
      c.pipeline_stage,
      c.email || '',
      c.phone || '',
      `"${(c.assignee?.full_name_en || 'Unassigned').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      new Date(c.created_at).toLocaleDateString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gdgoc-pr-contacts-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="glass-panel"
      style={{
        backgroundColor: 'var(--bg-card, #13151b)',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        borderRadius: '1rem',
        overflow: 'hidden',
      }}
    >
      {/* Header bar with Export */}
      <div
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: '#9aa0a6' }}>
          Showing <span style={{ fontWeight: 700, color: '#fff' }}>{contacts.length}</span> contacts
        </div>
        <button
          onClick={exportToCsv}
          disabled={contacts.length === 0}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.5rem 0.9rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            color: '#e8eaed',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: contacts.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <FileSpreadsheet size={15} color="var(--google-green, #34A853)" />
          <span>Export CSV</span>
        </button>
      </div>

      {contacts.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9aa0a6' }}>
          No contacts match the current filters.
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
                  borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                  color: '#9aa0a6',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <th style={{ padding: '0.85rem 1.25rem' }}>Contact Name & Role</th>
                <th style={{ padding: '0.85rem 1rem' }}>Organization</th>
                <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pipeline Stage</th>
                <th style={{ padding: '0.85rem 1rem' }}>Channels</th>
                <th style={{ padding: '0.85rem 1rem' }}>Assigned To</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, idx) => {
                const stageCfg = STAGE_CONFIG[contact.pipeline_stage] || STAGE_CONFIG.new;
                const typeCfg = TYPE_CONFIG[contact.type] || TYPE_CONFIG.other;

                return (
                  <tr
                    key={contact.id}
                    style={{
                      borderBottom:
                        idx === contacts.length - 1
                          ? 'none'
                          : '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Name & Role */}
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{contact.name}</div>
                      {contact.role_title && (
                        <div style={{ fontSize: '0.78rem', color: '#9aa0a6' }}>{contact.role_title}</div>
                      )}
                    </td>

                    {/* Organization */}
                    <td style={{ padding: '0.85rem 1rem', color: '#bdc1c6' }}>
                      {contact.organization ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Building size={14} style={{ color: '#9aa0a6' }} />
                          <span>{contact.organization}</span>
                        </div>
                      ) : (
                        <span style={{ color: '#5f6368' }}>—</span>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0.55rem',
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
                    </td>

                    {/* Stage */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: stageCfg.bg,
                          color: stageCfg.color,
                        }}
                      >
                        {stageCfg.icon}
                        <span>{stageCfg.label}</span>
                      </span>
                    </td>

                    {/* Channels */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            title={contact.email}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '1.75rem',
                              height: '1.75rem',
                              borderRadius: '0.4rem',
                              backgroundColor: 'rgba(66, 133, 244, 0.1)',
                              color: '#8ab4f8',
                            }}
                          >
                            <Mail size={13} />
                          </a>
                        ) : null}

                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            title={contact.phone}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '1.75rem',
                              height: '1.75rem',
                              borderRadius: '0.4rem',
                              backgroundColor: 'rgba(52, 168, 83, 0.1)',
                              color: '#81c995',
                            }}
                          >
                            <Phone size={13} />
                          </a>
                        ) : null}

                        {!contact.email && !contact.phone && (
                          <span style={{ color: '#5f6368', fontSize: '0.8rem' }}>None</span>
                        )}
                      </div>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {contact.assignee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {contact.assignee.avatar_url ? (
                            <img
                              src={contact.assignee.avatar_url}
                              alt=""
                              style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '1.4rem',
                                height: '1.4rem',
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
                          <span style={{ color: '#e8eaed', fontSize: '0.82rem' }}>
                            {contact.assignee.full_name_en || contact.assignee.full_name_ar || 'Member'}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#5f6368' }}>Unassigned</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => onOpenEditModal(contact)}
                        title="Edit Contact"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                          color: '#9aa0a6',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.45rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.78rem',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#9aa0a6';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
