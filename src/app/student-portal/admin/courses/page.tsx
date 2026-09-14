import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAdminCourses } from './actions';
import { AdminCoursesClient } from '@/components/student-portal/admin/AdminCoursesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Course & Curriculum Management — GDGoC HNU',
  description: 'Manage chapter course tracks, assign instructors and mentors, schedule sessions, and govern student enrollments.',
};

export default async function AdminCoursesPage() {
  const result = await getAdminCourses();

  if (!result.success) {
    redirect('/dashboard');
  }

  return (
    <AppShell>
      <AdminCoursesClient
        initialCourses={result.courses}
        departments={result.departments}
        teamMembers={result.teamMembers}
        userRole={result.userRole}
        userDepartmentId={result.userDepartmentId}
        canCreate={result.canCreate}
      />
    </AppShell>
  );
}
