import React from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getMeetingsList, getMeetingSchedulingOptions } from './actions';
import { TeamMeetingsClient } from '@/components/meetings/TeamMeetingsClient';

export const dynamic = 'force-dynamic';

export default async function TeamMeetingsPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/signin?redirect=/meetings');
  }

  // Active status gating
  if (context.profile.status !== 'active') {
    redirect('/onboarding/status');
  }

  const [meetingsRes, optionsRes] = await Promise.all([
    getMeetingsList(),
    getMeetingSchedulingOptions(),
  ]);

  return (
    <AppShell>
      <TeamMeetingsClient
        initialMeetings={meetingsRes.meetings || []}
        canSchedule={optionsRes.canSchedule}
        departments={optionsRes.departments || []}
        members={optionsRes.members || []}
        currentUserId={context.profile.id}
      />
    </AppShell>
  );
}
