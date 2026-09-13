'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Event, EventRegistrationField } from '@/types';
import { updateEventDetails, UpdateEventInput } from '@/app/events/actions';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  FileText, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle,
  Sparkles,
  Loader2
} from 'lucide-react';

interface EditEventModalProps {
  event: Event;
  departments: Array<{ id: string; name: string; code?: string; branch?: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export function EditEventModal({
  event,
  departments,
  isOpen,
  onClose,
}: EditEventModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'registration'>('general');

  // Form State
  const [title, setTitle] = useState(event.title || '');
  const [slug, setSlug] = useState(event.slug || '');
  const [description, setDescription] = useState(event.description || '');
  const [venue, setVenue] = useState(event.venue || '');
  const [eventDate, setEventDate] = useState(event.event_date || '');
  const [startTime, setStartTime] = useState(event.start_time || '');
  const [endTime, setEndTime] = useState(event.end_time || '');
  const [capacity, setCapacity] = useState<string>(event.capacity ? String(event.capacity) : '');
  const [departmentId, setDepartmentId] = useState(event.department_id || '');
  const [registrationFields, setRegistrationFields] = useState<EventRegistrationField[]>(
    Array.isArray(event.registration_fields) ? event.registration_fields : []
  );

  if (!isOpen || !mounted) return null;

  // Add custom question
  const handleAddField = () => {
    const newField: EventRegistrationField = {
      id: `field_${Date.now()}`,
      label: '',
      field_type: 'text',
      required: false,
    };
    setRegistrationFields([...registrationFields, newField]);
  };

  const handleUpdateField = (index: number, key: keyof EventRegistrationField, value: any) => {
    const updated = [...registrationFields];
    updated[index] = { ...updated[index], [key]: value };
    setRegistrationFields(updated);
  };

  const handleRemoveField = (index: number) => {
    setRegistrationFields(registrationFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: UpdateEventInput = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        venue: venue.trim() || undefined,
        eventDate,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        capacity: capacity ? Number(capacity) : null,
        departmentId: departmentId || undefined,
        registrationFields,
      };

      const res = await updateEventDetails(event.id, payload);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update event details.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Event updated successfully!');
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        router.refresh();
      }, 750);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-blue)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                Edit Event Details
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Update title, timing, venue, registration questions, and capacity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '0 1.75rem',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2.5px solid var(--google-blue)' : '2.5px solid transparent',
              color: activeTab === 'general' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: activeTab === 'general' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            General & Venue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'schedule' ? '2.5px solid var(--google-blue)' : '2.5px solid transparent',
              color: activeTab === 'schedule' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: activeTab === 'schedule' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Schedule & Capacity
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('registration')}
            style={{
              padding: '0.85rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'registration' ? '2.5px solid var(--google-blue)' : '2.5px solid transparent',
              color: activeTab === 'registration' ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: activeTab === 'registration' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Custom Registration Questions ({registrationFields.length})
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(234, 67, 53, 0.12)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  color: '#FCA5A5',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertCircle size={16} color="var(--google-red)" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(52, 168, 83, 0.12)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#86EFAC',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Check size={16} color="var(--google-green)" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Event Title <span style={{ color: 'var(--google-red)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Next.js & AI Web Dev Workshop"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g., ai-workshop-2026"
                      className="input-field"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Host Committee (Department)
                    </label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="">Select Committee</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Venue / Location
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g., Campus Main Hall / Google Meet link"
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '2.4rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Description & Overview
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide event overview, topics covered, agenda, and expectations..."
                    className="input-field"
                    style={{ width: '100%', resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: SCHEDULE & CAPACITY */}
            {activeTab === 'schedule' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Event Date <span style={{ color: 'var(--google-red)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '2.4rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Start Time
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', paddingLeft: '2.4rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      End Time
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Clock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', paddingLeft: '2.4rem' }}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Attendee Capacity Limit
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Users size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="number"
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      placeholder="Leave empty for unlimited capacity"
                      className="input-field"
                      style={{ width: '100%', paddingLeft: '2.4rem' }}
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                    When capacity is reached, new registrations automatically enter the Waitlist.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTRATION QUESTIONS */}
            {activeTab === 'registration' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    Add questions attendees must answer upon registering.
                  </span>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                  >
                    <Plus size={14} />
                    <span>Add Question</span>
                  </button>
                </div>

                {registrationFields.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No custom registration questions configured. Standard questions (Full Name, Email, Phone) are asked by default.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {registrationFields.map((field, idx) => (
                      <div
                        key={field.id || idx}
                        style={{
                          padding: '1rem',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateField(idx, 'label', e.target.value)}
                            placeholder={`Question #${idx + 1} (e.g. Which programming track are you interested in?)`}
                            className="input-field"
                            style={{ flex: 1 }}
                          />

                          <select
                            value={field.field_type}
                            onChange={(e) => handleUpdateField(idx, 'field_type', e.target.value as any)}
                            className="input-field"
                            style={{ width: '130px' }}
                          >
                            <option value="text">Short Text</option>
                            <option value="textarea">Long Text</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="number">Number</option>
                            <option value="select">Select</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRemoveField(idx)}
                            style={{
                              background: 'rgba(234, 67, 53, 0.1)',
                              border: 'none',
                              color: 'var(--google-red)',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                            }}
                            title="Delete question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateField(idx, 'required', e.target.checked)}
                          />
                          <span>Required question (attendees cannot register without answering)</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ padding: '0.6rem 1.25rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
