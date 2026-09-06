'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  GitFork, 
  User, 
  Radio, 
  Users, 
  AlertCircle, 
  Send, 
  Sparkles, 
  ArrowDown, 
  Building2, 
  Calendar, 
  Check, 
  Loader2 
} from 'lucide-react';
import { TaskDetailData } from './TaskDetailClient';
import { TaskAssignmentMode, TaskPriority } from '@/types';

interface CandidateProfile {
  id: string;
  full_name: string;
  role: string;
  position?: string | null;
  avatar_url?: string | null;
  department_id?: string | null;
}

interface TargetDepartment {
  id: string;
  name: string;
  code: string;
  branch: string;
  memberCount: number;
}

interface DelegateTaskModalProps {
  task: TaskDetailData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (childTask: any, updatedParentTask: any) => void;
  mockRole?: string | null;
  currentUserId?: string;
}

export function DelegateTaskModal({
  task,
  isOpen,
  onClose,
  onSuccess,
  mockRole,
  currentUserId,
}: DelegateTaskModalProps) {
  const [recipientMode, setRecipientMode] = useState<TaskAssignmentMode>('single');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(task.department_id || '');
  const [delegationNotes, setDelegationNotes] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium');
  const [deadline, setDeadline] = useState<string>(
    task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''
  );

  const [departments, setDepartments] = useState<TargetDepartment[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mockQuery = mockRole ? `?mock=${mockRole}` : '';

  // Load valid delegation targets based on user's position in hierarchy
  useEffect(() => {
    if (!isOpen) return;

    async function loadTargets() {
      try {
        setIsLoadingTargets(true);
        setErrorMsg(null);

        const res = await fetch(`/api/tasks/${task.id}/delegation-targets${mockQuery}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load delegation targets');
        }

        setDepartments(data.departments || []);
        setCandidates(data.candidates || []);

        // Pre-select first candidate or department
        if (data.candidates && data.candidates.length > 0) {
          setSelectedProfileId(data.candidates[0].id);
        }
        if (data.departments && data.departments.length > 0) {
          const matchDept = data.departments.find((d: any) => d.id === task.department_id);
          setSelectedDepartmentId(matchDept ? matchDept.id : data.departments[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading delegation candidates');
      } finally {
        setIsLoadingTargets(false);
      }
    }

    loadTargets();
  }, [isOpen, task.id, task.department_id, mockQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipientMode === 'single' && !selectedProfileId) {
      setErrorMsg('Please select a recipient member or head to delegate to.');
      return;
    }

    if (recipientMode === 'broadcast' && !selectedDepartmentId) {
      setErrorMsg('Please select a target committee for broadcast delegation.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch(`/api/tasks/${task.id}/delegate${mockQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_mode: recipientMode,
          recipient_profile_id: recipientMode === 'single' ? selectedProfileId : undefined,
          recipient_department_id: recipientMode === 'broadcast' ? selectedDepartmentId : undefined,
          delegation_notes: delegationNotes.trim() || undefined,
          priority,
          deadline: deadline || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delegate task');
      }

      onSuccess(data.childTask, data.parentTask);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing task delegation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCandidate = candidates.find((c) => c.id === selectedProfileId);
  const selectedDeptObj = departments.find((d) => d.id === selectedDepartmentId);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          background: 'rgba(19, 27, 46, 0.96)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(168, 85, 247, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <GitFork size={16} color="#C084FC" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C084FC' }}>
                Downward Delegation (Spec §4.2 Part B)
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Delegate Task: {task.title}
            </h2>
            <p style={{ margin: 0, marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Pass this deliverable down the leadership chain with appended instructions. This creates a child task while placing this parent task into <strong>Delegated</strong> status until completed.
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(234, 67, 53, 0.15)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoadingTargets ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '0.88rem' }}>Loading eligible delegation targets...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Mode Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Delegation Target Mode <span style={{ color: 'var(--google-red)' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setRecipientMode('single')}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: recipientMode === 'single' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1.5px solid ${recipientMode === 'single' ? 'var(--google-blue)' : 'var(--border-subtle)'}`,
                    color: recipientMode === 'single' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  <User size={18} color={recipientMode === 'single' ? 'var(--google-blue)' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Single Person</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Specific Head or Member</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode('broadcast')}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    background: recipientMode === 'broadcast' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1.5px solid ${recipientMode === 'broadcast' ? '#A855F7' : 'var(--border-subtle)'}`,
                    color: recipientMode === 'broadcast' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textAlign: 'left',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  <Radio size={18} color={recipientMode === 'broadcast' ? '#C084FC' : 'var(--text-muted)'} />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Committee Broadcast</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>All members of committee</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Recipient Selection */}
            {recipientMode === 'single' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Select Recipient <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                {candidates.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#FCA5A5', padding: '0.75rem', background: 'rgba(234, 67, 53, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    No eligible downstream profiles found for your role.
                  </div>
                ) : (
                  <select
                    className="input-field"
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.88rem' }}
                    required
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} — {c.position || c.role.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Target Committee for Broadcast <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                {departments.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#FCA5A5', padding: '0.75rem', background: 'rgba(234, 67, 53, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    No committees found within your delegation authority.
                  </div>
                ) : (
                  <select
                    className="input-field"
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.88rem' }}
                    required
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.branch.toUpperCase()}) — {d.memberCount} active member{d.memberCount !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Delegation Notes & Directives */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Delegation Instructions & Scope Notes
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={delegationNotes}
                onChange={(e) => setDelegationNotes(e.target.value)}
                placeholder="Specify execution directives, constraints, or sub-deliverables to be produced..."
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
              <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Appended cleanly to the original description. Does not overwrite the root task specifications.
              </span>
            </div>

            {/* Optional Adjustments: Deadline & Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Sub-Task Deadline
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Sub-Task Priority
                </label>
                <select
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            {/* Visual Delegation Chain Preview */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px dashed rgba(168, 85, 247, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              <GitFork size={16} color="#C084FC" />
              <span>
                <strong>Flow Preview:</strong> [Current Task] ➔ Delegates to{' '}
                <strong style={{ color: '#F3E8FF' }}>
                  {recipientMode === 'single'
                    ? selectedCandidate?.full_name || 'Selected Recipient'
                    : selectedDeptObj
                    ? `Broadcast to ${selectedDeptObj.name} (${selectedDeptObj.memberCount} members)`
                    : 'Selected Committee'}
                </strong>{' '}
                (Parent task pauses as <code>Delegated</code>).
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn btn-outline"
                style={{ fontSize: '0.88rem', padding: '0.55rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (recipientMode === 'single' && !selectedProfileId) || (recipientMode === 'broadcast' && !selectedDepartmentId)}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.88rem',
                  padding: '0.55rem 1.5rem',
                  background: 'linear-gradient(135deg, #A855F7, #4285F4)',
                  border: 'none',
                }}
              >
                <GitFork size={15} />
                <span>{isSubmitting ? 'Delegating...' : 'Confirm Delegation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
