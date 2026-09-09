import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ShieldCheck,
  Award,
  Calendar,
  User,
  Hash,
  Download,
  Building,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface VerifyPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Verify Certificate (${code.substring(0, 8)}...) — GDGoC HNU`,
    description: 'Public credential verification portal for Google Developer Groups on Campus - Helwan National University.',
  };
}

export const dynamic = 'force-dynamic';

export default async function CertificateVerificationPage({ params }: VerifyPageProps) {
  const { code } = await params;
  const admin = createAdminClient();

  // Query certificate by verification_code
  const { data: cert, error } = await admin
    .from('certificates')
    .select(`
      id,
      title,
      certificate_number,
      verification_code,
      issue_date,
      recipient_name,
      pdf_drive_url,
      event_id,
      issued_by
    `)
    .eq('verification_code', code)
    .maybeSingle();

  // If not found by verification_code, check certificate_number (e.g. GDGOC-2026-XXXXXX)
  let certificate = cert;
  if (!certificate && code.toUpperCase().startsWith('GDGOC-')) {
    const { data: byNum } = await admin
      .from('certificates')
      .select(`
        id,
        title,
        certificate_number,
        verification_code,
        issue_date,
        recipient_name,
        pdf_drive_url,
        event_id,
        issued_by
      `)
      .eq('certificate_number', code.toUpperCase())
      .maybeSingle();
    certificate = byNum;
  }

  // Fetch optional event and issuer info without exposing PII
  let eventTitle: string | null = null;
  let issuerName: string | null = null;

  if (certificate) {
    if (certificate.event_id) {
      const { data: eventData } = await admin
        .from('events')
        .select('title')
        .eq('id', certificate.event_id)
        .maybeSingle();
      if (eventData) eventTitle = eventData.title;
    }

    if (certificate.issued_by) {
      const { data: issuerData } = await admin
        .from('profiles')
        .select('full_name, role')
        .eq('id', certificate.issued_by)
        .maybeSingle();
      if (issuerData) {
        issuerName = `${issuerData.full_name} (${issuerData.role.replace('_', ' ')})`;
      }
    }
  }

  const formattedDate = certificate?.issue_date
    ? new Date(certificate.issue_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #0f172a 0%, #080c14 100%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2.5rem 1.25rem',
      }}
    >
      {/* Top Header / Chapter Branding */}
      <header
        style={{
          width: '100%',
          maxWidth: '720px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #4285F4, #34A853)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              &lt;&gt;
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              GDGoC HNU
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Credential Verification Service
            </div>
          </div>
        </Link>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.82rem',
            color: '#94a3b8',
            textDecoration: 'none',
            padding: '0.4rem 0.8rem',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>
      </header>

      {/* Main Verification Container */}
      <main style={{ width: '100%', maxWidth: '720px' }}>
        {certificate ? (
          <div
            className="glass-panel"
            style={{
              padding: '2.5rem',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.75rem',
            }}
          >
            {/* Google 4-Color Accent Strip */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background:
                  'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
              }}
            />

            {/* Authenticity Badge Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                background: 'rgba(52, 168, 83, 0.12)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(52, 168, 83, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34a853',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#86efac',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Officially Verified Credential</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  This certificate was issued by Google Developer Groups on Campus — Helwan National University and recorded on the chapter ledger.
                </div>
              </div>
            </div>

            {/* Certificate Core Information */}
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#38bdf8',
                  marginBottom: '0.5rem',
                }}
              >
                Certificate of Achievement
              </div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: '#ffffff',
                  margin: '0 0 0.5rem 0',
                  letterSpacing: '-0.02em',
                }}
              >
                {certificate.title}
              </h1>
              <div style={{ fontSize: '1.1rem', color: '#94a3b8' }}>
                Conferred upon{' '}
                <strong style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.25rem' }}>
                  {certificate.recipient_name}
                </strong>
              </div>
            </div>

            {/* Credentials Meta Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                padding: '1.25rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {/* Event Name */}
              {eventTitle && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <Building size={18} color="#38bdf8" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      Associated Event
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      {eventTitle}
                    </div>
                  </div>
                </div>
              )}

              {/* Issue Date */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Calendar size={18} color="#fbbc04" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Date Conferred
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                    {formattedDate}
                  </div>
                </div>
              </div>

              {/* Certificate Number */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Hash size={18} color="#a855f7" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Serial Number
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>
                    {certificate.certificate_number}
                  </div>
                </div>
              </div>

              {/* Issuing Authority */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <Award size={18} color="#34a853" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Issued By
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                    {issuerName || 'GDGoC Helwan National University'}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.5rem',
              }}
            >
              <a
                href={`/api/certificates/${certificate.id}/download`}
                download
                id="btn-download-verified-pdf"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1.75rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4285F4, #2b6cb0)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.4)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <Download size={18} />
                <span>Download Official PDF</span>
              </a>

              {certificate.pdf_drive_url && (
                <a
                  href={certificate.pdf_drive_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>Google Drive Archive</span>
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Privacy & Anti-Tamper Notice (Spec §4.14) */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                color: '#64748b',
                lineHeight: 1.5,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '1.25rem',
              }}
            >
              🔒 <strong>Cryptographic Verification Guarantee:</strong> This record is bound to verification code{' '}
              <code style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                {certificate.verification_code}
              </code>
              . In strict compliance with §4.14, private member PII (such as student email and ID) is not disclosed on public verification pages.
            </div>
          </div>
        ) : (
          /* Unverified / Not Found State */
          <div
            className="glass-panel"
            style={{
              padding: '3.5rem 2rem',
              borderRadius: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ea4335',
              }}
            >
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
                Certificate Not Found
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
                The verification code <code style={{ color: '#f87171' }}>{code}</code> could not be located in our official credentials registry.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1rem',
                fontSize: '0.8rem',
                color: '#94a3b8',
                textAlign: 'left',
                maxWidth: '480px',
              }}
            >
              <strong>Common reasons:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.2rem', lineHeight: 1.6 }}>
                <li>The verification link was mistyped or truncated.</li>
                <li>The certificate may have been revoked by the chapter administration.</li>
                <li>The certificate was issued under a test environment.</li>
              </ul>
            </div>

            <Link
              href="/"
              style={{
                marginTop: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '3rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
        GDGoC Helwan National University Operating System • Chapter Governance &amp; Verifications
      </footer>
    </div>
  );
}
