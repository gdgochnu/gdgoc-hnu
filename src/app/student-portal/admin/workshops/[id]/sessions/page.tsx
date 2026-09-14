import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getWorkshopWithSessions } from './actions';
import { WorkshopSessionsClient } from '@/components/student-portal/admin/WorkshopSessionsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getWorkshopWithSessions(id);
  const workshopTitle = result.workshop?.title || 'Workshop';

  return {
    title: `${workshopTitle} — Sessions Management | GDGoC HNU`,
    description: `Manage workshop sessions, schedules, offline venues, online meetings, and learning materials for ${workshopTitle}.`,
  };
}

export default async function WorkshopSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getWorkshopWithSessions(id);

  if (!result.success || !result.workshop) {
    redirect('/student-portal/admin/workshops');
  }

  return (
    <AppShell>
      <WorkshopSessionsClient
        workshop={result.workshop}
        initialSessions={result.sessions}
        canManage={result.canManage}
        userRole={result.userRole}
      />
    </AppShell>
  );
}
