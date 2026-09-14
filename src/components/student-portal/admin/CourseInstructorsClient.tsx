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
  X,
} from 'lucide-react';
import {
  CourseRosterHeader,
  AssignedInstructorItem,
  CandidateMemberItem,
  assignCourseInstructor,
  updateCourseInstructorRole,
  removeCourseInstructor,
} from '@/app/student-portal/admin/courses/[id]/instructors/actions';
import { CourseInstructorRole } from '@/types/student';

interface CourseInstructorsClientProps {
  course: CourseRosterHeader;
  initialAssigned: AssignedInstructorItem[];
  initialCandidates: CandidateMemberItem[];
  canManage: boolean;
  userRole?: string;
}

export function CourseInstructorsClient({
  course,
  initialAssigned,
  initialCandidates,
  canManage,
  userRole,
}: CourseInstructorsClientProps) {
  const [assigned, setAssigned] = useState<AssignedInstructorItem[]>(initialAssigned);
  const [candidates, setCandidates] = useState<CandidateMemberItem[]>(initialCandidates);
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [candidateSearchQuery, setCandidateSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | CourseInstructorRole>('all');
  const [candidateDeptFilter, setCandidateDeptFilter] = useState<string>('all');
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

  // Unique departments for candidates filter
  const candidateDepts = Array.from(
    new Set(candidates.map((c) => c.department_name).filter(Boolean) as string[])
  ).sort();

  // Filter candidate pool
  const filteredCandidates = candidates.filter((item) => {
    const q = candidateSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.full_name.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      (item.department_name && item.department_name.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q));

    const matchesDept = candidateDeptFilter === 'all' || item.department_name === candidateDeptFilter;

    return matchesSearch && matchesDept;
  });

  const instructorsCount = assigned.filter((a) => a.role === 'instructor').length;
  const mentorsCount = assigned.filter((a) => a.role === 'mentor').length;

  const handleAssign = async (candidate: CandidateMemberItem, role: CourseInstructorRole) => {
    try {
      setIsProcessing(candidate.id);
      setStatusMessage(null);

      const res = await assignCourseInstructor(course.id, candidate.id, role);
      if (!res.success || !res.item) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to assign team member.' });
        return;
      }

      setAssigned([...assigned, res.item]);
      setCandidates(candidates.filter((c) => c.id !== candidate.id));
      setStatusMessage({
        type: 'success',
        text: `Assigned ${candidate.full_name} as ${role === 'instructor' ? 'Instructor' : 'Mentor'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleToggleRole = async (profileId: string, currentRole: CourseInstructorRole, fullName: string) => {
    const newRole: CourseInstructorRole = currentRole === 'instructor' ? 'mentor' : 'instructor';
    try {
      setIsProcessing(profileId);
      setStatusMessage(null);

      const res = await updateCourseInstructorRole(course.id, profileId, newRole);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to update role.' });
        return;
      }

      setAssigned(
        assigned.map((a) => (a.profile_id === profileId ? { ...a, role: newRole } : a))
      );
      setStatusMessage({
        type: 'success',
        text: `Updated ${fullName}'s role to ${newRole === 'instructor' ? 'Instructor' : 'Mentor'}.`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemove = async (profileId: string, fullName: string) => {
    if (!confirm(`Are you sure you want to remove ${fullName} from this course roster?`)) {
      return;
    }

    try {
      setIsProcessing(profileId);
      setStatusMessage(null);

      const res = await removeCourseInstructor(course.id, profileId);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to remove member.' });
        return;
      }

      const removed = assigned.find((a) => a.profile_id === profileId);
      setAssigned(assigned.filter((a) => a.profile_id !== profileId));

      if (removed) {
        const candidateItem: CandidateMemberItem = {
          id: removed.profile_id,
          full_name: removed.full_name,
          avatar_url: removed.avatar_url,
          role: removed.committee_role,
          department_id: course.department_id,
          email: removed.email,
        };
        setCandidates([candidateItem, ...candidates]);
      }

      setStatusMessage({ type: 'success', text: `Removed ${fullName} from course roster.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove member.' });
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Breadcrumbs & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', color: '#94A3B8' }}>
          <Link
            href="/student-portal/admin/courses"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            Courses
          </Link>
          <span>/</span>
          <span style={{ color: '#E2E8F0', fontWeight: 500 }}>{course.title}</span>
          <span>/</span>
          <span style={{ color: '#F8FAFC', fontWeight: 700 }}>Instructors & Mentors</span>
        </div>

        {/* Course Sub-Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/student-portal/admin/courses/${course.id}/sessions`}
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
            href={`/student-portal/admin/courses/${course.id}/lessons`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(168, 85, 247, 0.15))',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <BookOpen size={14} style={{ color: '#93C5FD' }} />
            <span>Lessons</span>
          </Link>

          <Link
            href={`/student-portal/admin/courses/${course.id}/enrollments`}
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
            <GraduationCap size={15} />
            <span>Enrollments Roster</span>
          </Link>

          <Link
            href={`/student/courses/${course.id}`}
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
            title="Preview Student LMS Classroom"
          >
            <ExternalLink size={13} />
            <span>Student View</span>
          </Link>
        </div>
      </div>

      {/* Course Hero & Stats */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.06) 100%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: course.status === 'published' ? 'rgba(52, 168, 83, 0.2)' : 'rgba(251, 188, 4, 0.2)',
                  color: course.status === 'published' ? '#34A853' : '#FBBF24',
                  border: `1px solid ${course.status === 'published' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(251, 188, 4, 0.4)'}`,
                }}
              >
                {course.status}
              </span>

              {course.department_name && (
                <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                  {course.department_name} ({course.department_code})
                </span>
              )}

              {course.category && (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#E2E8F0',
                  }}
                >
                  {course.category}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' }}>
              {course.title}
            </h1>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.4rem', margin: 0 }}>
              Manage teaching instructors, lab mentors, and student review staff for this track.
            </p>
          </div>

          <Link
            href={`/student-portal/admin/courses/${course.id}/sessions`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.88rem',
              textDecoration: 'none',
              transition: 'background 0.15s ease',
            }}
          >
            <Calendar size={16} style={{ color: '#60A5FA' }} />
            View Sessions Schedule
          </Link>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '1.8rem',
            paddingTop: '1.4rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Assigned
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
              {assigned.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#60A5FA', fontWeight: 600, textTransform: 'uppercase' }}>
              Instructors
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>
              {instructorsCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#34A853', fontWeight: 600, textTransform: 'uppercase' }}>
              Mentors
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34A853', marginTop: '0.2rem' }}>
              {mentorsCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#FBBF24', fontWeight: 600, textTransform: 'uppercase' }}>
              Available Candidates
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.2rem' }}>
              {candidates.length}
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: statusMessage.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? 'rgba(52, 168, 83, 0.3)' : 'rgba(234, 67, 53, 0.3)'}`,
            color: statusMessage.type === 'success' ? '#34D399' : '#F87171',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMessage.text}
        </div>
      )}

      {/* Live Search & Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.4rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
            }}
          />
          <input
            type="text"
            placeholder="Search assigned staff by name, role, email..."
            value={assignedSearchQuery}
            onChange={(e) => setAssignedSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 2.2rem 0.55rem 2.4rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
          {assignedSearchQuery && (
            <button
              type="button"
              onClick={() => setAssignedSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.8rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {(['all', 'instructor', 'mentor'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: roleFilter === r ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid transparent',
                background: roleFilter === r ? 'rgba(66, 133, 244, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: roleFilter === r ? '#60A5FA' : '#94A3B8',
                textTransform: 'capitalize',
              }}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: ACTIVE ASSIGNED ROSTER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} style={{ color: '#4285F4' }} />
            Active Course Roster ({filteredAssigned.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            Toggle between Instructor and Mentor roles anytime
          </span>
        </div>

        {filteredAssigned.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Users size={36} style={{ color: '#64748B' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              No assigned instructors or mentors
            </h4>
            <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0 }}>
              {assigned.length === 0
                ? 'No team members have been assigned to this course yet. Use the candidate pool below to assign instructors.'
                : 'No assigned members match your current filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {filteredAssigned.map((member) => {
              const isInstructor = member.role === 'instructor';
              const busy = isProcessing === member.profile_id;

              return (
                <div
                  key={member.id}
                  className="glass-panel"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: isInstructor
                      ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)'
                      : 'linear-gradient(135deg, rgba(52, 168, 83, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: isInstructor ? '#4285F4' : '#34A853',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '1rem',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {member.avatar_url ? (
                          <img src={member.avatar_url} alt={member.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          member.full_name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#FFFFFF' }}>
                          {member.full_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                          {member.committee_role.replace('_', ' ')}
                          {member.department_name && ` • ${member.department_name}`}
                        </div>
                        {member.email && (
                          <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.1rem' }}>
                            {member.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Role Badge */}
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: isInstructor ? 'rgba(66, 133, 244, 0.2)' : 'rgba(52, 168, 83, 0.2)',
                        color: isInstructor ? '#60A5FA' : '#34D399',
                        border: `1px solid ${isInstructor ? 'rgba(66, 133, 244, 0.4)' : 'rgba(52, 168, 83, 0.4)'}`,
                      }}
                    >
                      {member.role}
                    </span>
                  </div>

                  {/* Actions & Role Toggle */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {canManage ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Role:</span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleRole(member.profile_id, member.role, member.full_name)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: isInstructor ? '#60A5FA' : '#34D399',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: busy ? 'not-allowed' : 'pointer',
                          }}
                          title="Click to toggle between Instructor and Mentor"
                        >
                          Switch to {isInstructor ? 'Mentor' : 'Instructor'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        Assigned on {new Date(member.assigned_at).toLocaleDateString()}
                      </span>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemove(member.profile_id, member.full_name)}
                        title="Remove member from course"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(234, 67, 53, 0.1)',
                          border: '1px solid rgba(234, 67, 53, 0.25)',
                          borderRadius: '6px',
                          color: '#EA4335',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.3rem 0.6rem',
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: CANDIDATE COMMITTEE MEMBERS POOL */}
      {canManage && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} style={{ color: '#34A853' }} />
                Available Committee Candidates
                <span
                  style={{
                    padding: '0.15rem 0.55rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: 'rgba(52, 168, 83, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                  }}
                >
                  {filteredCandidates.length}
                  {candidates.length !== filteredCandidates.length && ` / ${candidates.length}`}
                </span>
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                Active committee members eligible to be assigned as Course Instructors or Mentors.
              </p>
            </div>
          </div>

          {/* Dedicated Search & Filter Bar for Candidates */}
          <div
            className="glass-panel"
            style={{
              padding: '0.85rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.85rem',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.9rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                }}
              />
              <input
                type="text"
                placeholder="Search candidates by name, role, department, email..."
                value={candidateSearchQuery}
                onChange={(e) => setCandidateSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
              {candidateSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCandidateSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '0.8rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                  title="Clear candidate search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {candidateDepts.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>Department:</span>
                <select
                  value={candidateDeptFilter}
                  onChange={(e) => setCandidateDeptFilter(e.target.value)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#E2E8F0',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all" style={{ background: '#0F172A', color: '#FFFFFF' }}>All Departments</option>
                  {candidateDepts.map((d) => (
                    <option key={d} value={d} style={{ background: '#0F172A', color: '#FFFFFF' }}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {filteredCandidates.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '2.5rem',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '0.88rem',
              }}
            >
              {candidates.length === 0
                ? 'All eligible committee members are currently assigned to this course.'
                : (
                  <div>
                    <p style={{ margin: 0 }}>No candidate members match your search criteria.</p>
                    {(candidateSearchQuery || candidateDeptFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCandidateSearchQuery('');
                          setCandidateDeptFilter('all');
                        }}
                        style={{
                          marginTop: '0.75rem',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          color: '#60A5FA',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Clear Candidate Filters
                      </button>
                    )}
                  </div>
                )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {filteredCandidates.map((candidate) => {
                const busy = isProcessing === candidate.id;

                return (
                  <div
                    key={candidate.id}
                    className="glass-panel"
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#1E293B',
                          color: '#CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {candidate.avatar_url ? (
                          <img src={candidate.avatar_url} alt={candidate.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          candidate.full_name.slice(0, 2).toUpperCase()
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.full_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {candidate.role.replace('_', ' ')}
                          {candidate.department_name && ` • ${candidate.department_name}`}
                        </div>
                      </div>
                    </div>

                    {/* Quick Add Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAssign(candidate, 'instructor')}
                        style={{
                          padding: '0.3rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.35)',
                          color: '#60A5FA',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                        title="Add as Instructor"
                      >
                        + Instructor
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleAssign(candidate, 'mentor')}
                        style={{
                          padding: '0.3rem 0.55rem',
                          borderRadius: '6px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          border: '1px solid rgba(52, 168, 83, 0.35)',
                          color: '#34D399',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: busy ? 'not-allowed' : 'pointer',
                        }}
                        title="Add as Mentor"
                      >
                        + Mentor
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
