'use client';

import { useState } from 'react';
import { AccountApprovalsList, PendingAccount, DepartmentItem } from '@/components/AccountApprovalsList';
import { ManagedMembersList, ManagedMember } from '@/components/ManagedMembersList';
import { Users, Clock, ShieldCheck, UserCog } from 'lucide-react';

interface LeadershipDashboardTabsProps {
  pendingAccounts: PendingAccount[];
  managedMembers: ManagedMember[];
  departments: DepartmentItem[];
  currentUserId: string;
  currentUserRole?: string;
  currentUserDepartmentId?: string;
  currentUserBranch?: string;
}

export function LeadershipDashboardTabs({
  pendingAccounts,
  managedMembers,
  departments,
  currentUserId,
  currentUserRole,
  currentUserDepartmentId,
  currentUserBranch,
}: LeadershipDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'roster'>('pending');

  const pendingCount = pendingAccounts.length;
  const activeCount = managedMembers.filter((m) => m.status === 'active').length;
  const suspendedCount = managedMembers.filter((m) => m.status === 'suspended').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Navigation Tab Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '0.5rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'pending' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
            color: activeTab === 'pending' ? '#93C5FD' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'pending' ? '2px solid var(--google-blue)' : '2px solid transparent',
          }}
        >
          <Clock size={18} color={activeTab === 'pending' ? 'var(--google-blue)' : 'currentColor'} />
          <span>Pending Approvals</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '999px',
            background: pendingCount > 0 ? 'var(--google-yellow)' : 'rgba(255, 255, 255, 0.1)',
            color: pendingCount > 0 ? '#000000' : 'var(--text-muted)',
            fontWeight: 800,
          }}>
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'roster' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
            color: activeTab === 'roster' ? '#86EFAC' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeTab === 'roster' ? '2px solid var(--google-green)' : '2px solid transparent',
          }}
        >
          <UserCog size={18} color={activeTab === 'roster' ? 'var(--google-green)' : 'currentColor'} />
          <span>Roster & Account Controls</span>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.15rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(52, 168, 83, 0.2)',
            color: '#86EFAC',
            fontWeight: 800,
          }}>
            {activeCount + suspendedCount}
          </span>
          {suspendedCount > 0 ? (
            <span style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '999px',
              background: 'rgba(234, 67, 53, 0.2)',
              color: '#FCA5A5',
              fontWeight: 700,
            }}>
              {suspendedCount} suspended
            </span>
          ) : null}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'pending' ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Pending Candidate Applications
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Review onboarding applications submitted by applicants, assign department roles, and approve access.
            </p>
          </div>

          <AccountApprovalsList
            initialAccounts={pendingAccounts}
            departments={departments}
            managedMembers={managedMembers}
          />
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Member Roster & Access Controls
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Suspend or reactivate accounts anytime. Suspended members instantly lose platform access until reactivated.
            </p>
          </div>

          <ManagedMembersList
            initialMembers={managedMembers}
            departments={departments}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            currentUserDepartmentId={currentUserDepartmentId}
            currentUserBranch={currentUserBranch}
          />
        </div>
      )}
    </div>
  );
}
