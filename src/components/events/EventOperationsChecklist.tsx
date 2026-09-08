'use client';

import React, { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Check,
  ChevronDown,
  X,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  OperationsItem,
  EventOperationsSummary,
  toggleOperationsItem,
  addOperationsItem,
  deleteOperationsItem,
  seedDefaultOperationsChecklist,
  getEventOperationsChecklist,
} from '@/app/events/operations-actions';

interface EventOperationsChecklistProps {
  eventId: string;
  eventTitle: string;
  initialSummary: EventOperationsSummary;
  availableMembers?: Array<{
    id: string;
    full_name: string;
    role?: string;
  }>;
  canManage: boolean;
}

export function EventOperationsChecklist({
  eventId,
  eventTitle,
  initialSummary,
  availableMembers = [],
  canManage,
}: EventOperationsChecklistProps) {
  const [items, setItems] = useState<OperationsItem[]>(initialSummary.items);
  const [activePhase, setActivePhase] = useState<'all' | 'before' | 'during' | 'after'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New item form state
  const [newTaskName, setNewTaskName] = useState('');
  const [newPhase, setNewPhase] = useState<'before' | 'during' | 'after'>('before');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle item status with optimistic update
  const handleToggle = async (item: OperationsItem) => {
    const nextStatus = !item.is_completed;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              is_completed: nextStatus,
              completed_at: nextStatus ? new Date().toISOString() : null,
            }
          : i
      )
    );

    const res = await toggleOperationsItem(item.id, nextStatus);
    if (!res.success) {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_completed: item.is_completed } : i))
      );
      showToast('error', res.error || 'Failed to update item');
    } else {
      showToast('success', nextStatus ? 'Task completed!' : 'Task uncompleted');
    }
  };

  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await addOperationsItem(eventId, {
        task_name: newTaskName.trim(),
        phase: newPhase,
        assigned_to: newAssignedTo || null,
        notes: newNotes.trim() || null,
      });

      if (res.success && res.item) {
        setItems((prev) => [...prev, res.item!]);
        setShowAddModal(false);
        setNewTaskName('');
        setNewNotes('');
        setNewAssignedTo('');
        showToast('success', 'Operations task added');
      } else {
        showToast('error', res.error || 'Failed to add task');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Item
  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this operations checklist item?')) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    const res = await deleteOperationsItem(itemId);
    if (!res.success) {
      showToast('error', res.error || 'Failed to delete item');
    } else {
      showToast('success', 'Operations task removed');
    }
  };

  // Seed Default Template
  const handleSeed = async () => {
    if (!confirm('Seed standard Operations checklist (20 tasks across Before, During & After)?')) return;
    setIsSeeding(true);
    try {
      const res = await seedDefaultOperationsChecklist(eventId);
      if (res.success) {
        const fresh = await getEventOperationsChecklist(eventId);
        setItems(fresh.items);
        showToast('success', `Added ${res.count} default operations tasks!`);
      } else {
        showToast('error', res.error || 'Failed to seed template');
      }
    } finally {
      setIsSeeding(false);
    }
  };

  // Dynamic Statistics
  const total = items.length;
  const completed = items.filter((i) => i.is_completed).length;
  const overallPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  const beforeItems = items.filter((i) => i.phase === 'before');
  const duringItems = items.filter((i) => i.phase === 'during');
  const afterItems = items.filter((i) => i.phase === 'after');

  const beforeComp = beforeItems.filter((i) => i.is_completed).length;
  const duringComp = duringItems.filter((i) => i.is_completed).length;
  const afterComp = afterItems.filter((i) => i.is_completed).length;

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchPhase = activePhase === 'all' || item.phase === activePhase;
    const matchQuery =
      !searchQuery.trim() ||
      item.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.assigned_profile && item.assigned_profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchPhase && matchQuery;
  });

  return (
    <div
      id="event-operations-checklist-section"
      className="glass-panel"
      style={{
        padding: '2rem',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: toastMessage.type === 'success' ? 'rgba(52,168,83,0.95)' : 'rgba(234,67,53,0.95)',
            color: '#fff',
            padding: '0.55rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardList size={22} color="#FBBC04" />
            Operations Event Control Checklists
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Structured on-ground logistical control across <strong style={{ color: '#8ab4f8' }}>Before</strong>, <strong style={{ color: '#FBBC04' }}>During</strong>, and <strong style={{ color: '#34A853' }}>After</strong> event phases (Spec §4.9)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {canManage && items.length === 0 && (
            <button
              id="ops-seed-btn"
              onClick={handleSeed}
              disabled={isSeeding}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(251, 188, 4, 0.12)',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 0.9rem',
                color: '#fdd663',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: isSeeding ? 'not-allowed' : 'pointer',
              }}
            >
              {isSeeding ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
              Seed Standard Operations Template
            </button>
          )}

          {canManage && (
            <button
              id="ops-add-task-btn"
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'var(--google-blue)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
              }}
            >
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Progress Cards per Phase */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* Overall Progress */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Overall Readiness
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: overallPercentage === 100 ? '#34A853' : '#8ab4f8' }}>
              {overallPercentage}%
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${overallPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4285F4, #34A853)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {completed} of {total} operations tasks completed
          </div>
        </div>

        {/* Before (Pre-Event) */}
        <div
          onClick={() => setActivePhase('before')}
          style={{
            background: activePhase === 'before' ? 'rgba(66, 133, 244, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activePhase === 'before' ? 'rgba(66, 133, 244, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#8ab4f8', fontWeight: 700 }}>1. BEFORE (PREP)</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#8ab4f8' }}>
              {beforeComp}/{beforeItems.length}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${beforeItems.length > 0 ? (beforeComp / beforeItems.length) * 100 : 0}%`,
                height: '100%',
                background: '#4285F4',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* During (Execution) */}
        <div
          onClick={() => setActivePhase('during')}
          style={{
            background: activePhase === 'during' ? 'rgba(251, 188, 4, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activePhase === 'during' ? 'rgba(251, 188, 4, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#FBBC04', fontWeight: 700 }}>2. DURING (ON-GROUND)</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FBBC04' }}>
              {duringComp}/{duringItems.length}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${duringItems.length > 0 ? (duringComp / duringItems.length) * 100 : 0}%`,
                height: '100%',
                background: '#FBBC04',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* After (Teardown & Wrap-up) */}
        <div
          onClick={() => setActivePhase('after')}
          style={{
            background: activePhase === 'after' ? 'rgba(52, 168, 83, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${activePhase === 'after' ? 'rgba(52, 168, 83, 0.4)' : 'var(--border-subtle)'}`,
            borderRadius: '12px',
            padding: '1rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#34A853', fontWeight: 700 }}>3. AFTER (WRAP-UP)</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34A853' }}>
              {afterComp}/{afterItems.length}
            </span>
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${afterItems.length > 0 ? (afterComp / afterItems.length) * 100 : 0}%`,
                height: '100%',
                background: '#34A853',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Phase Pill Selector */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.3rem', borderRadius: '10px' }}>
          {(
            [
              { key: 'all', label: 'All Tasks', count: total },
              { key: 'before', label: 'Before', count: beforeItems.length },
              { key: 'during', label: 'During', count: duringItems.length },
              { key: 'after', label: 'After', count: afterItems.length },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActivePhase(t.key)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                background: activePhase === t.key ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activePhase === t.key ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: activePhase === t.key ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>{t.label}</span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '10px',
                  background: activePhase === t.key ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  color: activePhase === t.key ? '#fff' : 'var(--text-muted)',
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '240px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '32px',
              paddingRight: '10px',
              paddingTop: '0.4rem',
              paddingBottom: '0.4rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Checklist Items List */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
          <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>No operations checklist tasks found</div>
          <p style={{ fontSize: '0.82rem', margin: '0.35rem 0 1rem' }}>
            {items.length === 0
              ? 'Get started by seeding the standard Operations checklist or creating a task.'
              : 'Try changing your search or phase filter.'}
          </p>
          {canManage && items.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              style={{
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                color: '#fdd663',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✨ Seed 20 Standard Tasks
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {filteredItems.map((item) => {
            const phaseColor =
              item.phase === 'before' ? '#8ab4f8' : item.phase === 'during' ? '#FBBC04' : '#34A853';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '10px',
                  background: item.is_completed ? 'rgba(52, 168, 83, 0.04)' : 'rgba(255, 255, 255, 0.025)',
                  border: `1px solid ${item.is_completed ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.07)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Toggle Checkbox Button */}
                <button
                  onClick={() => handleToggle(item)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                  }}
                  title={item.is_completed ? 'Mark uncompleted' : 'Mark as completed'}
                >
                  {item.is_completed ? (
                    <CheckCircle2 size={20} color="#34A853" />
                  ) : (
                    <Circle size={20} color="var(--text-muted)" />
                  )}
                </button>

                {/* Content Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: item.is_completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: item.is_completed ? 'line-through' : 'none',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.task_name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    {/* Phase Badge */}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '4px',
                        background: `rgba(${phaseColor.includes('8ab4') ? '66,133,244' : phaseColor.includes('FBBC') ? '251,188,4' : '52,168,83'}, 0.12)`,
                        color: phaseColor,
                      }}
                    >
                      {item.phase}
                    </span>

                    {/* Assigned To */}
                    {item.assigned_profile ? (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: '#8ab4f8',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'rgba(66, 133, 244, 0.08)',
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Users size={11} /> {item.assigned_profile.full_name}
                      </span>
                    ) : null}

                    {/* Notes */}
                    {item.notes && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        • {item.notes}
                      </span>
                    )}

                    {/* Completion details */}
                    {item.is_completed && item.completed_at && (
                      <span style={{ fontSize: '0.7rem', color: '#81c995', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                        <Check size={12} /> Done {new Date(item.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete button */}
                {canManage && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      borderRadius: '6px',
                    }}
                    title="Delete task"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--google-blue)" />
                Add Operations Task
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Task Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Task Name <span style={{ color: 'var(--google-red)' }}>*</span>
                </label>
                <input
                  id="ops-task-name-input"
                  type="text"
                  placeholder="e.g., Verify wireless mics & presentation clicker"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Phase Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Phase
                </label>
                <select
                  id="ops-phase-select"
                  value={newPhase}
                  onChange={(e) => setNewPhase(e.target.value as any)}
                  style={{ width: '100%' }}
                >
                  <option value="before">1. Before Event (Planning & Prep)</option>
                  <option value="during">2. During Event (On-Ground Coordination)</option>
                  <option value="after">3. After Event (Teardown & Wrap-up)</option>
                </select>
              </div>

              {/* Assignee Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Assigned Volunteer / Member
                </label>
                <select
                  id="ops-assignee-select"
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">Unassigned</option>
                  {availableMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} {m.role ? `(${m.role.replace('_', ' ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Notes / Instructions (Optional)
                </label>
                <textarea
                  placeholder="Specific requirements, contact persons, or logistics details..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="ops-submit-btn"
                  type="submit"
                  disabled={isSubmitting || !newTaskName.trim()}
                  style={{
                    padding: '0.6rem 1.3rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--google-blue)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
                  }}
                >
                  {isSubmitting ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
