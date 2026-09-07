'use client';

import { useState } from 'react';
import { createEventDraft, CreateEventDraftInput, EventTaskDraftInput } from '@/app/events/actions';
import { EventRegistrationField, EventOwner, TaskPriority, TaskAssignmentMode } from '@/types';
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  Loader2,
  Sparkles,
  ChevronRight,
  CheckSquare
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

interface EventBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event: any) => void;
  departments: DepartmentOption[];
  members: MemberOption[];
  defaultDepartmentId?: string;
}

export function EventBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  departments,
  members,
  defaultDepartmentId,
}: EventBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState<'basics' | 'owners' | 'fields' | 'tasks'>('basics');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(100);
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || departments[0]?.id || '');

  // Owners State
  const [owners, setOwners] = useState<EventOwner[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Event Lead');

  // Registration Fields State
  const [registrationFields, setRegistrationFields] = useState<EventRegistrationField[]>([]);

  // Event Tasks State (Step 8.2)
  const [initialTasks, setInitialTasks] = useState<EventTaskDraftInput[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDeptId, setNewTaskDeptId] = useState(departmentId);
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskMode, setNewTaskMode] = useState<TaskAssignmentMode>('single');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');

  if (!isOpen) return null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u0600-\u06FF\-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  };

  const handleAddOwner = () => {
    if (!selectedMemberId) return;
    if (owners.some(o => o.profile_id === selectedMemberId)) return;

    const mem = members.find(m => m.id === selectedMemberId);
    if (!mem) return;

    setOwners([
      ...owners,
      {
        profile_id: mem.id,
        committee_role: selectedRole,
        full_name: mem.full_name_en || mem.full_name,
        email: mem.email,
        avatar_url: mem.avatar_url,
      },
    ]);
    setSelectedMemberId('');
  };

  const handleRemoveOwner = (profileId: string) => {
    setOwners(owners.filter(o => o.profile_id !== profileId));
  };

  const handleAddField = () => {
    const newField: EventRegistrationField = {
      id: `field_${Date.now()}`,
      label: '',
      field_type: 'text',
      options: [],
      required: false,
      placeholder: '',
    };
    setRegistrationFields([...registrationFields, newField]);
  };

  const handleUpdateField = (index: number, updates: Partial<EventRegistrationField>) => {
    const updated = [...registrationFields];
    updated[index] = { ...updated[index], ...updates };
    setRegistrationFields(updated);
  };

  const handleRemoveField = (index: number) => {
    setRegistrationFields(registrationFields.filter((_, idx) => idx !== index));
  };

  const handleAddInitialTask = () => {
    if (!newTaskTitle.trim()) return;
    setInitialTasks([
      ...initialTasks,
      {
        title: newTaskTitle.trim(),
        departmentId: newTaskDeptId || departmentId,
        priority: newTaskPriority,
        assignmentMode: newTaskMode,
        assigneeId: newTaskMode === 'single' ? (newTaskAssigneeId || null) : null,
        deadline: newTaskDeadline || undefined,
      },
    ]);
    setNewTaskTitle('');
    setNewTaskAssigneeId('');
    setNewTaskDeadline('');
  };

  const handleRemoveInitialTask = (index: number) => {
    setInitialTasks(initialTasks.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter an event title.');
      setCurrentStep('basics');
      return;
    }

    if (!eventDate) {
      setErrorMessage('Please choose an event date.');
      setCurrentStep('basics');
      return;
    }

    if (!departmentId) {
      setErrorMessage('Please select the hosting committee.');
      setCurrentStep('basics');
      return;
    }

    try {
      setIsSubmitting(true);
      const input: CreateEventDraftInput = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        venue: venue.trim() || undefined,
        eventDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        capacity: capacity ? Number(capacity) : null,
        departmentId,
        owners,
        registrationFields,
        tasks: initialTasks,
      };

      const result = await createEventDraft(input);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to save event draft.');
      } else {
        onSuccess(result.event);
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error creating event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 13, 0.82)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.5rem',
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}>
          {/* Top Google Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }} />

          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={20} color="var(--google-blue)" />
              <span>Create Event Draft</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              Configure event logistics, assign committee leads, and define registration questions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0.5rem 1.5rem',
          gap: '0.5rem',
          overflowX: 'auto',
        }}>
          <button
            type="button"
            onClick={() => setCurrentStep('basics')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: currentStep === 'basics' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
              color: currentStep === 'basics' ? '#93C5FD' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Calendar size={15} />
            <span>1. Logistics</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep('owners')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: currentStep === 'owners' ? 'rgba(52, 168, 83, 0.15)' : 'transparent',
              color: currentStep === 'owners' ? '#86EFAC' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <Users size={15} />
            <span>2. Leads ({owners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep('fields')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: currentStep === 'fields' ? 'rgba(251, 188, 4, 0.15)' : 'transparent',
              color: currentStep === 'fields' ? '#FDE047' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <HelpCircle size={15} />
            <span>3. Questions ({registrationFields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentStep('tasks')}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: currentStep === 'tasks' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              color: currentStep === 'tasks' ? '#D8B4FE' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckSquare size={15} />
            <span>4. Tasks ({initialTasks.length})</span>
          </button>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'rgba(234, 67, 53, 0.12)',
              border: '1px solid rgba(234, 67, 53, 0.3)',
              color: '#FCA5A5',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
            }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Details & Logistics */}
          {currentStep === 'basics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  EVENT TITLE *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="e.g. Google Cloud & Generative AI Workshop 2026"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    outline: 'none',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    PUBLIC URL SLUG *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <span style={{ padding: '0 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderRight: '1px solid var(--border-subtle)' }}>
                      /events/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="event-slug"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        color: '#93C5FD',
                        fontSize: '0.88rem',
                        outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    HOSTING COMMITTEE *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.branch.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    EVENT DATE *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    START TIME
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    END TIME
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    VENUE / LOCATION
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. Hall 3, Faculty of Engineering / Google Meet"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    MAX ATTENDEE CAPACITY
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 150"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  EVENT DESCRIPTION & AGENDA
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the topics, keynote speakers, prerequisites, and goals of this event..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Event Owners & Roles */}
          {currentStep === 'owners' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Assign Event Stakeholders & Leads</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 1rem' }}>
                  Assign committee members responsible for leading execution, speakers, technical setup, and logistics.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Choose Chapter Member --</option>
                    {members.map((mem) => (
                      <option key={mem.id} value={mem.id}>
                        {mem.full_name_en || mem.full_name} ({mem.email})
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    style={{
                      width: '180px',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Event Lead">Event Lead</option>
                    <option value="Technical Speaker">Technical Speaker</option>
                    <option value="Logistics & Venue">Logistics & Venue</option>
                    <option value="PR & Outreach">PR & Outreach</option>
                    <option value="Media & Coverage">Media & Coverage</option>
                    <option value="Check-in Coordinator">Check-in Coordinator</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleAddOwner}
                    disabled={!selectedMemberId}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.65rem 1rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Lead</span>
                  </button>
                </div>
              </div>

              {/* Owners List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  CURRENT EVENT LEADS ({owners.length})
                </span>

                {owners.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                  }}>
                    No additional leads added yet. (You will automatically be recorded as the Event Creator).
                  </div>
                ) : (
                  owners.map((owner) => (
                    <div
                      key={owner.profile_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(66, 133, 244, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: 'var(--google-blue)',
                        }}>
                          {owner.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FFFFFF' }}>
                            {owner.full_name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {owner.email}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          color: '#86EFAC',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                        }}>
                          {owner.committee_role}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveOwner(owner.profile_id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#F87171',
                            cursor: 'pointer',
                            padding: '0.3rem',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Custom Registration Fields */}
          {currentStep === 'fields' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Custom Registration Form Questions</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                    Attendee Name, Email, and Phone are collected automatically. Add custom questions below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddField}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', fontSize: '0.85rem', borderColor: 'rgba(66, 133, 244, 0.4)' }}
                >
                  <Plus size={15} color="var(--google-blue)" />
                  <span>Add Question</span>
                </button>
              </div>

              {/* List of Custom Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {registrationFields.length === 0 ? (
                  <div style={{
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '12px',
                    color: 'var(--text-muted)',
                  }}>
                    <HelpCircle size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.6 }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Standard Registration Only
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      No custom questions defined. Click "Add Question" above if you need specific details like GitHub URLs, t-shirt sizes, or experience levels.
                    </div>
                  </div>
                ) : (
                  registrationFields.map((field, idx) => (
                    <div
                      key={field.id}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--google-blue)' }}>
                          QUESTION #{idx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#F87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.8rem',
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>QUESTION LABEL</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, { label: e.target.value })}
                            placeholder="e.g. GitHub Profile URL or T-Shirt Size"
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              color: '#FFFFFF',
                              fontSize: '0.88rem',
                              outline: 'none',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>FIELD TYPE</label>
                          <select
                            value={field.field_type}
                            onChange={(e) => handleUpdateField(idx, { field_type: e.target.value as any })}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              color: '#FFFFFF',
                              fontSize: '0.88rem',
                              outline: 'none',
                            }}
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Paragraph / Long Text</option>
                            <option value="number">Number</option>
                            <option value="select">Dropdown Select</option>
                            <option value="checkbox">Single Checkbox (Yes/No)</option>
                          </select>
                        </div>
                      </div>

                      {field.field_type === 'select' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                            DROPDOWN OPTIONS (comma separated)
                          </label>
                          <input
                            type="text"
                            value={(field.options || []).join(', ')}
                            onChange={(e) => handleUpdateField(idx, {
                              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                            })}
                            placeholder="Option 1, Option 2, Option 3"
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              color: '#FFFFFF',
                              fontSize: '0.88rem',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          id={`req_${field.id}`}
                          checked={field.required}
                          onChange={(e) => handleUpdateField(idx, { required: e.target.checked })}
                          style={{ accentColor: 'var(--google-blue)', cursor: 'pointer' }}
                        />
                        <label htmlFor={`req_${field.id}`} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                          Required answer for registration
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Event Tasks (Step 8.2) */}
          {currentStep === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Attach Event Tasks</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 1rem' }}>
                  Pre-seed operational and technical tasks linked to this event (e.g. slides, venue booking, check-in duty).
                </p>

                <div style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>TASK TITLE *</label>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="e.g. Prepare presentation slides & live demo"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>COMMITTEE</label>
                      <select
                        value={newTaskDeptId}
                        onChange={(e) => setNewTaskDeptId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
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
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>PRIORITY</label>
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
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

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>MODE</label>
                      <select
                        value={newTaskMode}
                        onChange={(e) => setNewTaskMode(e.target.value as TaskAssignmentMode)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      >
                        <option value="single">Single Assignee</option>
                        <option value="broadcast">Broadcast to Committee 📢</option>
                      </select>
                    </div>

                    {newTaskMode === 'single' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ASSIGNEE</label>
                        <select
                          value={newTaskAssigneeId}
                          onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-subtle)',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            outline: 'none',
                          }}
                        >
                          <option value="">-- Unassigned --</option>
                          {members
                            .filter(m => !newTaskDeptId || m.department_id === newTaskDeptId)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name_en || m.full_name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>DEADLINE</label>
                      <input
                        type="date"
                        value={newTaskDeadline}
                        onChange={(e) => setNewTaskDeadline(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-subtle)',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={handleAddInitialTask}
                      disabled={!newTaskTitle.trim()}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                    >
                      <Plus size={14} />
                      <span>Add to Event Task List</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Initial Tasks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  TASKS TO CREATE WITH EVENT ({initialTasks.length})
                </span>

                {initialTasks.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--text-muted)',
                    fontSize: '0.88rem',
                  }}>
                    No tasks added to draft yet. You can also add tasks anytime from the Event details page after saving.
                  </div>
                ) : (
                  initialTasks.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <CheckSquare size={16} color="var(--google-blue)" />
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#FFFFFF' }}>{t.title}</span>
                        {t.assignmentMode === 'broadcast' && (
                          <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#D8B4FE' }}>
                            Broadcast 📢
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                          {t.priority} priority
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInitialTask(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#F87171', cursor: 'pointer', padding: '0.2rem' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.2)',
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary"
            style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem' }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentStep !== 'tasks' && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'basics') setCurrentStep('owners');
                  else if (currentStep === 'owners') setCurrentStep('fields');
                  else if (currentStep === 'fields') setCurrentStep('tasks');
                }}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.88rem' }}
              >
                <span>Next Step</span>
                <ChevronRight size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.5rem',
                fontSize: '0.88rem',
                background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Draft...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save as Draft</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
