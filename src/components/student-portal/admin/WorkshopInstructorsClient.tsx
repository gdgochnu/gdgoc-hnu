'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  Calendar,
  ArrowLeft,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ExternalLink,
  BookOpen,
  QrCode,
  X,
} from 'lucide-react';
import {
  WorkshopRosterHeader,
  AssignedWorkshopInstructorItem,
  CandidateMemberItem,
  assignWorkshopInstructor,
  updateWorkshopInstructorRole,
  removeWorkshopInstructor,
} from '@/app/student-portal/admin/workshops/[id]/instructors/actions';
import { CourseInstructorRole } from '@/types/student';

interface WorkshopInstructorsClientProps {
  workshop: WorkshopRosterHeader;
  initialAssigned: AssignedWorkshopInstructorItem[];
  initialCandidates: CandidateMemberItem[];
  canManage: boolean;
  userRole?: string;
}

export function WorkshopInstructorsClient({
  workshop,
  initialAssigned,
  initialCandidates,
  canManage,
  userRole,
}: WorkshopInstructorsClientProps) {
  const [assigned, setAssigned] = useState<AssignedWorkshopInstructorItem[]>(initialAssigned);
  const [candidates, setCandidates] = useState<CandidateMemberItem[]>(initialCandidates);
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | CourseInstructorRole>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter assigned roster
  const filteredAssigned = assigned.filter((item) => {
    const q = assignedSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.full_name.toLowerCase().includes(q) ||
      item.committee_role.toLowerCase().includes(q) ||
      (item.department_name && item.department_name.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter candidates
  const filteredCandidates = candidates.filter((item) => {
    const q = candidateSearchQuery.trim().toLowerCase();
    return (
      !q ||
      item.full_name.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      (item.department_name && item.department_name.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q))
    );
  });

  const instructorsCount = assigned.filter((i) => i.role === 'instructor').length;
  const mentorsCount = assigned.filter((i) => i.role === 'mentor').length;

  const handleAssign = async (candidate: CandidateMemberItem, role: CourseInstructorRole) => {
    try {
      setIsProcessing(candidate.id);
      setStatusMessage(null);

      const res = await assignWorkshopInstructor(workshop.id, candidate.id, role);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to assign instructor.' });
        return;
      }

      // Move from candidates to assigned
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
      setAssigned((prev) => [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          workshop_id: workshop.id,
          profile_id: candidate.id,
          role,
          assigned_at: new Date().toISOString(),
          full_name: candidate.full_name,
          avatar_url: candidate.avatar_url,
          committee_role: candidate.role,
          email: candidate.email,
          department_name: candidate.department_name,
        },
      ]);

      setStatusMessage({
        type: 'success',
        text: `Assigned ${candidate.full_name} as ${role === 'instructor' ? 'Workshop Instructor' : 'Workshop Mentor'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRoleChange = async (item: AssignedWorkshopInstructorItem, newRole: CourseInstructorRole) => {
    if (item.role === newRole) return;

    try {
      setIsProcessing(item.id);
      setStatusMessage(null);

      const res = await updateWorkshopInstructorRole(workshop.id, item.id, newRole);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update role.' });
        return;
      }

      setAssigned((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, role: newRole } : a))
      );

      setStatusMessage({
        type: 'success',
        text: `Updated ${item.full_name}'s role to ${newRole === 'instructor' ? 'Instructor' : 'Mentor'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemove = async (item: AssignedWorkshopInstructorItem) => {
    if (!confirm(`Are you sure you want to remove ${item.full_name} from this workshop?`)) {
      return;
    }

    try {
      setIsProcessing(item.id);
      setStatusMessage(null);

      const res = await removeWorkshopInstructor(workshop.id, item.id);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to remove instructor.' });
        return;
      }

      setAssigned((prev) => prev.filter((a) => a.id !== item.id));
      setCandidates((prev) => [
        ...prev,
        {
          id: item.profile_id,
          full_name: item.full_name,
          avatar_url: item.avatar_url,
          role: item.committee_role,
          department_id: null,
          department_name: item.department_name,
          email: item.email,
        },
      ]);

      setStatusMessage({
        type: 'success',
        text: `Removed ${item.full_name} from workshop teaching staff.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 2rem 4rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
      }}
    >
      {/* 1. Header & Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#94A3B8' }}>
          <Link
            href="/student-portal/admin/workshops"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#60A5FA',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            Workshops
          </Link>
          <span>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{workshop.title}</span>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Instructors & Mentors</span>
        </div>

        {/* Sub-Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/workshops/${workshop.id}/sessions`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#CBD5E1',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Calendar size={14} style={{ color: '#60A5FA' }} />
            <span>Sessions</span>
          </Link>

          <Link
            href={`/student-portal/admin/workshops/${workshop.id}/registrations`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(52, 168, 83, 0.15)',
              border: '1px solid rgba(52, 168, 83, 0.35)',
              color: '#86EFAC',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <QrCode size={14} />
            <span>Registrations Roster</span>
          </Link>

          <Link
            href={`/student/workshops/${workshop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94A3B8',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={13} />
            <span>Student View</span>
          </Link>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          style={{
            padding: '1rem 1.4rem',
            borderRadius: '12px',
            background:
              statusMessage.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(52, 168, 83, 0.35)' : 'rgba(234, 67, 53, 0.35)'}`,
            color: statusMessage.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMessage.text}
        </div>
      )}

      {/* 2. Workshop Hero Info Card */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.85) 100%)',
          padding: '2.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: workshop.status === 'published' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)',
                color: workshop.status === 'published' ? '#34A853' : '#FBBF24',
              }}
            >
              {workshop.status}
            </span>

            {workshop.category && (
              <span
                style={{
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: '#60A5FA',
                }}
              >
                {workshop.category}
              </span>
            )}

            {workshop.department_name && (
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                {workshop.department_name}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
            {workshop.title}
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '0.92rem', marginTop: '0.5rem', marginBottom: 0 }}>
            Assign and manage workshop instructors and mentors who facilitate sessions and conduct live training.
          </p>
        </div>

        {/* Stats Pill */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div
            style={{
              padding: '1rem 1.4rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#4285F4' }}>
              {instructorsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              Instructors
            </div>
          </div>

          <div
            style={{
              padding: '1rem 1.4rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34A853' }}>
              {mentorsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
              Mentors
            </div>
          </div>
        </div>
      </div>

      {/* 3. Assigned Roster Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Assigned Teaching Staff ({assigned.length})
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: '0.2rem 0 0 0' }}>
              Staff members currently assigned to lead or mentor this workshop.
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '240px',
              }}
            >
              <Search size={15} style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search assigned staff..."
                value={assignedSearchQuery}
                onChange={(e) => setAssignedSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
              {assignedSearchQuery && (
                <button
                  onClick={() => setAssignedSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Role Filter Pills */}
            <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {(['all', 'instructor', 'mentor'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    border: 'none',
                    cursor: 'pointer',
                    background: roleFilter === r ? '#4285F4' : 'transparent',
                    color: roleFilter === r ? '#FFFFFF' : '#94A3B8',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {r === 'all' ? 'All Staff' : `${r}s`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Assigned Staff Grid */}
        {filteredAssigned.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              borderRadius: '16px',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              textAlign: 'center',
              color: '#94A3B8',
            }}
          >
            <Users size={36} style={{ color: '#475569', margin: '0 auto 0.75rem auto' }} />
            <h3 style={{ color: '#E2E8F0', fontSize: '1.1rem', margin: 0 }}>
              {assigned.length === 0 ? 'No instructors or mentors assigned yet' : 'No staff match your search query'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.35rem' }}>
              {assigned.length === 0
                ? 'Use the section below to search and assign team members as instructors or mentors.'
                : 'Try adjusting your search keywords or role filter.'}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {filteredAssigned.map((item) => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.4rem',
                  borderRadius: '16px',
                  border: `1px solid ${item.role === 'instructor' ? 'rgba(66, 133, 244, 0.25)' : 'rgba(52, 168, 83, 0.25)'}`,
                  background: 'rgba(15, 23, 42, 0.65)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: item.role === 'instructor' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                      border: `2px solid ${item.role === 'instructor' ? '#4285F4' : '#34A853'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '1rem',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {item.avatar_url ? (
                      <img
                        src={item.avatar_url}
                        alt={item.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      item.full_name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.98rem',
                          fontWeight: 800,
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.full_name}
                      </h4>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: item.role === 'instructor' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                          color: item.role === 'instructor' ? '#60A5FA' : '#34D399',
                        }}
                      >
                        {item.role}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                      {item.committee_role} • {item.department_name || 'Core Team'}
                    </div>

                    {item.email && (
                      <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {canManage && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      gap: '0.5rem',
                    }}
                  >
                    {/* Role Switcher */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>Role:</span>
                      <select
                        disabled={isProcessing === item.id}
                        value={item.role}
                        onChange={(e) => handleRoleChange(item, e.target.value as CourseInstructorRole)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#F8FAFC',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="instructor" style={{ background: '#0F172A' }}>Instructor</option>
                        <option value="mentor" style={{ background: '#0F172A' }}>Mentor</option>
                      </select>
                    </div>

                    {/* Remove Button */}
                    <button
                      type="button"
                      disabled={isProcessing === item.id}
                      onClick={() => handleRemove(item)}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(234, 67, 53, 0.12)',
                        border: '1px solid rgba(234, 67, 53, 0.25)',
                        color: '#F87171',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                      title="Remove from workshop"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Assign New Staff Section */}
      {canManage && (
        <div
          className="glass-panel"
          style={{
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60A5FA', fontWeight: 800, fontSize: '0.82rem', textTransform: 'uppercase' }}>
                <UserPlus size={16} />
                Assign Workshop Staff
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0 0 0' }}>
                Available Team Members ({candidates.length})
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: '0.2rem 0 0 0' }}>
                Search and assign members from your chapter committees to facilitate this workshop.
              </p>
            </div>

            {/* Candidate Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                width: '280px',
              }}
            >
              <Search size={15} style={{ color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="Search candidate members..."
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
              {candidateSearchQuery && (
                <button
                  onClick={() => setCandidateSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Candidate List */}
          {filteredCandidates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.88rem' }}>
              No available members match "{candidateSearchQuery}".
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1rem',
                maxHeight: '440px',
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}
            >
              {filteredCandidates.slice(0, 30).map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      {c.avatar_url ? (
                        <img src={c.avatar_url} alt={c.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        c.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.full_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                        {c.role} • {c.department_name || 'General'}
                      </div>
                    </div>
                  </div>

                  {/* Assign Buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      disabled={isProcessing === c.id}
                      onClick={() => handleAssign(c, 'instructor')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        color: '#60A5FA',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Assign as Instructor"
                    >
                      + Instructor
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing === c.id}
                      onClick={() => handleAssign(c, 'mentor')}
                      style={{
                        padding: '0.35rem 0.65rem',
                        borderRadius: '8px',
                        background: 'rgba(52, 168, 83, 0.15)',
                        border: '1px solid rgba(52, 168, 83, 0.3)',
                        color: '#34D399',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Assign as Mentor"
                    >
                      + Mentor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
