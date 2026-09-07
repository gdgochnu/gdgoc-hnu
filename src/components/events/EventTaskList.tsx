'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Task, TaskPriority, TaskAssignmentMode } from '@/types';
import { createEventTask, unlinkTaskFromEvent, EventTaskDraftInput } from '@/app/events/actions';
import { 
  CheckSquare, 
  Plus, 
  Clock, 
  Users, 
  ExternalLink, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Radio, 
  Loader2, 
  ChevronRight,
  Sparkles,
  Building2,
  Calendar,
  X
} from 'lucide-react';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  branch: string;
}

interface MemberOption {
  id: string;
  full_name: string;
  full_name_en?: string | null;
  email: string;
  avatar_url?: string | null;
  department_id?: string | null;
}

interface EventTaskListProps {
  eventId: string;
  eventTitle: string;
  eventDepartmentId: string;
  initialTasks: any[];
  departments: DepartmentOption[];
  members: MemberOption[];
  canManage?: boolean;
}

export function EventTaskList({
  eventId,
  eventTitle,
  eventDepartmentId,
  initialTasks,
  departments,
  members,
  canManage = true,
}: EventTaskListProps) {
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'review' | 'done'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [targetDeptId, setTargetDeptId] = useState(eventDepartmentId);
  const [assignmentMode, setAssignmentMode] = useState<TaskAssignmentMode>('single');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');

  const filteredTasks = tasks.filter(t => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'todo') return t.status === 'todo';
    if (statusFilter === 'in_progress') return t.status === 'in_progress' || t.status === 'delegated';
    if (statusFilter === 'review') return t.status === 'review';
    if (statusFilter === 'done') return t.status === 'done';
    return true;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    if (!taskTitle.trim()) {
      setActionError('Task title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const input: EventTaskDraftInput = {
        title: taskTitle.trim(),
        description: taskDescription.trim() || undefined,
        departmentId: targetDeptId || eventDepartmentId,
        assigneeId: assignmentMode === 'single' ? (assigneeId || null) : null,
        assignmentMode,
        priority,
        deadline: deadline || undefined,
      };

      const res = await createEventTask(eventId, input);
      if (!res.success || !res.task) {
        setActionError(res.error || 'Failed to create event task.');
      } else {
        setTasks([res.task, ...tasks]);
        setIsAddModalOpen(false);
        setTaskTitle('');
        setTaskDescription('');
        setAssigneeId('');
        setDeadline('');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error creating task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    if (!confirm('Remove this task from this event? The task will remain on the committee board.')) return;
    try {
      setActionError(null);
      const res = await unlinkTaskFromEvent(taskId, eventId);
      if (!res.success) {
        setActionError(res.error || 'Failed to remove task from event.');
      } else {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error unlinking task.');
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return { label: 'High', color: '#FCA5A5', bg: 'rgba(234, 67, 53, 0.15)', border: 'rgba(234, 67, 53, 0.3)' };
      case 'medium':
        return { label: 'Medium', color: '#FDE047', bg: 'rgba(251, 188, 4, 0.15)', border: 'rgba(251, 188, 4, 0.3)' };
      case 'low':
        return { label: 'Low', color: '#93C5FD', bg: 'rgba(66, 133, 244, 0.15)', border: 'rgba(66, 133, 244, 0.3)' };
      default:
        return { label: p, color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.1)' };
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'todo':
        return { label: 'To Do', color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.08)' };
      case 'in_progress':
        return { label: 'In Progress', color: '#93C5FD', bg: 'rgba(66, 133, 244, 0.15)' };
      case 'delegated':
        return { label: 'Delegated 🔀', color: '#D8B4FE', bg: 'rgba(168, 85, 247, 0.15)' };
      case 'review':
        return { label: 'In Review', color: '#FDE047', bg: 'rgba(251, 188, 4, 0.15)' };
      case 'done':
        return { label: 'Done ✅', color: '#86EFAC', bg: 'rgba(52, 168, 83, 0.15)' };
      default:
        return { label: s, color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(66, 133, 244, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <CheckSquare size={18} color="var(--google-blue)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Event Task List
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.2)',
                color: '#93C5FD',
              }}>
                {tasks.length}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              Operational and technical tasks linked to {eventTitle}
            </p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
            }}
          >
            <Plus size={15} />
            <span>Add Event Task</span>
          </button>
        )}
      </div>

      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: 'rgba(234, 67, 53, 0.12)',
          border: '1px solid rgba(234, 67, 53, 0.3)',
          color: '#FCA5A5',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(0, 0, 0, 0.25)',
        padding: '0.25rem',
        borderRadius: '10px',
        width: 'fit-content',
        border: '1px solid var(--border-subtle)',
      }}>
        {(['all', 'todo', 'in_progress', 'review', 'done'] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '7px',
              border: 'none',
              background: statusFilter === status ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: statusFilter === status ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {status === 'all' ? `All (${tasks.length})` : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
          borderRadius: '12px',
          border: '1px dashed var(--border-subtle)',
          color: 'var(--text-muted)',
        }}>
          <CheckSquare size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', fontSize: '0.92rem' }}>
            No tasks found in this view
          </div>
          <div style={{ fontSize: '0.82rem' }}>
            {canManage ? 'Click "Add Event Task" to assign design, logistics, or speaker preparation.' : 'No tasks assigned yet.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredTasks.map((task) => {
            const pBadge = getPriorityBadge(task.priority);
            const sBadge = getStatusBadge(task.status);
            const isBroadcast = task.assignment_mode === 'broadcast';
            const dept = departments.find(d => d.id === task.department_id);

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  transition: 'background 0.15s',
                }}
              >
                {/* Left: Title, Description, and Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link
                      href={`/tasks/${task.id}`}
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: '#FFFFFF',
                        textDecoration: 'none',
                      }}
                    >
                      {task.title}
                    </Link>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      background: pBadge.bg,
                      color: pBadge.color,
                      border: `1px solid ${pBadge.border}`,
                    }}>
                      {pBadge.label}
                    </span>

                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      background: sBadge.bg,
                      color: sBadge.color,
                    }}>
                      {sBadge.label}
                    </span>

                    {isBroadcast && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#D8B4FE',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}>
                        Broadcast 📢
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {dept && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Building2 size={12} color="var(--google-blue)" />
                        {dept.name}
                      </span>
                    )}

                    {task.deadline && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} color="var(--google-yellow)" />
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Assignee & Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {isBroadcast ? (
                    <span style={{ fontSize: '0.78rem', color: '#D8B4FE', fontWeight: 600 }}>
                      All Members ({task.task_assignees?.length || 0})
                    </span>
                  ) : task.assignee ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: 'rgba(66, 133, 244, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--google-blue)',
                      }}>
                        {task.assignee.full_name?.charAt(0) || 'U'}
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {task.assignee.full_name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unassigned</span>
                  )}

                  <Link
                    href={`/tasks/${task.id}`}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Task</span>
                    <ExternalLink size={12} />
                  </Link>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleUnlinkTask(task.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#F87171',
                        cursor: 'pointer',
                        padding: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Unlink task from this event"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Task Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 13, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
        }}>
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '2rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={18} color="var(--google-blue)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Add Event Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  TASK TITLE *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Design Event Poster & Social Banner"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  DESCRIPTION / DELIVERABLES
                </label>
                <textarea
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Specific requirements, design dimensions, or logistics details..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    TARGET COMMITTEE
                  </label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    PRIORITY
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Assignment Mode (Phase 6 upgrade) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  ASSIGNMENT MODE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setAssignmentMode('single')}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: assignmentMode === 'single' ? '1px solid var(--google-blue)' : '1px solid var(--border-subtle)',
                      background: assignmentMode === 'single' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: assignmentMode === 'single' ? '#93C5FD' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Single Person
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignmentMode('broadcast')}
                    style={{
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: assignmentMode === 'broadcast' ? '1px solid #A855F7' : '1px solid var(--border-subtle)',
                      background: assignmentMode === 'broadcast' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: assignmentMode === 'broadcast' ? '#D8B4FE' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Broadcast to All 📢
                  </button>
                </div>
              </div>

              {assignmentMode === 'single' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    ASSIGNEE
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Choose Member --</option>
                    {members
                      .filter(m => !targetDeptId || m.department_id === targetDeptId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name_en || m.full_name} ({m.email})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  DUE DATE
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Attach Task</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
