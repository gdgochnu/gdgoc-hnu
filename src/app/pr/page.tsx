import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { canAccessPrCrm, getPrContacts, getPrTeamMembers } from './actions';
import { PrCrmHub } from '@/components/pr/PrCrmHub';
import { AppShell } from '@/components/layout/AppShell';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PR CRM & Outreach Pipeline | GDGoC HNU OS',
  description: 'Manage external speakers, chapter sponsors, venue partners, and outreach pipeline.',
};

export default async function PrCrmPage() {
  const access = await canAccessPrCrm();

  if (!access.hasAccess) {
    return (
      <AppShell>
        <div
          style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '1rem',
              backgroundColor: 'rgba(234, 67, 53, 0.12)',
              color: 'var(--google-red, #ea4335)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Access Restricted
          </h1>
          <p style={{ maxWidth: '440px', color: '#9aa0a6', fontSize: '0.95rem', lineHeight: 1.5 }}>
            The PR CRM & Outreach Pipeline is reserved for the Chapter Leadership (President & Co-President)
            and Public Relations (PR) committee members.
          </p>
        </div>
      </AppShell>
    );
  }

  // Fetch initial contacts and team members in parallel
  const [contactsResult, teamResult] = await Promise.all([
    getPrContacts({}, { skipAuthCheck: true }),
    getPrTeamMembers({ skipAuthCheck: true }),
  ]);

  return (
    <AppShell>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        <PrCrmHub
          initialContacts={contactsResult.data || []}
          teamMembers={teamResult.data || []}
          currentUserRole={access.role}
          isPresidential={access.isPresidential}
        />
      </div>
    </AppShell>
  );
}
