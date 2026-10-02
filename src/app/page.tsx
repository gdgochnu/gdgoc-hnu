import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import {
  Sparkles, BookOpen, Calendar, Award, QrCode, Users, ArrowRight,
  CheckCircle2, Globe, HelpCircle, ExternalLink, ChevronRight, ChevronDown,
  LayoutGrid, ShieldCheck, CheckSquare, Zap, Lock, Video, Compass,
  BrainCircuit, BarChart3, MonitorPlay,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GDGoC HNU — Google Developer Groups on Campus Helwan National University',
  description: 'The official student developer learning portal at Helwan National University. Free industry-aligned courses, weekend bootcamps, tech mentorship, and President-verified credentials.',
};

interface HomePageProps { searchParams?: Promise<{ [key: string]: string | string[] | undefined }>; }

export default async function HomePage(props: HomePageProps) {
  let currentUser = null;
  let teamProfile = null;
  let studentProfile = null;
  try {
    const context = await getUserContext().catch(() => null);
    currentUser = context?.user || null;
    if (context?.profile && context.profile.status === 'active') teamProfile = context.profile;
    if (currentUser) {
      const res = await getCurrentStudentProfile().catch(() => null);
      if (res?.success) studentProfile = res.student;
    }
  } catch (err) { console.warn('HomePage session retrieval notice:', err); }

  const isChapterTeamMember = Boolean(teamProfile && teamProfile.status === 'active');
  const isProfileComplete = isStudentProfileComplete(studentProfile);

  let coursesCount = 0, workshopsCount = 0, certificatesCount = 0;
  try {
    const admin = createAdminClient();
    const [courseRes, wsRes, certRes] = await Promise.all([
      admin.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      admin.from('workshops').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
      admin.from('student_certificates').select('id', { count: 'exact', head: true }),
    ]);
    coursesCount = courseRes.count || 0;
    workshopsCount = wsRes.count || 0;
    certificatesCount = certRes.count || 0;
  } catch (err) { console.warn('Failed to load dynamic portal counts:', err); }

  const techTracks = [
    { code: 'WEB', title: 'Web Development', desc: 'Frontend, Backend, and Full-Stack engineering with modern TypeScript, React, Next.js, and serverless cloud architecture.', icon: Globe, color: '#4285F4', gradient: 'linear-gradient(135deg, rgba(66,133,244,0.15) 0%, rgba(66,133,244,0.03) 100%)', borderColor: 'rgba(66,133,244,0.28)', badge: 'Full-Stack Engineering', curriculum: ['TypeScript', 'React', 'Next.js', 'Supabase'], href: '/student/courses' },
    { code: 'AI', title: 'AI & Machine Learning', desc: 'Deep learning, LLMs, computer vision, data science pipelines, neural networks, and intelligent system integrations.', icon: BrainCircuit, color: '#EA4335', gradient: 'linear-gradient(135deg, rgba(234,67,53,0.15) 0%, rgba(234,67,53,0.03) 100%)', borderColor: 'rgba(234,67,53,0.28)', badge: 'Artificial Intelligence', curriculum: ['Python', 'TensorFlow', 'Scikit-learn', 'LLM APIs'], href: '/student/courses' },
    { code: 'DS', title: 'Data Science', desc: 'Statistical analysis, data visualization, predictive modeling, business intelligence, and data engineering pipelines.', icon: BarChart3, color: '#34A853', gradient: 'linear-gradient(135deg, rgba(52,168,83,0.15) 0%, rgba(52,168,83,0.03) 100%)', borderColor: 'rgba(52,168,83,0.28)', badge: 'Data & Analytics', curriculum: ['Python', 'Pandas', 'SQL', 'Power BI'], href: '/student/courses' },
    { code: 'CS', title: 'Intro to CS', desc: 'Foundational CS concepts including algorithms, data structures, problem solving, and programming fundamentals for beginners.', icon: MonitorPlay, color: '#FBBC04', gradient: 'linear-gradient(135deg, rgba(251,188,4,0.15) 0%, rgba(251,188,4,0.03) 100%)', borderColor: 'rgba(251,188,4,0.28)', badge: 'Computer Science', curriculum: ['Algorithms', 'Data Structures', 'C++', 'Problem Solving'], href: '/student/courses' },
  ];

  const faqs = [
    { q: 'Is the GDGoC HNU Student Portal free for all university students?', a: 'Yes, 100% free! Every course, workshop, code review, mentorship session, and verified completion certificate is provided at zero cost to Helwan National University students as part of the Google Developer Groups on Campus community initiative.' },
    { q: 'How does the digital Attendance QR Pass work?', a: 'When you activate your student profile, a unique permanent QR code is automatically generated for your account. When attending offline lectures or weekend bootcamps, our event officers scan your code in under 5 seconds to record your verified attendance.' },
    { q: 'How are course completion certificates verified by employers?', a: 'Each certificate is approved and cryptographically signed by the Chapter President. Every certificate features a permanent serial code and QR code that can be verified by employers and universities anytime via our public /verify portal.' },
    { q: 'Can I enroll in multiple tracks simultaneously?', a: 'Yes! You can explore and enroll in multiple technical tracks. We recommend focusing on one primary track per semester to complete all practical assignments, checkpoint quizzes, and capstone projects on schedule.' },
    { q: 'I am a GDGoC Team Member. How do I access the Chapter Operations OS?', a: 'Team members can seamlessly switch between the Student Portal and Chapter Operations OS. Look for the "Chapter Operations OS" link in the top bar or in the dedicated Leadership section at the bottom of the footer.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', color: '#F8FAFC', fontFamily: 'var(--font-inter, sans-serif)', overflowX: 'hidden' }}>

      {teamProfile && teamProfile.status === 'active' && (
        <div style={{ background: 'linear-gradient(90deg, rgba(66,133,244,0.15) 0%, rgba(52,168,83,0.15) 100%)', borderBottom: '1px solid rgba(66,133,244,0.25)', padding: '0.45rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '0.82rem', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#93C5FD' }}>
            <ShieldCheck size={14} color="#60A5FA" />
            <span>Logged in as Chapter Team Member ({teamProfile.role?.replace(/_/g, ' ')})</span>
          </span>
          <Link href="/dashboard" style={{ color: '#FFFFFF', background: 'rgba(66,133,244,0.25)', border: '1px solid rgba(66,133,244,0.4)', padding: '0.15rem 0.6rem', borderRadius: '6px', textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span>Open Chapter OS</span><ArrowRight size={11} />
          </Link>
        </div>
      )}

      <header style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', background: 'rgba(7,11,20,0.88)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0.85rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}>
              <img src="/icons/icon.svg" alt="GDGoC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: '#FFFFFF', letterSpacing: '-0.02em' }}>GDGoC</span>
                <span style={{ background: 'linear-gradient(90deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, fontSize: '1rem' }}>HNU</span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, lineHeight: 1 }}>Helwan National University</div>
            </div>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem', fontSize: '0.875rem', fontWeight: 600 }} className="student-landing-nav-links">
            <a href="#tracks" style={{ color: '#94A3B8', textDecoration: 'none' }}>Tracks</a>
            <a href="#journey" style={{ color: '#94A3B8', textDecoration: 'none' }}>How it Works</a>
            <Link href="/student/courses" style={{ color: '#94A3B8', textDecoration: 'none' }}>Courses</Link>
            <Link href="/student/workshops" style={{ color: '#94A3B8', textDecoration: 'none' }}>Bootcamps</Link>
            <Link href="/verify" style={{ color: '#94A3B8', textDecoration: 'none' }}>Verify</Link>
            <a href="#faq" style={{ color: '#94A3B8', textDecoration: 'none' }}>FAQ</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {currentUser ? (
              isProfileComplete ? (
                <Link href="/student/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 14px rgba(66,133,244,0.35)' }}>
                  <LayoutGrid size={14} /><span>Dashboard</span>
                </Link>
              ) : (
                <Link href="/student/onboarding" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', borderRadius: '10px', background: 'linear-gradient(135deg, #EA4335 0%, #D93025 100%)', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 700, textDecoration: 'none' }}>
                  <Sparkles size={14} /><span>Complete Profile</span>
                </Link>
              )
            ) : (
              <SignInWithGoogleButton label="Sign In" redirectTo="/student" />
            )}
          </div>
        </div>
      </header>

      <section style={{ position: 'relative', padding: 'clamp(4.5rem,8vw,7.5rem) 1.5rem clamp(3rem,5vw,5rem)', maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '380px', background: 'radial-gradient(ellipse, rgba(66,133,244,0.13) 0%, rgba(52,168,83,0.06) 50%, transparent 72%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '8%', left: '3%', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(234,67,53,0.07) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '8%', right: '3%', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(251,188,4,0.06) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1.1rem', borderRadius: '999px', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.22)', color: '#93C5FD', fontSize: '0.82rem', fontWeight: 700, marginBottom: '2rem' }}>
            <Sparkles size={13} color="#60A5FA" />
            <span>Google Developer Groups on Campus · Helwan National University</span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.6rem,6vw,4.4rem)', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.035em', lineHeight: 1.1, margin: '0 0 1.5rem' }}>
            Build Real Skills.{' '}
            <span style={{ background: 'linear-gradient(135deg, #4285F4 0%, #34A853 55%, #FBBC04 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>Land Real Jobs.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2.2vw,1.2rem)', color: '#94A3B8', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto 2.5rem', fontWeight: 400 }}>
            Free hands-on courses, weekend bootcamps, mentorship, and President-verified credentials — built exclusively for{' '}
            <span style={{ color: '#CBD5E1', fontWeight: 600 }}>Helwan National University</span> students.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '5rem' }}>
            {currentUser ? (
              isProfileComplete ? (
                <>
                  <Link href="/student/dashboard" style={{ padding: '0.9rem 1.9rem', borderRadius: '12px', background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 8px 28px rgba(66,133,244,0.4)' }}>
                    <LayoutGrid size={17} /><span>Open Dashboard</span>
                  </Link>
                  <Link href="/student/courses" style={{ padding: '0.9rem 1.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>Explore Courses</span><ChevronRight size={16} />
                  </Link>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                  <Link href="/student/onboarding" style={{ padding: '1rem 2.2rem', borderRadius: '14px', background: 'linear-gradient(135deg, #EA4335 0%, #4285F4 100%)', color: '#FFFFFF', fontSize: '1.05rem', fontWeight: 900, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 30px rgba(234,67,53,0.4)' }}>
                    <Sparkles size={18} /><span>Complete Your Profile to Get Started</span><ArrowRight size={17} />
                  </Link>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#FCA5A5' }}>Registration required before accessing the student portal and attendance QR pass.</p>
                </div>
              )
            ) : (
              <>
                <SignInWithGoogleButton label="Join as a Student — It's Free" redirectTo="/student" />
                <a href="#tracks" style={{ padding: '0.9rem 1.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#FFFFFF', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Browse Tracks</span><ChevronRight size={16} />
                </a>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,200px),1fr))', gap: '1rem', maxWidth: '980px', margin: '0 auto' }}>
          {[
            { num: coursesCount > 0 ? String(coursesCount) : '4', label: 'Active Tracks', detail: 'Industry-aligned curricula', color: '#4285F4', icon: BookOpen },
            { num: workshopsCount > 0 ? workshopsCount + '+' : 'Weekly', label: 'Workshops & Bootcamps', detail: 'QR-verified attendance', color: '#34A853', icon: Calendar },
            { num: '100%', label: 'Free for Students', detail: 'No fees, ever', color: '#EA4335', icon: Sparkles },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} style={{ borderRadius: '16px', padding: '1.4rem 1.2rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: stat.color + '15', border: '1px solid ' + stat.color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.65rem' }}>
                  <Icon size={17} color={stat.color} />
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, color: stat.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{stat.num}</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#FFFFFF', marginTop: '0.3rem' }}>{stat.label}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>{stat.detail}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="tracks" style={{ padding: 'clamp(3.5rem,7vw,6rem) 1.5rem', maxWidth: '1240px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 4rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Technical Learning Tracks</div>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem', letterSpacing: '-0.025em', lineHeight: 1.15 }}>Choose Your Tech Path</h2>
          <p style={{ fontSize: '1rem', color: '#94A3B8', margin: 0, lineHeight: 1.65 }}>Four specialized tracks designed to take you from zero to job-ready. Each includes structured courses, weekly sessions, real projects, and a verified certificate.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,270px),1fr))', gap: '1.5rem' }}>
          {techTracks.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.code} style={{ borderRadius: '20px', background: track.gradient, border: '1px solid ' + track.borderColor, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, ' + track.color + '18 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: track.color + '18', border: '1.5px solid ' + track.color + '35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={25} color={track.color} />
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.25rem 0.7rem', borderRadius: '999px', background: track.color + '15', color: track.color, border: '1px solid ' + track.color + '28', fontFamily: 'monospace', letterSpacing: '0.04em' }}>{track.code}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.6rem', letterSpacing: '-0.01em' }}>{track.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.65, margin: '0 0 1.2rem' }}>{track.desc}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {track.curriculum.map((tech) => (
                      <span key={tech} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: '#CBD5E1' }}>{tech}</span>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid ' + track.color + '18', paddingTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.76rem', color: track.color, fontWeight: 700 }}>{track.badge}</span>
                  <Link href={track.href} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 700, color: '#FFFFFF', textDecoration: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', background: track.color + '18', border: '1px solid ' + track.color + '30' }}>
                    <span>Explore</span><ArrowRight size={13} color={track.color} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="journey" style={{ padding: 'clamp(3.5rem,7vw,6rem) 1.5rem', background: 'rgba(11,17,32,0.5)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 4rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34A853', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Structured Growth</div>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>Your 4-Step Journey to Mastery</h2>
            <p style={{ fontSize: '1rem', color: '#94A3B8', margin: 0, lineHeight: 1.65 }}>From signing in with Google to holding a President-verified credential — a clear, structured path forward.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,250px),1fr))', gap: '1.5rem' }}>
            {[
              { step: '01', title: 'Sign In & Get Your QR Pass', desc: 'Sign in with your Google account and complete your academic info to unlock your permanent attendance QR pass instantly.', icon: QrCode, color: '#4285F4' },
              { step: '02', title: 'Enroll in Tracks & Bootcamps', desc: 'Pick your track and gain access to syllabus, live meeting links, embedded YouTube lectures, and PDF slides.', icon: BookOpen, color: '#34A853' },
              { step: '03', title: 'Complete Tasks & Get Feedback', desc: 'Submit weekly coding assignments and checkpoint quizzes. Receive personalized grades from GDGoC tech leads.', icon: CheckSquare, color: '#FBBC04' },
              { step: '04', title: 'Earn a Verified Certificate', desc: 'Pass track benchmarks to receive an official certificate, cryptographically signed by the Chapter President.', icon: Award, color: '#EA4335' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} style={{ borderRadius: '20px', padding: '2rem 1.75rem', background: 'rgba(11,17,32,0.8)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem', backdropFilter: 'blur(12px)' }}>
                  <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', fontSize: '2.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.04)', lineHeight: 1, fontFamily: 'monospace' }}>{item.step}</div>
                  <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: item.color + '15', border: '1.5px solid ' + item.color + '35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} color={item.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Step {item.step}</div>
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.6rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.875rem', color: '#94A3B8', lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ padding: 'clamp(3rem,6vw,5.5rem) 1.5rem', maxWidth: '1240px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ borderRadius: '24px', background: 'linear-gradient(135deg, rgba(15,22,38,0.92) 0%, rgba(9,13,25,0.98) 100%)', border: '1px solid rgba(66,133,244,0.22)', padding: 'clamp(2rem,5vw,3.5rem) clamp(1.5rem,4vw,3rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: '2.5rem', alignItems: 'center', boxShadow: '0 25px 60px -20px rgba(0,0,0,0.8)', overflow: 'hidden', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)', opacity: 0.8 }} />
          <div style={{ minWidth: 0, wordBreak: 'break-word' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '999px', background: 'rgba(66,133,244,0.12)', color: '#93C5FD', fontSize: '0.76rem', fontWeight: 800, marginBottom: '1.25rem', border: '1px solid rgba(66,133,244,0.2)' }}>
              <QrCode size={12} /><span>Smart Contactless Pass</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem', lineHeight: 1.2 }}>
              Your Official Attendance Pass —{' '}
              <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Ready in Seconds</span>
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.65, margin: '0 0 1.75rem' }}>No paper sign-in sheets. Your digital QR code pass is permanent, encrypted, and recognized across all on-campus sessions, hackathons, and weekend workshops.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '2rem' }}>
              {['Instant scanner check-in by HR officers with duplicate prevention', 'Real-time attendance rate updates on your personal dashboard', 'Attendance directly contributes to your completion certificates'].map((point, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', color: '#CBD5E1' }}>
                  <CheckCircle2 size={15} color="#34A853" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ lineHeight: 1.5 }}>{point}</span>
                </div>
              ))}
            </div>
            <Link href={currentUser ? (isProfileComplete ? '/student/my-qr' : '/student/onboarding') : '/student'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.55rem', padding: '0.8rem 1.6rem', borderRadius: '11px', background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 6px 20px rgba(66,133,244,0.4)' }}>
              <QrCode size={15} /><span>{currentUser ? 'View My QR Pass' : 'Get Your Attendance Pass'}</span><ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minWidth: 0 }}>
            <div style={{ maxWidth: '280px', width: '100%', borderRadius: '20px', padding: '1.75rem 1.5rem', background: 'rgba(5,8,18,0.97)', border: '1px solid rgba(66,133,244,0.28)', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.7)', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)' }} />
              <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(66,133,244,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem', border: '1px solid rgba(66,133,244,0.22)' }}>
                <QrCode size={22} color="#60A5FA" />
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFFFFF' }}>Helwan National University</div>
              <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 700, marginTop: '0.15rem', marginBottom: '1.35rem' }}>GDGoC Student Attendance Pass</div>
              <div style={{ margin: '0 auto 1.35rem', padding: '0.85rem', background: '#FFFFFF', borderRadius: '11px', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                <img src="/icons/icon.svg" alt="QR Pass Preview" style={{ width: '65px', height: '65px', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: '#475569', fontFamily: 'monospace', marginBottom: '0.6rem' }}>ID: STU-•••••••• · ACTIVE</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.7rem', borderRadius: '999px', background: 'rgba(52,168,83,0.12)', border: '1px solid rgba(52,168,83,0.28)', fontSize: '0.68rem', fontWeight: 700, color: '#86EFAC' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />Verified & Active
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" style={{ padding: 'clamp(3.5rem,7vw,6rem) 1.5rem', maxWidth: '860px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', margin: '0 auto 3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FBBC04', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.75rem' }}>Have Questions?</div>
          <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.8rem', letterSpacing: '-0.025em' }}>Frequently Asked Questions</h2>
          <p style={{ fontSize: '0.96rem', color: '#94A3B8', margin: 0 }}>Everything you need to know about joining, attendance, and certificates.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {faqs.map((f, idx) => (
            <details key={idx} className="student-faq-item glass-panel" open={idx === 0}>
              <summary className="student-faq-summary">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <HelpCircle size={16} color="#60A5FA" style={{ flexShrink: 0 }} />
                  <span>{f.q}</span>
                </div>
                <ChevronDown size={16} className="student-faq-chevron" />
              </summary>
              <div className="student-faq-content">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      <section style={{ padding: 'clamp(2rem,5vw,4rem) 1.5rem clamp(4rem,8vw,7rem)', maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ borderRadius: '28px', background: 'linear-gradient(180deg, #0E1828 0%, #070B14 100%)', border: '1px solid rgba(66,133,244,0.28)', padding: 'clamp(2.5rem,6vw,4.5rem) 2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)' }} />
          <div style={{ position: 'absolute', bottom: '-50px', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '300px', background: 'radial-gradient(ellipse, rgba(66,133,244,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', borderRadius: '999px', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)', color: '#93C5FD', fontSize: '0.8rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              <Zap size={12} color="#60A5FA" /><span>Join the Community</span>
            </div>
            <h2 style={{ fontSize: 'clamp(2rem,4.5vw,3.2rem)', fontWeight: 900, color: '#FFFFFF', margin: '0 0 1rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>Ready to Start Your Tech Journey?</h2>
            <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '500px', margin: '0 auto 2.5rem', lineHeight: 1.65 }}>Join Helwan National University students building real applications and learning from industry mentors — completely free.</p>
            <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
              {currentUser ? (
                <Link href="/student/dashboard" style={{ padding: '1rem 2.2rem', borderRadius: '13px', background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '1.05rem', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', boxShadow: '0 12px 35px rgba(66,133,244,0.45)' }}>
                  <span>Go to Student Dashboard</span><ArrowRight size={17} />
                </Link>
              ) : (
                <SignInWithGoogleButton label="Sign In with Google — It's Free" redirectTo="/student" />
              )}
            </div>
          </div>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(7,11,20,0.99)', padding: 'clamp(3rem,6vw,4.5rem) 1.5rem 2.5rem' }}>
        <div className="home-footer-grid" style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div className="home-footer-brand">
            <div style={{ width: '33px', height: '33px', borderRadius: '9px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px', flexShrink: 0 }}>
              <img src="/icons/icon.svg" alt="GDGoC" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="home-footer-brand-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.15rem' }}>
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#FFFFFF' }}>GDGoC HNU</span>
              </div>
              <div style={{ fontSize: '0.66rem', color: '#475569', marginBottom: '0.6rem' }}>Helwan National University</div>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55, margin: '0 0 0.6rem' }}>Google Developer Groups on Campus at Helwan National University. Bridging university education with hands-on software engineering.</p>
              <div style={{ fontSize: '0.7rem', color: '#334155' }}>© 2026 GDGoC HNU. All rights reserved.</div>
            </div>
          </div>
          <div className="home-footer-col">
            <h4 style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 1.25rem' }}>Student Learning</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.83rem' }}>
              {/* Always visible */}
              <Link href="/student/courses" style={{ color: '#475569', textDecoration: 'none' }}>Tracks & Courses Catalog</Link>
              <Link href="/student/workshops" style={{ color: '#475569', textDecoration: 'none' }}>Weekend Bootcamps</Link>
              <a href="#faq" style={{ color: '#475569', textDecoration: 'none' }}>FAQ</a>
              {/* Only for logged-in students with complete profiles */}
              {currentUser && isProfileComplete ? (
                <>
                  <Link href="/student/dashboard" style={{ color: '#475569', textDecoration: 'none' }}>Student Dashboard</Link>
                  <Link href="/student/my-qr" style={{ color: '#475569', textDecoration: 'none' }}>Attendance QR Pass</Link>
                  <Link href="/student/certificates" style={{ color: '#475569', textDecoration: 'none' }}>My Certificates</Link>
                </>
              ) : (
                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.45rem', padding: '0.55rem 0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Lock size={11} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>
                    <Link href="/student" style={{ color: '#60A5FA', textDecoration: 'none', fontWeight: 700 }}>Sign in</Link>
                    {' '}to access your dashboard, QR pass & certificates
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="home-footer-col">
            <div className="home-footer-os-card" style={{ borderRadius: '16px', padding: '1.3rem', background: 'linear-gradient(180deg, rgba(66,133,244,0.08) 0%, rgba(9,13,25,0.6) 100%)', border: '1px solid rgba(66,133,244,0.22)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <ShieldCheck size={15} color="#60A5FA" />
                <h4 style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Chapter Leadership OS</h4>
              </div>
              <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1rem' }}>Internal governance workspace for GDGoC HNU organizing leads, committee heads, and team members.</p>
              {isChapterTeamMember && teamProfile ? (
                <>
                  <div style={{ marginBottom: '0.7rem', padding: '0.28rem 0.6rem', borderRadius: '7px', background: 'rgba(52,168,83,0.12)', border: '1px solid rgba(52,168,83,0.25)', fontSize: '0.7rem', color: '#86EFAC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CheckCircle2 size={11} color="#34A853" /><span>Logged in as {teamProfile.role?.replace(/_/g, ' ')}</span>
                  </div>
                  <Link href="/dashboard" style={{ width: '100%', padding: '0.58rem 0.8rem', borderRadius: '8px', background: 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxSizing: 'border-box' }}>
                    <span>Open Chapter OS</span><ArrowRight size={12} />
                  </Link>
                  <div style={{ marginTop: '0.7rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#334155' }}>
                    <Link href="/approvals" style={{ color: 'inherit', textDecoration: 'none' }}>Approvals</Link>
                    <span>·</span>
                    <Link href="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
                    <span>·</span>
                    <Link href="/stats" style={{ color: 'inherit', textDecoration: 'none' }}>Stats</Link>
                    <span>·</span>
                    <Link href="/members" style={{ color: 'inherit', textDecoration: 'none' }}>Directory</Link>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/auth/login" style={{ width: '100%', padding: '0.58rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748B', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', boxSizing: 'border-box' }}>
                    <Lock size={11} /><span>Chapter Team Sign In</span><ArrowRight size={11} />
                  </Link>
                  <div style={{ marginTop: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#334155' }}>
                    <Lock size={10} color="#1E293B" style={{ flexShrink: 0 }} /><span>Restricted to approved GDGoC team members</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="home-footer-bottom" style={{ maxWidth: '1240px', margin: '0 auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.76rem', color: '#334155' }}>
          <div>Google Developer Groups on Campus — Helwan National University (HNU) Chapter.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34A853', display: 'inline-block' }} />
            <span>Systems Online · Academic Year 2025/2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
