import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { ContentCalendarClient } from '@/components/workspace/ContentCalendarClient';
import { ContentCalendarSkeleton } from '@/components/skeletons/ContentCalendarSkeleton';
import { Event } from '@/types';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function ContentCalendarDataLoader({ profile, isPresidential }: { profile: any; isPresidential: boolean }) {
  const admin = createAdminClient();

  // Fetch departments
  const { data: departmentsData } = await admin
    .from('departments')
    .select('id, name, code, branch')
    .order('name', { ascending: true });
  const departments = departmentsData || [];

  // Fetch events
  let eventsQuery = admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)')
    .order('event_date', { ascending: true });

  if (!isPresidential) {
    if (profile.department_id) {
      eventsQuery = eventsQuery.or(
        `department_id.eq.${profile.department_id},status.in.(published,closed,completed)`
      );
    } else {
      eventsQuery = eventsQuery.in('status', ['published', 'closed', 'completed']);
    }
  }

  const { data: eventsData } = await eventsQuery;
  const events: Event[] = (eventsData || []).map((e: any) => ({
    ...e,
    registration_fields: Array.isArray(e.registration_fields) ? e.registration_fields : [],
    owners: Array.isArray(e.owners) ? e.owners : [],
  }));

  return (
    <ContentCalendarClient
      events={events}
      currentUserRole={profile.role}
      departments={departments}
    />
  );
}

export default async function ContentCalendarPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    return (
      <AppShell>
        <div style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Sign In Required</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Access the chapter content calendar by signing in first.
            </p>
            <Link href="/" className="btn-primary">Return to Home</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const profile = context.profile;
  const isPresidential = ['president', 'co_president'].includes(profile.role);

  return (
    <AppShell>
      <Suspense fallback={<ContentCalendarSkeleton />}>
        <ContentCalendarDataLoader profile={profile} isPresidential={isPresidential} />
      </Suspense>
    </AppShell>
  );
}
