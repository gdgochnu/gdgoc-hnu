import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCourseInstructorsRoster } from './actions';
import { CourseInstructorsClient } from '@/components/student-portal/admin/CourseInstructorsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseInstructorsRoster(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Instructors & Mentors | GDGoC HNU`,
    description: `Manage instructor and mentor teaching staff for ${courseTitle}.`,
  };
}

export default async function CourseInstructorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseInstructorsRoster(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <CourseInstructorsClient
        course={result.course}
        initialAssigned={result.assigned}
        initialCandidates={result.candidates}
        canManage={result.canManage}
        userRole={result.userRole}
      />
    </AppShell>
  );
}
