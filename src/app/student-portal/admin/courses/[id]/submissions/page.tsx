import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourseSubmissions } from './actions';
import { CourseSubmissionsClient } from '@/components/student-portal/admin/CourseSubmissionsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseSubmissions(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Submissions & Grading | GDGoC HNU`,
    description: `Evaluate student assignments, provide code feedback, and assign grades for ${courseTitle}.`,
  };
}

export default async function CourseSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseSubmissions(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <CourseSubmissionsClient
      course={result.course}
      initialTasks={result.tasks}
      initialSubmissions={result.submissions}
      canManage={result.canManage}
      userRole={result.userRole}
    />
  );
}
