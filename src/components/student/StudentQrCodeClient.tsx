'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Building2,
  GraduationCap,
  Eye,
  EyeOff,
  Info,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { StudentProfile } from '@/types/student';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';

interface StudentQrCodeClientProps {
  student: StudentProfile;
  teamRole?: string | null;
}

export function StudentQrCodeClient({ student, teamRole }: StudentQrCodeClientProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedQr, setCopiedQr] = useState(false);
  const [showNationalId, setShowNationalId] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const passCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!student?.qr_code) return;
    let isMounted = true;

    generateStyledQRDataURL(student.qr_code, 320)
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch(() => {
        QRCode.toDataURL(student.qr_code, { width: 320, margin: 2 })
          .then((url) => {
            if (isMounted) setQrDataUrl(url);
          })
          .catch((err) => console.error('QR generation fallback error:', err));
      });

    return () => {
      isMounted = false;
    };
  }, [student?.qr_code]);

  const handleCopyQr = () => {
    if (!student?.qr_code) return;
    navigator.clipboard.writeText(student.qr_code);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  const handleDownloadCardPng = async () => {
    if (!passCardRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(passCardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5,
        backgroundColor: '#070B14',
      });
      const link = document.createElement('a');
      link.download = `GDGoC-HNU-Pass-${student.qr_code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export pass card:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadRawQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `GDGoC-QR-${student.qr_code}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const maskNationalId = (id: string | null) => {
    if (!id) return 'Not Provided';
    if (showNationalId) return id;
    if (id.length <= 4) return '••••';
    return `${id.slice(0, 3)}••••••${id.slice(-4)}`;
  };

  const getYearLabel = (year: number | null) => {
    if (!year) return 'Student Member';
    switch (year) {
      case 1:
        return '1st Year';
      case 2:
        return '2nd Year';
      case 3:
        return '3rd Year';
      case 4:
        return '4th Year';
      case 5:
        return '5th Year';
      default:
        return `Year ${year}`;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#F8FAFC',
        fontFamily: 'var(--font-inter, sans-serif)',
        paddingBottom: '5rem',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        {/* Back Link & Page Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Link
              href="/student/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#60A5FA',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                marginBottom: '0.5rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Student Dashboard</span>
            </Link>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Permanent Attendance Pass
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#94A3B8', margin: '0.3rem 0 0 0' }}>
              Your unique chapter identity. Keep this pass handy for all sessions, bootcamps, and workshops.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }} className="no-print">
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#E2E8F0',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={16} />
              <span>Print Pass</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCardPng}
              disabled={isExporting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: isExporting ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
              }}
            >
              <Download size={16} />
              <span>{isExporting ? 'Generating...' : 'Save Pass Image (PNG)'}</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE PASS CARD CONTAINER */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            ref={passCardRef}
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'linear-gradient(145deg, #0F172A 0%, #070B14 100%)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 50px -10px rgba(66, 133, 244, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Top Google Colors Accent Stripe */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: 'linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
              }}
            />

            {/* Header / Chapter Identity */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(66, 133, 244, 0.15)',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <GraduationCap size={18} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                    GDGoC HNU
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600 }}>
                    Official Student Pass
                  </div>
                </div>
              </div>

              {teamRole ? (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#34D399',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                  }}
                >
                  Team Member
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#60A5FA',
                    background: 'rgba(66, 133, 244, 0.15)',
                    border: '1px solid rgba(66, 133, 244, 0.3)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  Active Student
                </span>
              )}
            </div>

            {/* Student Name & Avatar */}
            <div style={{ marginBottom: '1.25rem' }}>
              {student.avatar_url ? (
                <img
                  src={student.avatar_url}
                  alt={student.full_name_en || 'Student'}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(66, 133, 244, 0.6)',
                    margin: '0 auto 0.75rem auto',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    margin: '0 auto 0.75rem auto',
                    border: '2px solid rgba(66, 133, 244, 0.5)',
                  }}
                >
                  {(student.full_name_en || 'S').charAt(0).toUpperCase()}
                </div>
              )}

              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                {student.full_name_en || 'Student Member'}
              </h2>
              {student.full_name_ar && (
                <div style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                  {student.full_name_ar}
                </div>
              )}
            </div>

            {/* HIGH DENSITY QR CODE BOX */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '1rem',
                boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.6)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '240px',
                height: '240px',
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`Student QR Code ${student.qr_code}`}
                  style={{ width: '216px', height: '216px', display: 'block' }}
                />
              ) : (
                <div style={{ color: '#0F172A', fontSize: '0.85rem', fontWeight: 600 }}>
                  Generating QR Code...
                </div>
              )}
            </div>

            {/* Permanent QR Code String */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0.5rem 1rem',
                marginBottom: '1.25rem',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: '#60A5FA', letterSpacing: '0.08em' }}>
                {student.qr_code}
              </span>
              <button
                type="button"
                onClick={handleCopyQr}
                title="Copy QR Code string"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedQr ? '#34D399' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                }}
                className="no-print"
              >
                {copiedQr ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {/* Student Metadata Card inside Pass */}
            <div
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.8rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Faculty / Institution:</span>
                <span style={{ color: '#E2E8F0', fontWeight: 700, textAlign: 'right', maxWidth: '65%' }}>
                  {student.faculty || 'Helwan National University'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Academic Level:</span>
                <span style={{ color: '#E2E8F0', fontWeight: 700 }}>
                  {getYearLabel(student.academic_year)}
                </span>
              </div>

              {student.national_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>National ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#CBD5E1', fontFamily: 'monospace', fontWeight: 600 }}>
                      {maskNationalId(student.national_id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNationalId(!showNationalId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      className="no-print"
                    >
                      {showNationalId ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div style={{ marginTop: '1rem', fontSize: '0.68rem', color: '#64748B' }}>
              Google Developer Groups on Campus • Helwan National University
            </div>
          </div>
        </div>

        {/* PASS INSTRUCTIONS / INFO CARDS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            marginTop: '0.5rem',
          }}
          className="no-print"
        >
          {/* Card 1 */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
                flexShrink: 0,
              }}
            >
              <QrCode size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.3rem 0' }}>
                One Permanent Code
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                This QR code never changes. It identifies you across every course, multi-session workshop, and chapter event.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34D399',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.3rem 0' }}>
                Instant Attendance Check-in
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Show this screen to HR or Mentors at the session door. The scanner immediately logs your presence and updates your attendance progress.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 4, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FBBF24',
                flexShrink: 0,
              }}
            >
              <Download size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 0.3rem 0' }}>
                Works Offline
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
                Save the PNG pass to your smartphone photo gallery or Apple/Google Wallet photos for quick access without relying on campus Wi-Fi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, nav, .no-print {
            display: none !important;
          }
          div[style*="passCardRef"] {
            border: 1px solid #000000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
