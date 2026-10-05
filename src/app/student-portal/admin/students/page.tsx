import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getAdminStudentsDirectoryData } from './actions';
import { AdminStudentsDirectoryClient } from '@/components/student-portal/admin/AdminStudentsDirectoryClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Enrolled Scholars Directory & Analytics — GDGoC HNU Presidential Portal',
  description:
    'Comprehensive presidential overview of all registered students, enrollment trends, faculty distribution, attendance analytics, and issued completion certificates.',
};

export default async function AdminStudentsDirectoryPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/');
  }

  const role = context.profile.role;
  const isAuthorized = role === 'president' || role === 'co_president';

  if (!isAuthorized) {
    redirect('/student-portal/admin/courses');
  }

  const result = await getAdminStudentsDirectoryData();

  if (!result.success || !result.data) {
    return (
      <AppShell>
        <div style={{ maxWidth: 1200, margin: '2rem auto', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#EF4444' }}>Unable to load Students Directory</h2>
          <p style={{ color: '#94A3B8' }}>{result.error || 'Please try again later.'}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AdminStudentsDirectoryClient initialData={result.data} userRole={role} />
    </AppShell>
  );
}
