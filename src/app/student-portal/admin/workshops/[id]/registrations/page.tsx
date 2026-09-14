import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getWorkshopRegistrationsRoster } from './actions';
import { WorkshopRegistrationsClient } from '@/components/student-portal/admin/WorkshopRegistrationsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getWorkshopRegistrationsRoster(id);
  const title = result.header?.title || 'Workshop';

  return {
    title: `${title} — Registrations Roster | GDGoC HNU`,
    description: `Manage student attendees, QR passes, and registrations for ${title}.`,
  };
}

export default async function WorkshopRegistrationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getWorkshopRegistrationsRoster(id);

  if (!result.success || !result.header) {
    redirect('/student-portal/admin/workshops');
  }

  return (
    <AppShell>
      <WorkshopRegistrationsClient
        header={result.header}
        initialRegistrations={result.registrations}
        canManage={result.canManage}
      />
    </AppShell>
  );
}
