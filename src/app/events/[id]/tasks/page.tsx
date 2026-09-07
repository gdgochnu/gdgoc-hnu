import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { EventTaskList } from '@/components/events/EventTaskList';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventTasksPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventTasksPage({ params }: EventTasksPageProps) {
  const { id } = await params;
  const context = await getUserContext();
  const admin = createAdminClient();

  // Fetch Event Details
  const { data: event, error: eventErr } = await admin
    .from('events')
    .select('id, title, department_id, status, departments:department_id(id, name, code, branch)')
    .eq('id', id)
    .maybeSingle();

  if (eventErr || !event) {
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
              The requested event does not exist.
            </p>
            <Link href="/events" className="btn-primary">
              Return to Events
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // Fetch tasks tied to this event
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

  // Fetch departments & members for modal
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

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1240px', margin: '0 auto' }} suppressHydrationWarning>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              href={`/events/${event.id}`}
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
              <span>Back to {event.title}</span>
            </Link>
          </div>

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
