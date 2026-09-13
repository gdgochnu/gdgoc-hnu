import Link from 'next/link';
import { getUserContext } from '@/lib/auth/get-user-context';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import { UserAuthStatus } from '@/components/UserAuthStatus';
import { 
  CheckCircle2, 
  QrCode, 
  Workflow, 
  CalendarDays, 
  FolderGit2, 
  Award, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  LayoutGrid,
  User as UserIcon,
  Code2,
  Users2,
  Compass,
  Zap,
  Lock,
  Layers
} from 'lucide-react';

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const dynamic = 'force-dynamic';

export default async function HomePage(props: HomePageProps) {
  const searchParams = await props.searchParams;
  const authError = searchParams?.error;

  // Retrieve cached, fast user context from server
  let currentUser = null;
  let userProfile = null;

  try {
    const context = await getUserContext();
    currentUser = context.user;
    userProfile = context.profile;
  } catch (err) {
    console.warn('Unable to retrieve server auth session:', err);
  }

  const modules = [
    {
      title: 'Smart QR Attendance',
      desc: 'High-speed attendee check-in under 10 seconds with duplicate prevention and org-wide attendance leaderboard.',
      icon: QrCode,
      color: 'var(--google-blue)',
      badge: 'Core Operations'
    },
    {
      title: 'Multi-Stage Approvals',
      desc: 'Automated hierarchy governance: Committee Head → Branch Head → President / Co-President.',
      icon: Workflow,
      color: 'var(--google-red)',
      badge: 'Governance'
    },
    {
      title: 'Full Event Lifecycle',
      desc: 'Draft proposal, multi-tier approval, public registration with QR tickets, and post-event analytics.',
      icon: CalendarDays,
      color: 'var(--google-yellow)',
      badge: 'Events'
    },
    {
      title: 'Google Drive Bridge',
      desc: 'Seamless cloud bridge powered by Google Apps Script. Auto-creates structured folders for assets and evidence.',
      icon: FolderGit2,
      color: 'var(--google-green)',
      badge: 'Cloud Storage'
    },
    {
      title: 'Verifiable Certificates',
      desc: 'Dynamic template engine generating high-resolution PDF certificates with public QR authentication codes.',
      icon: Award,
      color: 'var(--google-blue)',
      badge: 'Credentials'
    },
    {
      title: 'Gamification & Tiers',
      desc: 'Transparent point economy, consecutive attendance streaks, tiered badges, and semester Hall of Fame.',
      icon: Sparkles,
      color: 'var(--google-yellow)',
      badge: 'Engagement'
    }
  ];

  const tracks = [
    { name: 'Web Development', branch: 'Tech', color: 'var(--google-blue)' },
    { name: 'AI & Machine Learning', branch: 'Tech', color: 'var(--google-red)' },
    { name: 'Mobile (Flutter & Android)', branch: 'Tech', color: 'var(--google-green)' },
    { name: 'Cloud & DevOps', branch: 'Tech', color: 'var(--google-yellow)' },
    { name: 'Human Resources (HR)', branch: 'Non-Tech', color: 'var(--google-blue)' },
    { name: 'Public Relations (PR)', branch: 'Non-Tech', color: 'var(--google-red)' },
    { name: 'Media & Branding', branch: 'Non-Tech', color: 'var(--google-yellow)' },
    { name: 'Operations & Logistics', branch: 'Non-Tech', color: 'var(--google-green)' }
  ];

  // Helper for member role badge in Hero area
  const getRoleDetails = (role?: string) => {
    switch (role) {
      case 'president':
        return { title: '👑 Chapter President', color: '#FDE047', bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(66, 133, 244, 0.2))', border: 'rgba(251, 188, 4, 0.5)' };
      case 'co_president':
        return { title: '👑 Co-President', color: '#FDE047', bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(52, 168, 83, 0.2))', border: 'rgba(251, 188, 4, 0.5)' };
      case 'branch_head':
        return { title: 'Branch Head', color: '#86EFAC', bg: 'rgba(52, 168, 83, 0.2)', border: 'rgba(52, 168, 83, 0.4)' };
      case 'committee_head':
        return { title: 'Committee Head', color: '#86EFAC', bg: 'rgba(52, 168, 83, 0.2)', border: 'rgba(52, 168, 83, 0.4)' };
      case 'committee_co_head':
        return { title: 'Committee Co-Head', color: '#86EFAC', bg: 'rgba(52, 168, 83, 0.2)', border: 'rgba(52, 168, 83, 0.4)' };
      default:
        return { title: 'Active Member', color: '#93C5FD', bg: 'rgba(66, 133, 244, 0.15)', border: 'rgba(66, 133, 244, 0.3)' };
    }
  };

  const roleInfo = userProfile ? getRoleDetails(userProfile.role) : null;

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Google 4-Color Top Accent Strip */}
      <div style={{
        height: '3px',
        background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
        width: '100%',
        position: 'sticky',
        top: 0,
        zIndex: 52,
      }} />

      {/* Navigation Header */}
      <header
        className="header-nav"
        style={{
          position: 'sticky',
          top: '3px',
          zIndex: 50,
          background: 'rgba(11, 15, 25, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <div className="nav-content">
          {/* Brand Logo & Title */}
          <Link href="/" className="brand-badge" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '35px',
              borderRadius: '10px',
              background: 'radial-gradient(circle at 30% 30%, rgba(66, 133, 244, 0.16), rgba(15, 20, 32, 0.85))',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '3px 5px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), 0 0 16px rgba(66, 133, 244, 0.12)',
            }}>
              <img
                src="/icons/icon.svg"
                alt="GDGoC Logo"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '19px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.4))',
                }}
              />
            </div>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}>
                <span>GDGoC</span>
                <span style={{
                  background: 'linear-gradient(90deg, #4285F4, #34A853)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  HNU
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '0.08rem 0.35rem',
                  borderRadius: '4px',
                  background: 'rgba(66, 133, 244, 0.18)',
                  color: '#93C5FD',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}>
                  OS
                </span>
              </div>
              <div className="header-brand-sub" style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Helwan National University
              </div>
            </div>
          </Link>

          {/* User Auth or Sign In Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentUser ? (
              <UserAuthStatus
                email={currentUser.email || ''}
                fullName={userProfile?.full_name}
                avatarUrl={userProfile?.avatar_url}
                role={userProfile?.role}
                status={userProfile?.status}
              />
            ) : (
              <SignInWithGoogleButton variant="nav" label="Sign In" />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 4rem', flex: 1, width: '100%' }}>
        {/* Error Alert if any */}
        {authError && (
          <div style={{ background: 'rgba(234, 67, 53, 0.12)', border: '1px solid rgba(234, 67, 53, 0.4)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#FCA5A5' }}>
            <span style={{ fontWeight: 700 }}>Authentication Notice:</span>
            <span>Could not complete Google sign-in session exchange. Please try again.</span>
          </div>
        )}

        {/* Hero Section */}
        <section className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto 4.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.1rem', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
            <ShieldCheck size={16} color="var(--google-blue)" />
            <span>Google Developer Groups on Campus • Helwan National University</span>
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)', fontWeight: 800, lineHeight: 1.12, letterSpacing: '-0.035em', marginBottom: '1.5rem' }}>
            One Platform. <br />
            <span style={{ background: 'linear-gradient(135deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              One Source of Truth.
            </span>
          </h1>

          <p style={{ fontSize: '1.18rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '2.5rem', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            The official chapter-management operating system for GDGoC HNU. Unifying member development, tasks, events, verified attendance, and credentials into one connected ecosystem.
          </p>

          {/* Action Area based on Auth State with Clear UX */}
          <div style={{ marginBottom: '2.5rem' }}>
            {currentUser && userProfile?.status === 'active' ? (
              /* Case A: Active Member / Leader Welcome Card */
              <div
                className="glass-panel animate-fade-in"
                style={{
                  maxWidth: '640px',
                  width: '100%',
                  margin: '0 auto',
                  padding: '2rem 2.25rem',
                  borderRadius: '20px',
                  background: 'radial-gradient(ellipse at top, rgba(66, 133, 244, 0.14) 0%, rgba(15, 20, 32, 0.9) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 32px rgba(66, 133, 244, 0.16)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: '1.25rem',
                }}
              >
                {/* Avatar & Badges Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    {userProfile.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.full_name}
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(66, 133, 244, 0.5)',
                          boxShadow: '0 0 16px rgba(66, 133, 244, 0.3)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                        border: '2px solid rgba(66, 133, 244, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <UserIcon size={28} color="var(--google-blue)" />
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: '#34A853',
                      border: '2px solid #0F1420',
                      boxShadow: '0 0 8px #34A853',
                    }} />
                  </div>

                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                      {roleInfo && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          background: roleInfo.bg,
                          color: roleInfo.color,
                          border: `1px solid ${roleInfo.border}`,
                        }}>
                          {roleInfo.title}
                        </span>
                      )}
                      {userProfile.department && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '999px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}>
                          {userProfile.department.name}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.35rem', marginBottom: 0 }}>
                      Welcome back, {userProfile.full_name || 'Member'}!
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
                  Your chapter workspace is ready. Access your assigned tasks, attendance records, events, and credentials.
                </p>

                {/* Main CTA: Chapter Dashboard & Secondary Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: '0.35rem' }}>
                  <Link
                    href="/dashboard"
                    className="btn-primary"
                    style={{
                      padding: '0.85rem 1.85rem',
                      fontSize: '1rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      boxShadow: '0 4px 20px rgba(66, 133, 244, 0.45)',
                      textDecoration: 'none',
                    }}
                  >
                    <LayoutGrid size={19} />
                    <span>Enter Chapter Dashboard</span>
                    <ArrowRight size={18} />
                  </Link>

                  {['president', 'co_president', 'branch_head'].includes(userProfile.role) && (
                    <Link
                      href="/approvals"
                      className="btn-secondary"
                      style={{
                        padding: '0.85rem 1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        textDecoration: 'none',
                      }}
                    >
                      <Workflow size={16} color="var(--google-yellow)" />
                      <span>Approvals Portal</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : currentUser && userProfile?.status === 'pending_review' ? (
              /* Case B: Pending Review Card */
              <div
                className="glass-panel animate-fade-in"
                style={{
                  maxWidth: '560px',
                  width: '100%',
                  margin: '0 auto',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'rgba(251, 188, 4, 0.08)',
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(251, 188, 4, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Sparkles size={24} color="var(--google-yellow)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FDE047', marginBottom: '0.4rem' }}>
                    Application Under Review
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    Your membership application has been received and is currently being reviewed by chapter leadership.
                  </p>
                </div>
                <Link
                  href="/onboarding/status"
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.6rem',
                    fontSize: '0.95rem',
                    background: 'linear-gradient(135deg, #FBBC04 0%, #D97706 100%)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Check Application Status</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : currentUser ? (
              /* Case C: Incomplete Profile / Onboarding Required */
              <div
                className="glass-panel animate-fade-in"
                style={{
                  maxWidth: '560px',
                  width: '100%',
                  margin: '0 auto',
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'rgba(66, 133, 244, 0.08)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#93C5FD', marginBottom: '0.4rem' }}>
                  Finish Setting Up Your Profile
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  Complete your academic details and select your track to activate your chapter membership.
                </p>
                <Link
                  href="/onboarding/complete-profile"
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.6rem',
                    fontSize: '0.95rem',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Complete Your Profile</span>
                  <ArrowRight size={17} />
                </Link>
              </div>
            ) : (
              /* Case D: Visitor (Not logged in) */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <SignInWithGoogleButton label="Sign in with Google" variant="primary" />
                <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Open to all Helwan National University students & members
                </span>
              </div>
            )}
          </div>

          {/* Key Value Badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid var(--border-subtle)' }}>
              <Lock size={14} color="var(--google-blue)" />
              <span>Google OAuth Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid var(--border-subtle)' }}>
              <Zap size={14} color="var(--google-yellow)" />
              <span>Mobile PWA Ready</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.03)', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid var(--border-subtle)' }}>
              <Layers size={14} color="var(--google-green)" />
              <span>Postgres RLS Enforced</span>
            </div>
          </div>
        </section>

        {/* Chapter Tracks & Committees */}
        <section style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Our Chapter Tracks & Committees
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Every track operates as a dedicated first-class unit with specialized tools and workflows
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            {tracks.map((track, i) => (
              <div
                key={i}
                className="glass-panel"
                style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
              >
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: track.color, boxShadow: `0 0 8px ${track.color}` }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{track.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{track.branch} Branch</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture Modules Grid */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 700, letterSpacing: '-0.02em' }}>Platform Core Modules</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Engineered end-to-end to eliminate manual spreadsheets and fragmented chats</p>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
              Phase 2: Auth Active
            </div>
          </div>

          <div className="grid-cards">
            {modules.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <div
                  key={idx}
                  className="glass-panel"
                  style={{
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: mod.color, opacity: 0.8 }} />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.04)', border: `1px solid rgba(255, 255, 255, 0.08)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={22} color={mod.color} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem 0.65rem', borderRadius: '999px' }}>
                        {mod.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.18rem', fontWeight: 700, marginBottom: '0.6rem' }}>{mod.title}</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      {mod.desc}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Ready in Platform</span>
                    <CheckCircle2 size={14} color="#4ADE80" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem 1.5rem', background: 'rgba(11, 15, 25, 0.9)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            © 2026 Google Developer Groups on Campus — Helwan National University (HNU).
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
            <Link href="/certificates" style={{ color: 'inherit', textDecoration: 'none' }}>Certificates</Link>
            <Link href="/api/db-verify" style={{ color: 'inherit', textDecoration: 'none' }}>System Health</Link>
            <Link href="/manifest.webmanifest" style={{ color: 'inherit', textDecoration: 'none' }}>PWA Manifest</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
