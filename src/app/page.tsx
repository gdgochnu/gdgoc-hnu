import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { createAdminClient } from '@/lib/supabase/admin';
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
  Cpu,
  Smartphone,
  Globe,
  Cloud,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  CheckSquare,
  Workflow,
  FolderGit2,
  Zap,
  Lock,
  Layers,
  Search,
  Compass,
  Video,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GDGoC HNU — Google Developer Groups on Campus Helwan National University',
  description:
    'The official student developer learning portal at Helwan National University. Free industry-aligned courses, weekend bootcamps, tech mentorship, and President-verified credentials.',
};

interface HomePageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage(props: HomePageProps) {
  // 1. Fetch user context & student profile
  let currentUser = null;
  let teamProfile = null;
  let studentProfile = null;

  try {
    const context = await getUserContext().catch(() => null);
    currentUser = context?.user || null;
    teamProfile = context?.profile || null;

    if (currentUser) {
      const res = await getCurrentStudentProfile().catch(() => null);
      if (res?.success) {
        studentProfile = res.student;
      }
    }
  } catch (err) {
    console.warn('HomePage session retrieval notice:', err);
  }

  // 2. Fetch live portal counts from database
  let studentsCount = 0;
  let coursesCount = 0;
  let workshopsCount = 0;
  let certificatesCount = 0;

  try {
    const admin = createAdminClient();
    const [stuRes, courseRes, wsRes, certRes] = await Promise.all([
      admin.from('student_profiles').select('id', { count: 'exact', head: true }),
      admin.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      admin.from('workshops').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
      admin.from('student_certificates').select('id', { count: 'exact', head: true }),
    ]);

    studentsCount = stuRes.count || 0;
    coursesCount = courseRes.count || 0;
    workshopsCount = wsRes.count || 0;
    certificatesCount = certRes.count || 0;
  } catch (err) {
    console.warn('Failed to load dynamic portal counts:', err);
  }

  // Official Chapter Tracks & Committees matching DB public.departments
  const techTracks = [
    {
      code: 'WEB',
      title: 'Web Development',
      branch: 'Tech Track',
      desc: 'Frontend, Backend, and Full-Stack web engineering using modern TypeScript, React, Next.js, and serverless cloud architectures.',
      icon: Globe,
      color: '#4285F4', // Google Blue
      badge: 'Full-Stack Engineering',
      curriculum: 'TypeScript • React • Next.js • REST & Supabase',
      href: '/student/courses',
    },
    {
      code: 'AI',
      title: 'AI & Machine Learning',
      branch: 'Tech Track',
      desc: 'Deep learning, LLMs, computer vision, data science pipelines, neural networks, and intelligent system integrations.',
      icon: Cpu,
      color: '#EA4335', // Google Red
      badge: 'Data & Intelligence',
      curriculum: 'Python • Scikit-learn • TensorFlow • LLM APIs',
      href: '/student/courses',
    },
    {
      code: 'MOBILE',
      title: 'Mobile Development',
      branch: 'Tech Track',
      desc: 'Cross-platform and native mobile apps with Flutter, Android, Dart, state management, and Firebase cloud integrations.',
      icon: Smartphone,
      color: '#34A853', // Google Green
      badge: 'Mobile Engineering',
      curriculum: 'Flutter • Dart • Android SDK • Firebase Cloud',
      href: '/student/courses',
    },
    {
      code: 'CLOUD',
      title: 'Cloud & DevOps',
      branch: 'Tech Track',
      desc: 'Google Cloud Platform (GCP), infrastructure as code, containerization with Docker, Kubernetes, and automated CI/CD pipelines.',
      icon: Cloud,
      color: '#FBBC04', // Google Yellow
      badge: 'Cloud Infrastructure',
      curriculum: 'Google Cloud Platform • Docker • CI/CD Pipelines',
      href: '/student/courses',
    },
  ];

