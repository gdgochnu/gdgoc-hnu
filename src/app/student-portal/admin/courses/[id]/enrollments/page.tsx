import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourseEnrollmentsRoster } from './actions';
import { CourseEnrollmentsClient } from '@/components/student-portal/admin/CourseEnrollmentsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseEnrollmentsRoster(id);
  const title = result.header?.title || 'Course';

  return {
    title: `${title} — Student Enrollments | GDGoC HNU`,
    description: `Manage student admission requests, approvals, and waitlist for ${title}.`,
  };
}

export default async function CourseEnrollmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseEnrollmentsRoster(id);

  if (!result.success || !result.header) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <CourseEnrollmentsClient
      header={result.header}
      initialEnrollments={result.enrollments || []}
      canManage={result.canManage || false}
    />
  );
}
