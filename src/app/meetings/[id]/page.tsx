import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getMeetingDetails, getMeetingSchedulingOptions } from '../actions';
import { MeetingAttendanceClient } from '@/components/meetings/MeetingAttendanceClient';

export const dynamic = 'force-dynamic';

interface MeetingPageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: MeetingPageProps) {
  const { id } = await params;
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect(`/auth/signin?redirect=/meetings/${id}`);
  }

  if (context.profile.status !== 'active') {
    redirect('/onboarding/status');
  }

  const [detailsRes, optionsRes] = await Promise.all([
    getMeetingDetails(id),
    getMeetingSchedulingOptions(),
  ]);

  if (!detailsRes.success || !detailsRes.meeting) {
    notFound();
  }

  return (
    <AppShell>
      <MeetingAttendanceClient
        meeting={detailsRes.meeting}
        initialAttendees={detailsRes.attendees || []}
        canManageAttendance={!!detailsRes.canManageAttendance}
        canEditMeeting={!!detailsRes.canEditMeeting}
        canDeleteMeeting={!!detailsRes.canDeleteMeeting}
        availableMembers={optionsRes.members || []}
      />
    </AppShell>
  );
}
