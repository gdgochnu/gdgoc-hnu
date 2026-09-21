import Link from 'next/link';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  Award,
  QrCode,
  Users,
  ArrowRight,
  CheckCircle2,
  Video,
  MapPin,
  FileCode2,
  Cpu,
  Smartphone,
  Globe,
  Cloud,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Terminal,
  Layers,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Student Portal — GDGoC Helwan National University',
  description:
    'Free hands-on developer courses, weekend workshops, mentorship from committee leads, and President-verified certificates at Helwan National University.',
};

export default async function StudentPortalLandingPage() {
  const context = await getUserContext().catch(() => null);
  const currentUser = context?.user || null;
  const isTeamMember = Boolean(context?.profile);

  let studentProfile = null;
  if (currentUser) {
    try {
      const res = await getCurrentStudentProfile();
      studentProfile = res.student;
    } catch (e) {
      console.warn('Failed to load student profile for landing page:', e);
    }
  }

  const tracks = [
    {
      id: 'web',
      title: 'Web & Full-Stack Development',
      desc: 'Master HTML5, CSS3, modern TypeScript, React, Next.js 15, and serverless architectures.',
      icon: Globe,
      color: '#4285F4', // Google Blue
      badge: 'Most Popular',
      sessions: 'Multi-Session Course + Capstone',
    },
    {
      id: 'mobile',
      title: 'Mobile App Development',
      desc: 'Build cross-platform iOS and Android apps using Flutter, Dart, state management, and Firebase.',
      icon: Smartphone,
      color: '#34A853', // Google Green
      badge: 'High Demand',
      sessions: 'Practical Labs + Code Reviews',
    },
    {
      id: 'ai',
      title: 'Artificial Intelligence & Machine Learning',
      desc: 'Explore Python for Data Science, Scikit-learn, Neural Networks, Computer Vision, and Prompt Engineering.',
      icon: Cpu,
      color: '#EA4335', // Google Red
      badge: 'Future Tech',
      sessions: 'Real-world Datasets + Hands-on',
    },
    {
      id: 'cloud',
      title: 'Google Cloud & Modern DevOps',
      desc: 'Learn cloud computing fundamentals, Docker containers, Kubernetes orchestration, and GCP services.',
      icon: Cloud,
      color: '#FBBC04', // Google Yellow
      badge: 'Industry Certified',
      sessions: 'Cloud Console + Live Demos',
    },
    {
      id: 'cyber',
      title: 'Cybersecurity & Network Defense',
      desc: 'Understand web security vulnerabilities, penetration testing basics, cryptography, and defensive hygiene.',
      icon: ShieldAlert,
      color: '#A855F7', // Purple
      badge: 'Specialized',
      sessions: 'CTF Challenges + Labs',
    },
    {
      id: 'core',
      title: 'Git, GitHub & Core Tech Skills',
      desc: 'Professional version control, open-source contribution, technical interviewing, and portfolio building.',
      icon: Terminal,
      color: '#38BDF8', // Cyan
      badge: 'Essential',
      sessions: 'Weekend Bootcamps',
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'One-Click Student Sign-In',
      desc: 'Sign in with your Google account. Your permanent attendance QR code is automatically generated instantly.',
      icon: QrCode,
      color: '#4285F4',
    },
    {
      step: '02',
      title: 'Enroll in Tracks & Workshops',
      desc: 'Browse courses owned by specialized committees. Join open tracks or apply for instructor-gated bootcamps.',
      icon: BookOpen,
      color: '#34A853',
    },
    {
      step: '03',
      title: 'Attend Sessions & Submit Tasks',
      desc: 'Attend campus sessions (scanned via your personal QR) or watch online YouTube live classes. Submit task links and take quizzes.',
      icon: FileCode2,
      color: '#FBBC04',
    },
    {
      step: '04',
      title: 'Earn Verified Certificates',
      desc: 'Meet course attendance and deliverable criteria to receive official President-approved credentials verified via QR codes.',
      icon: Award,
      color: '#EA4335',
    },
  ];

  const faqs = [
    {
      q: 'Are courses and workshops in the Student Portal free?',
      a: 'Yes, 100% free! GDGoC Helwan National University is a non-profit, student-led developer community supported by Google. All materials, sessions, and certificates are provided at zero cost.',
    },
    {
      q: 'Who can enroll in these learning programs?',
      a: 'Any university student! While our primary campus is Helwan National University (HNU), students from all Egyptian universities are welcome to register for open tracks and online sessions.',
    },
    {
      q: 'How is attendance recorded during sessions?',
      a: 'Each student receives a permanent QR code on their profile. When you attend an offline session or workshop, an HR officer or Instructor scans your QR using their camera to log your check-in instantly.',
    },
    {
      q: 'I am a GDGoC HNU Team Member. Can I join as a student?',
      a: 'Yes! Our Dual-Role Bridge allows team members to enroll as students in any other committee’s courses. Your accounts are bridged automatically via your team email.',
    },
    {
      q: 'How do I receive a certificate of completion?',
      a: 'Complete the required attendance rate (typically ≥75%) and submit the required tasks/quizzes. The Chapter President reviews final eligibility and issues high-resolution digital certificates with public verification codes.',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#F8FAFC',
        fontFamily: 'var(--font-inter, sans-serif)',
        overflowX: 'hidden',
      }}
    >
      {/* Top Floating Glass Navigation Bar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(11, 15, 25, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.85rem 1.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Logo & Portal Identity */}
          <Link
            href="/student"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(52, 168, 83, 0.2) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={22} color="#60A5FA" />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                GDGoC HNU <span style={{ color: '#60A5FA' }}>Student Portal</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                Learning & Mentorship Engine
              </div>
            </div>
          </Link>

          {/* Quick Nav Links — desktop only via CSS class */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
            }}
            className="student-landing-nav-links"
          >
            <a href="#tracks" style={{ color: '#CBD5E1', fontSize: '0.86rem', fontWeight: 600, textDecoration: 'none' }}>
              Tracks &amp; Courses
            </a>
            <a href="#how-it-works" style={{ color: '#CBD5E1', fontSize: '0.86rem', fontWeight: 600, textDecoration: 'none' }}>
              How It Works
            </a>
            <a href="#bridge" style={{ color: '#CBD5E1', fontSize: '0.86rem', fontWeight: 600, textDecoration: 'none' }}>
              Team Member Bridge
            </a>
            <a href="#faq" style={{ color: '#CBD5E1', fontSize: '0.86rem', fontWeight: 600, textDecoration: 'none' }}>
              FAQ
            </a>
          </div>

          {/* User Auth Action Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {studentProfile?.status === 'active' ? (
                  <Link
                    href="/student/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                    }}
                  >
                    <span>My Dashboard</span>
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <Link
                    href="/student/onboarding"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '10px',
                      background: 'rgba(251, 188, 4, 0.15)',
                      border: '1px solid rgba(251, 188, 4, 0.4)',
                      color: '#FDE047',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Sparkles size={15} />
                    <span>Complete Profile</span>
                  </Link>
                )}
              </div>
            ) : (
              <SignInWithGoogleButton
                label="Sign In"
                variant="nav"
                redirectTo="/student/dashboard"
              />
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '4.5rem 1.5rem 3.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Glow Spheres */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '350px',
            background: 'radial-gradient(ellipse at center, rgba(66, 133, 244, 0.18) 0%, rgba(52, 168, 83, 0.08) 50%, transparent 75%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto' }}>
          {/* Official Google Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.12)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              color: '#93C5FD',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4ADE80',
                boxShadow: '0 0 10px #4ADE80',
              }}
            />
            <span>Google Developer Groups on Campus • Helwan National University</span>
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.75rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              color: '#FFFFFF',
              letterSpacing: '-0.025em',
              margin: '0 0 1.25rem',
            }}
          >
            Learn Real Tech.{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Build Working Software.
            </span>{' '}
            Get Google Certified.
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.18rem)',
              color: '#94A3B8',
              lineHeight: 1.65,
              margin: '0 auto 2.25rem',
              maxWidth: '720px',
            }}
          >
            The dedicated learning management system for Helwan National University students. Hands-on courses,
            weekend bootcamps, 1-on-1 code reviews by committee leads, and President-approved verifiable credentials.
          </p>

          {/* Dual Role Alert Pill if Team Member */}
          {isTeamMember && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.5rem 1.1rem',
                borderRadius: '12px',
                background: 'rgba(52, 168, 83, 0.12)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                color: '#86EFAC',
                fontSize: '0.84rem',
                fontWeight: 700,
                marginBottom: '1.75rem',
              }}
            >
              <CheckCircle2 size={16} color="#4ADE80" />
              <span>Team Member Bridge Active: You can enroll in student courses with your team account!</span>
            </div>
          )}

          {/* Hero Call to Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {currentUser ? (
              studentProfile?.status === 'active' ? (
                <>
                  <Link
                    href="/student/dashboard"
                    style={{
                      padding: '0.9rem 1.8rem',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                      color: '#FFFFFF',
                      fontSize: '1rem',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 8px 25px rgba(66, 133, 244, 0.4)',
                    }}
                  >
                    <span>Open Student Dashboard</span>
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/student/my-qr"
                    style={{
                      padding: '0.9rem 1.5rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      color: '#F1F5F9',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <QrCode size={18} color="#60A5FA" />
                    <span>My Attendance QR</span>
                  </Link>
                </>
              ) : (
                <Link
                  href="/student/onboarding"
                  style={{
                    padding: '0.9rem 1.8rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FBBC04 0%, #F59E0B 100%)',
                    color: '#0B0F19',
                    fontSize: '1rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 25px rgba(251, 188, 4, 0.35)',
                  }}
                >
                  <Sparkles size={18} />
                  <span>Complete Your Student Profile</span>
                  <ArrowRight size={18} />
                </Link>
              )
            ) : (
              <>
                <SignInWithGoogleButton
                  label="Join as Student with Google"
                  redirectTo="/student/dashboard"
                />
                <a
                  href="#tracks"
                  style={{
                    padding: '0.9rem 1.5rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#CBD5E1',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <span>Explore Tracks</span>
                  <ChevronRight size={17} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Live Portal Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            marginTop: '4rem',
          }}
        >
          {[
            { num: '500+', label: 'University Students', detail: 'Helwan National University & beyond', color: '#4285F4' },
            { num: '100%', label: 'Free & Open Learning', detail: 'Hands-on courses & bootcamps', color: '#34A853' },
            { num: '1-on-1', label: 'Mentorship & Tasks', detail: 'Reviewed by GDGoC Tech Leads', color: '#FBBC04' },
            { num: 'Verifiable', label: 'Google Chapter Certificates', detail: 'Signed by President with QR verification', color: '#EA4335' },
          ].map((s, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: '18px',
                padding: '1.5rem 1.25rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, letterSpacing: '-0.02em' }}>
                {s.num}
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.35rem' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                {s.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tracks & Curriculum Section */}
      <section
        id="tracks"
        style={{
          padding: '4.5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Curriculum & Tracks
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            Specialized Tech Tracks Taught by GDGoC Committee Leads
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94A3B8', marginTop: '0.75rem', lineHeight: 1.6 }}>
            Each track is managed directly by its owning committee (e.g. Web, Mobile, AI) featuring offline labs on campus and online YouTube live streaming.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {tracks.map((t) => {
            const IconComponent = t.icon;
            return (
              <div
                key={t.id}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(180deg, rgba(19, 27, 46, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        background: `${t.color}18`,
                        border: `1px solid ${t.color}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComponent size={24} color={t.color} />
                    </div>

                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.65rem',
                        borderRadius: '999px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        color: '#CBD5E1',
                      }}
                    >
                      {t.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                    {t.title}
                  </h3>

                  <p style={{ fontSize: '0.86rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
                    {t.desc}
                  </p>
                </div>

                <div
                  style={{
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: '#64748B',
                  }}
                >
                  <span style={{ color: '#93C5FD', fontWeight: 600 }}>{t.sessions}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: '#CBD5E1', fontWeight: 700 }}>
                    Official Track
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          padding: '4.5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: '32px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3.5rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#34A853', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Clear & Simple Process
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            How the Student Portal Works
          </h2>
          <p style={{ fontSize: '0.95rem', color: '#94A3B8', marginTop: '0.75rem', lineHeight: 1.6 }}>
            From your first sign-in to receiving a verified certificate approved by the Chapter President.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  borderRadius: '18px',
                  background: 'rgba(19, 27, 46, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '1.75rem 1.5rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1.25rem',
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    color: 'rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {s.step}
                </div>

                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: `${s.color}18`,
                    border: `1px solid ${s.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <Icon size={20} color={s.color} />
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
                  {s.title}
                </h3>

                <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
                  {s.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team Member Bridge Showcase */}
      <section
        id="bridge"
        style={{
          padding: '4.5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
        }}
      >
        <div
          className="glass-panel"
          style={{
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.12) 100%)',
            border: '1px solid rgba(66, 133, 244, 0.35)',
            padding: '2.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div style={{ flex: 1, minWidth: '300px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(66, 133, 244, 0.2)',
                color: '#93C5FD',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '1rem',
              }}
            >
              <Layers size={13} />
              <span>Team Member Bridge (§4.S.2)</span>
            </span>

            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.85rem' }}>
              Are you already a GDGoC HNU Team Member?
            </h2>

            <p style={{ fontSize: '0.94rem', color: '#CBD5E1', margin: 0, lineHeight: 1.65, maxWidth: '650px' }}>
              Our unique Dual-Role architecture allows members of any committee (e.g. PR, Media, HR, Logistics)
              to register as learners in Web, Mobile, or AI tracks. Your team identity and student profile
              are automatically linked seamlessly!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
            {currentUser ? (
              <Link
                href="/student/dashboard"
                style={{
                  padding: '0.85rem 1.6rem',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Access Student Portal
              </Link>
            ) : (
              <SignInWithGoogleButton
                label="Sign In with Team Email"
                redirectTo="/student/dashboard"
              />
            )}
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>
              Auto-detects matching email in chapter roster
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        style={{
          padding: '4.5rem 1.5rem',
          maxWidth: '860px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', margin: '0 auto 2.75rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FBBC04', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Frequently Asked Questions
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
            Got Questions? We’ve Got Answers.
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                padding: '1.4rem 1.5rem',
              }}
            >
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={17} color="#60A5FA" />
                <span>{f.q}</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, paddingLeft: '1.55rem' }}>
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action Banner */}
      <section
        style={{
          padding: '4rem 1.5rem 6rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          className="glass-panel"
          style={{
            borderRadius: '28px',
            background: 'linear-gradient(180deg, #131B2E 0%, #0B0F19 100%)',
            border: '1px solid rgba(66, 133, 244, 0.4)',
            padding: '3.5rem 2rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          <h2 style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem' }}>
            Ready to Start Your Tech Journey?
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            Join hundreds of Helwan National University students building real applications and learning from industry mentors.
          </p>

          <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
            {currentUser ? (
              <Link
                href="/student/dashboard"
                style={{
                  padding: '1rem 2.2rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontSize: '1.05rem',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 10px 30px rgba(66, 133, 244, 0.45)',
                }}
              >
                <span>Go to Your Student Dashboard</span>
                <ArrowRight size={18} />
              </Link>
            ) : (
              <SignInWithGoogleButton
                label="Sign In with Google — It's Free"
                redirectTo="/student/dashboard"
              />
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(11, 15, 25, 0.95)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.82rem',
          color: '#64748B',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
          <GraduationCap size={16} color="#60A5FA" />
          <span style={{ color: '#F1F5F9', fontWeight: 700 }}>GDGoC HNU Student Portal</span>
          <span>•</span>
          <span>Google Developer Groups on Campus</span>
        </div>
        <div>
          Helwan National University (HNU) Chapter • Built with Next.js, Supabase, and Tailwind-free Vanilla CSS.
        </div>
      </footer>
    </div>
  );
}
