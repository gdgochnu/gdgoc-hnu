'use client';

import React, { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Loader2,
  Briefcase,
  User,
  AlertCircle,
  Check,
} from 'lucide-react';
import { UserRole } from '@/types';
import { updateMemberPositionAndRole } from '@/app/approvals/actions';

export interface EditMemberPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    id: string;
    full_name: string;
    position: string | null;
    role: UserRole;
    department_id?: string | null;
    avatar_url?: string | null;
  };
  departments: Array<{ id: string; name: string; code: string; branch: string; description?: string | null }>;
  callerRole?: string;
  callerBranch?: string;
  onSuccess?: (updated: {
    position: string;
    role: UserRole;
    department_id: string | null;
    department?: { id: string; name: string; code: string; branch: string; description?: string | null } | null;
  }) => void;
}

const COMMON_POSITIONS = [
  'Member',
  'Senior Member',
  'Sub-Team Lead',
  'Core Contributor',
  'Project Lead',
  'Technical Specialist',
  'Operations Associate',
  'Marketing Associate',
  'Content Lead',
  'Logistics Lead',
];

export function EditMemberPositionModal({
  isOpen,
  onClose,
  member,
  departments,
  callerRole = 'president',
  callerBranch,
  onSuccess,
}: EditMemberPositionModalProps) {
  const isPresidential = ['president', 'co_president'].includes(callerRole);
  const isBranchHead = callerRole === 'branch_head';
  const isCommitteeHead = ['committee_head', 'committee_co_head'].includes(callerRole);

  const availableDepartments = departments.filter((d) => {
    if (isPresidential) return true;
    if (isBranchHead && callerBranch) return d.branch === callerBranch;
    return true;
  });

  const [position, setPosition] = useState<string>(member.position || 'Member');
  const [role, setRole] = useState<UserRole>(member.role || 'member');
  const [departmentId, setDepartmentId] = useState<string>(member.department_id || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSave = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPos = position.trim();
    if (!cleanPos) {
      setErrorMsg('Position title cannot be empty.');
      return;
    }

    startTransition(async () => {
      const res = await updateMemberPositionAndRole({
        targetProfileId: member.id,
        position: cleanPos,
        role,
        departmentId: departmentId ? departmentId : null,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update member position.');
        return;
      }

      setSuccessMsg('Position and role updated successfully!');
      if (onSuccess && res.updated) {
        onSuccess(res.updated as any);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    });
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(5, 7, 13, 0.82)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(19, 23, 34, 0.98), rgba(11, 15, 25, 0.98))',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), 0 0 32px rgba(66, 133, 244, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Google 4-Color Accent Strip */}
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Briefcase size={20} color="var(--google-blue)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Manage Member Position
              </h2>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Executive assignment &amp; role hierarchy controls
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-muted)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Target Member Quick Banner */}
        <div
          style={{
            padding: '1rem 1.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {member.avatar_url ? (
              <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={22} color="var(--text-muted)" />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member.full_name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Current: <strong>{member.position || 'Member'}</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>&bull;</span>
              <span style={{ textTransform: 'capitalize', color: '#93C5FD' }}>{member.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Modal Form Body */}
        <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Error Message */}
          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: '#FCA5A5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} color="var(--google-red)" style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.12)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                color: '#86EFAC',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Check size={16} color="var(--google-green)" style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Position Title Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Position Title <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. Senior Member, Sub-Team Lead, Core Contributor..."
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />

            {/* Quick Position Suggestion Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
              {COMMON_POSITIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setPosition(chip)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    background: position === chip ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: position === chip ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: position === chip ? '#93C5FD' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* 2. System Role & Permission Level */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              System Authority Role
            </label>
            <select
              value={role}
              disabled={isCommitteeHead}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                setRole(newRole);
                const selectedDept = departments.find((d) => d.id === departmentId);
                const isTech = selectedDept?.branch === 'tech';

                if (newRole === 'branch_head') {
                  setPosition(isTech ? 'Technical Branch Head' : 'Non-Technical Branch Head');
                } else if (newRole === 'committee_head') {
                  if (!position || position === 'Member' || position.includes('Branch Head')) {
                    setPosition(selectedDept ? `Head of ${selectedDept.name}` : 'Committee Head');
                  }
                } else if (newRole === 'committee_co_head') {
                  if (!position || position === 'Member' || position.includes('Branch Head')) {
                    setPosition(selectedDept ? `Co-Head of ${selectedDept.name}` : 'Committee Co-Head');
                  }
                } else if (newRole === 'member') {
                  if (position.includes('Branch Head') || position.startsWith('Head of ') || position.startsWith('Co-Head of ')) {
                    setPosition('Member');
                  }
                }
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#1a1e29',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
                opacity: isCommitteeHead ? 0.6 : 1,
                cursor: isCommitteeHead ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="member">General Member (Standard Access)</option>
              <option value="committee_co_head">Committee Co-Head (Task &amp; Review Management)</option>
              <option value="committee_head">Committee Head (Full Committee Leadership)</option>
              {isPresidential && <option value="branch_head">Branch Head (Technical or Non-Technical Branch)</option>}
              {isPresidential && <option value="co_president">Chapter Co-President (Executive Board)</option>}
              {isPresidential && <option value="president">Chapter President (Supreme Leadership)</option>}
            </select>
            {isCommitteeHead && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Role assignment is restricted to Branch Heads &amp; Chapter Presidents.
              </span>
            )}
          </div>

          {/* 3. Assigned Committee / Department */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Assigned Committee / Department {isBranchHead && callerBranch ? `(${callerBranch === 'tech' ? 'Technical' : 'Non-Technical'} Branch)` : ''}
            </label>
            <select
              value={departmentId}
              disabled={isCommitteeHead}
              onChange={(e) => {
                const newDeptId = e.target.value;
                setDepartmentId(newDeptId);
                const selectedDept = departments.find((d) => d.id === newDeptId);
                const isTech = selectedDept?.branch === 'tech';

                if (role === 'branch_head') {
                  setPosition(isTech ? 'Technical Branch Head' : 'Non-Technical Branch Head');
                } else if (role === 'committee_head' && selectedDept) {
                  if (!position || position === 'Member' || position.startsWith('Head of ')) {
                    setPosition(`Head of ${selectedDept.name}`);
                  }
                } else if (role === 'committee_co_head' && selectedDept) {
                  if (!position || position === 'Member' || position.startsWith('Co-Head of ')) {
                    setPosition(`Co-Head of ${selectedDept.name}`);
                  }
                }
              }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#1a1e29',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none',
                opacity: isCommitteeHead ? 0.6 : 1,
                cursor: isCommitteeHead ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">No Department (General / Cross-Functional)</option>
              {availableDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.branch === 'tech' ? 'Tech Branch' : 'Non-Tech Branch'})
                </option>
              ))}
            </select>
            {isCommitteeHead && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Department transfers are restricted to Branch Heads &amp; Presidential leadership.
              </span>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
              border: 'none',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
            }}
          >
            {isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving Position...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Position</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
