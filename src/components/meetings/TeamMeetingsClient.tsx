'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Users,
  Plus,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Search,
  Filter,
  Sparkles,
  ChevronRight,
  UserCheck,
  Building2,
  CalendarPlus
} from 'lucide-react';
import { TeamMeeting, DepartmentBranch } from '@/types';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';

interface TeamMeetingsClientProps {
  initialMeetings: TeamMeeting[];
  canSchedule: boolean;
  departments: Array<{ id: string; name: string; code: string; branch: DepartmentBranch }>;
  members: Array<{ id: string; full_name: string; role: string; department_id: string | null; email: string; avatar_url: string | null }>;
  currentUserId: string;
}

export function TeamMeetingsClient({
  initialMeetings,
  canSchedule,
  departments,
  members,
  currentUserId,
}: TeamMeetingsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tabs & filters
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my' | 'past'>('upcoming');
  const [typeFilter, setTypeFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'all_team' | 'branch' | 'department'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // Client-side filtering for fast instant responsiveness
  const filteredMeetings = initialMeetings.filter((m) => {
    // Tab filter
    if (activeTab === 'past') {
      if (m.meeting_date >= today && m.status !== 'completed') return false;
    } else if (activeTab === 'upcoming') {
      if (m.meeting_date < today || m.status === 'cancelled' || m.status === 'completed') return false;
    } else if (activeTab === 'my') {
      const isInvited = m.my_attendance != null;
      const isOrganizer = m.created_by === currentUserId || m.facilitator_id === currentUserId;
      if (!isInvited && !isOrganizer) return false;
    }

    // Type filter
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;

    // Audience filter
    if (audienceFilter !== 'all' && m.target_audience_type !== audienceFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchCreator = m.creator?.full_name.toLowerCase().includes(q);
      const matchDept = m.target_department?.name.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchCreator && !matchDept) return false;
    }

    return true;
  });

  const getAudienceLabel = (meeting: TeamMeeting) => {
    switch (meeting.target_audience_type) {
      case 'all_team':
        return 'All Chapter Team';
      case 'branch':
        return meeting.target_branch === 'tech' ? 'Technical Branch' : 'Non-Technical Branch';
      case 'department':
        return meeting.target_department?.name || 'Department Meeting';
      case 'selected_members':
        return 'Selected Members';
      default:
        return 'Team Meeting';
    }
  };

  const getStatusBadge = (meeting: TeamMeeting) => {
    if (meeting.status === 'cancelled') {
      return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
    }
    if (meeting.status === 'completed' || meeting.meeting_date < today) {
      return { label: 'Completed', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
    }
    if (meeting.meeting_date === today) {
      return { label: 'Happening Today', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
    }
    return { label: 'Scheduled', color: '#4ADE80', bg: 'rgba(74, 222, 128, 0.12)', border: 'rgba(74, 222, 128, 0.25)' };
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 5rem' }}>
      {/* Top Banner Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                borderRadius: '12px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#60A5FA',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid rgba(66, 133, 244, 0.3)',
              }}
            >
              <Users size={12} />
              INTERNAL OPERATIONS
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            Team Meetings & Attendance
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#94A3B8', marginTop: '0.35rem', maxWidth: '640px' }}>
            Official internal meetings, online syncs, physical gatherings, and HR attendance tracking.
          </p>
        </div>

        {/* Schedule Meeting Button (President & Branch Heads Only) */}
        {canSchedule && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            style={{
              padding: '0.8rem 1.4rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 20px rgba(66, 133, 244, 0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            <Plus size={18} />
            <span>Schedule Team Meeting</span>
          </button>
        )}
      </div>

      {/* Tabs & Controls Header */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Main Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'upcoming', label: 'Upcoming Meetings', icon: Calendar },
              { id: 'my', label: 'My Meetings', icon: UserCheck },
              { id: 'past', label: 'Past Meetings', icon: Clock3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.1rem',
                    borderRadius: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: isActive ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: isActive ? '1px solid #4285F4' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#60A5FA' : '#94A3B8',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search meetings..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.3rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Filter Pills: Type & Scope */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>
            <Filter size={13} />
            <span>FORMAT:</span>
          </div>

          {[
            { id: 'all', label: 'All Formats' },
            { id: 'online', label: 'Online 🌐' },
            { id: 'offline', label: 'In-Person 📍' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTypeFilter(item.id as any)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: typeFilter === item.id ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                border: typeFilter === item.id ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
                color: typeFilter === item.id ? '#FFFFFF' : '#94A3B8',
              }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ width: '1px', height: '18px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 0.25rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 700 }}>
            <Building2 size={13} />
            <span>AUDIENCE:</span>
          </div>

          {[
            { id: 'all', label: 'All Audiences' },
            { id: 'all_team', label: 'All Team' },
            { id: 'branch', label: 'Branch' },
            { id: 'department', label: 'Committee' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAudienceFilter(item.id as any)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: audienceFilter === item.id ? 'rgba(251, 188, 4, 0.15)' : 'transparent',
                border: audienceFilter === item.id ? '1px solid rgba(251, 188, 4, 0.35)' : '1px solid transparent',
                color: audienceFilter === item.id ? '#FBBF24' : '#94A3B8',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meetings Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredMeetings.map((meeting) => {
          const statusBadge = getStatusBadge(meeting);
          const isOnline = meeting.type === 'online';
          const myAtt = meeting.my_attendance;

          return (
            <div
              key={meeting.id}
              className="glass-panel"
              style={{
                borderRadius: '18px',
                background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
                border: '1px solid rgba(66, 133, 244, 0.2)',
                padding: '1.5rem',
                boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
                transition: 'border-color 0.2s, transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {/* Meeting Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    {/* Status Badge */}
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        background: statusBadge.bg,
                        border: `1px solid ${statusBadge.border}`,
                        color: statusBadge.color,
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {statusBadge.label}
                    </span>

                    {/* Format Badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        background: isOnline ? 'rgba(66, 133, 244, 0.12)' : 'rgba(52, 168, 83, 0.12)',
                        border: isOnline ? '1px solid rgba(66, 133, 244, 0.25)' : '1px solid rgba(52, 168, 83, 0.25)',
                        color: isOnline ? '#93C5FD' : '#86EFAC',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                      }}
                    >
                      {isOnline ? <Video size={12} /> : <MapPin size={12} />}
                      <span>{isOnline ? 'Online Meeting' : 'In-Person'}</span>
                    </span>

                    {/* Audience Scope Badge */}
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        background: 'rgba(251, 188, 4, 0.1)',
                        border: '1px solid rgba(251, 188, 4, 0.25)',
                        color: '#FDE047',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                      }}
                    >
                      {getAudienceLabel(meeting)}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem', lineHeight: 1.3 }}>
                    {meeting.title}
                  </h2>

                  {meeting.description && (
                    <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                      {meeting.description}
                    </p>
                  )}
                </div>

                {/* Date & Time Box */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '0.85rem 1.1rem',
                    textAlign: 'right',
                    minWidth: '170px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', color: '#60A5FA', fontSize: '0.88rem', fontWeight: 800, marginBottom: '0.2rem' }}>
                    <Calendar size={14} />
                    <span>{new Date(meeting.meeting_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', color: '#CBD5E1', fontSize: '0.82rem', fontWeight: 600 }}>
                    <Clock size={13} color="#4ADE80" />
                    <span>{meeting.start_time} {meeting.end_time ? `– ${meeting.end_time}` : ''}</span>
                  </div>
                </div>
              </div>

              {/* Meeting Venue / Link Box */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  padding: '0.85rem 1.1rem',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {isOnline ? (
                    <>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Video size={16} color="#60A5FA" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F1F5F9' }}>
                          Online Meeting Room
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                          {meeting.online_meeting_url || 'Link provided upon meeting'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MapPin size={16} color="#4ADE80" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F1F5F9' }}>
                          {meeting.location || 'Campus Meeting Venue'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                          Physical attendance required
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Direct Action: Join or View details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {isOnline && meeting.online_meeting_url && (
                    <a
                      href={meeting.online_meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        boxShadow: '0 2px 10px rgba(66, 133, 244, 0.3)',
                      }}
                    >
                      <Video size={14} />
                      <span>Join Meeting</span>
                      <ExternalLink size={12} />
                    </a>
                  )}

                  <Link
                    href={`/meetings/${meeting.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.9rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#F1F5F9',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Attendance Ledger</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Card Footer Info: Attendees count & Current Member Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  paddingTop: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={14} color="#60A5FA" />
                    <span><strong>{meeting.attendees_count || 0}</strong> Team Members Invited</span>
                  </div>

                  {meeting.creator && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>Organized by <strong>{meeting.creator.full_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* My Attendance Status Badge */}
                {myAtt ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Your Status:</span>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        background:
                          myAtt.status === 'present'
                            ? 'rgba(52, 168, 83, 0.15)'
                            : myAtt.status === 'late'
                            ? 'rgba(251, 188, 4, 0.15)'
                            : myAtt.status === 'excused'
                            ? 'rgba(96, 165, 250, 0.15)'
                            : myAtt.status === 'absent'
                            ? 'rgba(234, 67, 53, 0.15)'
                            : 'rgba(255, 255, 255, 0.08)',
                        color:
                          myAtt.status === 'present'
                            ? '#4ADE80'
                            : myAtt.status === 'late'
                            ? '#FBBF24'
                            : myAtt.status === 'excused'
                            ? '#60A5FA'
                            : myAtt.status === 'absent'
                            ? '#F87171'
                            : '#CBD5E1',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {myAtt.status.toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Not on invite list
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {filteredMeetings.length === 0 && (
          <div
            className="glass-panel"
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              borderRadius: '20px',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              background: 'rgba(15, 23, 42, 0.4)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(66, 133, 244, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <Calendar size={32} color="#60A5FA" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
              No Meetings Found
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94A3B8', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              {activeTab === 'my'
                ? "You don't have any meetings scheduled or assigned yet."
                : activeTab === 'past'
                ? 'No past meeting history found.'
                : 'No upcoming meetings scheduled at the moment.'}
            </p>

            {canSchedule && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                style={{
                  padding: '0.75rem 1.4rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Plus size={16} />
                <span>Schedule New Meeting</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(id) => {
          router.refresh();
          router.push(`/meetings/${id}`);
        }}
        departments={departments}
        members={members}
      />
    </div>
  );
}
