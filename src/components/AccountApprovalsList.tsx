'use client';

import { useState } from 'react';
import { approveAccount, rejectAccount, requestAccountChanges } from '@/app/approvals/actions';
import { UserRole } from '@/types';
import { 
  Check, 
  X, 
  RotateCcw, 
  User, 
  Mail, 
  Phone, 
  ExternalLink, 
  MessageSquare,
  AlertCircle,
  Loader2,
  Linkedin,
  Facebook,
  Instagram,
  IdCard,
  Building2,
  GraduationCap
} from 'lucide-react';

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  branch: string;
}

export interface PendingAccount {
  id: string;
  full_name: string;
  full_name_ar?: string | null;
  full_name_en?: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  whatsapp_number?: string | null;
  national_id?: string | null;
  university_id: string | null;
  faculty: string | null;
  department_major?: string | null;
  academic_year: string | number | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
  position: string | null;
  skills: string[] | null;
  portfolio_url: string | null;
  motivation: string | null;
  availability_hours: number | null;
  how_heard: string | null;
  created_at: string;
  department_id: string | null;
  departments?: DepartmentItem | null;
}

interface AccountApprovalsListProps {
  initialAccounts: PendingAccount[];
  departments: DepartmentItem[];
  managedMembers?: Array<{
    id: string;
    full_name: string;
    role: UserRole;
    status: string;
    position: string | null;
    department_id: string | null;
    departments?: { branch: string } | null;
  }>;
}

