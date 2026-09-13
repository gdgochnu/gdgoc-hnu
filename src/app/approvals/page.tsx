import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { LeadershipDashboardTabs } from '@/components/LeadershipDashboardTabs';
import { ApprovalsSkeleton } from '@/components/skeletons/ApprovalsSkeleton';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function ApprovalsDataLoader({
  callerProfile,
  userId,
}: {
  callerProfile: any;
  userId: string;
}) {
  const admin = createAdminClient();
  const isPresidential = ['president', 'co_president'].includes(callerProfile.role);

  // Fetch departments first to establish branch mapping
  const { data: rawDepts } = await admin.from('departments').select('id, name, code, branch').order('name');
  const deptList = rawDepts || [];
  const deptMap = new Map(deptList.map(d => [d.id, d]));

  const callerDept = callerProfile.department_id ? deptMap.get(callerProfile.department_id) : null;
  const callerBranch = callerDept?.branch || null;

  let pendingQuery = admin
    .from('profiles')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });

  let managedQuery = admin
    .from('profiles')
    .select('*')
    .in('status', ['active', 'suspended'])
    .order('created_at', { ascending: false });

  // Scoped views:
  // - Branch Head: strictly see members and applications within their branch (Tech vs Non-Tech)
  // - Committee Head: strictly see members and applications within their specific committee
  if (!isPresidential) {
    if (callerProfile.role === 'branch_head' && callerBranch) {
      const branchDeptIds = deptList.filter(d => d.branch === callerBranch).map(d => d.id);
      pendingQuery = pendingQuery.in('department_id', branchDeptIds);
      managedQuery = managedQuery.in('department_id', branchDeptIds);
    } else if (['committee_head', 'committee_co_head'].includes(callerProfile.role) && callerProfile.department_id) {
      pendingQuery = pendingQuery.eq('department_id', callerProfile.department_id);
      managedQuery = managedQuery.eq('department_id', callerProfile.department_id);
    }
  }

  const [pendingRes, managedRes] = await Promise.all([
    pendingQuery,
    managedQuery,
  ]);

  const pendingAccounts = (pendingRes.data || []).map(acc => ({
    ...acc,
    departments: acc.department_id ? deptMap.get(acc.department_id) || null : null,
  }));

  const managedMembers = (managedRes.data || []).map(acc => ({
    ...acc,
    departments: acc.department_id ? deptMap.get(acc.department_id) || null : null,
  }));

  return (
    <LeadershipDashboardTabs
      pendingAccounts={pendingAccounts || []}
      managedMembers={managedMembers || []}
      departments={deptList}
      currentUserId={userId}
      currentUserRole={callerProfile.role}
      currentUserDepartmentId={callerProfile.department_id || undefined}
      currentUserBranch={callerBranch || undefined}
    />
  );
}

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Leadership Sign In Required</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              The management portal is restricted to Chapter Leadership and Committee Heads.
            </p>
            <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
          </div>
        </main>
      </div>
    );
  }

  const admin = createAdminClient();

  // Fetch caller's profile
  let { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role, status, department_id')
    .eq('id', user.id)
    .maybeSingle();

  // Check if caller has leadership authority
  const allowedRoles = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'];
  let hasAuthority = callerProfile && allowedRoles.includes(callerProfile.role) && callerProfile.status === 'active';
  
  // Early bootstrap check: if no president exists at all in the database, promote current user
  if (!hasAuthority) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);

      hasAuthority = true;
      callerProfile = {
        id: user.id,
        role: 'president',
        status: 'active',
        department_id: null,
      };
    }
  }

  if (!hasAuthority || !callerProfile) {
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
              Only Chapter Leadership (President, Co-President, Branch Heads, and Committee Heads) can access this workspace.
            </p>
            <Link href="/" className="btn-secondary">Return to Home</Link>
          </div>
        </main>
      </div>
    );
  }

  const roleTitle = callerProfile.role === 'president' 
    ? 'Presidential Portal'
    : callerProfile.role === 'co_president'
    ? 'Co-Presidential Portal'
    : callerProfile.role === 'branch_head'
    ? 'Branch Head Portal'
    : 'Committee Head Portal';

  return (
    <AppShell>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 5rem', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
              Leadership Approvals Queue
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0.25rem 0 0' }}>
              Review pending member account registrations, manage status, and oversee chapter applications.
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 600, border: '1px solid rgba(66, 133, 244, 0.3)' }}>
            {roleTitle}
          </span>
        </div>

        <Suspense fallback={<ApprovalsSkeleton />}>
          <ApprovalsDataLoader callerProfile={callerProfile} userId={user.id} />
        </Suspense>
      </div>
    </AppShell>
  );
}
