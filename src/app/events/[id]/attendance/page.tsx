import React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { checkUserCheckinAccess, getEventAttendanceStream } from '@/app/events/actions';
import { EventCheckinScanner } from '@/components/events/EventCheckinScanner';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert, ArrowLeft, Calendar, QrCode } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AttendancePageProps {
  params: Promise<{ id: string }>;
}

export default async function EventAttendancePage({ params }: AttendancePageProps) {
  const { id } = await params;
  const context = await getUserContext();

  // 1. Authentication Guard
  if (!context.user || !context.profile) {
    redirect(`/auth/login?redirect=/events/${id}/attendance`);
  }

  const admin = createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 2. Fetch Event
  const query = admin
    .from('events')
    .select('id, title, slug, status, event_date, start_time, checkin_access_profile_ids, department:departments(name, code)');

  const { data: event, error: eventErr } = isUuid
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('slug', id).maybeSingle();

  if (eventErr || !event) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <ShieldAlert size={36} color="var(--google-red)" style={{ margin: '0 auto 1rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Event Not Found
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '2rem' }}>
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

  // 3. Strict Check-in Duty Access Gating (§4.3 item 5 & §4.4)
  // Only profiles in checkin_access_profile_ids, plus HR role and President/Co-President can open this screen.
  const accessCheck = await checkUserCheckinAccess(event.id, context.user.id);

  if (!accessCheck.hasAccess) {
    return (
      <AppShell>
        <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{
            padding: '3.5rem 2rem',
            borderRadius: '20px',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            background: 'linear-gradient(180deg, rgba(234, 67, 53, 0.08) 0%, rgba(19, 27, 46, 0.95) 100%)',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(234, 67, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <ShieldAlert size={30} color="var(--google-red)" />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', color: '#FFFFFF' }}>
              Check-in Access Restricted
            </h1>

            <p style={{ color: '#CBD5E1', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              You do not have attendance check-in duty assigned for <strong>{event.title}</strong>.
            </p>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '0.84rem',
              color: '#94A3B8',
              textAlign: 'left',
              marginBottom: '2rem',
              lineHeight: 1.6,
            }}>
              <div style={{ fontWeight: 700, color: '#F1F5F9', marginBottom: '0.25rem' }}>
                Access Policy (§4.3 item 5):
              </div>
              Attendance check-in duty is restricted strictly to profiles specifically assigned to this event's check-in duty team, the HR department, and Chapter Leadership. A Committee Head with no assigned duty on this event cannot open this screen.
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <Link href={`/events/${event.id}`} className="btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.86rem' }}>
                Return to Event Workspace
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // 4. Authorized: Fetch initial attendance stream and stats
  const initialStats = await getEventAttendanceStream(event.id);

  return (
    <AppShell>
      <EventCheckinScanner
        eventId={event.id}
        eventTitle={event.title}
        initialStats={initialStats}
        accessReason={accessCheck.reason}
        officerName={context.profile.full_name}
      />
    </AppShell>
  );
}
