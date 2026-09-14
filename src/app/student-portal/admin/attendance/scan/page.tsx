import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAttendanceScannerData } from './actions';
import { AttendanceScannerClient } from '@/components/student-portal/admin/AttendanceScannerClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unified Attendance Scanner — Student Portal | GDGoC HNU',
  description: 'Live mobile QR scanner and manual check-in console for GDGoC HNU course and workshop sessions.',
};

interface PageProps {
  searchParams: Promise<{
    type?: string;
    sessionId?: string;
    courseId?: string;
    workshopId?: string;
  }>;
}

export default async function AttendanceScanPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const result = await getAttendanceScannerData();

  if (!result.success || !result.canScan) {
    redirect('/student-portal/admin/courses');
  }

  return (
    <AppShell>
      <AttendanceScannerClient
        sessions={result.sessions}
        officerName={result.officerName}
        officerRole={result.officerRole}
        canScan={result.canScan}
        initialType={params.type === 'workshop' ? 'workshop' : params.type === 'course' ? 'course' : undefined}
        initialSessionId={params.sessionId}
        initialParentId={params.courseId || params.workshopId}
      />
    </AppShell>
  );
}
