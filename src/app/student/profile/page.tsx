import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStudentProfilePageData } from '@/app/student/actions';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentProfileViewClient } from '@/components/student/StudentProfileViewClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Student Profile & Accreditation — GDGoC HNU',
  description: 'View and manage your academic profile, enrolled tracks, attendance passes, and verified certificates.',
};

export default async function StudentProfilePage() {
  const result = await getStudentProfilePageData();

  if (!result.authenticated) {
    redirect('/student?signin=true');
  }

  if (result.needsOnboarding || !result.student || !isStudentProfileComplete(result.student)) {
    redirect('/student/onboarding');
  }

  return (
    <StudentAppShell student={result.student} teamRole={result.teamRole}>
      <StudentProfileViewClient
        initialData={{
          student: result.student,
          teamRole: result.teamRole,
          faculties: result.faculties,
          stats: result.stats,
          courses: result.courses,
          workshops: result.workshops,
          certificates: result.certificates,
        }}
      />
    </StudentAppShell>
  );
}