export function AccountApprovalsList({
  initialAccounts,
  departments,
  managedMembers,
}: AccountApprovalsListProps) {
  const [accounts, setAccounts] = useState<PendingAccount[]>(initialAccounts);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [changesModalId, setChangesModalId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Form states per card
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [selectedDepts, setSelectedDepts] = useState<Record<string, string>>({});
  const [selectedPositions, setSelectedPositions] = useState<Record<string, string>>({});

  const isLeadershipDept = (d: { code?: string; name: string }) =>
    d.code === 'TECH_LEAD' || d.code === 'NON_TECH_LEAD' || d.name.toLowerCase().includes('branch leadership');

  const rawLeadershipDepts = departments.filter(isLeadershipDept);
  const leadershipDepts = rawLeadershipDepts.length > 0 ? rawLeadershipDepts : [
    { id: 'a8210a97-86d5-47d8-b222-f211ef27a324', code: 'TECH_LEAD', name: 'Technical Branch Leadership', branch: 'tech' },
    { id: 'dce12f40-baf7-47e3-a36f-db26572fa2bc', code: 'NON_TECH_LEAD', name: 'Non-Technical Branch Leadership', branch: 'non_tech' }
  ];
  const standardDepts = departments.filter((d) => !isLeadershipDept(d));

  // Determine active Branch Heads in the chapter
  const techBranchHead = managedMembers?.find(
    (m) =>
      m.status === 'active' &&
      m.role === 'branch_head' &&
      (m.departments?.branch === 'tech' || (m.position?.toLowerCase().includes('technical') && !m.position?.toLowerCase().includes('non-technical')))
  );
  const nonTechBranchHead = managedMembers?.find(
    (m) =>
      m.status === 'active' &&
      m.role === 'branch_head' &&
      (m.departments?.branch === 'non_tech' || m.position?.toLowerCase().includes('non-technical'))
  );

  const handleRoleChange = (accId: string, acc: PendingAccount, newRole: UserRole) => {
    setSelectedRoles((prev) => ({ ...prev, [accId]: newRole }));

    const currentDeptId = selectedDepts[accId] || acc.department_id;
    const currentDept = departments.find((d) => d.id === currentDeptId);
    const isTech = currentDept ? currentDept.branch === 'tech' : true;

    if (newRole === 'branch_head') {
      const targetLeadDept = leadershipDepts.find((d) => d.branch === (isTech ? 'tech' : 'non_tech')) || leadershipDepts[0];
      if (targetLeadDept) {
        setSelectedDepts((prev) => ({ ...prev, [accId]: targetLeadDept.id }));
        setSelectedPositions((prev) => ({
          ...prev,
          [accId]: targetLeadDept.branch === 'tech' ? 'Technical Branch Head' : 'Non-Technical Branch Head',
        }));
      }
    } else if (newRole === 'committee_head') {
      let targetDept = currentDept;
      if (!targetDept || isLeadershipDept(targetDept)) {
        targetDept = standardDepts.find((d) => d.branch === (isTech ? 'tech' : 'non_tech')) || standardDepts[0];
      }
      if (targetDept) {
        setSelectedDepts((prev) => ({ ...prev, [accId]: targetDept.id }));
        setSelectedPositions((prev) => ({ ...prev, [accId]: `Head of ${targetDept.name}` }));
      }
    } else if (newRole === 'committee_co_head') {
      let targetDept = currentDept;
      if (!targetDept || isLeadershipDept(targetDept)) {
        targetDept = standardDepts.find((d) => d.branch === (isTech ? 'tech' : 'non_tech')) || standardDepts[0];
      }
      if (targetDept) {
        setSelectedDepts((prev) => ({ ...prev, [accId]: targetDept.id }));
        setSelectedPositions((prev) => ({ ...prev, [accId]: `Co-Head of ${targetDept.name}` }));
      }
    } else {
      // member
      let targetDept = currentDept;
      if (!targetDept || isLeadershipDept(targetDept)) {
        targetDept = standardDepts.find((d) => d.branch === (isTech ? 'tech' : 'non_tech')) || standardDepts[0];
      }
      if (targetDept) {
        setSelectedDepts((prev) => ({ ...prev, [accId]: targetDept.id }));
      }
      setSelectedPositions((prev) => ({ ...prev, [accId]: 'Member' }));
    }
  };

  const handleDeptChange = (accId: string, newDeptId: string) => {
    setSelectedDepts((prev) => ({ ...prev, [accId]: newDeptId }));
    const role = selectedRoles[accId] || 'member';
    const dept = [...departments, ...leadershipDepts].find((d) => d.id === newDeptId);
    if (!dept) return;

    if (role === 'branch_head') {
      const isTech = dept.branch === 'tech';
      setSelectedPositions((prev) => ({
        ...prev,
        [accId]: isTech ? 'Technical Branch Head' : 'Non-Technical Branch Head',
      }));
    } else if (role === 'committee_head') {
      setSelectedPositions((prev) => ({
        ...prev,
        [accId]: `Head of ${dept.name}`,
      }));
    } else if (role === 'committee_co_head') {
      setSelectedPositions((prev) => ({
        ...prev,
        [accId]: `Co-Head of ${dept.name}`,
      }));
    }
  };

  const formatAcademicYear = (year: string | number | null) => {
    if (!year) return 'N/A';
    const n = Number(year);
    if (n === 1) return '1st Year';
    if (n === 2) return '2nd Year';
    if (n === 3) return '3rd Year';
    if (n === 4) return '4th Year';
    if (n === 5) return '5th Year';
    return `Year ${year}`;
  };

  const handleApprove = async (acc: PendingAccount) => {
    try {
      setActiveActionId(acc.id);
      setActionError(null);

      const assignedRole = selectedRoles[acc.id] || 'member';
      let assignedDept = selectedDepts[acc.id] || acc.department_id || undefined;
      let assignedPos = selectedPositions[acc.id] || acc.position || 'Member';

      if (assignedRole === 'branch_head') {
        const dept = [...departments, ...leadershipDepts].find((d) => d.id === assignedDept);
        const isTech = dept ? dept.branch === 'tech' : (assignedPos.toLowerCase().includes('technical') && !assignedPos.toLowerCase().includes('non-technical'));
        const existingHead = isTech ? techBranchHead : nonTechBranchHead;

        if (existingHead && existingHead.id !== acc.id) {
          setActionError(`Cannot assign Branch Head: ${existingHead.full_name} is already the active ${isTech ? 'Technical' : 'Non-Technical'} Branch Head. Each branch can only have one Branch Head.`);
          return;
        }

        const leadDept = leadershipDepts.find((d) => d.branch === (isTech ? 'tech' : 'non_tech'));
        if (leadDept) {
          assignedDept = leadDept.id;
        }
        assignedPos = isTech ? 'Technical Branch Head' : 'Non-Technical Branch Head';
      }

      const res = await approveAccount(acc.id, assignedRole, assignedDept, assignedPos);
      if (!res.success) {
        setActionError(res.error || 'Failed to approve account');
      } else {
        setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error approving account');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleConfirmReject = async (profileId: string) => {
    try {
      setActiveActionId(profileId);
      setActionError(null);
      const res = await rejectAccount(profileId, promptText);
      if (!res.success) {
        setActionError(res.error || 'Failed to reject account');
      } else {
        setAccounts((prev) => prev.filter((a) => a.id !== profileId));
        setRejectModalId(null);
        setPromptText('');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error rejecting account');
    } finally {
      setActiveActionId(null);
    }
  };

  const handleConfirmChanges = async (profileId: string) => {
    try {
      setActiveActionId(profileId);
      setActionError(null);
      const res = await requestAccountChanges(profileId, promptText);
      if (!res.success) {
        setActionError(res.error || 'Failed to request changes');
      } else {
        setAccounts((prev) => prev.filter((a) => a.id !== profileId));
        setChangesModalId(null);
        setPromptText('');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error requesting changes');
    } finally {
      setActiveActionId(null);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Check size={28} color="#4ADE80" />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.4rem' }}>Inbox is Clean!</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          There are no member accounts currently awaiting leadership approval.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {actionError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.85rem 1.25rem', borderRadius: '10px', background: 'rgba(234, 67, 53, 0.12)', border: '1px solid rgba(234, 67, 53, 0.3)', color: '#FCA5A5' }}>
          <AlertCircle size={18} color="var(--google-red)" />
          <span>{actionError}</span>
        </div>
      )}

      {accounts.map((acc) => {
        const isBusy = activeActionId === acc.id;
        const currentRole = selectedRoles[acc.id] || 'member';
        const isBranchHead = currentRole === 'branch_head';
        const selectableDepts = isBranchHead ? leadershipDepts : standardDepts;

        let effectiveDept = selectedDepts[acc.id] || acc.department_id || '';
        if (isBranchHead && !leadershipDepts.some((d) => d.id === effectiveDept)) {
          const curObj = departments.find((d) => d.id === effectiveDept);
          const isCurTech = curObj ? curObj.branch === 'tech' : true;
          effectiveDept = (leadershipDepts.find((d) => d.branch === (isCurTech ? 'tech' : 'non_tech')) || leadershipDepts[0])?.id || '';
        } else if (!isBranchHead && leadershipDepts.some((d) => d.id === effectiveDept)) {
          effectiveDept = standardDepts[0]?.id || '';
        }

        const selectedDeptObj = [...departments, ...leadershipDepts].find((d) => d.id === effectiveDept);
        const isTechBranch = selectedDeptObj ? selectedDeptObj.branch === 'tech' : true;
        const existingHeadForBranch = isTechBranch ? techBranchHead : nonTechBranchHead;
        const isBranchOccupied = isBranchHead && Boolean(existingHeadForBranch && existingHeadForBranch.id !== acc.id);

        const currentPos = selectedPositions[acc.id] ?? (isBranchHead ? (isTechBranch ? 'Technical Branch Head' : 'Non-Technical Branch Head') : (acc.position || 'Member'));
        const primaryName = acc.full_name_en || acc.full_name;
        const secondaryName = acc.full_name_ar;
        const whatsappContact = acc.whatsapp_number || acc.phone;

        return (
          <div
            key={acc.id}
            className="glass-panel"
            style={{
              padding: '2rem',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top Accent Strip */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: 'var(--google-blue)' }} />

            {/* Header: Candidate Info with Dual Names */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {acc.avatar_url ? (
                  <img
                    src={acc.avatar_url}
                    alt={primaryName}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(66, 133, 244, 0.3)' }}
                  />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={26} color="var(--google-blue)" />
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                      {primaryName}
                    </h3>
                    {secondaryName && (
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        ({secondaryName})
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Mail size={13} />
                      {acc.email}
                    </span>
                    {acc.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Phone size={13} />
                        {acc.phone}
                      </span>
                    )}
                    {whatsappContact && (
                      <a
                        href={`https://wa.me/${whatsappContact.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#4ADE80', textDecoration: 'none' }}
                      >
                        <Phone size={13} />
                        {whatsappContact} (WhatsApp)
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', border: '1px solid rgba(251, 188, 4, 0.3)', fontWeight: 600 }}>
                  Pending Review
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(acc.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Academic & Identification Overview Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>FACULTY & MAJOR</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {acc.faculty || 'Unspecified'}
                  {acc.department_major ? ` • ${acc.department_major}` : ''}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>ACADEMIC YEAR</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {formatAcademicYear(acc.academic_year)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>STUDENT ID</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, fontFamily: 'monospace' }}>
                  {acc.university_id || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>NATIONAL ID</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, fontFamily: 'monospace', color: '#86EFAC' }}>
                  {acc.national_id || 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>TARGET COMMITTEE</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--google-blue)' }}>
                  {acc.departments ? `${acc.departments.name} (${acc.departments.branch})` : 'General / Any'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>WEEKLY COMMITMENT</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {acc.availability_hours || 5} hrs / week
                </span>
              </div>
            </div>

            {/* Social & Professional Links */}
            {(acc.linkedin_url || acc.facebook_url || acc.instagram_url || acc.portfolio_url) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Profiles:</span>
                {acc.linkedin_url && (
                  <a
                    href={acc.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#93C5FD', textDecoration: 'none', background: 'rgba(66, 133, 244, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(66, 133, 244, 0.25)' }}
                  >
                    <Linkedin size={12} />
                    <span>LinkedIn</span>
                  </a>
                )}
                {acc.facebook_url && (
                  <a
                    href={acc.facebook_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-secondary)', textDecoration: 'none', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Facebook size={12} />
                    <span>Facebook</span>
                  </a>
                )}
                {acc.instagram_url && (
                  <a
                    href={acc.instagram_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#F472B6', textDecoration: 'none', background: 'rgba(255, 255, 255, 0.05)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Instagram size={12} />
                    <span>Instagram</span>
                  </a>
                )}
                {acc.portfolio_url && (
                  <a
                    href={acc.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#86EFAC', textDecoration: 'none', background: 'rgba(52, 168, 83, 0.1)', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(52, 168, 83, 0.25)' }}
                  >
                    <ExternalLink size={12} />
                    <span>Portfolio / CV</span>
                  </a>
                )}
              </div>
            )}

            {/* Motivation Statement */}
            {acc.motivation && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquare size={13} />
                  <span>MOTIVATION & GOALS</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.55, background: 'rgba(0, 0, 0, 0.2)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--google-yellow)' }}>
                  "{acc.motivation}"
                </p>
              </div>
            )}

            {/* Skills Tags */}
            {acc.skills && acc.skills.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Skills:</span>
                {acc.skills.map((s, i) => (
                  <span key={i} style={{ fontSize: '0.76rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Leadership Assignment & Decision Bar */}
            <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              {/* Role & Committee Overrides */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ASSIGN ROLE</label>
                    <select
                      value={currentRole}
                      onChange={(e) => handleRoleChange(acc.id, acc, e.target.value as UserRole)}
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: isBranchOccupied ? '1px solid #EF4444' : '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    >
                      <option value="member">Member</option>
                      <option value="committee_co_head">Committee Co-Head</option>
                      <option value="committee_head">Committee Head</option>
                      <option value="branch_head">Branch Head</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {isBranchHead ? 'ASSIGN BRANCH LEADERSHIP' : 'ASSIGN COMMITTEE'}
                    </label>
                    <select
                      value={effectiveDept}
                      onChange={(e) => handleDeptChange(acc.id, e.target.value)}
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: isBranchOccupied ? '1px solid #EF4444' : '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    >
                      {selectableDepts.map((d) => {
                        const isDTech = d.branch === 'tech';
                        const head = isDTech ? techBranchHead : nonTechBranchHead;
                        const occupied = isBranchHead && Boolean(head && head.id !== acc.id);
                        return (
                          <option key={d.id} value={d.id}>
                            {d.name} {occupied ? `⚠️ (Occupied: ${head?.full_name})` : isBranchHead ? '✓ (Available)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>POSITION TITLE</label>
                    <input
                      type="text"
                      value={currentPos}
                      onChange={(e) => setSelectedPositions({ ...selectedPositions, [acc.id]: e.target.value })}
                      placeholder="e.g. Member"
                      style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: '0.85rem', width: isBranchHead ? '190px' : '130px' }}
                    />
                  </div>
                </div>

                {isBranchOccupied && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.78rem',
                    color: '#F87171',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '0.35rem 0.65rem'
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Single Branch Head Rule:</strong> {existingHeadForBranch?.full_name} is already the active {isTechBranch ? 'Technical' : 'Non-Technical'} Branch Head. Each branch can only have one Branch Head.
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setChangesModalId(acc.id);
                    setPromptText('');
                  }}
                  disabled={isBusy}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', color: '#FBBF24' }}
                >
                  <RotateCcw size={14} />
                  <span>Request Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRejectModalId(acc.id);
                    setPromptText('');
                  }}
                  disabled={isBusy}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', color: '#F87171' }}
                >
                  <X size={14} />
                  <span>Reject</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApprove(acc)}
                  disabled={isBusy || isBranchOccupied}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.85rem',
                    background: isBranchOccupied ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #34A853 0%, #16A34A 100%)',
                    boxShadow: isBranchOccupied ? 'none' : '0 4px 14px rgba(52, 168, 83, 0.3)',
                    opacity: isBranchOccupied ? 0.45 : 1,
                    cursor: isBranchOccupied ? 'not-allowed' : 'pointer'
                  }}
                  title={isBranchOccupied ? 'Cannot approve: branch already has an active Branch Head' : undefined}
                >
                  {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Approve & Activate</span>
                </button>
              </div>
            </div>

            {/* Inline Prompt Modal for Reject / Request Changes */}
            {(rejectModalId === acc.id || changesModalId === acc.id) && (
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  {rejectModalId === acc.id ? 'State Reason for Rejection:' : 'Specify Requested Changes:'}
                </div>
                <textarea
                  rows={2}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={rejectModalId === acc.id ? 'Explain why application was not accepted...' : 'e.g. Please provide a working portfolio link...'}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: '0.75rem', outline: 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalId(null);
                      setChangesModalId(null);
                      setPromptText('');
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => (rejectModalId === acc.id ? handleConfirmReject(acc.id) : handleConfirmChanges(acc.id))}
                    className="btn-primary"
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.8rem',
                      background: rejectModalId === acc.id ? 'var(--google-red)' : 'var(--google-yellow)',
                      color: rejectModalId === acc.id ? '#FFF' : '#000'
                    }}
                  >
                    {rejectModalId === acc.id ? 'Confirm Rejection' : 'Send Changes Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
