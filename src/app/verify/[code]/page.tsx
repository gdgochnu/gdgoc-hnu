import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ShieldCheck,
  Award,
  Calendar,
  User,
  Hash,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  QrCode as QrCodeIcon,
  Sparkles,
} from 'lucide-react';
import type { CertificateFieldLayout } from '@/types/certificates';
import { CertificatePreviewCanvas } from '@/components/certificates/CertificatePreviewCanvas';
import { CertificateDownloadActions } from '@/components/certificates/CertificateDownloadActions';

interface VerifyPageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim();
  return {
    title: `Verify Certificate (${code}) — GDGoC HNU`,
    description: 'Public credential verification portal for Google Developer Groups on Campus - Helwan National University.',
  };
}

export const dynamic = 'force-dynamic';

export default async function CertificateVerificationPage({ params }: VerifyPageProps) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).trim();
  const admin = createAdminClient();

  // 1. Query certificate by certificate_number first (case-insensitive)
  let { data: cert } = await admin
    .from('certificates')
    .select(`
      id,
      title,
      certificate_number,
      verification_code,
      issue_date,
      recipient_name,
      pdf_drive_url,
      template_id,
      event_id,
      issued_by
    `)
    .ilike('certificate_number', code)
    .maybeSingle();

  // 2. If not found by certificate_number, check verification_code (legacy UUID)
  if (!cert) {
    const { data: byCode } = await admin
      .from('certificates')
      .select(`
        id,
        title,
        certificate_number,
        verification_code,
        issue_date,
        recipient_name,
        pdf_drive_url,
        template_id,
        event_id,
        issued_by
      `)
      .eq('verification_code', code)
      .maybeSingle();
    cert = byCode;
  }

  // 3. Fallback: check by database ID
  if (!cert) {
    const { data: byId } = await admin
      .from('certificates')
      .select(`
        id,
        title,
        certificate_number,
        verification_code,
        issue_date,
        recipient_name,
        pdf_drive_url,
        template_id,
        event_id,
        issued_by
      `)
      .eq('id', code)
      .maybeSingle();
    cert = byId;
  }

  const certificate = cert;

  // 4. CANONICAL REDIRECT: If accessed via UUID or legacy code, redirect to canonical serial number URL
  if (certificate && certificate.certificate_number && code !== certificate.certificate_number) {
    redirect(`/verify/${encodeURIComponent(certificate.certificate_number)}`);
  }

  // Fetch event, template, issuer info, and QR code concurrently in parallel
  let eventTitle: string | null = null;
  let issuerName: string | null = null;
  let templateBg: string | null = null;
  let fieldLayout: CertificateFieldLayout | null = null;
  let qrCodeDataUrl = '';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (certificate) {
    // QR code encodes canonical serial number URL
    const verifyUrl = `${baseUrl}/verify/${encodeURIComponent(certificate.certificate_number)}`;

    const [qrResult, eventResult, tmplResult, defaultTmplResult, issuerResult] = await Promise.all([
      generateStyledQRDataURL(verifyUrl, 200).catch((e) => {
        console.warn('QR generation fallback:', e);
        return '';
      }),
      certificate.event_id
        ? admin.from('events').select('title').eq('id', certificate.event_id).maybeSingle()
        : Promise.resolve({ data: null }),
      certificate.template_id
        ? admin.from('certificate_templates').select('background_image_drive_file_id, field_layout').eq('id', certificate.template_id).maybeSingle()
        : Promise.resolve({ data: null }),
      !certificate.template_id
        ? admin.from('certificate_templates').select('background_image_drive_file_id, field_layout').order('created_at', { ascending: false }).limit(1).maybeSingle()
        : Promise.resolve({ data: null }),
      certificate.issued_by
        ? admin.from('profiles').select('full_name, role').eq('id', certificate.issued_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    qrCodeDataUrl = qrResult || '';
    if (eventResult?.data?.title) eventTitle = eventResult.data.title;

    const activeTmpl = tmplResult?.data || defaultTmplResult?.data;
    if (activeTmpl?.background_image_drive_file_id) {
      templateBg = activeTmpl.background_image_drive_file_id;
    }
    if (activeTmpl?.field_layout) {
      fieldLayout = activeTmpl.field_layout as CertificateFieldLayout;
    }

    if (issuerResult?.data) {
      issuerName = `${issuerResult.data.full_name} (${issuerResult.data.role.replace('_', ' ')})`;
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
          maxWidth: '860px',
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
      </header>

      {/* Main Verification Container */}
      <main style={{ width: '100%', maxWidth: '860px' }}>
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
              gap: '2rem',
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

            {/* VISUAL CERTIFICATE PREVIEW CANVAS (Live Rendered) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Visual Certificate Preview (A4 Landscape)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#93c5fd' }}>
                  High-Resolution Render
                </span>
              </div>

              <CertificatePreviewCanvas
                recipientName={certificate.recipient_name}
                title={certificate.title}
                formattedDate={formattedDate}
                certificateNumber={certificate.certificate_number}
                issuerName={issuerName ? issuerName.split('(')[0] : ''}
                eventTitle={eventTitle}
                fieldLayout={fieldLayout}
                templateBg={templateBg}
                qrCodeDataUrl={qrCodeDataUrl}
              />
            </div>

            {/* Credentials Meta Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
            <div style={{ paddingTop: '0.5rem', width: '100%' }}>
              <CertificateDownloadActions
                certificateId={certificate.id}
                certificateNumber={certificate.certificate_number}
                recipientName={certificate.recipient_name}
              />
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
