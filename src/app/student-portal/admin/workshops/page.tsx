import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAdminWorkshops } from './actions';
import { AdminWorkshopsClient } from '@/components/student-portal/admin/AdminWorkshopsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Workshops & Bootcamps Management — GDGoC HNU',
  description: 'Manage chapter multi-session workshops, schedule technical sessions, assign instructors, and govern registrations.',
};

export default async function AdminWorkshopsPage() {
  const result = await getAdminWorkshops();

  if (!result.success) {
    redirect('/dashboard');
  }

  return (
    <AppShell>
      <AdminWorkshopsClient
        initialWorkshops={result.workshops}
        departments={result.departments}
        teamMembers={result.teamMembers}
        userRole={result.userRole}
        userDepartmentId={result.userDepartmentId}
        canCreate={result.canCreate}
      />
    </AppShell>
  );
}
