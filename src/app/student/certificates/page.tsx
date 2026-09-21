import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';
import { getStudentCertificatesList } from '@/app/student-portal/admin/certificates/actions';
import { StudentAppShell } from '@/components/student/StudentAppShell';
import { StudentCertificatesClient } from '@/components/student/StudentCertificatesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Certificates — GDGoC HNU Student Portal',
  description: 'View, download, share, and verify your official course and workshop completion certificates.',
};

export default async function StudentCertificatesPage() {
  const profileRes = await getCurrentStudentProfile();

  if (!profileRes.success || !profileRes.student) {
    redirect('/student?signin=true');
  }

  if (!isStudentProfileComplete(profileRes.student)) {
    redirect('/student/onboarding');
  }

  const certsRes = await getStudentCertificatesList();
  const certificates = certsRes.certificates || [];

  return (
    <StudentAppShell student={profileRes.student} teamRole={profileRes.teamRole || null}>
      <StudentCertificatesClient
        student={profileRes.student}
        certificates={certificates}
      />
    </StudentAppShell>
  );
}
