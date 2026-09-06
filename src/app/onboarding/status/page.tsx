import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { OnboardingStatusClient } from '@/components/OnboardingStatusClient';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldAlert, 
  User, 
  Sparkles, 
  ChevronRight, 
  FileEdit, 
  RotateCcw, 
  Building2, 
  GraduationCap, 
  Calendar, 
  ExternalLink,
  Info
} from 'lucide-react';

export const metadata = {
  title: 'Application Status — GDGoC HNU OS',
  description: 'Track your GDGoC Helwan National University membership application status in real time.',
};

export const dynamic = 'force-dynamic';

export default async function OnboardingStatusPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. If not authenticated, prompt to sign in
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
        <main style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <User size={28} color="var(--google-blue)" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.75rem' }}>Check Application Status</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Sign in with your Google account to track the review progress of your membership application.
            </p>
            <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
          </div>
        </main>
      </div>
    );
  }

  // 2. Fetch user's profile
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // If no profile exists yet or status is incomplete -> redirect to complete-profile
  if (!profile || profile.status === 'incomplete') {
    redirect('/onboarding/complete-profile');
  }

  // Fetch target department directly by id
  let targetDept: { id: string; name: string; code: string; branch: string } | null = null;
  if (profile.department_id) {
    const { data: dept } = await admin
      .from('departments')
      .select('id, name, code, branch')
      .eq('id', profile.department_id)
      .maybeSingle();
    targetDept = dept;
  }

  const changesNotes = (profile.custom_fields as Record<string, any>)?.changes_requested_notes;
  const status = profile.status;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
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
              <div className="brand-sub">Application Status Portal</div>
            </div>
          </Link>

          <OnboardingStatusClient />
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '880px', margin: '0 auto', padding: '3rem 1.5rem 5rem', width: '100%' }}>
        {/* ======================================================== */}
        {/* CASE 1: PENDING REVIEW                                   */}
        {/* ======================================================== */}
        {status === 'pending_review' && (
          <div>
            {/* Status Hero Banner */}
            <div className="glass-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', textAlign: 'center', border: '1px solid rgba(251, 188, 4, 0.3)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(251, 188, 4, 0.15)', marginBottom: '1.25rem', border: '1px solid rgba(251, 188, 4, 0.4)' }}>
                <Clock size={32} color="var(--google-yellow)" />
              </div>
              <div style={{ display: 'inline-block', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Under Leadership Review
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                Your Application Has Been Received
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
                Thank you for applying to join GDGoC Helwan National University! Your application is currently in the leadership queue for review.
              </p>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="glass-panel" style={{ padding: '1.75rem 2rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Onboarding Progress Tracker
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52, 168, 83, 0.2)', border: '1px solid var(--google-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={18} color="var(--google-green)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Google Sign-In</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Account verified</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52, 168, 83, 0.2)', border: '1px solid var(--google-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={18} color="var(--google-green)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Profile Submitted</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>All 15 fields filled</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(251, 188, 4, 0.2)', border: '1px solid var(--google-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} color="var(--google-yellow)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FDE047' }}>Leadership Review</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In review queue</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Sparkles size={16} color="var(--text-secondary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Member</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Full platform access</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Application Snapshot Card */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Submitted Application Details</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Submitted: {new Date(profile.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Full Name</div>
                  <div style={{ fontWeight: 600 }}>{profile.full_name}</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Target Committee</div>
                  <div style={{ fontWeight: 600, color: 'var(--google-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={15} />
                    <span>{targetDept?.name || 'Assigned by Leadership'}</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preferred Position</div>
                  <div style={{ fontWeight: 600 }}>{profile.position || 'Member'}</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Faculty & Academic Year</div>
                  <div style={{ fontWeight: 600 }}>{profile.faculty} — {profile.academic_year}</div>
                </div>
              </div>

              {profile.skills && profile.skills.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Skills</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {profile.skills.map((skill: string, i: number) => (
                      <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.motivation && (
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Why GDGoC HNU?</div>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{profile.motivation}"
                  </p>
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(66, 133, 244, 0.08)', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                <Info size={16} color="var(--google-blue)" style={{ flexShrink: 0 }} />
                <span>You will receive an in-app notification and email update as soon as Chapter Leadership takes action.</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASE 2: CHANGES REQUESTED                                */}
        {/* ======================================================== */}
        {status === 'changes_requested' && (
          <div>
            <div className="glass-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', border: '1px solid rgba(251, 188, 4, 0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 188, 4, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={26} color="var(--google-yellow)" />
                </div>
                <div>
                  <div style={{ display: 'inline-block', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.2)', color: '#FDE047', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                    Action Required
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Changes Requested on Your Application
                  </h1>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Chapter Leadership reviewed your application and requested specific modifications before proceeding with approval.
              </p>

              {/* Reviewer Note Box */}
              <div style={{ background: 'rgba(251, 188, 4, 0.08)', border: '1px solid rgba(251, 188, 4, 0.3)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FDE047', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileEdit size={16} />
                  <span>Leadership Feedback & Instructions:</span>
                </div>
                <div style={{ fontSize: '0.95rem', color: '#FFFBEB', lineHeight: 1.6, fontWeight: 500 }}>
                  {changesNotes || 'Please review and update your academic details, committee preference, or motivation statement.'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  href="/onboarding/complete-profile"
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem', textDecoration: 'none' }}
                  id="edit-resubmit-btn"
                >
                  <FileEdit size={18} />
                  <span>Edit & Resubmit Application</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASE 3: REJECTED                                         */}
        {/* ======================================================== */}
        {status === 'rejected' && (
          <div>
            <div className="glass-panel" style={{ padding: '2.5rem 2rem', marginBottom: '2rem', border: '1px solid rgba(234, 67, 53, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <XCircle size={26} color="var(--google-red)" />
                </div>
                <div>
                  <div style={{ display: 'inline-block', padding: '0.25rem 0.65rem', borderRadius: '999px', background: 'rgba(234, 67, 53, 0.15)', color: '#FCA5A5', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                    Application Not Approved
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Application Status Update
                  </h1>
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Thank you for your interest in joining Google Developer Groups on Campus — Helwan National University. After careful review, your application was not accepted for this recruitment cycle.
              </p>

              {profile.rejection_reason && (
                <div style={{ background: 'rgba(234, 67, 53, 0.08)', border: '1px solid rgba(234, 67, 53, 0.25)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FCA5A5', marginBottom: '0.5rem' }}>
                    Review Feedback:
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#FEE2E2', lineHeight: 1.6 }}>
                    {profile.rejection_reason}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  href="/onboarding/complete-profile"
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '0.95rem', textDecoration: 'none' }}
                  id="reapply-btn"
                >
                  <RotateCcw size={18} />
                  <span>Update & Re-apply</span>
                </Link>
                <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>
                  Back to Homepage
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASE 4: SUSPENDED                                        */}
        {/* ======================================================== */}
        {status === 'suspended' && (
          <div>
            <div className="glass-panel" style={{ padding: '3rem 2rem', marginBottom: '2rem', textAlign: 'center', border: '1px solid rgba(234, 67, 53, 0.4)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(234, 67, 53, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <ShieldAlert size={32} color="var(--google-red)" />
              </div>
              <div style={{ display: 'inline-block', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'rgba(234, 67, 53, 0.15)', color: '#FCA5A5', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Account Suspended
              </div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                Account Access Suspended
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', maxWidth: '580px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                Your account access has been temporarily suspended by Chapter Leadership pursuant to Chapter Operations & Code of Conduct guidelines. If you believe this is in error, please contact the Chapter President or your Committee Head.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <a href="mailto:gdgoc@hnu.edu.eg" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ExternalLink size={16} />
                  <span>Contact Chapter Leadership</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CASE 5: ACTIVE                                           */}
        {/* ======================================================== */}
        {status === 'active' && (
          <div>
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px solid rgba(52, 168, 83, 0.4)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(52, 168, 83, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={36} color="var(--google-green)" />
              </div>
              <div style={{ display: 'inline-block', padding: '0.3rem 0.85rem', borderRadius: '999px', background: 'rgba(52, 168, 83, 0.15)', color: '#86EFAC', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Active Member
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
                Welcome to GDGoC HNU! 🎉
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                Your account is active as <strong style={{ color: '#FFF' }}>{profile.role.replace('_', ' ').toUpperCase()}</strong> in <strong style={{ color: 'var(--google-blue)' }}>{targetDept?.name || 'General'}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem' }}>
                  <span>Enter Chapter Operating System</span>
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
