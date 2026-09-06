'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  CheckSquare, 
  CircleDot, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Building2, 
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Tag
} from 'lucide-react';
import { TaskStatus, TaskPriority, UserRole, TaskAssignmentMode } from '@/types';

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  department_id: string;
  assignee_id?: string | null;
  created_by?: string | null;
  delegated_by_id?: string | null;
  parent_task_id?: string | null;
  assignment_mode?: TaskAssignmentMode;
  event_id?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string | null;
  evidence_url?: string | null;
  approval_instance_id?: string | null;
  created_at: string;
  updated_at: string;
  departments?: {
    id: string;
    name: string;
    code: string;
    branch: string;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: string;
    position?: string | null;
  } | null;
}

export interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  branch: string;
}

import { CreateTaskModal, AssigneeOption } from './CreateTaskModal';
import { SubmitForReviewModal } from './SubmitForReviewModal';
import { Play, Send } from 'lucide-react';

export interface TasksKanbanClientProps {
  initialTasks: TaskItem[];
  departments: DepartmentOption[];
  members?: AssigneeOption[];
  currentUserRole: UserRole;
  currentUserId: string;
  userDepartmentId?: string | null;
}

interface ColumnConfig {
  id: TaskStatus;
  label: string;
  accentColor: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }>;
  description: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'todo',
    label: 'To Do',
    accentColor: '#4285F4', // Google Blue
    icon: CircleDot,
    description: 'Backlog and ready for pickup',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    accentColor: '#FBBC04', // Google Yellow
    icon: Clock,
    description: 'Currently being actively executed',
  },
  {
    id: 'review',
    label: 'In Review',
    accentColor: '#A855F7', // Executive Purple
    icon: ShieldCheck,
    description: 'Multi-stage approval pipeline',
  },
  {
    id: 'done',
    label: 'Done',
    accentColor: '#34A853', // Google Green
    icon: CheckCircle2,
    description: 'Approved & verified deliverables',
  },
];

