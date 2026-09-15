import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getQuizForTaking } from './actions';
import { QuizTakingClient } from '@/components/student/QuizTakingClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}): Promise<Metadata> {
  const { id, quizId } = await params;
  const result = await getQuizForTaking(id, quizId);
  const quizTitle = result.quiz?.title || 'Quiz';
  const courseTitle = result.course?.title || 'Course';

  return {
    title: `${quizTitle} — Assessment | ${courseTitle} | GDGoC HNU`,
    description: `Take interactive assessment and test your knowledge in ${quizTitle}.`,
  };
}

export default async function QuizTakingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; quizId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id, quizId } = await params;
  const { mode } = await searchParams;
  const result = await getQuizForTaking(id, quizId);

  if (!result.success || !result.quiz) {
    redirect(`/student/courses/${id}`);
  }

  const initialMode: 'take' | 'review' =
    mode === 'review'
      ? 'review'
      : mode === 'retake'
      ? 'take'
      : (!result.canAttempt && result.existingAttempts.length > 0 ? 'review' : 'take');

  return (
    <QuizTakingClient
      courseId={id}
      courseTitle={result.course?.title || 'Course'}
      quiz={result.quiz}
      existingAttempts={result.existingAttempts}
      canAttempt={result.canAttempt}
      nextAttemptNumber={result.nextAttemptNumber}
      reason={result.reason}
      initialMode={initialMode}
    />
  );
}
