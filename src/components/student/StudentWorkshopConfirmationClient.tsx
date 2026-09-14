'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Video,
  QrCode,
  Download,
  Printer,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Share2,
  Check,
  Building,
  User,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { Workshop, WorkshopSession } from '@/types/student';

interface StudentWorkshopConfirmationClientProps {
  workshop: Workshop & { department_name?: string; department_code?: string };
  registration: {
    id: string;
    qr_code: string;
    status: 'registered' | 'waitlisted' | 'cancelled';
    registered_at: string;
  };
  student: {
    id: string;
    full_name_en: string;
    full_name_ar?: string | null;
    email: string;
    university?: string | null;
    faculty?: string | null;
    national_id?: string | null;
    qr_code?: string;
  };
  sessions: WorkshopSession[];
}

export function StudentWorkshopConfirmationClient({
  workshop,
  registration,
  student,
  sessions,
}: StudentWorkshopConfirmationClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    registration.qr_code
  )}`;

  // Generate Google Calendar Link for the primary/first session
  let gcalLink = '';
  if (sessions.length > 0) {
    const firstSession = sessions[0];
    const dateClean = firstSession.session_date.replace(/-/g, '');
    const startTimeClean = (firstSession.start_time || '10:00:00').replace(/:/g, '').slice(0, 6);
    const endTimeClean = (firstSession.end_time || '12:00:00').replace(/:/g, '').slice(0, 6);
    const startStr = `${dateClean}T${startTimeClean}`;
    const endStr = `${dateClean}T${endTimeClean}`;

    const locationText =
      firstSession.type === 'offline'
        ? firstSession.venue || 'Helwan University Campus Lab'
        : 'Online Live Stream';

    const detailsText = `GDGoC HNU Workshop: ${workshop.title}\nPass Code: ${registration.qr_code}`;

    gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `GDGoC Bootcamp: ${workshop.title}`
    )}&dates=${startStr}/${endStr}&details=${encodeURIComponent(detailsText)}&location=${encodeURIComponent(
      locationText
    )}`;
  }

  // Generate and download .ics iCalendar file
  const handleDownloadIcs = () => {
    if (sessions.length === 0) return;

    let icsEvents = '';
    for (const s of sessions) {
      const dateClean = s.session_date.replace(/-/g, '');
      const startTimeClean = (s.start_time || '10:00:00').replace(/:/g, '').slice(0, 6);
      const endTimeClean = (s.end_time || '12:00:00').replace(/:/g, '').slice(0, 6);
      const startStr = `${dateClean}T${startTimeClean}`;
      const endStr = `${dateClean}T${endTimeClean}`;

      const loc =
        s.type === 'offline'
          ? s.venue || 'Helwan University Campus'
          : s.online_meeting_url || 'Online Live Stream';

      icsEvents += `
BEGIN:VEVENT
UID:${s.id}@gdgoc.hnu.edu.eg
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z
DTSTART:${startStr}
DTEND:${endStr}
SUMMARY:GDGoC Workshop: ${workshop.title} (Session ${s.session_number})
DESCRIPTION:${s.title} - Pass Code: ${registration.qr_code}
LOCATION:${loc}
STATUS:CONFIRMED
END:VEVENT`;
    }

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GDGoC Helwan University//Workshop Pass//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH${icsEvents}
END:VCALENDAR`.trim();

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `GDGoC_${workshop.title.replace(/\s+/g, '_')}_Schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(registration.qr_code);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        padding: '2.5rem 2rem',
        maxWidth: '1080px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        paddingBottom: '5rem',
      }}
    >
      {/* Celebration Header */}
      <div
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.85rem',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.2) 0%, rgba(66, 133, 244, 0.15) 100%)',
            border: '1px solid rgba(52, 168, 83, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34A853',
            boxShadow: '0 8px 30px rgba(52, 168, 83, 0.25)',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              background: 'rgba(52, 168, 83, 0.12)',
              border: '1px solid rgba(52, 168, 83, 0.3)',
              color: '#34A853',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.6rem',
            }}
          >
            <Sparkles size={14} /> Registration Confirmed
          </div>
          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            You&apos;re Officially In! 🎉
          </h1>
          <p
            style={{
              color: '#94A3B8',
              fontSize: '1.05rem',
              maxWidth: '620px',
              margin: '0.6rem auto 0 auto',
              lineHeight: 1.6,
            }}
          >
            Your seat for <strong>{workshop.title}</strong> has been secured. A confirmation email with calendar invites and your unique admission pass has been sent to <strong>{student.email}</strong>.
          </p>
        </div>
      </div>

      {/* Main Grid: Pass Card on Left, Sessions & Calendar on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 420px) 1fr',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Pass Card (Printable & Downloadable) */}
        <div
          id="printable-workshop-pass"
          style={{
            borderRadius: '22px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 28, 0.95) 100%)',
            border: '1px solid rgba(52, 168, 83, 0.4)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(52, 168, 83, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top 4-color Google Brand Stripe */}
          <div
            style={{
              height: '4px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          <div
            style={{
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '1.25rem',
            }}
          >
            {/* Header info */}
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#4ADE80',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Official Workshop Admission Pass
              </div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  margin: '0.35rem 0 0 0',
                  lineHeight: 1.3,
                }}
              >
                {workshop.title}
              </h2>
              {workshop.department_name && (
                <div style={{ fontSize: '0.8rem', color: '#60A5FA', marginTop: '0.2rem', fontWeight: 600 }}>
                  {workshop.department_name} ({workshop.department_code})
                </div>
              )}
            </div>

            {/* High-res QR Image */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: '#FFFFFF',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <img
                src={qrImageUrl}
                alt="Workshop Registration QR"
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
              <span
                style={{
                  fontSize: '0.78rem',
                  color: '#0F172A',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                }}
              >
                {registration.qr_code}
              </span>
            </div>

            {/* Student Details Pill */}
            <div
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Attendee:</span>
                <span style={{ color: '#F8FAFC', fontWeight: 700 }}>{student.full_name_en}</span>
              </div>
              {student.university && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94A3B8' }}>University:</span>
                  <span style={{ color: '#CBD5E1' }}>{student.university}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Pass Token:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#4ADE80',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.8rem',
                  }}
                >
                  {copiedLink ? (
                    <>
                      <Check size={12} /> Copied
                    </>
                  ) : (
                    registration.qr_code
                  )}
                </button>
              </div>
            </div>

            {/* Pass Actions: Print / Copy */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#F8FAFC',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Printer size={15} /> Print Pass
              </button>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#4ADE80',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={15} /> : <Share2 size={15} />}
                {copiedLink ? 'Code Copied!' : 'Copy Pass'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Calendar Sync & Scheduled Sessions Breakdown */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Calendar Integration Box */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                📅 Add Schedule to Your Calendar
              </h3>
              <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
                Sync all workshop sessions to your Google Calendar or Apple/Outlook calendar with one click so you never miss a live lab.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {gcalLink && (
                <a
                  href={gcalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.7rem 1.25rem',
                    borderRadius: '10px',
                    background: 'var(--google-blue, #4285F4)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(66, 133, 244, 0.3)',
                  }}
                >
                  <Calendar size={16} /> Add to Google Calendar
                </a>
              )}
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.7rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#F8FAFC',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={16} /> Download .ics Calendar File
                </button>
              )}
            </div>
          </div>

          {/* Sessions Breakdown List */}
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                Scheduled Sessions ({sessions.length})
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                Attendance checked via QR
              </span>
            </div>

            {sessions.length === 0 ? (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#94A3B8',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                }}
              >
                <Clock size={24} style={{ color: '#64748B', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#E2E8F0' }}>
                  Detailed Schedule Forthcoming
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                  Session times and locations will be updated before the workshop starts.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          color: '#60A5FA',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {s.session_number}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>
                          {s.title}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.6rem',
                            alignItems: 'center',
                            color: '#94A3B8',
                            fontSize: '0.8rem',
                            marginTop: '0.25rem',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>📅 {s.session_date}</span>
                          <span>•</span>
                          <span>⏰ {s.start_time} - {s.end_time}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {s.type === 'offline' ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(52, 168, 83, 0.15)',
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                            color: '#4ADE80',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          <MapPin size={12} /> {s.venue || 'Campus Venue'}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '6px',
                            background: 'rgba(66, 133, 244, 0.15)',
                            border: '1px solid rgba(66, 133, 244, 0.3)',
                            color: '#60A5FA',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                          }}
                        >
                          <Video size={12} /> Online Live Stream
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Portal Navigation Links */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/student/dashboard"
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.8rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Go to Dashboard <ArrowRight size={15} />
            </Link>
            <Link
              href={`/student/workshops/${workshop.id}`}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.8rem 1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#F8FAFC',
                fontWeight: 600,
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Workshop Details & LMS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
