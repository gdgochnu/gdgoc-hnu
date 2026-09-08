import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { EventTaskList } from '@/components/events/EventTaskList';
import { CheckinAccessManager } from '@/components/events/CheckinAccessManager';
import { EventReviewBanner } from '@/components/events/EventReviewBanner';
import { PublicEventView } from '@/components/events/PublicEventView';
import { Event, EventStatus } from '@/types';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Building2, 
  CheckSquare, 
  HelpCircle, 
  ArrowLeft, 
  ShieldAlert, 
  ChevronRight,
  ExternalLink,
  Sparkles,
  Lock,
  Globe
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const isPublicViewRequested = sParams.view === 'public';
  const context = await getUserContext();
  const admin = createAdminClient();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Fetch Event Details (by UUID or slug)
  const query = admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)');

  const { data: eventData, error: eventErr } = isUuid
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('slug', id).maybeSingle();

  if (eventErr || !eventData) {
    if (!isUuid || !context.profile) {
      // Public 404
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0B0F19',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2rem', borderRadius: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(234, 67, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <ShieldAlert size={28} color="var(--google-red)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Event Not Found
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              The event you are looking for does not exist or registration is not open yet.
            </p>
            <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
              Back to Home
            </Link>
          </div>
        </div>
      );
    }

    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }} suppressHydrationWarning>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(234, 67, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <ShieldAlert size={28} color="var(--google-red)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Event Not Found
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              The requested event does not exist or has been removed.
            </p>
            <Link href="/events" className="btn-primary">
              Return to Events
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const event: Event = {
    ...eventData,
    registration_fields: Array.isArray(eventData.registration_fields) ? eventData.registration_fields : [],
    owners: Array.isArray(eventData.owners) ? eventData.owners : [],
  };

  // Determine whether to display the Public Event Page or the Internal Management Console
  const isPublicRoute = !isUuid || isPublicViewRequested;

  if (isPublicRoute) {
    // If not published, check if user is allowed to preview
    const isLeadership = context.profile && ['president', 'co_president', 'branch_head'].includes(context.profile.role);
    const isOwner = Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === context.user?.id);
    const isDeptHead = context.profile?.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(context.profile?.role || '');
    const canPreview = isLeadership || isOwner || isDeptHead || event.created_by === context.user?.id;

    if (event.status !== 'published' && !canPreview) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0B0F19',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          textAlign: 'center',
        }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '3.5rem 2rem', borderRadius: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(251, 188, 4, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Lock size={28} color="#FBBC04" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Registration Not Open
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Registration for <strong>{event.title}</strong> is currently not available to the public. Please stay tuned on our official channels.
            </p>
            <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', padding: '0.75rem 1.5rem', borderRadius: '8px' }}>
              Back to Home
            </Link>
          </div>
        </div>
      );
    }

    // Fetch live registration counts for public page
    const { count: regCount } = await admin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'registered');

    const { count: waitCount } = await admin
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('status', 'waitlisted');

    const totalRegistered = regCount ?? 0;
    const totalWaitlisted = waitCount ?? 0;
    const capacity = event.capacity;
    const isCapacityFull = capacity !== null && capacity > 0 && totalRegistered >= capacity;
    const spotsRemaining = capacity !== null && capacity > 0 ? Math.max(0, capacity - totalRegistered) : null;

    return (
      <PublicEventView
        event={event}
        registeredCount={totalRegistered}
        waitlistCount={totalWaitlisted}
        isCapacityFull={isCapacityFull}
        spotsRemaining={spotsRemaining}
        isPreview={event.status !== 'published'}
        userContext={{
          isLoggedIn: !!context.profile,
          fullName: context.profile?.full_name,
          email: context.user?.email,
          role: context.profile?.role,
        }}
      />
    );
  }

  // Internal Workspace Guard: If accessed by UUID without public view flag, require login
  if (!context.profile) {
    if (event.status === 'published') {
      redirect(`/events/${event.slug}`);
    } else {
      redirect(`/auth/login?redirect=/events/${id}`);
    }
  }

  // 2. Fetch all tasks tied to this event (Step 8.2)
  const { data: tasksData } = await admin
    .from('tasks')
    .select(`
      id,
      title,
      description,
      department_id,
      assignee_id,
      created_by,
      delegated_by_id,
      parent_task_id,
      assignment_mode,
      event_id,
      priority,
      status,
      deadline,
      evidence_url,
      approval_instance_id,
      created_at,
      updated_at,
      departments:department_id (id, name, code, branch),
      assignee:assignee_id (id, full_name, avatar_url, role, position),
      task_assignees (
        id,
        profile_id,
        status,
        evidence_url,
        submitted_at,
        profile:profile_id (id, full_name, avatar_url, role, position)
      )
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: false });

  const tasks = tasksData || [];

  // 3. Fetch departments & active members for task creation modal
  const [deptRes, memberRes] = await Promise.all([
    admin.from('departments').select('id, name, code, branch').order('name'),
    admin.from('profiles').select('id, full_name, full_name_en, email, avatar_url, department_id').eq('status', 'active').order('full_name'),
  ]);

  const departments = deptRes.data || [];
  const members = (memberRes.data || []).map(m => ({
    id: m.id,
    full_name: m.full_name,
    full_name_en: m.full_name_en,
    email: m.email,
    avatar_url: m.avatar_url,
    department_id: m.department_id,
  }));

  const isPresidential = context.profile?.role ? ['president', 'co_president'].includes(context.profile.role) : false;
  const isDeptHead = context.profile?.department_id === event.department_id;
  const canManage = isPresidential || isDeptHead;

  // 4. Fetch profiles with Check-in Access (Step 8.3)
  const checkinProfileIds: string[] = Array.isArray(event.checkin_access_profile_ids)
    ? event.checkin_access_profile_ids
    : [];

  let initialCheckinMembers: any[] = [];
  if (checkinProfileIds.length > 0) {
    const { data: cMembers } = await admin
      .from('profiles')
      .select('id, full_name, full_name_en, email, avatar_url, role, department:department_id(name, code)')
      .in('id', checkinProfileIds);
    initialCheckinMembers = cMembers || [];
  }

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
      default:
        return { label: status, bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: 'rgba(255, 255, 255, 0.15)' };
    }
  };

  const statusBadge = getStatusBadge(event.status);

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1240px', margin: '0 auto' }} suppressHydrationWarning>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Breadcrumb Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <Link
              href="/events"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Events Hub</span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                href={`/events/${event.id}/tasks`}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
              >
                <CheckSquare size={14} color="var(--google-blue)" />
                <span>Dedicated Tasks View</span>
              </Link>
            </div>
          </div>

          {/* Event Review & Approval Banner (Step 8.4) */}
          <EventReviewBanner event={event} canManage={canManage} />

          {/* Event Hero Banner */}
          <div className="glass-panel" style={{
            padding: '2.5rem 2rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            {/* Top Google Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: event.status === 'draft'
                ? 'var(--google-yellow)'
                : event.status === 'published'
                ? 'var(--google-green)'
                : 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: statusBadge.bg,
                    color: statusBadge.color,
                    border: `1px solid ${statusBadge.border}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {statusBadge.label}
                  </span>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                  }}>
                    <Building2 size={13} color="var(--google-blue)" />
                    <span>{event.department?.name || 'Hosting Committee'}</span>
                  </span>
                </div>

                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.4rem', color: '#FFFFFF' }}>
                  {event.title}
                </h1>
                <div style={{ fontSize: '0.88rem', color: '#93C5FD', fontFamily: 'monospace' }}>
                  /events/{event.slug}
                </div>
              </div>

              {/* Event Quick Stats */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>EVENT DATE</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.92rem' }}>
                    <Calendar size={14} color="var(--google-yellow)" />
                    <span>{new Date(event.event_date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div style={{ width: '1px', background: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TASKS LINKED</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.92rem', color: '#93C5FD' }}>
                    <CheckSquare size={14} />
                    <span>{tasks.length} Tasks</span>
                  </div>
                </div>

                <div style={{ width: '1px', background: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CAPACITY</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.92rem', color: '#86EFAC' }}>
                    <Users size={14} />
                    <span>{event.capacity || 'Unlimited'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logistics Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: '0.85rem',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>VENUE / LOCATION</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <MapPin size={14} color="var(--google-red)" />
                  {event.venue || 'TBD'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>TIMING</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <Clock size={14} color="var(--google-blue)" />
                  {event.start_time ? event.start_time.slice(0, 5) : 'TBD'}
                  {event.end_time ? ` - ${event.end_time.slice(0, 5)}` : ''}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>CUSTOM REGISTRATION FIELDS</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <HelpCircle size={14} color="#A855F7" />
                  {event.registration_fields.length} Questions Defined
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>EVENT LEADS / OWNERS</span>
                <span style={{ fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <Users size={14} color="var(--google-green)" />
                  {event.owners.length} Assigned Leads
                </span>
              </div>
            </div>

            {event.description && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                  Description & Agenda
                </span>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.92rem', margin: 0 }}>
                  {event.description}
                </p>
              </div>
            )}
          </div>

          {/* Check-in Access Management (Step 8.3) */}
          <CheckinAccessManager
            eventId={event.id}
            eventTitle={event.title}
            initialAssignedMembers={initialCheckinMembers}
            availableMembers={members}
            canManage={canManage}
          />

          {/* Event Task List (Step 8.2 Highlight) */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <EventTaskList
              eventId={event.id}
              eventTitle={event.title}
              eventDepartmentId={event.department_id}
              initialTasks={tasks}
              departments={departments}
              members={members}
              canManage={canManage}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
