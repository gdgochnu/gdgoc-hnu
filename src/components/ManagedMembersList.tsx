'use client';

import { useState, useMemo } from 'react';
import { suspendAccount, reactivateAccount } from '@/app/approvals/actions';
import { UserRole, ProfileStatus } from '@/types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Filter, 
  AlertTriangle, 
  RotateCcw, 
  Loader2, 
  UserX, 
  UserCheck, 
  Building2, 
  Mail, 
  Phone,
  GraduationCap,
  Calendar
} from 'lucide-react';

export interface ManagedMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  university_id: string | null;
  faculty: string | null;
  academic_year: string | null;
  role: UserRole;
  position: string | null;
  status: ProfileStatus;
  department_id: string | null;
  custom_fields: Record<string, any> | null;
  created_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
}

interface ManagedMembersListProps {
  initialMembers: ManagedMember[];
  departments: Array<{ id: string; name: string; code: string; branch: string }>;
  currentUserRole?: string;
  currentUserId?: string;
}

export function ManagedMembersList({
  initialMembers,
  departments,
  currentUserId,
}: ManagedMembersListProps) {
  const [members, setMembers] = useState<ManagedMember[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  
  // Action states
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Suspend modal state
  const [suspendModalMember, setSuspendModalMember] = useState<ManagedMember | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Reactivate modal state
  const [reactivateModalMember, setReactivateModalMember] = useState<ManagedMember | null>(null);

  // Filtering
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }
      // Department filter
      if (deptFilter !== 'all' && m.department_id !== deptFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.full_name?.toLowerCase().includes(q);
        const matchesEmail = m.email?.toLowerCase().includes(q);
        const matchesUniId = m.university_id?.toLowerCase().includes(q);
        const matchesPosition = m.position?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesUniId && !matchesPosition) {
          return false;
        }
      }
      return true;
    });
  }, [members, searchQuery, deptFilter, statusFilter]);

  const handleConfirmSuspend = async () => {
    if (!suspendModalMember) return;
    try {
      setActiveActionId(suspendModalMember.id);
      setActionError(null);
      setActionSuccess(null);

      const res = await suspendAccount(suspendModalMember.id, suspendReason);
      if (!res.success) {
        setActionError(res.error || 'Failed to suspend account');
      } else {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === suspendModalMember.id
              ? {
                  ...m,
                  status: 'suspended',
                  custom_fields: {
                    ...(m.custom_fields || {}),
                    suspension_reason: suspendReason.trim() || 'Administrative suspension',
                    suspended_at: new Date().toISOString(),
                  },
                }
              : m
          )
        );
        setActionSuccess(`Account for ${suspendModalMember.full_name} has been suspended.`);
        setSuspendModalMember(null);
        setSuspendReason('');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error suspending account');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!reactivateModalMember) return;
    try {
      setActiveActionId(reactivateModalMember.id);
      setActionError(null);
      setActionSuccess(null);

      const res = await reactivateAccount(reactivateModalMember.id);
      if (!res.success) {
        setActionError(res.error || 'Failed to reactivate account');
      } else {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === reactivateModalMember.id
              ? {
                  ...m,
                  status: 'active',
                  custom_fields: {
                    ...(m.custom_fields || {}),
                    reactivated_at: new Date().toISOString(),
                  },
                }
              : m
          )
        );
        setActionSuccess(`Account for ${reactivateModalMember.full_name} is now reactivated!`);
        setReactivateModalMember(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error reactivating account');
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Messages */}
      {actionError ? (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(234, 67, 53, 0.12)',
          border: '1px solid rgba(234, 67, 53, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#FCA5A5',
          fontSize: '0.9rem'
        }}>
          <ShieldAlert size={20} color="var(--google-red)" style={{ flexShrink: 0 }} />
          <span>{actionError}</span>
        </div>
      ) : null}

      {actionSuccess ? (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: 'rgba(52, 168, 83, 0.12)',
          border: '1px solid rgba(52, 168, 83, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#86EFAC',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={20} color="var(--google-green)" style={{ flexShrink: 0 }} />
          <span>{actionSuccess}</span>
        </div>
      ) : null}

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'space-between'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by name, email, university ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.75rem', height: '44px', width: '100%' }}
            />
          </div>

          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '0 1 auto' }}>
            <Filter size={16} color="var(--google-blue)" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input-field"
              style={{ height: '44px', paddingRight: '2rem' }}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === 'all' ? 'var(--google-blue)' : 'transparent',
                color: statusFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === 'active' ? 'var(--google-green)' : 'transparent',
                color: statusFilter === 'active' ? '#000000' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Active ({members.filter(m => m.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('suspended')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: statusFilter === 'suspended' ? 'var(--google-red)' : 'transparent',
                color: statusFilter === 'suspended' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Suspended ({members.filter(m => m.status === 'suspended').length})
            </button>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
            <UserX size={24} color="var(--text-muted)" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.5rem' }}>No accounts match your filter</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Try altering your search keywords or switching the status filter tab.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredMembers.map((m) => {
            const isSuspended = m.status === 'suspended';
            const isCurrentCaller = m.id === currentUserId;
            const isPresident = m.role === 'president';
            const isActionBusy = activeActionId === m.id;
            const suspensionReasonNote = m.custom_fields?.suspension_reason;

            return (
              <div 
                key={m.id} 
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  border: isSuspended ? '1px solid rgba(234, 67, 53, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSuspended ? 'rgba(234, 67, 53, 0.04)' : undefined,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Top Status Accent Bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: isSuspended ? 'var(--google-red)' : 'var(--google-green)',
                }} />

                {/* Member Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: isSuspended 
                        ? 'rgba(234, 67, 53, 0.2)' 
                        : 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: isSuspended ? 'var(--google-red)' : '#FFFFFF',
                      border: isSuspended ? '1px solid rgba(234, 67, 53, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                      flexShrink: 0
                    }}>
                      {m.avatar_url ? (
                        <img 
                          src={m.avatar_url} 
                          alt={m.full_name} 
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        m.full_name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{m.full_name || 'Anonymous User'}</span>
                        {isCurrentCaller ? (
                          <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                            You
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                        {m.position || m.role}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: isSuspended ? 'rgba(234, 67, 53, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                    color: isSuspended ? '#FCA5A5' : '#86EFAC',
                    border: isSuspended ? '1px solid rgba(234, 67, 53, 0.3)' : '1px solid rgba(52, 168, 83, 0.3)',
                    flexShrink: 0
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isSuspended ? 'var(--google-red)' : 'var(--google-green)',
                      display: 'inline-block'
                    }} />
                    {isSuspended ? 'Suspended' : 'Active'}
                  </span>
                </div>

                {/* Details Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} color="var(--google-blue)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
                  </div>
                  {m.phone ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} color="var(--google-green)" />
                      <span>{m.phone}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building2 size={14} color="var(--google-yellow)" />
                    <span>{m.departments?.name || 'General Chapter'}</span>
                  </div>
                  {m.university_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <GraduationCap size={14} color="var(--google-red)" />
                      <span>ID: {m.university_id} {m.faculty ? `• ${m.faculty}` : ''}</span>
                    </div>
                  ) : null}
                </div>

                {/* Suspension Reason Warning Banner if Suspended */}
                {isSuspended && suspensionReasonNote ? (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(234, 67, 53, 0.1)',
                    border: '1px solid rgba(234, 67, 53, 0.2)',
                    fontSize: '0.8rem',
                    color: '#FCA5A5'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertTriangle size={13} color="var(--google-red)" />
                      Reason:
                    </div>
                    <div>"{suspensionReasonNote}"</div>
                  </div>
                ) : null}

                {/* Action Controls */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  {isPresident ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.4rem' }}>
                      Chapter President (Protected)
                    </div>
                  ) : isCurrentCaller ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.4rem' }}>
                      Self account cannot be modified
                    </div>
                  ) : isSuspended ? (
                    <button
                      onClick={() => setReactivateModalMember(m)}
                      disabled={isActionBusy}
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        padding: '0.55rem',
                        borderColor: 'rgba(52, 168, 83, 0.4)',
                        color: '#86EFAC',
                      }}
                    >
                      {isActionBusy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UserCheck size={16} color="var(--google-green)" />
                      )}
                      <span>Reactivate Account</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSuspendModalMember(m);
                        setSuspendReason('');
                      }}
                      disabled={isActionBusy}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                        padding: '0.55rem',
                        borderRadius: '10px',
                        background: 'rgba(234, 67, 53, 0.1)',
                        border: '1px solid rgba(234, 67, 53, 0.3)',
                        color: '#FCA5A5',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isActionBusy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UserX size={16} color="var(--google-red)" />
                      )}
                      <span>Suspend Account</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {suspendModalMember ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 1000,
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(234, 67, 53, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <AlertTriangle size={26} color="var(--google-red)" />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Suspend Account?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Suspending <strong>{suspendModalMember.full_name}</strong> will instantly revoke their access to the GDGoC platform. This action is completely reversible.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                Reason for Suspension (Optional)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Inactivity during probation, academic leave, or code of conduct review..."
                rows={3}
                className="input-field"
                style={{ width: '100%', resize: 'none', fontSize: '0.88rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setSuspendModalMember(null);
                  setSuspendReason('');
                }}
                disabled={activeActionId === suspendModalMember.id}
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={activeActionId === suspendModalMember.id}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '10px',
                  background: 'var(--google-red)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {activeActionId === suspendModalMember.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserX size={16} />
                )}
                <span>Confirm Suspension</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reactivate Confirmation Modal */}
      {reactivateModalMember ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 1000,
        }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(52, 168, 83, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              <UserCheck size={26} color="var(--google-green)" />
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Reactivate Account?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Reactivating <strong>{reactivateModalMember.full_name}</strong> will instantly restore their access to chapter tasks, events, and their department workspace.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setReactivateModalMember(null)}
                disabled={activeActionId === reactivateModalMember.id}
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReactivate}
                disabled={activeActionId === reactivateModalMember.id}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '10px',
                  background: 'var(--google-green)',
                  color: '#000000',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {activeActionId === reactivateModalMember.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                <span>Reactivate Now</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
