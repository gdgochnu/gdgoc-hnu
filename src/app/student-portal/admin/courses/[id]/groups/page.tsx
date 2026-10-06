import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCourseGroupsData } from './actions';
import { CourseGroupsClient } from '@/components/student-portal/admin/CourseGroupsClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getCourseGroupsData(id);
  const title = result.data?.course?.title || 'Course';

  return {
    title: `${title} — Study Groups & WhatsApp Links | GDGoC HNU`,
    description: `Manage cohorts, split students into WhatsApp groups, and track join rates for ${title}.`,
  };
}

export default async function CourseGroupsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCourseGroupsData(id);

  if (!result.success || !result.data) {
    redirect('/student-portal/admin/courses');
  }

  return <CourseGroupsClient initialData={result.data} />;
}
