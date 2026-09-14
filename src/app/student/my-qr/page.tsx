import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStudentQrPassData } from '@/app/student/actions';
import { StudentNavbar } from '@/components/student/StudentNavbar';
import { StudentQrCodeClient } from '@/components/student/StudentQrCodeClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Permanent Attendance QR Pass — GDGoC HNU',
  description: 'Your permanent student attendance pass for courses, multi-session bootcamps, and workshops.',
};

export default async function StudentMyQrPage() {
  const result = await getStudentQrPassData();

  if (!result.authenticated) {
    redirect('/student?signin=true');
  }

  if (result.needsOnboarding || !result.student) {
    redirect('/student/onboarding');
  }

  const { student, teamRole } = result;

  return (
    <>
      <StudentNavbar
        studentName={student.full_name_en || student.full_name_ar || 'Student'}
        studentQr={student.qr_code}
        teamRole={teamRole}
        avatarUrl={student.avatar_url}
      />
      <StudentQrCodeClient student={student} teamRole={teamRole} />
    </>
  );
}