  const nonTechCommittees = [
    {
      code: 'HR',
      title: 'Human Resources (HR)',
      branch: 'Non-Tech Committee',
      desc: 'Member talent recruitment, onboarding pipelines, member performance reviews, and attendance desk operations.',
      icon: Users,
      color: '#4285F4', // Google Blue
      badge: 'People & Operations',
      curriculum: 'Talent Recruitment • Appraisals • Engagement',
      href: '/dashboard',
    },
    {
      code: 'PR',
      title: 'Public Relations (PR)',
      branch: 'Non-Tech Committee',
      desc: 'Corporate sponsorships, external industry partnerships, university administration relations, and guest speaker outreach.',
      icon: Compass,
      color: '#EA4335', // Google Red
      badge: 'External Partnerships',
      curriculum: 'Sponsorships • Industry Relations • Speaker Outreach',
      href: '/student/workshops',
    },
    {
      code: 'MEDIA',
      title: 'Media & Branding',
      branch: 'Non-Tech Committee',
      desc: 'Google chapter visual identity, UI design, motion graphics, video production, social channels, and event photography.',
      icon: Video,
      color: '#FBBC04', // Google Yellow
      badge: 'Creative & Design',
      curriculum: 'Visual Identity • Figma • Motion Graphics • Coverage',
      href: '/student/workshops',
    },
    {
      code: 'OPS',
      title: 'Operations & Logistics',
      branch: 'Non-Tech Committee',
      desc: 'Campus event management, auditorium reservations, audio/visual setups, hardware coordination, and on-ground logistics.',
      icon: Calendar,
      color: '#34A853', // Google Green
      badge: 'Event Logistics',
      curriculum: 'Event Logistics • Venue Preparation • Stage Execution',
      href: '/student/workshops',
    },
  ];

