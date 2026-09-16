import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getMentorDashboardData } from './actions';
import { MentorDashboardClient } from '@/components/student-portal/admin/MentorDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mentor Dashboard — GDGoC HNU',
  description: 'Track mentee progress, review submissions, flag at-risk students, and manage your mentorship pipeline.',
};

export default async function MentorDashboardPage() {
  const result = await getMentorDashboardData();

  if (!result.success && result.error === 'Unauthorized: Authentication required.') {
    redirect('/');
  }

  return (
    <AppShell>
      <MentorDashboardClient initialData={result} />
    </AppShell>
  );
}

