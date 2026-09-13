import React from 'react';
import { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { checkUserCheckinAccess } from '@/app/events/actions';
import { EventAttendeesLedgerClient, TicketHolderItem } from '@/components/events/EventAttendeesLedgerClient';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ticket Holders & Attendance Ledger — GDGoC HNU OS',
  description: 'View registered attendees, live single-use check-in status, and event capacity statistics.',
};

interface AttendeesPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventAttendeesPage({ params }: AttendeesPageProps) {
  const { id } = await params;
  const context = await getUserContext();

  // 1. Authentication Check
  if (!context.user || !context.profile) {
    redirect(`/auth/login?redirect=/events/${id}/attendees`);
  }

  const admin = createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 2. Resolve Event
  const eventQuery = admin
    .from('events')
    .select('id, title, slug, status, event_date, start_time, capacity, venue, department_id, checkin_access_profile_ids, owners');

  const { data: event, error: eventErr } = isUuid
    ? await eventQuery.eq('id', id).maybeSingle()
    : await eventQuery.eq('slug', id).maybeSingle();

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

  // 3. Authorization Check
  const userRole = context.profile.role;
  const isLeadership = ['president', 'co_president', 'branch_head'].includes(userRole);
  const isDeptHead = context.profile.department_id === event.department_id && ['committee_head', 'committee_co_head'].includes(userRole);
  const isOwner = Array.isArray(event.owners) && event.owners.some((o: any) => o.profile_id === context.user?.id);
  const accessCheck = await checkUserCheckinAccess(event.id, context.user.id);
  const canViewAttendees = isLeadership || isDeptHead || isOwner || accessCheck.hasAccess;

  if (!canViewAttendees) {
    return (
      <AppShell>
        <div style={{ maxWidth: '640px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{
            padding: '3.5rem 2rem',
            borderRadius: '20px',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            background: 'linear-gradient(180deg, rgba(234, 67, 53, 0.08) 0%, rgba(19, 27, 46, 0.95) 100%)',
          }}>
            <ShieldAlert size={36} color="var(--google-red)" style={{ margin: '0 auto 1.5rem' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.75rem', color: '#FFFFFF' }}>
              Access Restricted
            </h1>
            <p style={{ color: '#CBD5E1', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              You do not have administrative permissions to view the ticket holders ledger for <strong>{event.title}</strong>.
            </p>
            <Link href={`/events/${event.id}`} className="btn-primary">
              Back to Event Workspace
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 4. Fetch all registrations and attendance records in parallel
  const [registrationsRes, attendanceRes] = await Promise.all([
    admin
      .from('event_registrations')
      .select('id, full_name, email, phone, status, qr_code, created_at, profile_id')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false }),
    admin
      .from('attendance')
      .select('id, registration_id, check_in_time, method')
      .eq('event_id', event.id),
  ]);

  const rawRegistrations = registrationsRes.data || [];
  const attendanceList = attendanceRes.data || [];

  // Map attendance by registration_id
  const attendanceMap = new Map<string, { check_in_time: string; method: string }>();
  attendanceList.forEach((att) => {
    if (att.registration_id) {
      attendanceMap.set(att.registration_id, {
        check_in_time: att.check_in_time,
        method: att.method,
      });
    }
  });

  const attendees: TicketHolderItem[] = rawRegistrations.map((reg) => {
    const checkin = attendanceMap.get(reg.id);
    return {
      id: reg.id,
      fullName: reg.full_name,
      email: reg.email,
      phone: reg.phone,
      status: reg.status,
      qrCode: reg.qr_code,
      createdAt: reg.created_at,
      profileId: reg.profile_id,
      isCheckedIn: !!checkin,
      checkInTime: checkin?.check_in_time || null,
      checkInMethod: checkin?.method || null,
    };
  });

  return (
    <AppShell>
      <EventAttendeesLedgerClient
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          event_date: event.event_date,
          start_time: event.start_time,
          capacity: event.capacity,
          venue: event.venue,
        }}
        initialAttendees={attendees}
        canManageCheckin={accessCheck.hasAccess || isLeadership || isDeptHead}
      />
    </AppShell>
  );
}
