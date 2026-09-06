'use client';

import { useState, useMemo } from 'react';
import { 
  createCommittee, 
  updateCommittee, 
  assignCommitteeLeadership,
  CreateCommitteeInput,
  UpdateCommitteeInput
} from '@/app/settings/committees/actions';
import { DepartmentBranch } from '@/types';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2, 
  Edit3, 
  Users, 
  Sparkles, 
  Layers, 
  UserPlus, 
  AlertCircle,
  X
} from 'lucide-react';

export interface CommitteeLeader {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

export interface CommitteeItem {
  id: string;
  name: string;
  code: string;
  branch: DepartmentBranch;
  description: string | null;
  head_id: string | null;
  co_head_id: string | null;
  member_count?: number;
  head?: CommitteeLeader | null;
  co_head?: CommitteeLeader | null;
}

export interface EligibleMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
  position: string | null;
}

interface CommitteesManagementClientProps {
  initialCommittees: CommitteeItem[];
  eligibleMembers: EligibleMember[];
}

export function CommitteesManagementClient({
  initialCommittees,
  eligibleMembers,
}: CommitteesManagementClientProps) {
  const [committees, setCommittees] = useState<CommitteeItem[]>(initialCommittees);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<'all' | 'tech' | 'non_tech'>('all');

  // Async action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<CommitteeItem | null>(null);
  const [leadershipCommittee, setLeadershipCommittee] = useState<CommitteeItem | null>(null);

  // Form states: Create
  const [createForm, setCreateForm] = useState<CreateCommitteeInput>({
    name: '',
    code: '',
    branch: 'tech',
    description: '',
  });

  // Form states: Edit
  const [editForm, setEditForm] = useState<UpdateCommitteeInput>({
    id: '',
    name: '',
    code: '',
    branch: 'tech',
    description: '',
  });

  // Form states: Assign Leadership
  const [selectedHeadId, setSelectedHeadId] = useState<string>('');
  const [selectedCoHeadId, setSelectedCoHeadId] = useState<string>('');

  // Auto-generate code slug on typing committee name
  const handleNameChange = (name: string, isEdit: boolean) => {
    if (isEdit) {
      setEditForm((prev) => ({ ...prev, name }));
    } else {
      const suggestedCode = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/gi, '')
        .replace(/\s+/g, '_')
        .slice(0, 10);
      setCreateForm((prev) => ({
        ...prev,
        name,
        code: prev.code ? prev.code : suggestedCode,
      }));
    }
  };

  // Filtered committees
  const filteredCommittees = useMemo(() => {
    return committees.filter((c) => {
      if (branchFilter !== 'all' && c.branch !== branchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesHead = c.head?.full_name.toLowerCase().includes(q);
        const matchesCoHead = c.co_head?.full_name.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesHead && !matchesCoHead) {
          return false;
        }
      }
      return true;
    });
  }, [committees, branchFilter, searchQuery]);

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await createCommittee(createForm);
      if (!res.success) {
        setActionError(res.error || 'Failed to create committee');
      } else {
        if (res.department) {
          setCommittees((prev) => [
            ...prev,
            {
              ...res.department,
              member_count: 0,
              head: null,
              co_head: null,
            },
          ]);
        }
        setActionSuccess(`Committee "${createForm.name}" created successfully!`);
        setIsCreateOpen(false);
        setCreateForm({ name: '', code: '', branch: 'tech', description: '' });
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error creating committee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommittee) return;

    try {
      setIsSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await updateCommittee(editForm);
      if (!res.success) {
        setActionError(res.error || 'Failed to update committee');
      } else {
        setCommittees((prev) =>
          prev.map((c) =>
            c.id === editingCommittee.id
              ? {
                  ...c,
                  name: editForm.name.trim(),
                  code: editForm.code.trim().toUpperCase(),
                  branch: editForm.branch,
                  description: editForm.description?.trim() || null,
                }
              : c
          )
        );
        setActionSuccess(`Committee "${editForm.name}" updated successfully!`);
        setEditingCommittee(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating committee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Assign Leadership Submit
  const handleAssignLeadershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadershipCommittee) return;

    try {
      setIsSubmitting(true);
      setActionError(null);
      setActionSuccess(null);

      const headVal = selectedHeadId === 'none' || !selectedHeadId ? null : selectedHeadId;
      const coHeadVal = selectedCoHeadId === 'none' || !selectedCoHeadId ? null : selectedCoHeadId;

      const res = await assignCommitteeLeadership(leadershipCommittee.id, headVal, coHeadVal);
      if (!res.success) {
        setActionError(res.error || 'Failed to assign leadership');
      } else {
        // Resolve leader objects
        const newHeadObj = headVal
          ? eligibleMembers.find((m) => m.id === headVal) || null
          : null;
        const newCoHeadObj = coHeadVal
          ? eligibleMembers.find((m) => m.id === coHeadVal) || null
          : null;

        setCommittees((prev) =>
          prev.map((c) =>
            c.id === leadershipCommittee.id
              ? {
                  ...c,
                  head_id: headVal,
                  co_head_id: coHeadVal,
                  head: newHeadObj
                    ? {
                        id: newHeadObj.id,
                        full_name: newHeadObj.full_name,
                        email: newHeadObj.email,
                        avatar_url: newHeadObj.avatar_url,
                        role: 'committee_head',
                      }
                    : null,
                  co_head: newCoHeadObj
                    ? {
                        id: newCoHeadObj.id,
                        full_name: newCoHeadObj.full_name,
                        email: newCoHeadObj.email,
                        avatar_url: newCoHeadObj.avatar_url,
                        role: 'committee_co_head',
                      }
                    : null,
                }
              : c
          )
        );

        setActionSuccess(`Leadership for ${leadershipCommittee.name} assigned successfully!`);
        setLeadershipCommittee(null);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error assigning leadership');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Action Alerts */}
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

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="var(--google-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Committees</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF' }}>{committees.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} color="var(--google-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Tech Branch</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#93C5FD' }}>
              {committees.filter((c) => c.branch === 'tech').length}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} color="var(--google-green)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Non-Tech Branch</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#86EFAC' }}>
              {committees.filter((c) => c.branch === 'non_tech').length}
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} color="var(--google-yellow)" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Heads Assigned</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FDE047' }}>
              {committees.filter((c) => !!c.head_id).length} / {committees.length}
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search committees, codes, or leaders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.75rem', height: '44px', width: '100%' }}
            />
          </div>

          {/* Branch Filter Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '4px' }}>
            <button
              onClick={() => setBranchFilter('all')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: branchFilter === 'all' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                color: branchFilter === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              All Branches ({committees.length})
            </button>
            <button
              onClick={() => setBranchFilter('tech')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: branchFilter === 'tech' ? 'rgba(66, 133, 244, 0.25)' : 'transparent',
                color: branchFilter === 'tech' ? '#93C5FD' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Tech ({committees.filter((c) => c.branch === 'tech').length})
            </button>
            <button
              onClick={() => setBranchFilter('non_tech')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: branchFilter === 'non_tech' ? 'rgba(52, 168, 83, 0.25)' : 'transparent',
                color: branchFilter === 'non_tech' ? '#86EFAC' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Non-Tech ({committees.filter((c) => c.branch === 'non_tech').length})
            </button>
          </div>

          {/* New Committee Button */}
          <button
            onClick={() => {
              setIsCreateOpen(true);
              setCreateForm({ name: '', code: '', branch: 'tech', description: '' });
            }}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              flexShrink: 0
            }}
          >
            <Plus size={18} />
            <span>Create Committee</span>
          </button>
        </div>
      </div>

      {/* Committees Grid */}
      {filteredCommittees.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Building2 size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>No committees found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Try adjusting your search terms or filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredCommittees.map((c) => {
            const isTech = c.branch === 'tech';

            return (
              <div
                key={c.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Accent Strip */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: isTech
                      ? 'linear-gradient(90deg, #4285F4, #34A853)'
                      : 'linear-gradient(90deg, #FBBC04, #EA4335)',
                  }}
                />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: isTech ? 'rgba(66, 133, 244, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                          color: isTech ? '#93C5FD' : '#86EFAC',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {isTech ? 'Tech Branch' : 'Non-Tech Branch'}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        #{c.code}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                      {c.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => {
                      setEditingCommittee(c);
                      setEditForm({
                        id: c.id,
                        name: c.name,
                        code: c.code,
                        branch: c.branch,
                        description: c.description || '',
                      });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.45rem',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title="Edit Committee Details"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                {/* Description */}
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, margin: 0, minHeight: '2.6rem' }}>
                  {c.description || 'No specific description provided for this committee.'}
                </p>

                {/* Leadership Section */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  {/* Head of Committee */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: c.head ? 'rgba(66, 133, 244, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: c.head ? '#93C5FD' : 'var(--text-muted)',
                      }}>
                        {c.head?.avatar_url ? (
                          <img src={c.head.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                          c.head?.full_name?.charAt(0) || 'H'
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Committee Head
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: c.head ? '#FFFFFF' : 'var(--text-muted)' }}>
                          {c.head?.full_name || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                    {c.head ? (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 600 }}>
                        Active
                      </span>
                    ) : null}
                  </div>

                  {/* Co-Head of Committee */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: c.co_head ? 'rgba(52, 168, 83, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: c.co_head ? '#86EFAC' : 'var(--text-muted)',
                      }}>
                        {c.co_head?.avatar_url ? (
                          <img src={c.co_head.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                          c.co_head?.full_name?.charAt(0) || 'C'
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Committee Co-Head
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: c.co_head ? '#FFFFFF' : 'var(--text-muted)' }}>
                          {c.co_head?.full_name || 'Unassigned'}
                        </div>
                      </div>
                    </div>
                    {c.co_head ? (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(52, 168, 83, 0.15)', color: '#86EFAC', fontWeight: 600 }}>
                        Active
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: 'auto' }}>
                  <button
                    onClick={() => {
                      setLeadershipCommittee(c);
                      setSelectedHeadId(c.head_id || 'none');
                      setSelectedCoHeadId(c.co_head_id || 'none');
                    }}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      fontSize: '0.85rem',
                      padding: '0.6rem',
                    }}
                  >
                    <UserPlus size={16} color="var(--google-blue)" />
                    <span>Assign Leadership</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE COMMITTEE MODAL */}
      {isCreateOpen ? (
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
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="var(--google-blue)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Create New Committee</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Define chapter department and branch structure</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Committee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cybersecurity & InfoSec"
                  value={createForm.name}
                  onChange={(e) => handleNameChange(e.target.value, false)}
                  className="input-field"
                  style={{ width: '100%', height: '42px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    Unique Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CYBER"
                    value={createForm.code}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    Branch *
                  </label>
                  <select
                    value={createForm.branch}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, branch: e.target.value as DepartmentBranch }))}
                    className="input-field"
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="tech">Tech Branch</option>
                    <option value="non_tech">Non-Tech Branch</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Description & Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the committee's focus, responsibilities, and technical domains..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  <span>Create Committee</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* EDIT COMMITTEE MODAL */}
      {editingCommittee ? (
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
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251, 188, 4, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit3 size={20} color="var(--google-yellow)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Edit Committee Details</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Update details for {editingCommittee.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCommittee(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Committee Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', height: '42px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    Unique Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.code}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="input-field"
                    style={{ width: '100%', height: '42px', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                    Branch *
                  </label>
                  <select
                    value={editForm.branch}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, branch: e.target.value as DepartmentBranch }))}
                    className="input-field"
                    style={{ width: '100%', height: '42px' }}
                  >
                    <option value="tech">Tech Branch</option>
                    <option value="non_tech">Non-Tech Branch</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Description & Scope
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingCommittee(null)}
                  disabled={isSubmitting}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ASSIGN LEADERSHIP MODAL */}
      {leadershipCommittee ? (
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
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} color="var(--google-blue)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Assign Committee Leadership</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>{leadershipCommittee.name}</p>
                </div>
              </div>
              <button
                onClick={() => setLeadershipCommittee(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignLeadershipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Committee Head Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Committee Head
                </label>
                <select
                  value={selectedHeadId}
                  onChange={(e) => setSelectedHeadId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '44px' }}
                >
                  <option value="none">-- No Head Assigned --</option>
                  {eligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email}) • {m.role}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Assigning a member as Head promotes their role to <code>committee_head</code> and updates their department.
                </div>
              </div>

              {/* Committee Co-Head Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}>
                  Committee Co-Head (Optional)
                </label>
                <select
                  value={selectedCoHeadId}
                  onChange={(e) => setSelectedCoHeadId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', height: '44px' }}
                >
                  <option value="none">-- No Co-Head Assigned --</option>
                  {eligibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.email}) • {m.role}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Assigning a member as Co-Head promotes their role to <code>committee_co_head</code>.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setLeadershipCommittee(null)}
                  disabled={isSubmitting}
                  className="btn-secondary"
                  style={{ padding: '0.65rem 1.25rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                  <span>Save Leadership</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
