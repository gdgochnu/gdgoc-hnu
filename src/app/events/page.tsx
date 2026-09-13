import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { EventsListClient } from '@/components/events/EventsListClient';
import { EventsSkeleton } from '@/components/skeletons/EventsSkeleton';
import { Event } from '@/types';
import { checkAndAutoTransitionPastEvents } from '@/app/events/actions';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function EventsDataLoader({
  profile,
  userId,
}: {
  profile: any;
  userId: string;
}) {
  const admin = createAdminClient();

  // 1. Fetch departments
  const { data: departmentsData } = await admin
    .from('departments')
    .select('id, name, code, branch')
    .order('name', { ascending: true });

  const departments = departmentsData || [];

  // 2. Fetch active members for event owner assignment
  const { data: membersData } = await admin
    .from('profiles')
    .select('id, full_name, full_name_en, email, avatar_url, department_id')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  const members = (membersData || []).map((m) => ({
    id: m.id,
    full_name: m.full_name,
    full_name_en: m.full_name_en,
    email: m.email,
    avatar_url: m.avatar_url,
    department_id: m.department_id,
  }));

  // 3. Auto-transition any past due events to 'completed' (§4.3 item 7)
  await checkAndAutoTransitionPastEvents();

  // 4. Fetch events based on role and RLS scope
  const isPresidential = ['president', 'co_president'].includes(profile.role);
  let eventsQuery = admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)')
    .order('event_date', { ascending: false });

  if (!isPresidential) {
    if (profile.role === 'branch_head' && profile.department?.branch) {
      const branchDepts = departments.filter((d) => d.branch === profile.department?.branch).map((d) => d.id);
      eventsQuery = eventsQuery.or(`department_id.in.(${branchDepts.join(',')}),status.in.(published,closed,completed)`);
    } else if (profile.department_id) {
      eventsQuery = eventsQuery.or(`department_id.eq.${profile.department_id},status.in.(published,closed,completed)`);
    } else {
      eventsQuery = eventsQuery.in('status', ['published', 'closed', 'completed']);
    }
  }

  const { data: eventsData } = await eventsQuery;
  const initialEvents: Event[] = (eventsData || []).map((e: any) => ({
    ...e,
    registration_fields: Array.isArray(e.registration_fields) ? e.registration_fields : [],
    owners: Array.isArray(e.owners) ? e.owners : [],
  }));

  return (
    <EventsListClient
      initialEvents={initialEvents}
      departments={departments}
      members={members}
      currentUserRole={profile.role}
      currentUserId={userId}
      userDepartmentId={profile.department_id}
    />
  );
}

export default async function EventsPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
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
              Sign In Required
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Please sign in to access chapter events and workshops.
            </p>
            <Link href="/" className="btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1240px', margin: '0 auto', width: '100%' }} suppressHydrationWarning>
        <Suspense fallback={<EventsSkeleton />}>
          <EventsDataLoader profile={context.profile} userId={context.user.id} />
        </Suspense>
      </div>
    </AppShell>
  );
}
