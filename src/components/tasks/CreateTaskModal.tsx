'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  Sparkles, 
  Calendar, 
  Building2, 
  User, 
  AlertCircle,
  Flag,
  Radio,
  Users
} from 'lucide-react';
import { TaskPriority, TaskAssignmentMode } from '@/types';
import { TaskItem, DepartmentOption } from './TasksKanbanClient';

export interface AssigneeOption {
  id: string;
  full_name: string;
  role: string;
  department_id?: string | null;
  avatar_url?: string | null;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentOption[];
  defaultDeptId?: string;
  members: AssigneeOption[];
  onTaskCreated: (newTask: TaskItem) => void;
  isPresidentOrBranchHead: boolean;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  departments,
  defaultDeptId,
  members,
  onTaskCreated,
  isPresidentOrBranchHead,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deptId, setDeptId] = useState(defaultDeptId || (departments[0]?.id ?? ''));
  const [assignmentMode, setAssignmentMode] = useState<TaskAssignmentMode>('single');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter members by selected department
  const filteredMembers = members.filter((m) => {
    if (!deptId) return true;
    return m.department_id === deptId;
  });

  useEffect(() => {
    if (defaultDeptId) setDeptId(defaultDeptId);
  }, [defaultDeptId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a task title.');
      return;
    }
    if (!deptId) {
      setErrorMsg('Please select a committee.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch('/api/tasks?mock=president', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          department_id: deptId,
          assignment_mode: assignmentMode,
          assignee_id: assignmentMode === 'broadcast' ? null : (assigneeId || null),
          priority,
          deadline: deadline || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      onTaskCreated(data.task);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setAssignmentMode('single');
      setAssigneeId('');
      setDeadline('');
      setPriority('medium');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 8, 15, 0.75)',
        backdropFilter: 'blur(10px)',
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
          maxWidth: '580px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          background: 'rgba(19, 27, 46, 0.95)',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(66, 133, 244, 0.2)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Sparkles size={16} color="var(--google-blue)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--google-blue)' }}>
                Chapter Sprint Planning
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Create New Task
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(234, 67, 53, 0.15)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Task Title <span style={{ color: 'var(--google-red)' }}>*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Design Google OAuth Landing Screen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Assignment Mode Toggle (Spec §3.3 / §4.2) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Assignment Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAssignmentMode('single')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${assignmentMode === 'single' ? 'rgba(66, 133, 244, 0.8)' : 'var(--border-subtle)'}`,
                  background: assignmentMode === 'single' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: assignmentMode === 'single' ? '#93C5FD' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)',
                }}
              >
                <User size={18} color={assignmentMode === 'single' ? '#4285F4' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Single Assignee</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assigned to one member</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssignmentMode('broadcast');
                  setAssigneeId('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${assignmentMode === 'broadcast' ? 'rgba(168, 85, 247, 0.8)' : 'var(--border-subtle)'}`,
                  background: assignmentMode === 'broadcast' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  color: assignmentMode === 'broadcast' ? '#C084FC' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)',
                }}
              >
                <Radio size={18} color={assignmentMode === 'broadcast' ? '#A855F7' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Broadcast Mode</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>All committee members</div>
                </div>
              </button>
            </div>
          </div>

          {/* Committee & Assignee Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
            {/* Committee */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Committee <span style={{ color: 'var(--google-red)' }}>*</span>
              </label>
              <select
                className="input-field"
                value={deptId}
                onChange={(e) => {
                  setDeptId(e.target.value);
                  setAssigneeId(''); // Reset assignee if department changes
                }}
                disabled={!isPresidentOrBranchHead && departments.length === 1}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Selection (Single vs Broadcast) */}
            {assignmentMode === 'broadcast' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Target Recipients
                </label>
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#D8B4FE',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minHeight: '44px',
                  }}
                >
                  <Users size={16} color="#C084FC" />
                  <span>
                    Auto-assigns to <strong>all {filteredMembers.length} members</strong> of this committee.
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Assignee
                </label>
                <select
                  className="input-field"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned (Open for pickup)</option>
                  {filteredMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Priority & Deadline Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '1rem' }}>
            {/* Priority Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Priority Level
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => {
                  const isSelected = priority === p;
                  let activeBorder = 'rgba(66, 133, 244, 0.8)';
                  let activeBg = 'rgba(66, 133, 244, 0.2)';
                  let color = '#93C5FD';

                  if (p === 'medium') {
                    activeBorder = 'rgba(251, 188, 4, 0.8)';
                    activeBg = 'rgba(251, 188, 4, 0.2)';
                    color = '#FDE047';
                  } else if (p === 'high') {
                    activeBorder = 'rgba(234, 67, 53, 0.8)';
                    activeBg = 'rgba(234, 67, 53, 0.2)';
                    color = '#FCA5A5';
                  }

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        border: `1px solid ${isSelected ? activeBorder : 'var(--border-subtle)'}`,
                        background: isSelected ? activeBg : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? color : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Deadline
              </label>
              <input
                type="date"
                className="input-field"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Description & Deliverable Acceptance Criteria
            </label>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Outline deliverables, technical guidelines, or links to references..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ minWidth: '150px' }}
            >
              <CheckSquare size={16} />
              <span>{isSubmitting ? 'Creating...' : 'Create Deliverable'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
