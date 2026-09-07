import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CompleteProfileForm } from '@/components/CompleteProfileForm';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { FacultyOption } from '@/types';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompleteProfilePage() {
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

        <main style={{ maxWidth: '600px', margin: '6rem auto 3rem', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <UserCheck size={28} color="var(--google-blue)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem' }}>Sign in to Complete Profile</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              To join GDGoC Helwan National University, please sign in with your Google account first.
            </p>
            <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
          </div>
        </main>
      </div>
    );
  }

  // Check existing profile status using admin client
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.status === 'active') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-title">GDGoC HNU OS</div>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '5rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', border: '1px solid rgba(52, 168, 83, 0.3)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(52, 168, 83, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle2 size={28} color="var(--google-green)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem' }}>Profile Already Active</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your chapter profile is active and verified. You have full access to chapter tools and workspace.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
                Go to Home
              </Link>
              <Link href="/onboarding/status" className="btn-secondary" style={{ textDecoration: 'none' }}>
                View Membership Status
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (profile?.status === 'pending_review') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="header-nav">
          <div className="nav-content">
            <Link href="/" className="brand-badge">
              <div className="brand-title">GDGoC HNU OS</div>
            </Link>
          </div>
        </header>
        <main style={{ maxWidth: '600px', margin: '5rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem', border: '1px solid rgba(251, 188, 4, 0.3)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(251, 188, 4, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Clock size={28} color="var(--google-yellow)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem' }}>Application Under Review</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your membership application has been submitted and is currently under review by Chapter Leadership.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/onboarding/status" className="btn-primary" style={{ textDecoration: 'none' }}>
                Track Application Status
              </Link>
              <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
                Return to Home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 1. Fetch active committees
  let departments: { id: string; code: string; name: string; branch: string }[] = [];
  const { data: deptList } = await admin
    .from('departments')
    .select('id, code, name, branch')
    .order('name');
  if (deptList) departments = deptList;

  // 2. Fetch active faculties
  let faculties: FacultyOption[] = [];
  const { data: facultyList } = await admin
    .from('faculty_options')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (facultyList) faculties = facultyList as FacultyOption[];

  const initialFullName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '';
  const initialAvatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  const initialProfile = profile ? {
    fullNameAr: profile.full_name_ar || null,
    fullNameEn: profile.full_name_en || profile.full_name || initialFullName,
    nationalId: profile.national_id || null,
    phone: profile.phone || null,
    whatsappNumber: profile.whatsapp_number || profile.phone || null,
    faculty: profile.faculty || null,
    departmentMajor: profile.department_major || null,
    academicYear: profile.academic_year || 1,
    facebookUrl: profile.facebook_url || null,
    instagramUrl: profile.instagram_url || null,
    linkedinUrl: profile.linkedin_url || null,
    departmentId: profile.department_id || null,
    position: profile.position || 'Member',
    motivation: profile.motivation || null,
    howHeard: profile.how_heard || 'Social Media',
    availabilityHours: profile.availability_hours || 8,
    status: profile.status || 'incomplete',
    changesRequestedNotes: (profile.custom_fields as Record<string, any>)?.changes_requested_notes || null,
    rejectionReason: profile.rejection_reason || null,
  } : null;

  const statusLabel = profile?.status === 'changes_requested'
    ? 'Revisions Required'
    : profile?.status === 'rejected'
    ? 'Re-application'
    : 'Profile Incomplete';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="header-nav">
        <div className="nav-content">
          <Link href="/" className="brand-badge">
            <div className="brand-logo-wrap">
              <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                &lt;&gt;
              </span>
            </div>
            <div>
              <div className="brand-title">GDGoC HNU OS</div>
              <div className="brand-sub">Member Onboarding</div>
            </div>
          </Link>
          <div className="status-pill" style={{ background: 'rgba(251, 188, 4, 0.12)', color: '#FDE047', border: '1px solid rgba(251, 188, 4, 0.3)' }}>
            {statusLabel}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: '920px', margin: '0 auto', padding: '3rem 1.5rem 4rem', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.04)', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
            <ShieldCheck size={14} color="var(--google-blue)" />
            <span>Official Chapter Recruitment Application</span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            {profile?.status === 'changes_requested' ? 'Update & Resubmit Profile' : profile?.status === 'rejected' ? 'Revise Application' : 'Complete Your Profile'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            {profile?.status === 'changes_requested'
              ? 'Please review the leadership instructions below, update the required fields, and resubmit for approval.'
              : 'Please fill in your personal, academic, and contact details according to the chapter standards. Your profile will be reviewed by Chapter Leadership.'}
          </p>
        </div>

        <CompleteProfileForm
          initialEmail={user.email || ''}
          initialFullName={initialFullName}
          initialAvatarUrl={initialAvatarUrl}
          departments={departments}
          faculties={faculties}
          initialProfile={initialProfile}
        />
      </main>
    </div>
  );
}