  // FAQs
  const faqs = [
    {
      q: 'Is the GDGoC HNU Student Portal free for all university students?',
      a: 'Yes, 100% free! Every course, workshop, code review, mentorship session, and verified completion certificate is provided at zero cost to Helwan National University students as part of the Google Developer Groups on Campus community initiative.',
    },
    {
      q: 'How does the digital Attendance QR Pass work?',
      a: 'When you activate your student profile, a unique permanent QR code is automatically generated for your account. You can save or screenshot your pass on your phone. When attending offline lectures or weekend bootcamps, our event officers scan your code in under 5 seconds to record your verified attendance.',
    },
    {
      q: 'How are course completion certificates verified by employers?',
      a: 'Each certificate issued by GDGoC Helwan National University is approved and cryptographically signed by the Chapter President. Every certificate features a permanent serial code and QR code that can be verified by employers and universities anytime via our public /verify portal.',
    },
    {
      q: 'Can I enroll in multiple tracks simultaneously?',
      a: 'Yes! You can explore and enroll in multiple technical tracks (e.g. Web Development and AI/ML). We recommend focusing on one primary track per semester to ensure you can complete all practical assignments, checkpoint quizzes, and capstone projects on schedule.',
    },
    {
      q: 'I am a GDGoC Team Member. How do I access the Chapter Operations OS?',
      a: 'Team members can seamlessly switch between the Student Portal and Chapter Operations OS. Look for the "Chapter Operations OS" link in the top bar or in the dedicated Leadership section at the bottom of the footer.',
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
      {/* ========================================================================= */}
      {/* 1. TOP DUAL-ROLE BANNER (SHOWN ONLY IF LOGGED IN AS TEAM MEMBER) */}
      {/* ========================================================================= */}
      {teamProfile && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.15) 100%)',
            borderBottom: '1px solid rgba(66, 133, 244, 0.25)',
            padding: '0.45rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#93C5FD' }}>
            <ShieldCheck size={14} color="#60A5FA" />
            <span>You are logged in as a Chapter Team Member ({teamProfile.role?.replace(/_/g, ' ')})</span>
          </span>
          <Link
            href="/dashboard"
            style={{
              color: '#FFFFFF',
              background: 'rgba(66, 133, 244, 0.25)',
              border: '1px solid rgba(66, 133, 244, 0.4)',
              padding: '0.15rem 0.6rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.76rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>Open Chapter OS</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN NAVIGATION HEADER */}
      {/* ========================================================================= */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(7, 11, 20, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0.9rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo & Brand */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              }}
            >
              <img
                src="/icons/icon.svg"
                alt="GDGoC Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 900, fontSize: '1.05rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  GDGoC
                </span>
                <span
                  style={{
                    background: 'linear-gradient(90deg, #4285F4, #34A853)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 900,
                    fontSize: '1.05rem',
                  }}
                >
                  HNU
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                Helwan National University
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.75rem',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
            className="student-landing-nav-links"
          >
            <a href="#tracks" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              Tracks
            </a>
            <a href="#journey" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              How it Works
            </a>
            <Link href="/student/courses" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              Courses
            </Link>
            <Link href="/student/workshops" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              Bootcamps
            </Link>
            <Link href="/verify" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              Verify Credential
            </Link>
            <a href="#faq" style={{ color: '#CBD5E1', textDecoration: 'none', transition: 'color 0.2s' }}>
              FAQ
            </a>
          </nav>

          {/* Auth Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentUser ? (
              <Link
                href="/student/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1.15rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                }}
              >
                <LayoutGrid size={15} />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <SignInWithGoogleButton
                label="Sign In"
                redirectTo="/student/onboarding"
              />
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. HERO SECTION */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '5rem 1.5rem 4rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Glow Ambient Blobs */}
        <div
          style={{
            position: 'absolute',
            top: '5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(66, 133, 244, 0.15) 0%, rgba(52, 168, 83, 0.08) 50%, transparent 75%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto' }}>
          {/* Top Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              background: 'rgba(66, 133, 244, 0.12)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#93C5FD',
              fontSize: '0.84rem',
              fontWeight: 800,
              marginBottom: '1.75rem',
              boxShadow: '0 4px 20px rgba(66, 133, 244, 0.15)',
            }}
          >
            <Sparkles size={15} color="#60A5FA" />
            <span>Google Developer Groups on Campus • Helwan National University</span>
          </div>

          {/* Main Hero Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.85rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 1.5rem',
            }}
          >
            Build Real Applications.{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Learn with Industry Mentors.
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: '#94A3B8',
              lineHeight: 1.65,
              maxWidth: '720px',
              margin: '0 auto 2.5rem',
              fontWeight: 500,
            }}
          >
            Free hands-on developer curricula, weekend intensive bootcamps, practical code reviews, and President-verified credentials — built exclusively for Helwan National University students.
          </p>

          {/* Hero Call to Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '4rem',
            }}
          >
            {currentUser ? (
              <>
                <Link
                  href="/student/dashboard"
                  style={{
                    padding: '0.95rem 2rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 10px 30px rgba(66, 133, 244, 0.4)',
                  }}
                >
                  <LayoutGrid size={18} />
                  <span>Open Student Dashboard</span>
                </Link>

                <Link
                  href="/student/courses"
                  style={{
                    padding: '0.95rem 1.75rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Explore Courses</span>
                  <ChevronRight size={17} />
                </Link>
              </>
            ) : (
              <>
                <SignInWithGoogleButton
                  label="Join as a Student — It's Free"
                  redirectTo="/student/onboarding"
                />

                <a
                  href="#tracks"
                  style={{
                    padding: '0.95rem 1.75rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>Browse Tracks</span>
                  <ChevronRight size={17} />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Portal Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
            maxWidth: '1100px',
            margin: '0 auto',
          }}
        >
          {[
            {
              num: studentsCount > 0 ? `${studentsCount}+` : '500+',
              label: 'Enrolled Students',
              detail: 'Helwan National University community',
              color: '#4285F4',
            },
            {
              num: coursesCount > 0 ? `${coursesCount} Tracks` : '6 Tracks',
              label: 'Technical Curricula',
              detail: 'Hands-on courses with YouTube & slides',
              color: '#34A853',
            },
            {
              num: workshopsCount > 0 ? `${workshopsCount} Bootcamps` : 'Weekend Bootcamps',
              label: 'Intensive Workshops',
              detail: 'QR-verified attendance & labs',
              color: '#FBBC04',
            },
            {
              num: certificatesCount > 0 ? `${certificatesCount}+` : 'Verifiable',
              label: 'Signed Certificates',
              detail: 'Cryptographic QR verification code',
              color: '#EA4335',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: '18px',
                padding: '1.6rem 1.25rem',
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              }}
            >
              <div style={{ fontSize: '2.15rem', fontWeight: 900, color: stat.color, letterSpacing: '-0.02em' }}>
                {stat.num}
              </div>
              <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.35rem' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                {stat.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. OFFICIAL CHAPTER TRACKS & COMMITTEES SHOWCASE */}
      {/* ========================================================================= */}
      <section
        id="tracks"
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '750px', margin: '0 auto 3.5rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#60A5FA',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            Chapter Structure & Disciplines
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 1rem',
              letterSpacing: '-0.02em',
            }}
          >
            Official Chapter Tracks & Committees
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
            Operating directly under Google Developer Groups on Campus Helwan National University. Structured into specialized technical learning tracks and professional operations committees.
          </p>
        </div>

        {/* --- Sub-Section A: Technical Learning Tracks --- */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#93C5FD',
                fontSize: '0.82rem',
                fontWeight: 800,
                border: '1px solid rgba(66, 133, 244, 0.3)',
              }}
            >
              <Cpu size={14} color="#60A5FA" />
              <span>Technical Learning Tracks (Tech Branch)</span>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {techTracks.map((track) => {
              const Icon = track.icon;
              return (
                <div
                  key={track.code}
                  className="glass-panel"
                  style={{
                    borderRadius: '20px',
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
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
                      height: '3px',
                      background: track.color,
                      opacity: 0.85,
                    }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: `${track.color}15`,
                          border: `1px solid ${track.color}35`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={24} color={track.color} />
                      </div>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '999px',
                          background: `${track.color}18`,
                          color: track.color,
                          border: `1px solid ${track.color}35`,
                          fontFamily: 'monospace',
                        }}
                      >
                        {track.code}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
                      {track.title}
                    </h3>

                    <p style={{ fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                      {track.desc}
                    </p>

                    <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                      Stack: {track.curriculum}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                      paddingTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', color: track.color, fontWeight: 700 }}>
                      {track.badge}
                    </span>
                    <Link
                      href={track.href}
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>Explore Courses</span>
                      <ArrowRight size={13} color={track.color} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Sub-Section B: Operations & Creative Committees --- */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: 'rgba(52, 168, 83, 0.15)',
                color: '#86EFAC',
                fontSize: '0.82rem',
                fontWeight: 800,
                border: '1px solid rgba(52, 168, 83, 0.3)',
              }}
            >
              <Workflow size={14} color="#34A853" />
              <span>Operations & Creative Committees (Non-Tech Branch)</span>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {nonTechCommittees.map((comm) => {
              const Icon = comm.icon;
              return (
                <div
                  key={comm.code}
                  className="glass-panel"
                  style={{
                    borderRadius: '20px',
                    padding: '2rem',
                    background: 'rgba(15, 23, 42, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
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
                      height: '3px',
                      background: comm.color,
                      opacity: 0.85,
                    }}
                  />

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: `${comm.color}15`,
                          border: `1px solid ${comm.color}35`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={24} color={comm.color} />
                      </div>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '999px',
                          background: `${comm.color}18`,
                          color: comm.color,
                          border: `1px solid ${comm.color}35`,
                          fontFamily: 'monospace',
                        }}
                      >
                        {comm.code}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.5rem' }}>
                      {comm.title}
                    </h3>

                    <p style={{ fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
                      {comm.desc}
                    </p>

                    <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                      Focus: {comm.curriculum}
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                      paddingTop: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', color: comm.color, fontWeight: 700 }}>
                      {comm.badge}
                    </span>
                    <Link
                      href={comm.href}
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>Learn More</span>
                      <ArrowRight size={13} color={comm.color} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HOW IT WORKS (STUDENT LEARNING JOURNEY) */}
      {/* ========================================================================= */}
      <section
        id="journey"
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          background: 'radial-gradient(ellipse at bottom, rgba(15, 23, 42, 0.5) 0%, transparent 70%)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#34A853',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            Structured Growth
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 1rem',
              letterSpacing: '-0.02em',
            }}
          >
            Your 4-Step Journey to Tech Mastery
          </h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
            A streamlined process from joining with your Google account to receiving verified credentials signed by Chapter leadership.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[
            {
              step: '01',
              title: 'Instant Sign-In & QR Pass',
              desc: 'Sign in with your Google account and complete your academic info to immediately unlock your permanent attendance QR pass.',
              icon: QrCode,
              color: '#4285F4',
            },
            {
              step: '02',
              title: 'Enroll in Tracks & Bootcamps',
              desc: 'Select your preferred technical discipline. Access syllabus, live meeting links, embedded YouTube lectures, and PDF slides.',
              icon: BookOpen,
              color: '#34A853',
            },
            {
              step: '03',
              title: 'Hands-On Tasks & Feedback',
              desc: 'Submit weekly coding assignments and take checkpoint quizzes. Receive personalized feedback and grades from GDGoC tech leads.',
              icon: CheckSquare,
              color: '#FBBC04',
            },
            {
              step: '04',
              title: 'President-Verified Certificate',
              desc: 'Pass track evaluation benchmarks to earn an official certificate signed by Chapter leadership, verifiable via public QR codes.',
              icon: Award,
              color: '#EA4335',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  padding: '2rem 1.5rem',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} color={item.color} />
                  </div>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgba(255, 255, 255, 0.15)' }}>
                    {item.step}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  {item.title}
                </h3>

                <p style={{ fontSize: '0.86rem', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. PERMANENT ATTENDANCE PASS & VERIFICATION HIGHLIGHT */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: '4rem 1.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
        }}
      >
        <div
          className="glass-panel"
          style={{
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            padding: '3rem 2.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#93C5FD',
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '1rem',
              }}
            >
              <QrCode size={14} />
              <span>Smart Contactless Pass</span>
            </div>

            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.25rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem', lineHeight: 1.2 }}>
              Your Official Attendance Pass — Ready in Under 5 Seconds
            </h2>

            <p style={{ fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
              No paper sign-in sheets. Your digital QR code pass is permanent, encrypted, and recognized across all on-campus sessions, hackathons, and weekend workshops.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              {[
                'Instant scanner check-in by HR officers with duplicate prevention',
                'Real-time attendance rate updates on your personal student dashboard',
                'Eligibility safeguard: attendance directly contributes to your completion certificates',
              ].map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', color: '#CBD5E1' }}>
                  <CheckCircle2 size={16} color="#34A853" style={{ flexShrink: 0 }} />
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <Link
              href={currentUser ? '/student/my-qr' : '/student/onboarding'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 4px 15px rgba(66, 133, 244, 0.4)',
              }}
            >
              <span>{currentUser ? 'View My QR Pass' : 'Get Your Attendance Pass'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Pass Preview Mockup */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              className="glass-panel"
              style={{
                maxWidth: '340px',
                width: '100%',
                borderRadius: '20px',
                padding: '2rem 1.5rem',
                background: 'rgba(10, 15, 28, 0.9)',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                textAlign: 'center',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.6)',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                }}
              >
                <QrCode size={26} color="#60A5FA" />
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
                Helwan National University
              </div>
              <div style={{ fontSize: '0.76rem', color: '#60A5FA', fontWeight: 700, marginTop: '0.2rem' }}>
                GDGoC Student Attendance Pass
              </div>

              <div
                style={{
                  margin: '1.5rem auto',
                  padding: '1rem',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  width: '160px',
                  height: '160px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              >
                <img
                  src="/icons/icon.svg"
                  alt="QR Pass Preview"
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                />
              </div>

              <div style={{ fontSize: '0.74rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                ID: STU-•••••••• • ACTIVE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      {/* ========================================================================= */}
      <section
        id="faq"
        style={{
          padding: '5rem 1.5rem',
          maxWidth: '860px',
          margin: '0 auto',
        }}
      >
        <div style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#FBBC04',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.5rem',
            }}
          >
            Have Questions?
          </div>
          <h2
            style={{
              fontSize: 'clamp(1.85rem, 3.5vw, 2.5rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              margin: '0 0 0.8rem',
              letterSpacing: '-0.02em',
            }}
          >
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: '0.96rem', color: '#94A3B8', margin: 0 }}>
            Everything you need to know about joining courses, attendance, and certificates.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {faqs.map((f, idx) => (
            <details
              key={idx}
              className="student-faq-item glass-panel"
              open={idx === 0}
            >
              <summary className="student-faq-summary">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <HelpCircle size={18} color="#60A5FA" style={{ flexShrink: 0 }} />
                  <span>{f.q}</span>
                </div>
                <ChevronDown size={18} className="student-faq-chevron" />
              </summary>
              <div className="student-faq-content">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
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
                redirectTo="/student/onboarding"
              />
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. COMPREHENSIVE FOOTER WITH DEDICATED TEAM OS ACCESS */}
      {/* ========================================================================= */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(11, 15, 25, 0.95)',
          padding: '4rem 1.5rem 2.5rem',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Column 1: Brand & Chapter Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px',
                }}
              >
                <img src="/icons/icon.svg" alt="GDGoC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#FFFFFF' }}>GDGoC HNU</div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Helwan National University</div>
              </div>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              Google Developer Groups on Campus at Helwan National University. Bridging theoretical university education with hands-on software engineering practices.
            </p>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              © 2026 GDGoC HNU. All rights reserved.
            </div>
          </div>

          {/* Column 2: Student Programs */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
              Student Learning
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
              <Link href="/student/courses" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Tracks & Courses Catalog
              </Link>
              <Link href="/student/workshops" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Weekend Bootcamps & Workshops
              </Link>
              <Link href="/student/my-qr" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Permanent Attendance QR Pass
              </Link>
              <Link href="/student/dashboard" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Student Learning Dashboard
              </Link>
              <Link href="/student/certificates" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                My Issued Certificates
              </Link>
            </div>
          </div>

          {/* Column 3: Verification & Public Tools */}
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1.25rem' }}>
              Public Credentials
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.86rem' }}>
              <Link href="/verify" style={{ color: '#94A3B8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>Verify a Certificate</span>
                <ExternalLink size={12} />
              </Link>
              <Link href="/leaderboard" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Chapter Leaderboard & Points
              </Link>
              <Link href="/stats" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Public Chapter Statistics
              </Link>
              <a href="#faq" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                Frequently Asked Questions
              </a>
            </div>
          </div>

          {/* Column 4: Chapter Leadership & Team OS (USER REQUEST) */}
          <div>
            <div
              className="glass-panel"
              style={{
                borderRadius: '16px',
                padding: '1.4rem',
                background: 'linear-gradient(180deg, rgba(66, 133, 244, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.35)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
                <ShieldCheck size={18} color="#60A5FA" />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Chapter Leadership OS
                </h4>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.5, margin: '0 0 1rem' }}>
                Internal governance workspace for GDGoC HNU organizing leads, committee heads, and team members.
              </p>

              <Link
                href="/dashboard"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                  boxSizing: 'border-box',
                }}
              >
                <span>Sign in to Team OS</span>
                <ArrowRight size={13} />
              </Link>

              <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B' }}>
                <Link href="/approvals" style={{ color: 'inherit', textDecoration: 'none' }}>Approvals</Link>
                <span>•</span>
                <Link href="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
                <span>•</span>
                <Link href="/members" style={{ color: 'inherit', textDecoration: 'none' }}>Directory</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#64748B',
          }}
        >
          <div>
            Google Developer Groups on Campus — Helwan National University (HNU) Chapter.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853' }} />
            <span>Systems Online • Academic Year 2025/2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
