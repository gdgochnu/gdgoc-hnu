import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getSessionAttendanceSheet } from './actions';
import { SessionAttendanceSheetClient } from '@/components/student-portal/admin/SessionAttendanceSheetClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sessionId } = await params;
  const data = await getSessionAttendanceSheet(sessionId);

  if (!data.success) {
    return {
      title: 'Session Attendance Sheet — GDGoC HNU',
    };
  }

  return {
    title: `Session ${data.session.session_number}: ${data.session.title} — Attendance Sheet | GDGoC HNU`,
    description: `Attendance roster and manual check-in sheet for ${data.parent.title}, session ${data.session.session_number}.`,
  };
}

export default async function SessionAttendanceSheetPage({ params }: PageProps) {
  const { sessionId } = await params;
  const data = await getSessionAttendanceSheet(sessionId);

  if (!data.success || !data.userCanManage) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <SessionAttendanceSheetClient initialData={data} />
    </AppShell>
  );
}
