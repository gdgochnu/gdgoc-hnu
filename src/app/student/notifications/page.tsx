import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { getStudentNotifications } from './actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentNotificationsClient } from './StudentNotificationsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications Center — Student Portal | GDGoC HNU',
  description: 'View your course track updates, workshop registration passes, assignment feedback, and certificate notifications.',
};

export default async function StudentNotificationsPage() {
  const [profileRes, notifsRes] = await Promise.all([
    getCurrentStudentProfile(),
    getStudentNotifications({ limit: 50 }),
  ]);

  if (!profileRes.success || !profileRes.student) {
    redirect('/student?signin=true');
  }

  if (profileRes.student.status === 'incomplete') {
    redirect('/student/onboarding');
  }

  return (
    <StudentAppShell student={profileRes.student} teamRole={profileRes.teamRole || null}>
      <StudentNotificationsClient initialSummary={notifsRes.summary} />
    </StudentAppShell>
  );
}
