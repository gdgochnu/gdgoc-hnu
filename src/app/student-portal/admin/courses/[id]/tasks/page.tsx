import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCourseWithTasks } from './actions';
import { CourseTasksClient } from '@/components/student-portal/admin/CourseTasksClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseWithTasks(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Tasks & Assignments | GDGoC HNU`,
    description: `Assign, monitor deadlines, and review student tasks and assignments for ${courseTitle}.`,
  };
}

export default async function CourseTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseWithTasks(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <CourseTasksClient
        course={result.course}
        initialTasks={result.tasks}
        availableLessons={result.availableLessons}
        enrolledStudents={result.enrolledStudents}
        canManage={result.canManage}
        userRole={result.userRole}
      />
    </AppShell>
  );
}
