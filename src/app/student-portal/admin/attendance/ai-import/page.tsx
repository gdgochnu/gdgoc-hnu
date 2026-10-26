import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAiImportInitialData } from './actions';
import { AiAttendanceImportClient } from '@/components/student-portal/admin/AiAttendanceImportClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Excel Attendance Assistant — Student Portal Admin | GDGoC HNU',
  description: 'Intelligent multi-session attendance reconciliation and automated sheet importer powered by Gemini 3.8 Flash.',
};

interface PageProps {
  searchParams: Promise<{
    courseId?: string;
  }>;
}

export default async function AiAttendanceImportPage({ searchParams }: PageProps) {
  const { courseId } = await searchParams;
  const initialData = await getAiImportInitialData(courseId);

  if (!initialData.success || !initialData.canManage) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <AiAttendanceImportClient initialData={initialData} />
    </AppShell>
  );
}
