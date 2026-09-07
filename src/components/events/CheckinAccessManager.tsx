'use client';

import { useState } from 'react';
import { assignCheckinAccess, removeCheckinAccess } from '@/app/events/actions';
import { 
  QrCode, 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info,
  Sparkles
} from 'lucide-react';

interface MemberOption {
  id: string;
  full_name: string;
  full_name_en?: string | null;
  email: string;
  avatar_url?: string | null;
  role?: string;
  department?: {
    id?: string;
    name?: string;
    code?: string;
  } | null;
}

interface CheckinAccessManagerProps {
  eventId: string;
  eventTitle: string;
  initialAssignedMembers: MemberOption[];
  availableMembers: MemberOption[];
  canManage?: boolean;
}

export function CheckinAccessManager({
  eventId,
  eventTitle,
  initialAssignedMembers,
  availableMembers,
  canManage = true,
}: CheckinAccessManagerProps) {
  const [assigned, setAssigned] = useState<MemberOption[]>(initialAssignedMembers);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const assignedIds = new Set(assigned.map(m => m.id));
  const unassignedMembers = availableMembers.filter(m => !assignedIds.has(m.id));

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await assignCheckinAccess(eventId, [selectedMemberId]);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to assign check-in access.');
      } else {
        const addedMember = availableMembers.find(m => m.id === selectedMemberId);
        if (addedMember) {
          setAssigned(prev => [...prev, addedMember]);
        }
        setSelectedMemberId('');
        setSuccessMessage(`Granted check-in duty access and created Attendance Check-in task.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error assigning check-in access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (profileId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await removeCheckinAccess(eventId, profileId);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to remove check-in access.');
      } else {
        setAssigned(prev => prev.filter(m => m.id !== profileId));
        setSuccessMessage('Check-in access revoked successfully.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error removing check-in access.');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', borderRadius: '16px' }} suppressHydrationWarning>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(52, 168, 83, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <QrCode size={22} color="var(--google-green)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Check-in & Attendance Team</h3>
              <span style={{
                background: 'rgba(52, 168, 83, 0.2)',
                color: 'var(--google-green)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.6rem',
                borderRadius: '999px',
              }}>
                {assigned.length} Active
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>
              Task-gated QR scanner and attendance desk access (Spec §4.3 item 5)
            </p>
          </div>
        </div>
      </div>

      {/* Info Notice about Standing Access Override */}
      <div style={{
        background: 'rgba(66, 133, 244, 0.08)',
        border: '1px solid rgba(66, 133, 244, 0.2)',
        borderRadius: '10px',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
      }}>
        <ShieldCheck size={16} color="var(--google-blue)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
          <strong>Access Rule:</strong> Assigning an "Attendance Check-in" duty unlocks the QR check-in portal for that member on this event. President, Co-President, and the HR Committee retain standing override access (§3.17).
        </p>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div style={{
          background: 'rgba(234, 67, 53, 0.12)',
          border: '1px solid rgba(234, 67, 53, 0.3)',
          color: '#F28B82',
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertCircle size={15} />
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{
          background: 'rgba(52, 168, 83, 0.12)',
          border: '1px solid rgba(52, 168, 83, 0.3)',
          color: '#81C995',
          padding: '0.6rem 0.85rem',
          borderRadius: '8px',
          fontSize: '0.8rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={15} />
          {successMessage}
        </div>
      )}

      {/* Assigned Profiles List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
        {assigned.length === 0 ? (
          <div style={{
            padding: '1.5rem',
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '10px',
            border: '1px dashed var(--border-color)',
          }}>
            <Users size={24} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              No individual members specifically assigned to check-in duty yet.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.74rem', margin: '0.25rem 0 0' }}>
              Assign someone below or create an "Attendance Check-in" task to grant scanner access.
            </p>
          </div>
        ) : (
          assigned.map(member => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--google-blue), var(--google-green))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#fff',
                }}>
                  {(member.full_name_en || member.full_name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                      {member.full_name_en || member.full_name}
                    </span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      background: 'rgba(52, 168, 83, 0.15)',
                      color: 'var(--google-green)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '4px',
                    }}>
                      <QrCode size={11} /> Scanner Active
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'flex', gap: '0.5rem' }}>
                    <span>{member.email}</span>
                    {member.department?.name && <span>• {member.department.name}</span>}
                  </div>
                </div>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  title="Revoke check-in access"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--google-red)';
                    e.currentTarget.style.background = 'rgba(234, 67, 53, 0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Check-in Duty Form */}
      {canManage && (
        <form onSubmit={handleAssign} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <select
            value={selectedMemberId}
            onChange={e => setSelectedMemberId(e.target.value)}
            disabled={isSubmitting || unassignedMembers.length === 0}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.84rem',
            }}
          >
            <option value="">
              {unassignedMembers.length === 0 
                ? 'All available members assigned' 
                : 'Select chapter member to grant check-in duty...'}
            </option>
            {unassignedMembers.map(m => (
              <option key={m.id} value={m.id}>
                {m.full_name_en || m.full_name} ({m.email})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={!selectedMemberId || isSubmitting}
            className="btn-primary"
            style={{
              padding: '0.65rem 1rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
              background: 'var(--google-green)',
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus size={14} />
                Grant Check-in Duty
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
