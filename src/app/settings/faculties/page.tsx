import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { FacultiesManagementClient } from '@/components/FacultiesManagementClient';
import { AppShell } from '@/components/layout/AppShell';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { ShieldAlert, GraduationCap, ChevronRight, Settings } from 'lucide-react';
import { FacultyOption } from '@/types';

export const dynamic = 'force-dynamic';

export default async function FacultiesSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Check user login
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
        <header className="header-nav" suppressHydrationWarning>
          <div className="nav-content" suppressHydrationWarning>
            <Link href="/" className="brand-badge">
              <span className="brand-title">GDGoC HNU OS</span>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }} suppressHydrationWarning>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Presidential Sign In Required</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
              Faculty list and university college options configuration is strictly restricted to the Chapter President.
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
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Local bootstrap if no president exists
  let isPresident = callerProfile && callerProfile.role === 'president' && callerProfile.status === 'active';
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
      const { data: updatedProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      callerProfile = updatedProfile;
    }
  }

  if (!isPresident || !callerProfile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }} suppressHydrationWarning>
        <header className="header-nav" suppressHydrationWarning>
          <div className="nav-content" suppressHydrationWarning>
            <Link href="/" className="brand-badge">
              <span className="brand-title">GDGoC HNU OS</span>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }} suppressHydrationWarning>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <ShieldAlert size={28} color="var(--google-red)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Access Restricted</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Faculty configuration is strictly restricted to the Chapter President (Spec §1.3, §3.3).
            </p>
            <Link href="/" className="btn-secondary">Return to Home</Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. Fetch all faculties sorted by sort_order
  const { data: faculties } = await admin
    .from('faculty_options')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // 4. Fetch pending approvals count for navigation badge
  const { count: pendingApprovalsCount } = await admin
    .from('approval_instances')
    .select('id', { count: 'exact', head: true })
    .eq('workflow_type', 'account_approval')
    .eq('status', 'in_progress');

  return (
    <AppShell>
      <div style={{ padding: '2rem 1.5rem 4rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }} suppressHydrationWarning>
        {/* Breadcrumb Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
          <ChevronRight size={14} />
          <span>Administration</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Faculty Options</span>
        </div>

        {/* Page Title Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(66, 133, 244, 0.12)', border: '1px solid rgba(66, 133, 244, 0.3)', color: '#93C5FD', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <Settings size={14} />
              <span>Chapter Administration • President Only</span>
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Faculty Options Management
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '650px', lineHeight: 1.6 }}>
              Configure the official Helwan University faculties and colleges offered in recruitment and member profile forms. Inactive faculties are hidden from new applicants without affecting existing members.
            </p>
          </div>
        </div>

        {/* Interactive Management Client */}
        <FacultiesManagementClient initialFaculties={(faculties || []) as FacultyOption[]} />
      </div>
    </AppShell>
  );
}
