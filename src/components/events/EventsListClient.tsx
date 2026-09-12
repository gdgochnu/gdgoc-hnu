'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Event, EventStatus } from '@/types';
import { EventBuilderModal } from '@/components/events/EventBuilderModal';
import { EditEventButton } from '@/components/events/EditEventButton';
import { deleteEventDraft } from '@/app/events/actions';
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  Sparkles, 
  Trash2, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle
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

interface EventsListClientProps {
  initialEvents: Event[];
  departments: DepartmentOption[];
  members: MemberOption[];
  currentUserRole?: string;
  currentUserId?: string;
  userDepartmentId?: string | null;
}

export function EventsListClient({
  initialEvents,
  departments,
  members,
  currentUserRole,
  currentUserId,
  userDepartmentId,
}: EventsListClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review' | 'published' | 'completed'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const canCreate = currentUserRole ? ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(currentUserRole) : false;

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: events.length,
      drafts: events.filter(e => e.status === 'draft').length,
      inReview: events.filter(e => ['submitted_for_review', 'branch_review', 'pending_final_approval'].includes(e.status)).length,
      published: events.filter(e => ['approved', 'published'].includes(e.status)).length,
      completed: events.filter(e => e.status === 'completed').length,
    };
  }, [events]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchVenue = e.venue?.toLowerCase().includes(q) || false;
        const matchSlug = e.slug.toLowerCase().includes(q);
        if (!matchTitle && !matchVenue && !matchSlug) return false;
      }

      // Department
      if (deptFilter !== 'all' && e.department_id !== deptFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'draft' && e.status !== 'draft') return false;
      if (statusFilter === 'review' && !['submitted_for_review', 'branch_review', 'pending_final_approval'].includes(e.status)) return false;
      if (statusFilter === 'published' && !['approved', 'published'].includes(e.status)) return false;
      if (statusFilter === 'completed' && e.status !== 'completed') return false;

      return true;
    });
  }, [events, searchQuery, statusFilter, deptFilter]);

  const handleEventCreated = (newEvent: Event) => {
    setEvents([newEvent, ...events]);
  };

  const handleDeleteDraft = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this event draft?')) return;

    try {
      setActionError(null);
      const res = await deleteEventDraft(eventId);
      if (!res.success) {
        setActionError(res.error || 'Failed to delete event draft.');
      } else {
        setEvents(events.filter(ev => ev.id !== eventId));
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error deleting event draft.');
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'draft':
        return { label: 'Draft', bg: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', border: 'rgba(251, 188, 4, 0.3)' };
      case 'submitted_for_review':
      case 'branch_review':
      case 'pending_final_approval':
        return { label: 'In Review', bg: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', border: 'rgba(66, 133, 244, 0.3)' };
      case 'approved':
        return { label: 'Approved', bg: 'rgba(52, 168, 83, 0.15)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.3)' };
      case 'published':
        return { label: 'Published (Live)', bg: 'rgba(52, 168, 83, 0.2)', color: '#4ADE80', border: 'rgba(52, 168, 83, 0.4)' };
      case 'completed':
        return { label: 'Completed', bg: 'rgba(168, 85, 247, 0.15)', color: '#D8B4FE', border: 'rgba(168, 85, 247, 0.3)' };
      case 'closed':
        return { label: 'Closed', bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)', border: 'rgba(255, 255, 255, 0.15)' };
      case 'rejected':
        return { label: 'Changes Requested', bg: 'rgba(234, 67, 53, 0.15)', color: '#FCA5A5', border: 'rgba(234, 67, 53, 0.3)' };
      default:
        return { label: status, bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner & Action */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Calendar size={22} color="var(--google-blue)" />
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Events Hub & Lifecycle
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.4rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Design and launch chapter workshops, hackathons, and study jams. Complete draft creation, attach tasks, submit for review, and issue attendance QR codes.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              fontSize: '0.92rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
              boxShadow: '0 4px 16px rgba(66, 133, 244, 0.35)',
            }}
          >
            <Plus size={18} />
            <span>Create New Event</span>
          </button>
        )}
      </div>

      {actionError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(234, 67, 53, 0.12)',
          border: '1px solid rgba(234, 67, 53, 0.3)',
          color: '#FCA5A5',
          fontSize: '0.9rem',
        }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Stats Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Events
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF' }}>
            {stats.total}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-yellow)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Drafts in Progress
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FDE047' }}>
            {stats.drafts}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-blue)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Awaiting Review
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#93C5FD' }}>
            {stats.inReview}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid var(--google-green)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Live & Published
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#86EFAC' }}>
            {stats.published}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', borderLeft: '3px solid #A855F7' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Completed
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#D8B4FE' }}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel" style={{
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-subtle)',
          padding: '0.55rem 0.85rem',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '320px',
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, venue, or slug..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.88rem',
              outline: 'none',
              width: '100%',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '0.25rem',
            border: '1px solid var(--border-subtle)',
          }}>
            {(['all', 'draft', 'review', 'published', 'completed'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: statusFilter === s ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: statusFilter === s ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                {s === 'review' ? 'In Review' : s}
              </button>
            ))}
          </div>

          {/* Committee Select */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="all">All Committees</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'rgba(66, 133, 244, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Calendar size={28} color="var(--google-blue)" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            No Events Found
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            {searchQuery || statusFilter !== 'all' || deptFilter !== 'all'
              ? 'No events match your current filter criteria. Try clearing search filters.'
              : 'There are no events created yet. Start planning the chapter’s next big workshop or hackathon!'}
          </p>
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontSize: '0.88rem' }}
            >
              <Plus size={16} />
              <span>Create Event Draft</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem',
        }}>
          {filteredEvents.map((event) => {
            const badge = getStatusBadge(event.status);
            const isDraft = event.status === 'draft';
            const dept = departments.find(d => d.id === event.department_id);

            const canEditThisEvent =
              ['president', 'co_president', 'branch_head'].includes(currentUserRole || '') ||
              (userDepartmentId && userDepartmentId === event.department_id && ['committee_head', 'committee_co_head'].includes(currentUserRole || '')) ||
              (Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === currentUserId)) ||
              event.created_by === currentUserId;

            return (
              <div
                key={event.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* Top Status Accent Bar */}
                <div style={{
                  height: '4px',
                  background: isDraft
                    ? 'var(--google-yellow)'
                    : event.status === 'published'
                    ? 'var(--google-green)'
                    : 'var(--google-blue)',
                }} />

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {/* Header: Host Committee & Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                    }}>
                      <Building2 size={13} color="var(--google-blue)" />
                      <span>{dept?.name || 'Committee'}</span>
                    </span>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.35rem', letterSpacing: '-0.01em', lineHeight: 1.35, color: '#FFFFFF' }}>
                      {event.title}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#93C5FD', fontFamily: 'monospace', marginBottom: '0.5rem' }}>
                      /events/{event.slug}
                    </div>
                    {event.description ? (
                      <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {event.description}
                      </p>
                    ) : null}
                  </div>

                  {/* Key Logistics Metadata */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.65rem',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    fontSize: '0.82rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Calendar size={14} color="var(--google-yellow)" />
                      <span style={{ fontWeight: 600, color: '#FFFFFF' }}>
                        {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} color="var(--google-blue)" />
                      <span>
                        {event.start_time ? event.start_time.slice(0, 5) : 'TBD'}
                        {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', gridColumn: 'span 2' }}>
                      <MapPin size={14} color="var(--google-red)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.venue || 'Venue to be confirmed'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <Users size={14} color="var(--google-green)" />
                      <span>Capacity: {event.capacity || 'Unlimited'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                      <HelpCircle size={14} color="#A855F7" />
                      <span>{event.registration_fields?.length || 0} Questions</span>
                    </div>
                  </div>

                  {/* Owners Chips */}
                  {event.owners && event.owners.length > 0 && (
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                        EVENT LEADS
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {event.owners.slice(0, 3).map((o, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {o.full_name || 'Lead'} • {o.committee_role}
                          </span>
                        ))}
                        {event.owners.length > 3 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '0.15rem 0.4rem' }}>
                            +{event.owners.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div style={{
                  padding: '0.85rem 1.25rem',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {isDraft && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteDraft(event.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#F87171',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                        }}
                        title="Delete Draft Event"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    )}

                    {canEditThisEvent && (
                      <EditEventButton
                        event={event}
                        departments={departments}
                        label="Edit"
                        variant="secondary"
                      />
                    )}
                  </div>

                  <Link
                    href={`/events/${event.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: 'var(--google-blue)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Manage Event</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating Event Draft */}
      <EventBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleEventCreated}
        departments={departments}
        members={members}
        defaultDepartmentId={userDepartmentId || undefined}
      />
    </div>
  );
}
