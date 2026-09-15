import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getQuizAttemptsForReview } from './actions';
import { QuizReviewClient } from '@/components/student-portal/admin/QuizReviewClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}): Promise<Metadata> {
  const { id, quizId } = await params;
  const result = await getQuizAttemptsForReview(id, quizId);
  const quizTitle = result.quiz?.title || 'Quiz';
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${quizTitle} — Review Submissions | ${courseTitle} | GDGoC HNU`,
    description: `Evaluate and grade student answers for ${quizTitle}.`,
  };
}

export default async function QuizReviewPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  const result = await getQuizAttemptsForReview(id, quizId);

  if (!result.success || !result.quiz) {
    redirect(`/student-portal/admin/courses/${id}/quizzes`);
  }

  return (
    <AppShell>
      <QuizReviewClient
        courseId={id}
        courseTitle={result.course?.title || 'Course'}
        quiz={result.quiz}
        initialAttempts={result.attempts}
      />
    </AppShell>
  );
}
