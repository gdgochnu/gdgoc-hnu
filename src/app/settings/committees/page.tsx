import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { CommitteesManagementClient } from '@/components/CommitteesManagementClient';
import { CommitteesSkeleton } from '@/components/skeletons/CommitteesSkeleton';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { ShieldAlert, Building2, ChevronRight, Settings } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function CommitteesDataLoader() {
  const admin = createAdminClient();

  // Fetch all departments
  const { data: rawDepartments } = await admin
    .from('departments')
    .select('*')
    .order('name');

  // Fetch all active members for leadership assignment
  const { data: rawMembers } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, department_id, position')
    .eq('status', 'active')
    .order('full_name');

  const memberMap = new Map((rawMembers || []).map((m) => [m.id, m]));

  const committees = (rawDepartments || []).map((dept) => {
    const head = dept.head_id ? memberMap.get(dept.head_id) || null : null;
    const coHead = dept.co_head_id ? memberMap.get(dept.co_head_id) || null : null;
    return {
      ...dept,
      head: head
        ? {
            id: head.id,
            full_name: head.full_name,
            email: head.email,
            avatar_url: head.avatar_url,
            role: head.role,
          }
        : null,
      co_head: coHead
        ? {
            id: coHead.id,
            full_name: coHead.full_name,
            email: coHead.email,
            avatar_url: coHead.avatar_url,
            role: coHead.role,
          }
        : null,
    };
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 5rem', width: '100%' }}>
      {/* Breadcrumb & Title */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
          <ChevronRight size={14} />
          <span>Administration</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)' }}>Committees</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.35rem', color: '#FFFFFF' }}>
              Chapter Committees &amp; Departments
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
              Manage the chapter's organizational chart, create new technical/non-technical tracks, and appoint Committee Heads and Co-Heads.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 600, border: '1px solid rgba(66, 133, 244, 0.3)' }}>
            Leadership Only
          </span>
        </div>
      </div>

      {/* Committees Client */}
      <CommitteesManagementClient
        initialCommittees={committees}
        eligibleMembers={rawMembers || []}
      />
    </div>
  );
}

export default async function CommitteesSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Check user login
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-title">GDGoC HNU OS</div>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Presidential Sign In Required</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Committee structure settings are restricted to the Chapter President.
            </p>
            <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
          </div>
        </main>
      </div>
    );
  }

  const admin = createAdminClient();

  // 2. Fetch caller profile
  let { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .maybeSingle();

  // Local bootstrap if no president exists
  let isPresident = callerProfile && ['president', 'co_president'].includes(callerProfile.role) && callerProfile.status === 'active';
  if (!isPresident) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);
      isPresident = true;
    }
  }

  if (!isPresident) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-title">GDGoC HNU OS</div>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <ShieldAlert size={28} color="var(--google-red)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Access Restricted</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Committee structure configuration is strictly restricted to the Chapter President (Spec §1.3).
            </p>
            <Link href="/" className="btn-secondary">Return to Home</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AppShell>
      <Suspense fallback={<CommitteesSkeleton />}>
        <CommitteesDataLoader />
      </Suspense>
    </AppShell>
  );
}
