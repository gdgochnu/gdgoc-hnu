'use client';

import React, { useState } from 'react';
import {
  PRContact,
  PrContactType,
  PrPipelineStage,
  UserRole,
} from '@/types';
import { updatePrContact, deletePrContact } from '@/app/pr/actions';
import { X, Edit3, Trash2, Loader2, Building, Mail, Phone } from 'lucide-react';

interface EditContactModalProps {
  isOpen: boolean;
  contact: PRContact | null;
  onClose: () => void;
  onContactUpdated: (updatedContact: PRContact) => void;
  onContactDeleted: (contactId: string) => void;
  teamMembers: Array<{
    id: string;
    full_name_en: string;
    full_name_ar: string;
    role: UserRole;
    avatar_url?: string | null;
  }>;
}

export function EditContactModal({
  isOpen,
  contact,
  onClose,
  onContactUpdated,
  onContactDeleted,
  teamMembers,
}: EditContactModalProps) {
  const [name, setName] = useState(contact?.name || '');
  const [organization, setOrganization] = useState(contact?.organization || '');
  const [roleTitle, setRoleTitle] = useState(contact?.role_title || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [type, setType] = useState<PrContactType>(contact?.type || 'speaker');
  const [stage, setStage] = useState<PrPipelineStage>(contact?.pipeline_stage || 'new');
  const [assignedTo, setAssignedTo] = useState<string>(contact?.assigned_to || '');
  const [notes, setNotes] = useState(contact?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if contact prop changes
  React.useEffect(() => {
    if (contact) {
      setName(contact.name);
      setOrganization(contact.organization || '');
      setRoleTitle(contact.role_title || '');
      setEmail(contact.email || '');
      setPhone(contact.phone || '');
      setType(contact.type);
      setStage(contact.pipeline_stage);
      setAssignedTo(contact.assigned_to || '');
      setNotes(contact.notes || '');
      setConfirmDelete(false);
      setError(null);
    }
  }, [contact]);

  if (!isOpen || !contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Contact name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updates = {
        name: name.trim(),
        organization: organization.trim() || null,
        role_title: roleTitle.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        type,
        pipeline_stage: stage,
        assigned_to: assignedTo || null,
        notes: notes.trim() || null,
      };

      const res = await updatePrContact(contact.id, updates);

      if (res.success) {
        const assignedMember = teamMembers.find((m) => m.id === assignedTo);
        onContactUpdated({
          ...contact,
          ...updates,
          updated_at: new Date().toISOString(),
          assignee: assignedMember
            ? {
                id: assignedMember.id,
                full_name_en: assignedMember.full_name_en,
                full_name_ar: assignedMember.full_name_ar,
                avatar_url: assignedMember.avatar_url,
                role: assignedMember.role,
              }
            : null,
        });
        onClose();
      } else {
        setError(res.error || 'Failed to update contact');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const res = await deletePrContact(contact.id);
      if (res.success) {
        onContactDeleted(contact.id);
        onClose();
      } else {
        setError(res.error || 'Failed to delete contact');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact');
    } finally {
      setIsDeleting(false);
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
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-card, #13151b)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
          borderRadius: '1.25rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '1.75rem',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            paddingBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '0.75rem',
                background: 'rgba(66, 133, 244, 0.15)',
                color: 'var(--google-blue, #4285F4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Contact</h2>
              <p style={{ fontSize: '0.85rem', color: '#9aa0a6', margin: 0 }}>
                Update {contact.name}'s details or status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9aa0a6',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.5rem',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(234, 67, 53, 0.12)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              borderRadius: '0.75rem',
              color: '#f28b82',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Name & Role */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Full Name <span style={{ color: 'var(--google-red, #ea4335)' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.65rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Role / Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.65rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  color: '#fff',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </div>

          {/* Organization & Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Organization
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }} />
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: '0.65rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Contact Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PrContactType)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.65rem',
                  backgroundColor: '#1e212b',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <option value="speaker">🎤 Speaker</option>
                <option value="sponsor">💎 Sponsor</option>
                <option value="partner">🤝 Partner</option>
                <option value="venue">🏛️ Venue</option>
                <option value="other">📌 Other</option>
              </select>
            </div>
          </div>

          {/* Email & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: '0.65rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Phone
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9aa0a6' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem 0.65rem 2.25rem',
                    borderRadius: '0.65rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Pipeline Stage & Assigned Member */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Pipeline Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as PrPipelineStage)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.65rem',
                  backgroundColor: '#1e212b',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <option value="new">🔵 New</option>
                <option value="contacted">🟡 Contacted</option>
                <option value="negotiating">🔴 Negotiating</option>
                <option value="confirmed">🟢 Confirmed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
                Assigned Team Member
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.65rem',
                  backgroundColor: '#1e212b',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                  color: '#fff',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name_en} ({m.role.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e8eaed' }}>
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.65rem',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))',
                color: '#fff',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Buttons: Delete & Submit */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.65rem 1rem',
                borderRadius: '0.65rem',
                border: confirmDelete ? '1px solid var(--google-red, #ea4335)' : 'none',
                backgroundColor: confirmDelete ? 'rgba(234, 67, 53, 0.2)' : 'rgba(234, 67, 53, 0.1)',
                color: '#f28b82',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isDeleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              {confirmDelete ? 'Confirm Delete?' : 'Delete'}
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.65rem',
                  border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.2))',
                  backgroundColor: 'transparent',
                  color: '#e8eaed',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  backgroundColor: 'var(--google-blue, #4285F4)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