export function TasksKanbanClient({
  initialTasks,
  departments,
  members = [],
  currentUserRole,
  currentUserId,
  userDepartmentId,
}: TasksKanbanClientProps) {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskItem | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const mockParam = searchParams?.get('mock');
  const mockQuery = mockParam ? `?mock=${mockParam}` : '';

  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(currentUserRole);

  const handleStartTask = async (task: TaskItem) => {
    try {
      setLoadingTaskId(task.id);
      const res = await fetch(`/api/tasks/${task.id}/start?mock=president`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
      }
    } catch (err) {
      console.error('Error starting task:', err);
    } finally {
      setLoadingTaskId(null);
    }
  };

  // Filter tasks based on search, department, priority, and my-tasks toggle
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q) || false;
        const matchesAssignee = t.assignee?.full_name.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesDesc && !matchesAssignee) return false;
      }

      // Department scoping
      if (selectedDeptId !== 'all') {
        if (t.department_id !== selectedDeptId) return false;
      }

      // Priority
      if (selectedPriority !== 'all') {
        if (t.priority !== selectedPriority) return false;
      }

      // My tasks
      if (onlyMyTasks) {
        if (t.assignee_id !== currentUserId) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, selectedDeptId, selectedPriority, onlyMyTasks, currentUserId]);

  // Group tasks by status into 4 columns
  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
      rejected: [],
      delegated: [],
    };

    filteredTasks.forEach((t) => {
      // If task is rejected or delegated, display it under 'in_progress' with badge/flag (Spec §4.2)
      if (t.status === 'rejected') {
        map.in_progress.push(t);
      } else if (t.status === 'delegated') {
        map.in_progress.push(t);
      } else if (map[t.status]) {
        map[t.status].push(t);
      }
    });

    return map;
  }, [filteredTasks]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return { label: 'High', bg: 'rgba(234, 67, 53, 0.15)', color: '#F87171', border: 'rgba(234, 67, 53, 0.3)' };
      case 'medium':
        return { label: 'Medium', bg: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', border: 'rgba(251, 188, 4, 0.3)' };
      case 'low':
      default:
        return { label: 'Low', bg: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', border: 'rgba(66, 133, 244, 0.3)' };
    }
  };

  const formatDeadline = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)}d`, isUrgent: true };
    } else if (diffDays === 0) {
      return { text: 'Due Today', isUrgent: true };
    } else if (diffDays <= 2) {
      return { text: `Due in ${diffDays}d`, isUrgent: true };
    } else {
      return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isUrgent: false };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Filter & Action Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search tasks, descriptions, or assignees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          {/* Department Filter (Visible if multiple departments accessible) */}
          {departments.length > 1 && (
            <select
              className="input-field"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              style={{ width: 'auto', minWidth: '180px' }}
            >
              <option value="all">All Committees ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          )}

          {/* Priority Filter */}
          <select
            className="input-field"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* My Tasks Only Toggle */}
          <button
            onClick={() => setOnlyMyTasks(!onlyMyTasks)}
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${onlyMyTasks ? 'var(--google-blue)' : 'var(--border-subtle)'}`,
              background: onlyMyTasks ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: onlyMyTasks ? '#93C5FD' : 'var(--text-secondary)',
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)',
            }}
          >
            <User size={15} />
            <span>My Tasks</span>
          </button>
        </div>

        {/* Task Counter and Create Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredTasks.length}</strong> tasks
          </span>

          {isLeadership && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.88rem',
              }}
            >
              <Plus size={16} />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 4-Column Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '1.25rem',
          alignItems: 'flex-start',
        }}
      >
        {COLUMNS.map((col) => {
          const colTasks = tasksByColumn[col.id] || [];
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minHeight: '540px',
                background: 'rgba(19, 27, 46, 0.55)',
                borderTop: `3px solid ${col.accentColor}`,
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <ColIcon size={18} color={col.accentColor} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {col.label}
                  </h3>
                </div>

                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: `${col.accentColor}25`,
                    color: col.accentColor,
                    border: `1px solid ${col.accentColor}40`,
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Task Cards Column Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', flex: 1 }}>
                {colTasks.length === 0 ? (
                  <div
                    style={{
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      margin: 'auto 0',
                    }}
                  >
                    <ColIcon size={24} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    <span>No tasks in {col.label.toLowerCase()}</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const priorityBadge = getPriorityBadge(task.priority);
                    const deadlineInfo = formatDeadline(task.deadline);
                    const isRejected = task.status === 'rejected';
                    const isDelegated = task.status === 'delegated';

                    return (
                      <div
                        key={task.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.035)',
                          border: `1px solid ${isRejected ? 'rgba(234, 67, 53, 0.4)' : isDelegated ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)'}`,
                          borderRadius: 'var(--radius-md)',
                          padding: '1.1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          transition: 'var(--transition-smooth)',
                          position: 'relative',
                        }}
                        className="glass-panel"
                      >
                        {/* Card Top Row: Committee & Priority */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'var(--text-secondary)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                            }}
                          >
                            {task.departments?.name || 'General'}
                          </span>

                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {isDelegated && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(168, 85, 247, 0.2)',
                                  color: '#C084FC',
                                  border: '1px solid rgba(168, 85, 247, 0.4)',
                                }}
                              >
                                Delegated
                              </span>
                            )}
                            {task.assignment_mode === 'broadcast' && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(66, 133, 244, 0.2)',
                                  color: '#93C5FD',
                                  border: '1px solid rgba(66, 133, 244, 0.4)',
                                }}
                              >
                                Broadcast
                              </span>
                            )}
                            {isRejected && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(234, 67, 53, 0.2)',
                                  color: '#F87171',
                                  border: '1px solid rgba(234, 67, 53, 0.4)',
                                }}
                              >
                                Rejected
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: priorityBadge.bg,
                                color: priorityBadge.color,
                                border: `1px solid ${priorityBadge.border}`,
                              }}
                            >
                              {priorityBadge.label}
                            </span>
                          </div>
                        </div>
                        {/* Title & Description */}
                        <div>
                          <Link
                            href={`/tasks/${task.id}${mockQuery}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <h4
                              style={{
                                fontSize: '0.98rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                margin: 0,
                                marginBottom: '0.35rem',
                                lineHeight: 1.4,
                                cursor: 'pointer',
                              }}
                            >
                              {task.title}
                            </h4>
                          </Link>
                          {task.description && (
                            <p
                              style={{
                                fontSize: '0.83rem',
                                color: 'var(--text-secondary)',
                                margin: 0,
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Card Bottom Row: Assignee & Deadline */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '0.35rem',
                            paddingTop: '0.65rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          {/* Assignee */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {task.assignee?.avatar_url ? (
                              <img
                                src={task.assignee.avatar_url}
                                alt={task.assignee.full_name}
                                style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  background: 'rgba(66, 133, 244, 0.2)',
                                  color: '#93C5FD',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                {task.assignee?.full_name ? task.assignee.full_name.charAt(0) : '?'}
                              </div>
                            )}
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {task.assignee?.full_name || 'Unassigned'}
                            </span>
                          </div>

                          {/* Deadline */}
                          {deadlineInfo && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.75rem',
                                color: deadlineInfo.isUrgent ? '#F87171' : 'var(--text-muted)',
                                fontWeight: deadlineInfo.isUrgent ? 700 : 500,
                              }}
                            >
                              <Calendar size={13} />
                              <span>{deadlineInfo.text}</span>
                            </div>
                          )}
                        </div>

                        {/* Task Action Buttons based on status */}
                        {task.status === 'todo' && (
                          <button
                            onClick={() => handleStartTask(task)}
                            disabled={loadingTaskId === task.id}
                            style={{
                              marginTop: '0.4rem',
                              padding: '0.45rem 0.85rem',
                              background: 'rgba(66, 133, 244, 0.1)',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#93C5FD',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              cursor: 'pointer',
                              width: '100%',
                            }}
                          >
                            <Play size={13} />
                            <span>{loadingTaskId === task.id ? 'Starting...' : 'Start Task'}</span>
                          </button>
                        )}

                        {(task.status === 'in_progress' || task.status === 'rejected') && (
                          <button
                            onClick={() => setSelectedTaskForReview(task)}
                            style={{
                              marginTop: '0.4rem',
                              padding: '0.45rem 0.85rem',
                              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(66, 133, 244, 0.15))',
                              border: '1px solid rgba(168, 85, 247, 0.35)',
                              borderRadius: 'var(--radius-sm)',
                              color: '#D8B4FE',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              cursor: 'pointer',
                              width: '100%',
                            }}
                          >
                            <Send size={13} />
                            <span>Submit for Review</span>
                          </button>
                        )}

                        {task.status === 'done' && (
                          <div
                            style={{
                              marginTop: '0.4rem',
                              padding: '0.35rem 0.65rem',
                              background: 'rgba(52, 168, 83, 0.1)',
                              border: '1px solid rgba(52, 168, 83, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.4rem',
                              fontSize: '0.76rem',
                              color: '#4ADE80',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Verified Deliverable</span>
                          </div>
                        )}

                        {/* Approval Stage Indicator for tasks in review */}
                        {task.status === 'review' && task.approval_instance_id && (
                          <div
                            style={{
                              marginTop: '0.2rem',
                              padding: '0.45rem 0.75rem',
                              background: 'rgba(168, 85, 247, 0.1)',
                              border: '1px solid rgba(168, 85, 247, 0.25)',
                              borderRadius: 'var(--radius-sm)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.78rem',
                              color: '#C084FC',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                              <ShieldCheck size={14} />
                              <span>In Governance Review</span>
                            </span>
                            <Link
                              href={`/tasks/${task.id}${mockQuery}`}
                              style={{ color: '#E9D5FF', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 700 }}
                            >
                              <span>View Tracker</span>
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        )}

                        {/* Direct link to detail page */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.1rem' }}>
                          <Link
                            href={`/tasks/${task.id}${mockQuery}`}
                            style={{
                              fontSize: '0.74rem',
                              color: 'var(--text-muted)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                            }}
                          >
                            <span>Task Details</span>
                            <ChevronRight size={12} />
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal (Leadership only) */}
      {isLeadership && (
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          departments={departments}
          defaultDeptId={selectedDeptId !== 'all' ? selectedDeptId : (userDepartmentId || departments[0]?.id)}
          members={members}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [newTask, ...prev]);
          }}
          isPresidentOrBranchHead={['president', 'co_president', 'branch_head'].includes(currentUserRole)}
        />
      )}

      {/* Submit for Review Modal */}
      <SubmitForReviewModal
        task={selectedTaskForReview}
        isOpen={!!selectedTaskForReview}
        onClose={() => setSelectedTaskForReview(null)}
        onSuccess={(updatedTask) => {
          setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
        }}
      />
    </div>
  );
}
