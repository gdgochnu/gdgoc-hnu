import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getWorkshopInstructorsRoster } from './actions';
import { WorkshopInstructorsClient } from '@/components/student-portal/admin/WorkshopInstructorsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getWorkshopInstructorsRoster(id);
  const title = result.workshop?.title || 'Workshop';

  return {
    title: `${title} — Instructors & Mentors | GDGoC HNU`,
    description: `Manage instructor and mentor teaching staff for ${title}.`,
  };
}

export default async function WorkshopInstructorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getWorkshopInstructorsRoster(id);

  if (!result.success || !result.workshop) {
    redirect('/student-portal/admin/workshops');
  }

  return (
    <AppShell>
      <WorkshopInstructorsClient
        workshop={result.workshop}
        initialAssigned={result.assigned}
        initialCandidates={result.candidates}
        canManage={result.canManage}
        userRole={result.userRole}
      />
    </AppShell>
  );
}
