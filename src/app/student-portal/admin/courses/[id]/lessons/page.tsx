import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getCourseWithLessons } from './actions';
import { CourseLessonsClient } from '@/components/student-portal/admin/CourseLessonsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseWithLessons(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Lessons & Curriculum | GDGoC HNU`,
    description: `Manage lessons, syllabus units, video lectures, reading materials, tasks, and quizzes for ${courseTitle}.`,
  };
}

export default async function CourseLessonsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseWithLessons(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <CourseLessonsClient
        course={result.course}
        initialLessons={result.lessons}
        availableSessions={result.availableSessions}
        canManage={result.canManage}
        userRole={result.userRole}
      />
    </AppShell>
  );
}
