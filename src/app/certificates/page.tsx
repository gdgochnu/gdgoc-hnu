import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { CertificatesClient } from './CertificatesClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certificates & Credentials Hub — GDGoC HNU OS',
  description: 'Chapter certificate builder, bulk issuance engine, and credentials ledger.',
};

export default async function CertificatesPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/signin');
  }

  const admin = createAdminClient();

  // Fetch data in parallel
  const [
    { data: templates },
    { data: certs },
    { data: events },
  ] = await Promise.all([
    admin
      .from('certificate_templates')
      .select('*')
      .order('created_at', { ascending: false }),
    admin
      .from('certificates')
      .select(`
        id,
        title,
        certificate_number,
        verification_code,
        issue_date,
        recipient_name,
        recipient_email,
        pdf_drive_url,
        event_id,
        issued_by,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('events')
      .select('id, title')
      .order('date', { ascending: false })
      .limit(50),
  ]);

  return (
    <AppShell>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          width: '100%',
        }}
      >
        <CertificatesClient
          initialCertificates={certs || []}
          templates={templates || []}
          events={events || []}
          userRole={context.profile.role}
          currentUserId={context.profile.id}
        />
      </div>
    </AppShell>
  );
}
