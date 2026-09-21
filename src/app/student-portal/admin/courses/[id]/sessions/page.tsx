import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourseWithSessions } from './actions';
import { CourseSessionsClient } from '@/components/student-portal/admin/CourseSessionsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseWithSessions(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Sessions Management | GDGoC HNU`,
    description: `Manage session schedules, delivery mode, offline venues, live streams, and course materials for ${courseTitle}.`,
  };
}

export default async function CourseSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseWithSessions(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <CourseSessionsClient
      course={result.course}
      initialSessions={result.sessions}
      canManage={result.canManage}
      userRole={result.userRole}
    />
  );
}
