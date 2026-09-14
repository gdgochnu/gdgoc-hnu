import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStudentDashboardData } from '@/app/student/actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentDashboardClient } from '@/components/student/StudentDashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Student Dashboard — GDGoC HNU',
  description: 'Manage your enrolled courses, workshop registrations, task deliverables, attendance records, and certificates.',
};

export default async function StudentDashboardPage() {
  const result = await getStudentDashboardData();

  // If not signed in, redirect to login
  if (!result.authenticated) {
    redirect('/student?signin=true');
  }

  // If onboarding not completed, redirect to onboarding form
  if (result.needsOnboarding || !result.data) {
    redirect('/student/onboarding');
  }

  const { student, teamProfile } = result.data;

  return (
    <StudentAppShell student={student} teamRole={teamProfile?.role || null}>
      <StudentDashboardClient initialData={result.data} />
    </StudentAppShell>
  );
}

