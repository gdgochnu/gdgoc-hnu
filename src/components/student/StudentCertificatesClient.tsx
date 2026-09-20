'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Calendar,
  BookOpen,
  Check,
  Copy,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { StudentProfile, StudentCertificate } from '@/types/student';

interface StudentCertificatesClientProps {
  student: StudentProfile;
  certificates: StudentCertificate[];
}

export function StudentCertificatesClient({ student, certificates }: StudentCertificatesClientProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyVerificationLink = (certificateNumber: string) => {
    const url = `${window.location.origin}/verify/${certificateNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(certificateNumber);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleShareLinkedIn = (cert: StudentCertificate) => {
    const url = `${window.location.origin}/verify/${cert.certificate_number}`;
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      style={{
        padding: '2.5rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
      }}
    >
      {/* 1. Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2.25rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background:
            'radial-gradient(ellipse at top left, rgba(251, 188, 4, 0.12) 0%, rgba(66, 133, 244, 0.08) 50%, var(--surface-primary, #13151b) 100%)',
          border: '1px solid rgba(251, 188, 4, 0.3)',
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'rgba(251, 188, 4, 0.15)',
                border: '1px solid rgba(251, 188, 4, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
                flexShrink: 0,
              }}
            >
              <Award size={32} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#FFFFFF' }}>
                  Verified Credentials & Certificates
                </h1>
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 168, 83, 0.15)',
                    color: '#86EFAC',
                    border: '1px solid rgba(52, 168, 83, 0.35)',
                    textTransform: 'uppercase',
                  }}
                >
                  {certificates.length} Conferred
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.92rem', marginTop: '0.35rem', marginBottom: 0 }}>
                Authentic certificates issued under presidential authority for completing GDGoC Helwan National University technical tracks.
              </p>
            </div>
          </div>

          <Link
            href="/student/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>Return to Dashboard</span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* 2. Certificate Cards Grid */}
      {certificates.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
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
              borderRadius: '16px',
              background: 'rgba(251, 188, 4, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBBF24',
            }}
          >
            <Award size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.4rem 0' }}>
              No Certificates Conferred Yet
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #94A3B8)', margin: 0, maxWidth: '520px', lineHeight: 1.5 }}>
              Complete enrolled technical courses or hands-on bootcamps by attending sessions, completing assignments, and passing quizzes to earn your verified credentials.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <Link
              href="/student/courses"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.4rem',
                fontSize: '0.88rem',
                textDecoration: 'none',
              }}
            >
              <span>Explore Courses</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/student/workshops"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.4rem',
                fontSize: '0.88rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>View Bootcamps</span>
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.75rem' }}>
          {certificates.map((cert) => {
            const stats = cert.completion_stats || {};
            const isCopied = copiedCode === cert.certificate_number;

            return (
              <div
                key={cert.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                  background:
                    'radial-gradient(ellipse at top right, rgba(251, 188, 4, 0.06) 0%, rgba(19, 21, 27, 0.95) 75%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top Google Colors Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: 'linear-gradient(90deg, #4285F4, #EA4335, #FBBC04, #34A853)',
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(251, 188, 4, 0.15)',
                        color: '#FDE047',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {cert.course?.category || cert.workshop?.category || 'Technical Track'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: '#4ADE80',
                      }}
                    >
                      <ShieldCheck size={14} />
                      Verified
                    </span>
                  </div>

                  {/* Title & Serial */}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
                      {cert.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#93C5FD', fontWeight: 700 }}>
                        {cert.certificate_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>•</span>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        Issued: {new Date(cert.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Completion Stats Badges */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>Attendance</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#86EFAC', marginTop: '0.15rem' }}>
                        {stats.attendance_percentage ?? 100}%
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255, 255, 255, 0.06)', borderRight: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>Tasks Avg</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FCA5A5', marginTop: '0.15rem' }}>
                        {stats.task_average_score ? `${stats.task_average_score}%` : 'N/A'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>Quiz Score</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#93C5FD', marginTop: '0.15rem' }}>
                        {stats.quiz_average_score ? `${stats.quiz_average_score}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    {cert.pdf_drive_url ? (
                      <a
                        href={cert.pdf_drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.65rem',
                          fontSize: '0.84rem',
                          textDecoration: 'none',
                        }}
                      >
                        <Download size={14} />
                        <span>Download PDF</span>
                      </a>
                    ) : (
                      <Link
                        href={`/verify/${cert.certificate_number}`}
                        target="_blank"
                        className="btn-primary"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          padding: '0.65rem',
                          fontSize: '0.84rem',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={14} />
                        <span>View Credential</span>
                      </Link>
                    )}

                    <Link
                      href={`/verify/${cert.certificate_number}`}
                      target="_blank"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.65rem 0.95rem',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        color: '#FFFFFF',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        textDecoration: 'none',
                      }}
                    >
                      <ShieldCheck size={15} color="#4ADE80" />
                      <span>Verify</span>
                    </Link>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyVerificationLink(cert.certificate_number)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isCopied ? '#4ADE80' : 'var(--text-secondary, #94A3B8)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      <span>{isCopied ? 'Link Copied!' : 'Copy Verify URL'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareLinkedIn(cert)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#93C5FD',
                        background: 'rgba(66, 133, 244, 0.1)',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <Share2 size={13} />
                      <span>LinkedIn</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
