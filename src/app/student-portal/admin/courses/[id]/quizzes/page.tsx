import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourseWithQuizzes } from './actions';
import { CourseQuizzesClient } from '@/components/student-portal/admin/CourseQuizzesClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseWithQuizzes(id);
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${courseTitle} — Quizzes & Assessments | GDGoC HNU`,
    description: `Manage quizzes, interactive question banks, passing criteria, and retake policies for ${courseTitle}.`,
  };
}

export default async function CourseQuizzesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseWithQuizzes(id);

  if (!result.success || !result.course) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <CourseQuizzesClient
      course={result.course}
      initialQuizzes={result.quizzes}
      availableLessons={result.availableLessons}
      canManage={result.canManage}
      userRole={result.userRole}
    />
  );
}
