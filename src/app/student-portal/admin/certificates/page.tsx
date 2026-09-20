import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getCertificatePrograms } from './actions';
import { PresidentCertificateClient } from '@/components/student-portal/admin/PresidentCertificateClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Student Certificate Issuance Panel — GDGoC HNU',
  description: 'Presidential portal for calculating academic eligibility and issuing official verified course and workshop completion certificates.',
};

export default async function PresidentCertificatePage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/');
  }

  const role = context.profile.role;
  const isAuthorized = role === 'president' || role === 'co_president';

  if (!isAuthorized) {
    redirect('/student-portal/admin/courses');
  }

  const programsResult = await getCertificatePrograms();

  return (
    <AppShell>
      <PresidentCertificateClient
        initialPrograms={{
          courses: programsResult.courses || [],
          workshops: programsResult.workshops || [],
          templates: programsResult.templates || [],
        }}
      />
    </AppShell>
  );
}
