import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { CertificatesClient } from './CertificatesClient';
import { CertificatesSkeleton } from '@/components/skeletons/CertificatesSkeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Certificates & Credentials Hub — GDGoC HNU OS',
  description: 'Chapter certificate builder, bulk issuance engine, and credentials ledger.',
};

async function CertificatesDataLoader({
  currentUserId,
  userEmail,
  userRole,
}: {
  currentUserId: string;
  userEmail: string;
  userRole: string;
}) {
  const admin = createAdminClient();

  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(userRole);

  // Fetch data in parallel: templates & chapter ledger for leadership only, user's own certificates, and events
  const [
    templatesRes,
    { data: myCerts },
    certsRes,
    { data: events },
  ] = await Promise.all([
    isLeadership
      ? admin
          .from('certificate_templates')
          .select('*')
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
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
        recipient_profile_id,
        pdf_drive_url,
        event_id,
        issued_by,
        created_at,
        event:events(id, title)
      `)
      .or(`recipient_profile_id.eq.${currentUserId},recipient_email.eq.${userEmail}`)
      .order('created_at', { ascending: false }),
    isLeadership
      ? admin
          .from('certificates')
          .select(`
            id,
            title,
            certificate_number,
            verification_code,
            issue_date,
            recipient_name,
            recipient_email,
            recipient_profile_id,
            pdf_drive_url,
            event_id,
            issued_by,
            created_at,
            event:events(id, title)
          `)
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    admin
      .from('events')
      .select('id, title')
      .order('event_date', { ascending: false })
      .limit(50),
  ]);

  const templates = templatesRes.data;
  const certs = certsRes.data;

  const formatCertificates = (records: any[] | null) => {
    if (!records) return [];
    return records.map((r) => ({
      ...r,
      event: Array.isArray(r.event) ? (r.event[0] as { id: string; title: string } || null) : (r.event as { id: string; title: string } || null),
    }));
  };

  return (
    <CertificatesClient
      initialCertificates={formatCertificates(certs)}
      myCertificates={formatCertificates(myCerts)}
      templates={templates || []}
      events={events || []}
      userRole={userRole}
      currentUserId={currentUserId}
      userEmail={userEmail}
    />
  );
}

export default async function CertificatesPage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/login?redirect=/certificates');
  }

  const userEmail = context.profile.email || context.user.email || '';
  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(context.profile.role);

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
        <Suspense fallback={<CertificatesSkeleton isLeadership={isLeadership} />}>
          <CertificatesDataLoader
            currentUserId={context.profile.id}
            userEmail={userEmail}
            userRole={context.profile.role}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
