'use client';

import React, { useState, useTransition } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  ShieldCheck,
  Check,
  Search,
  Sparkles,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  Globe,
  Plus
} from 'lucide-react';
import { createTeamMeeting, CreateTeamMeetingInput } from '@/app/meetings/actions';
import { DepartmentBranch, TeamMeetingAudienceType, TeamMeetingType } from '@/types';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
  branch: DepartmentBranch;
}

interface MemberOption {
  id: string;
  full_name: string;
  role: string;
  department_id: string | null;
  email: string;
  avatar_url: string | null;
}

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meetingId: string) => void;
  departments: DepartmentOption[];
  members: MemberOption[];
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  departments,
  members,
}: ScheduleMeetingModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [meetingType, setMeetingType] = useState<TeamMeetingType>('online');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [location, setLocation] = useState('');

  // Audience
  const [audienceType, setAudienceType] = useState<TeamMeetingAudienceType>('all_team');
  const [targetBranch, setTargetBranch] = useState<DepartmentBranch>('tech');
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>(
    departments[0]?.id || ''
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  // Facilitator & Agenda
  const [facilitatorId, setFacilitatorId] = useState<string>('');
  const [agenda, setAgenda] = useState('');

  if (!isOpen) return null;

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }
    if (!meetingDate) {
      setError('Meeting date is required.');
      return;
    }
    if (!startTime) {
      setError('Start time is required.');
      return;
    }
    if (meetingType === 'online' && !onlineMeetingUrl.trim()) {
      setError('Please provide the online meeting link (Google Meet / Zoom).');
      return;
    }
    if (meetingType === 'offline' && !location.trim()) {
      setError('Please specify the physical location or room.');
      return;
    }
    if (audienceType === 'department' && !targetDepartmentId) {
      setError('Please choose a committee/department.');
      return;
    }
    if (audienceType === 'selected_members' && selectedMemberIds.length === 0) {
      setError('Please select at least one team member.');
      return;
    }

    const payload: CreateTeamMeetingInput = {
      title: title.trim(),
      description: description.trim() || null,
      meetingDate,
      startTime,
      endTime: endTime || null,
      type: meetingType,
      onlineMeetingUrl: meetingType === 'online' ? onlineMeetingUrl.trim() : null,
      location: meetingType === 'offline' ? location.trim() : null,
      targetAudienceType: audienceType,
      targetBranch: audienceType === 'branch' ? targetBranch : null,
      targetDepartmentId: audienceType === 'department' ? targetDepartmentId : null,
      selectedMemberIds: audienceType === 'selected_members' ? selectedMemberIds : undefined,
      facilitatorId: facilitatorId || null,
      agenda: agenda.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await createTeamMeeting(payload);
        if (res.success && res.meetingId) {
          onSuccess(res.meetingId);
          onClose();
        } else {
          setError(res.error || 'Failed to schedule meeting.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      }
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(66, 133, 244, 0.15)',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Google Colors Header */}
        <div
          style={{
            height: '5px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '1.5rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(66, 133, 244, 0.15)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} color="#60A5FA" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Schedule Team Meeting
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>
                Official internal meeting for Chapter Leadership and Committees
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.35)',
                color: '#FCA5A5',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.4rem' }}>
              Meeting Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Technical Branch Sync / Core Leadership Review"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.4rem' }}>
              Description / Objective
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of the meeting's purpose..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Date, Start Time & End Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                Date *
              </label>
              <input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Meeting Mode: Online vs Offline */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.75rem' }}>
              Meeting Format *
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setMeetingType('online')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: meetingType === 'online' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: meetingType === 'online' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: meetingType === 'online' ? '#60A5FA' : '#94A3B8',
                }}
              >
                <Video size={16} />
                <span>Online (Google Meet / Zoom)</span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingType('offline')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: meetingType === 'offline' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: meetingType === 'offline' ? '1px solid #34A853' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: meetingType === 'offline' ? '#4ADE80' : '#94A3B8',
                }}
              >
                <MapPin size={16} />
                <span>In-Person (Physical Venue)</span>
              </button>
            </div>

            {meetingType === 'online' ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Google Meet / Zoom URL *
                </label>
                <input
                  type="url"
                  required={meetingType === 'online'}
                  value={onlineMeetingUrl}
                  onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                  Physical Location / Hall / Room *
                </label>
                <input
                  type="text"
                  required={meetingType === 'offline'}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Hall 3 - Faculty Building / Computer Lab 102"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}
          </div>

          {/* Target Audience Scope */}
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.75rem' }}>
              Target Audience / Invitees *
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
              {[
                { id: 'all_team', label: 'All Team' },
                { id: 'branch', label: 'Branch' },
                { id: 'department', label: 'Committee' },
                { id: 'selected_members', label: 'Selected Members' },
              ].map((aud) => (
                <button
                  key={aud.id}
                  type="button"
                  onClick={() => setAudienceType(aud.id as TeamMeetingAudienceType)}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: audienceType === aud.id ? 'rgba(251, 188, 4, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: audienceType === aud.id ? '1px solid #FBBC04' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: audienceType === aud.id ? '#FBBF24' : '#94A3B8',
                    textAlign: 'center',
                  }}
                >
                  {aud.label}
                </button>
              ))}
            </div>

            {/* Scope Details depending on audienceType */}
            {audienceType === 'all_team' && (
              <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                ✨ All active members across Technical and Non-Technical branches will be added to the attendance ledger.
              </div>
            )}

            {audienceType === 'branch' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Select Branch
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: targetBranch === 'tech' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: targetBranch === 'tech' ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: targetBranch === 'tech' ? '#93C5FD' : '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="targetBranch"
                      checked={targetBranch === 'tech'}
                      onChange={() => setTargetBranch('tech')}
                    />
                    <span>Technical Branch</span>
                  </label>

                  <label
                    style={{
                      flex: 1,
                      padding: '0.65rem',
                      borderRadius: '8px',
                      background: targetBranch === 'non_tech' ? 'rgba(234, 67, 53, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: targetBranch === 'non_tech' ? '1px solid #EA4335' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: targetBranch === 'non_tech' ? '#FCA5A5' : '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <input
                      type="radio"
                      name="targetBranch"
                      checked={targetBranch === 'non_tech'}
                      onChange={() => setTargetBranch('non_tech')}
                    />
                    <span>Non-Technical Branch</span>
                  </label>
                </div>
              </div>
            )}

            {audienceType === 'department' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#CBD5E1', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Select Committee / Department
                </label>
                <select
                  value={targetDepartmentId}
                  onChange={(e) => setTargetDepartmentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: '#1A2338',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.branch === 'tech' ? 'Technical' : 'Non-Technical'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audienceType === 'selected_members' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 600 }}>
                    Selected Members ({selectedMemberIds.length})
                  </span>
                  {selectedMemberIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      style={{ background: 'none', border: 'none', color: '#F87171', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                  <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search members by name or email..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.84rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '0.25rem',
                  }}
                >
                  {filteredMembers.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => toggleMemberSelection(m.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#F1F5F9' }}>
                              {m.full_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              {m.role.replace(/_/g, ' ')} • {m.email}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} color="#60A5FA" />}
                      </div>
                    );
                  })}
                  {filteredMembers.length === 0 && (
                    <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: '#64748B' }}>
                      No members match your search.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assigned Attendance Facilitator (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.4rem' }}>
              Designated Attendance Taker / Facilitator (Optional)
            </label>
            <select
              value={facilitatorId}
              onChange={(e) => setFacilitatorId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: '#1A2338',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            >
              <option value="">Default: You (Meeting Organizer) & HR Team</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>

          {/* Agenda */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.4rem' }}>
              Meeting Agenda & Key Topics
            </label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Monthly updates&#10;2. Upcoming workshop planning&#10;3. Q&A and action items"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Footer buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#CBD5E1',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 15px rgba(66, 133, 244, 0.35)',
              }}
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar size={16} />
                  <span>Schedule Meeting</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
