'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock3,
  XCircle,
  ExternalLink,
  ArrowLeft,
  Search,
  Filter,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  UserCheck,
  Building2,
  Trash2,
  Loader2,
  Check,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { TeamMeeting, TeamMeetingAttendee, TeamMeetingAttendanceStatus } from '@/types';
import {
  updateMeetingAttendeeStatus,
  batchUpdateMeetingAttendees,
  addMeetingAttendee,
  deleteTeamMeeting,
} from '@/app/meetings/actions';

interface MeetingAttendanceClientProps {
  meeting: TeamMeeting;
  initialAttendees: TeamMeetingAttendee[];
  canManageAttendance: boolean;
  canEditMeeting: boolean;
  canDeleteMeeting: boolean;
  availableMembers: Array<{ id: string; full_name: string; role: string; email: string; avatar_url: string | null }>;
}

export function MeetingAttendanceClient({
  meeting,
  initialAttendees,
  canManageAttendance,
  canEditMeeting,
  canDeleteMeeting,
  availableMembers,
}: MeetingAttendanceClientProps) {
  const router = useRouter();
  const [attendees, setAttendees] = useState<TeamMeetingAttendee[]>(initialAttendees);
  const [isPending, startTransition] = useTransition();

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TeamMeetingAttendanceStatus>('all');

  // Modals & fast actions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState('');
  const [noteModalAttendee, setNoteModalAttendee] = useState<TeamMeetingAttendee | null>(null);
  const [noteText, setNoteText] = useState('');
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null);

  // Compute live stats
  const totalCount = attendees.length;
  const presentCount = attendees.filter((a) => a.status === 'present').length;
  const lateCount = attendees.filter((a) => a.status === 'late').length;
  const excusedCount = attendees.filter((a) => a.status === 'excused').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;
  const pendingCount = attendees.filter((a) => a.status === 'pending').length;

  const attendedTotal = presentCount + lateCount;
  const eligibleTotal = totalCount - excusedCount;
  const turnoutRate = eligibleTotal > 0 ? Math.round((attendedTotal / eligibleTotal) * 100) : 0;

  // Filter attendees
  const filteredAttendees = attendees.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.profile?.full_name.toLowerCase().includes(q);
      const matchEmail = a.profile?.email.toLowerCase().includes(q);
      const matchDept = a.profile?.department?.name.toLowerCase().includes(q);
      const matchNotes = a.notes?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept && !matchNotes) return false;
    }
    return true;
  });

  // Fast single-attendee status change
  const handleStatusChange = (profileId: string, newStatus: TeamMeetingAttendanceStatus, notes?: string) => {
    if (!canManageAttendance) return;
    setUpdatingProfileId(profileId);

    startTransition(async () => {
      try {
        const res = await updateMeetingAttendeeStatus({
          meetingId: meeting.id,
          profileId,
          status: newStatus,
          notes,
        });

        if (res.success) {
          setAttendees((prev) =>
            prev.map((a) =>
              a.profile_id === profileId
                ? {
                    ...a,
                    status: newStatus,
                    check_in_time: newStatus === 'present' || newStatus === 'late' ? new Date().toISOString() : null,
                    notes: notes !== undefined ? notes : a.notes,
                  }
                : a
            )
          );
        } else {
          alert(res.error || 'Failed to update attendance status.');
        }
      } catch (err: any) {
        alert(err.message || 'Error updating status.');
      } finally {
        setUpdatingProfileId(null);
      }
    });
  };

  // Batch action: Mark all pending as absent
  const handleMarkPendingAsAbsent = () => {
    const pendingAttendees = attendees.filter((a) => a.status === 'pending');
    if (pendingAttendees.length === 0) {
      alert('No pending attendees to update.');
      return;
    }

    if (!confirm(`Are you sure you want to mark all ${pendingAttendees.length} pending attendees as Absent?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const updates = pendingAttendees.map((a) => ({
          profileId: a.profile_id,
          status: 'absent' as TeamMeetingAttendanceStatus,
        }));

        const res = await batchUpdateMeetingAttendees({
          meetingId: meeting.id,
          updates,
        });

        if (res.success) {
          setAttendees((prev) =>
            prev.map((a) => (a.status === 'pending' ? { ...a, status: 'absent' } : a))
          );
        } else {
          alert(res.error || 'Failed to batch update attendees.');
        }
      } catch (err: any) {
        alert(err.message || 'Error performing batch update.');
      }
    });
  };

  // Batch action: Mark all pending as present
  const handleMarkPendingAsPresent = () => {
    const pendingAttendees = attendees.filter((a) => a.status === 'pending');
    if (pendingAttendees.length === 0) {
      alert('No pending attendees to update.');
      return;
    }

    if (!confirm(`Mark all ${pendingAttendees.length} pending attendees as Present?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const updates = pendingAttendees.map((a) => ({
          profileId: a.profile_id,
          status: 'present' as TeamMeetingAttendanceStatus,
        }));

        const res = await batchUpdateMeetingAttendees({
          meetingId: meeting.id,
          updates,
        });

        if (res.success) {
          const now = new Date().toISOString();
          setAttendees((prev) =>
            prev.map((a) => (a.status === 'pending' ? { ...a, status: 'present', check_in_time: now } : a))
          );
        } else {
          alert(res.error || 'Failed to batch update attendees.');
        }
      } catch (err: any) {
        alert(err.message || 'Error performing batch update.');
      }
    });
  };

  // Add new attendee on the fly
  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewMemberId) return;

    startTransition(async () => {
      try {
        const res = await addMeetingAttendee({
          meetingId: meeting.id,
          profileId: selectedNewMemberId,
          status: 'present',
        });

        if (res.success) {
          const memberObj = availableMembers.find((m) => m.id === selectedNewMemberId);
          const newAtt: TeamMeetingAttendee = {
            id: `temp-${Date.now()}`,
            meeting_id: meeting.id,
            profile_id: selectedNewMemberId,
            status: 'present',
            check_in_time: new Date().toISOString(),
            marked_by: null,
            notes: 'Added on-the-fly during meeting',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile: memberObj as any,
          };
          setAttendees((prev) => [...prev, newAtt]);
          setIsAddModalOpen(false);
          setSelectedNewMemberId('');
        } else {
          alert(res.error || 'Failed to add attendee.');
        }
      } catch (err: any) {
        alert(err.message || 'Error adding attendee.');
      }
    });
  };

  // Delete Meeting
  const handleDeleteMeeting = () => {
    if (!confirm('Are you sure you want to permanently delete this team meeting and its attendance records?')) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await deleteTeamMeeting(meeting.id);
        if (res.success) {
          router.push('/meetings');
        } else {
          alert(res.error || 'Failed to delete meeting.');
        }
      } catch (err: any) {
        alert(err.message || 'Error deleting meeting.');
      }
    });
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataRows = attendees.map((a, idx) => ({
      '#': idx + 1,
      'Full Name': a.profile?.full_name || 'N/A',
      'Email': a.profile?.email || 'N/A',
      'Role': (a.profile?.role || '').replace(/_/g, ' '),
      'Department': a.profile?.department?.name || 'Leadership',
      'Status': a.status.toUpperCase(),
      'Check-in Time': a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString() : 'N/A',
      'Notes / Excuse Reason': a.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Ledger');
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
    XLSX.writeFile(wb, `GDGoC_Meeting_${safeTitle}_${meeting.meeting_date}.xlsx`);
  };

  const isOnline = meeting.type === 'online';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/meetings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#94A3B8',
            fontSize: '0.88rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to All Meetings</span>
        </Link>
      </div>

      {/* Main Meeting Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '24px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(66, 133, 244, 0.3)',
          padding: '2rem',
          boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '300px' }}>
            {/* Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: isOnline ? 'rgba(66, 133, 244, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                  border: isOnline ? '1px solid rgba(66, 133, 244, 0.3)' : '1px solid rgba(52, 168, 83, 0.3)',
                  color: isOnline ? '#93C5FD' : '#86EFAC',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {isOnline ? <Video size={13} /> : <MapPin size={13} />}
                <span>{isOnline ? 'Online Meeting' : 'In-Person'}</span>
              </span>

              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(251, 188, 4, 0.12)',
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                  color: '#FDE047',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                {meeting.target_audience_type === 'all_team'
                  ? 'All Chapter Team'
                  : meeting.target_audience_type === 'branch'
                  ? `${meeting.target_branch === 'tech' ? 'Technical' : 'Non-Technical'} Branch`
                  : meeting.target_department?.name || 'Department Meeting'}
              </span>

              <span
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                Status: {meeting.status.toUpperCase()}
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.5rem', lineHeight: 1.25 }}>
              {meeting.title}
            </h1>

            {meeting.description && (
              <p style={{ fontSize: '0.95rem', color: '#CBD5E1', margin: '0 0 1rem', lineHeight: 1.6, maxWidth: '750px' }}>
                {meeting.description}
              </p>
            )}

            {/* Date, Time & Venue Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.75rem', color: '#94A3B8', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#F1F5F9', fontWeight: 600 }}>
                <Calendar size={16} color="#60A5FA" />
                <span>{new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#F1F5F9', fontWeight: 600 }}>
                <Clock size={16} color="#4ADE80" />
                <span>{meeting.start_time} {meeting.end_time ? `– ${meeting.end_time}` : ''}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#F1F5F9', fontWeight: 600 }}>
                {isOnline ? <Video size={16} color="#60A5FA" /> : <MapPin size={16} color="#F87171" />}
                <span>{isOnline ? 'Online (Google Meet / Zoom)' : (meeting.location || 'Campus')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Join, Delete */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '180px' }}>
            {isOnline && meeting.online_meeting_url && (
              <a
                href={meeting.online_meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.85rem 1.4rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
                }}
              >
                <Video size={18} />
                <span>Join Google Meet</span>
                <ExternalLink size={14} />
              </a>
            )}

            {canDeleteMeeting && (
              <button
                type="button"
                onClick={handleDeleteMeeting}
                disabled={isPending}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(234, 67, 53, 0.1)',
                  border: '1px solid rgba(234, 67, 53, 0.25)',
                  color: '#F87171',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <Trash2 size={14} />
                <span>Cancel / Delete Meeting</span>
              </button>
            )}
          </div>
        </div>

        {/* Agenda Section if provided */}
        {meeting.agenda && (
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' }}>
              Meeting Agenda & Objectives
            </div>
            <div style={{ fontSize: '0.9rem', color: '#E2E8F0', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
              {meeting.agenda}
            </div>
          </div>
        )}
      </div>

      {/* Attendance Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Total Invited */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
            Total Roster
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.2rem' }}>
            Invited team members
          </div>
        </div>

        {/* Present */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(52, 168, 83, 0.08)',
            border: '1px solid rgba(52, 168, 83, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86EFAC', textTransform: 'uppercase' }}>
            Present
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4ADE80', marginTop: '0.25rem' }}>
            {presentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#86EFAC', marginTop: '0.2rem' }}>
            On-time attendees
          </div>
        </div>

        {/* Late */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(251, 188, 4, 0.08)',
            border: '1px solid rgba(251, 188, 4, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FDE047', textTransform: 'uppercase' }}>
            Late
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FBBF24', marginTop: '0.25rem' }}>
            {lateCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#FDE047', marginTop: '0.2rem' }}>
            Joined after start
          </div>
        </div>

        {/* Excused */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(96, 165, 250, 0.08)',
            border: '1px solid rgba(96, 165, 250, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
            Excused
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#60A5FA', marginTop: '0.25rem' }}>
            {excusedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#93C5FD', marginTop: '0.2rem' }}>
            Pre-approved absence
          </div>
        </div>

        {/* Absent */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(234, 67, 53, 0.08)',
            border: '1px solid rgba(234, 67, 53, 0.25)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FCA5A5', textTransform: 'uppercase' }}>
            Absent
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F87171', marginTop: '0.25rem' }}>
            {absentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#FCA5A5', marginTop: '0.2rem' }}>
            Unexcused absence
          </div>
        </div>

        {/* Turnout % */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '16px',
            background: 'rgba(66, 133, 244, 0.1)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase' }}>
            Turnout Rate
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#60A5FA', marginTop: '0.25rem' }}>
            {turnoutRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#93C5FD', marginTop: '0.2rem' }}>
            {attendedTotal} of {eligibleTotal} eligible
          </div>
        </div>
      </div>

      {/* Attendance Ledger Toolbar */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search & Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendee by name/role..."
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'present', label: `Present (${presentCount})` },
              { id: 'late', label: `Late (${lateCount})` },
              { id: 'excused', label: `Excused (${excusedCount})` },
              { id: 'absent', label: `Absent (${absentCount})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setStatusFilter(p.id as any)}
                style={{
                  padding: '0.4rem 0.7rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: statusFilter === p.id ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                  border: statusFilter === p.id ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                  color: statusFilter === p.id ? '#FFFFFF' : '#94A3B8',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons: Export, Add Member, Batch Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {canManageAttendance && (
            <>
              <button
                type="button"
                onClick={handleMarkPendingAsPresent}
                disabled={isPending || pendingCount === 0}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#4ADE80',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: pendingCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: pendingCount === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={handleMarkPendingAsAbsent}
                disabled={isPending || pendingCount === 0}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  color: '#F87171',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: pendingCount === 0 ? 'not-allowed' : 'pointer',
                  opacity: pendingCount === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <XCircle size={13} />
                <span>Mark Rest Absent</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  color: '#60A5FA',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Plus size={13} />
                <span>Add Member</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#F1F5F9',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <FileSpreadsheet size={13} color="#4ADE80" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Attendees Table */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94A3B8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Attendee</th>
                <th style={{ padding: '1rem 1rem' }}>Committee / Role</th>
                <th style={{ padding: '1rem 1rem' }}>Status</th>
                <th style={{ padding: '1rem 1rem' }}>Time / Notes</th>
                {canManageAttendance && <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Quick Action (HR / Lead)</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAttendees.map((att) => {
                const isUpdating = updatingProfileId === att.profile_id;
                return (
                  <tr
                    key={att.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isUpdating ? 'rgba(66, 133, 244, 0.05)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Attendee Info */}
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'rgba(66, 133, 244, 0.2)',
                            color: '#60A5FA',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                          }}
                        >
                          {att.profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <Link
                            href={`/members/${att.profile_id}`}
                            style={{ fontWeight: 700, color: '#FFFFFF', textDecoration: 'none', fontSize: '0.9rem' }}
                          >
                            {att.profile?.full_name || 'Member'}
                          </Link>
                          <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                            {att.profile?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Committee / Role */}
                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#E2E8F0', fontSize: '0.84rem' }}>
                        {att.profile?.department?.name || 'Leadership'}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8', textTransform: 'capitalize' }}>
                        {(att.profile?.role || '').replace(/_/g, ' ')}
                      </div>
                    </td>

                    {/* Current Status Pill */}
                    <td style={{ padding: '1rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          background:
                            att.status === 'present'
                              ? 'rgba(52, 168, 83, 0.15)'
                              : att.status === 'late'
                              ? 'rgba(251, 188, 4, 0.15)'
                              : att.status === 'excused'
                              ? 'rgba(96, 165, 250, 0.15)'
                              : att.status === 'absent'
                              ? 'rgba(234, 67, 53, 0.15)'
                              : 'rgba(255, 255, 255, 0.08)',
                          color:
                            att.status === 'present'
                              ? '#4ADE80'
                              : att.status === 'late'
                              ? '#FBBF24'
                              : att.status === 'excused'
                              ? '#60A5FA'
                              : att.status === 'absent'
                              ? '#F87171'
                              : '#94A3B8',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {att.status === 'present' && <CheckCircle2 size={11} />}
                        {att.status === 'late' && <Clock size={11} />}
                        {att.status === 'excused' && <MessageSquare size={11} />}
                        {att.status === 'absent' && <XCircle size={11} />}
                        {att.status === 'pending' && <Clock3 size={11} />}
                        <span>{att.status.toUpperCase()}</span>
                      </span>
                    </td>

                    {/* Time / Notes */}
                    <td style={{ padding: '1rem 1rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                      {att.check_in_time && (
                        <div style={{ color: '#CBD5E1', fontSize: '0.78rem', marginBottom: '0.15rem' }}>
                          Checked in at {new Date(att.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {att.notes ? (
                        <div style={{ color: '#FBBF24', fontSize: '0.78rem', fontStyle: 'italic' }}>
                          Note: {att.notes}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNoteModalAttendee(att);
                            setNoteText(att.notes || '');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            fontSize: '0.74rem',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          + Add Note / Excuse
                        </button>
                      )}
                    </td>

                    {/* Quick 1-Click Status Switcher (HR / Leadership) */}
                    {canManageAttendance && (
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          {/* Present */}
                          <button
                            type="button"
                            title="Mark as Present"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(att.profile_id, 'present')}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              background: att.status === 'present' ? '#34A853' : 'rgba(52, 168, 83, 0.12)',
                              border: '1px solid rgba(52, 168, 83, 0.3)',
                              color: att.status === 'present' ? '#FFFFFF' : '#4ADE80',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Present
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            title="Mark as Late"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(att.profile_id, 'late')}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              background: att.status === 'late' ? '#FBBC04' : 'rgba(251, 188, 4, 0.12)',
                              border: '1px solid rgba(251, 188, 4, 0.3)',
                              color: att.status === 'late' ? '#000000' : '#FBBF24',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Late
                          </button>

                          {/* Excused */}
                          <button
                            type="button"
                            title="Mark as Excused"
                            disabled={isUpdating}
                            onClick={() => {
                              setNoteModalAttendee(att);
                              setNoteText(att.notes || '');
                            }}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              background: att.status === 'excused' ? '#4285F4' : 'rgba(66, 133, 244, 0.12)',
                              border: '1px solid rgba(66, 133, 244, 0.3)',
                              color: att.status === 'excused' ? '#FFFFFF' : '#60A5FA',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Excused
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            title="Mark as Absent"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(att.profile_id, 'absent')}
                            style={{
                              padding: '0.35rem 0.6rem',
                              borderRadius: '6px',
                              background: att.status === 'absent' ? '#EA4335' : 'rgba(234, 67, 53, 0.12)',
                              border: '1px solid rgba(234, 67, 53, 0.3)',
                              color: att.status === 'absent' ? '#FFFFFF' : '#F87171',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredAttendees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94A3B8' }}>
                    No attendees match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member On-The-Fly Modal */}
      {isAddModalOpen && (
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
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '480px',
              width: '100%',
              borderRadius: '20px',
              background: '#131B2E',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              padding: '1.75rem',
              color: '#FFFFFF',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Add Member to Meeting Roster
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
              Select an active member to add to this meeting's attendance ledger.
            </p>

            <form onSubmit={handleAddAttendee}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Choose Member
                </label>
                <select
                  required
                  value={selectedNewMemberId}
                  onChange={(e) => setSelectedNewMemberId(e.target.value)}
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
                  <option value="">Select a member...</option>
                  {availableMembers
                    .filter((m) => !attendees.some((a) => a.profile_id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#CBD5E1',
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedNewMemberId}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    background: '#4285F4',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isPending ? 'Adding...' : 'Add & Mark Present'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note / Excuse Modal */}
      {noteModalAttendee && (
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
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '460px',
              width: '100%',
              borderRadius: '20px',
              background: '#131B2E',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              padding: '1.75rem',
              color: '#FFFFFF',
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.35rem' }}>
              Excuse / Attendance Note
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
              Attendee: <strong>{noteModalAttendee.profile?.full_name}</strong>
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                Reason / Note
              </label>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="e.g. Midterm exam conflict / Medical reason / Approved early leave"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setNoteModalAttendee(null)}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#CBD5E1',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  handleStatusChange(noteModalAttendee.profile_id, 'excused', noteText);
                  setNoteModalAttendee(null);
                }}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  background: '#4285F4',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save as Excused
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
