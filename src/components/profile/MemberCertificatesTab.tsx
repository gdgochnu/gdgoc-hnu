'use client';

import React from 'react';
import Link from 'next/link';
import { Award, Download, ExternalLink, ShieldCheck, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { Certificate } from '@/types';

interface MemberCertificatesTabProps {
  certificates?: Certificate[];
  memberName: string;
}

export function MemberCertificatesTab({
  certificates = [],
  memberName,
}: MemberCertificatesTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem 2rem',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          background: 'linear-gradient(135deg, rgba(234, 67, 53, 0.08), transparent)',
          border: '1px solid rgba(234, 67, 53, 0.25)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 800,
                background: 'rgba(234, 67, 53, 0.15)',
                color: 'var(--google-red)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
              }}
            >
              <Award size={13} /> Verified Chapter Credentials
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Spec §4.6 &bull; §4.14
            </span>
          </div>

          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
            Certificates &amp; Achievements
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '600px' }}>
            Official cryptographic certificates issued to {memberName} for event participation, workshops, and chapter milestones.
          </p>
        </div>

        <div
          style={{
            padding: '0.6rem 1.1rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Issued Certificates
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {certificates.length}
          </div>
        </div>
      </div>

      {/* Certificates Grid */}
      {certificates.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            borderRadius: '16px',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(234, 67, 53, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Award size={28} color="var(--google-red)" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            No Certificates Issued Yet
          </h3>
          <p style={{ margin: '0.5rem auto 0', fontSize: '0.88rem', maxWidth: '480px', lineHeight: 1.5 }}>
            Certificates will be issued by Chapter Leadership upon completing events, workshops, or semester tenures with qualifying attendance rates.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="glass-panel"
              style={{
                borderRadius: '16px',
                padding: '1.75rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(0, 0, 0, 0.3))',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'rgba(52, 168, 83, 0.15)',
                      color: 'var(--google-green)',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                    }}
                  >
                    <ShieldCheck size={13} /> Verified Credential
                  </span>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {cert.certificate_number}
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    margin: '0 0 0.5rem 0',
                    lineHeight: 1.35,
                  }}
                >
                  {cert.title}
                </h4>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Calendar size={13} />
                  <span>Issued on {new Date(cert.issue_date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Links */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '1rem',
                }}
              >
                <a
                  href={cert.pdf_drive_url && cert.pdf_drive_url.startsWith('http') ? cert.pdf_drive_url : `/api/certificates/${cert.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--google-blue), #2563EB)',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} /> Download PDF
                </a>

                <Link
                  href={`/verify/${cert.verification_code}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <span>Verify</span>
                  <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
