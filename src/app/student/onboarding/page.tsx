import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStudentOnboardingData } from '@/app/student/actions';
import { CompleteStudentProfileForm } from '@/components/student/CompleteStudentProfileForm';
import { StudentOnboardingHeader } from '@/components/student/StudentOnboardingHeader';
import { SignInWithGoogleButton } from '@/components/SignInWithGoogleButton';
import {
  GraduationCap,
  Sparkles,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  QrCode,
  ArrowLeft,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Complete Student Profile — GDGoC HNU Student Portal',
  description: 'Complete your registration details to activate your student portal profile and generate your attendance QR code.',
};

export default async function StudentOnboardingPage() {
  const data = await getStudentOnboardingData();

  // If not authenticated, render login prompt
  if (!data.authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#070B14',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            maxWidth: '540px',
            width: '100%',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            <GraduationCap size={32} color="#60A5FA" />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.75rem' }}>
            Sign In to Complete Profile
          </h1>

          <p style={{ fontSize: '0.92rem', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 2rem' }}>
            To join the GDGoC Helwan National University Student Portal, please sign in with your Google account first.
          </p>

          <SignInWithGoogleButton
            label="Sign in with Google"
            redirectTo="/student/onboarding"
          />

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#94A3B8',
                fontSize: '0.84rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={15} />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isEditMode = data.isAlreadyActive;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#F8FAFC',
        fontFamily: 'var(--font-inter, sans-serif)',
        padding: '2.5rem 1.5rem 5rem',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Onboarding Header with strict access state & signout */}
        <StudentOnboardingHeader
          isEditMode={isEditMode}
          email={data.prefilled.email}
          avatarUrl={data.prefilled.avatarUrl}
          displayName={data.prefilled.fullNameEn || data.prefilled.fullNameAr}
        />

        {/* Page Header Banner */}
        <div
          className="glass-panel"
          style={{
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            padding: '2.5rem 2rem',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '2rem',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Top Google Colors Line */}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '999px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#93C5FD',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              {isEditMode ? (
                <>
                  <UserCheck size={13} />
                  <span>Profile Information & Settings</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Step 2 of 2: Profile Activation</span>
                </>
              )}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.35rem)',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.2,
              margin: '0 0 0.65rem',
            }}
          >
            {isEditMode ? 'Edit Profile Information' : 'Complete Your Student Profile'}
          </h1>

          <p style={{ fontSize: '0.94rem', color: '#94A3B8', margin: 0, lineHeight: 1.6, maxWidth: '650px' }}>
            {isEditMode
              ? 'Update your academic info, contact details, and social channels anytime. Changes will reflect across your attendance pass and certificates.'
              : 'Please fill in your academic and contact details below. Once submitted, your profile is immediately active with your personal attendance QR code ready for sessions and workshops.'}
          </p>
        </div>

        {/* The Form */}
        <CompleteStudentProfileForm
          prefilled={data.prefilled}
          faculties={data.faculties}
          isTeamMember={data.isTeamMember}
          isEditMode={isEditMode}
        />
      </div>
    </div>
  );
}
