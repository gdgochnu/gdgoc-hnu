'use client';

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { Event, EventRegistration } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  ExternalLink,
  Printer,
  Copy,
  ChevronRight,
  ShieldCheck,
  Building2,
  ArrowLeft,
  CalendarPlus,
  Ticket,
  UserCheck
} from 'lucide-react';

interface EventTicketViewProps {
  registration: EventRegistration & {
    event: Event & {
      department?: {
        name: string;
        code: string;
        branch: string;
      } | null;
    };
  };
}

export function EventTicketView({ registration }: EventTicketViewProps) {
  const { event } = registration;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const isWaitlisted = registration.status === 'waitlisted';

  // Generate QR Code data URL using client-side qrcode
  useEffect(() => {
    QRCode.toDataURL(registration.qr_code, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('QR generation error:', err);
        // Fallback to QR server
        setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(registration.qr_code)}&margin=10`);
      });
  }, [registration.qr_code]);

  // Handle Print
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Handle Copy Link
  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // WhatsApp Share
  const handleWhatsAppShare = () => {
    if (typeof window === 'undefined') return;
    const text = encodeURIComponent(
      `🎉 I just registered for "${event.title}" with GDGoC Helwan National University! Join me: ${window.location.origin}/events/${event.slug}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Format date
  const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Google Calendar URL Generator
  const generateGoogleCalendarUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description || ''}\n\nMy Registration ID: ${registration.qr_code}\nEvent Page: ${origin}/events/${event.slug}`
    );
    const location = encodeURIComponent(event.venue || 'Helwan National University');

    // Parse start and end time (format YYYYMMDDTHHmmssZ)
    const dateClean = event.event_date.replace(/-/g, '');
    const startTimeClean = (event.start_time || '10:00').replace(/:/g, '') + '00';
    const endTimeClean = (event.end_time || '14:00').replace(/:/g, '') + '00';
    const dates = `${dateClean}T${startTimeClean}/${dateClean}T${endTimeClean}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(66, 133, 244, 0.15), transparent 70%), #0B0F19',
      color: '#F8FAFC',
      padding: '2.5rem 1.5rem 5rem',
    }}>
      <style jsx global>{`
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-ticket {
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Top Navigation */}
      <div className="no-print" style={{
        maxWidth: '820px',
        margin: '0 auto 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <Link
          href={`/events/${event.slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#94A3B8',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Event Details</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#F1F5F9',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            <span>Print Ticket</span>
          </button>

          <a
            href={generateGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              background: 'rgba(66, 133, 244, 0.15)',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              color: '#60A5FA',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <CalendarPlus size={14} />
            <span>Add to Google Calendar</span>
          </a>
        </div>
      </div>

      {/* Main Ticket Container */}
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Celebration Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isWaitlisted ? 'rgba(251, 188, 4, 0.15)' : 'rgba(52, 168, 83, 0.15)',
            border: `2px solid ${isWaitlisted ? '#FBBC04' : '#34A853'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: `0 0 25px ${isWaitlisted ? 'rgba(251, 188, 4, 0.25)' : 'rgba(52, 168, 83, 0.25)'}`,
          }}>
            {isWaitlisted ? (
              <AlertCircle size={36} color="#FBBC04" />
            ) : (
              <CheckCircle2 size={36} color="#34A853" />
            )}
          </div>

          <h1 style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
            fontWeight: 900,
            marginBottom: '0.5rem',
            color: '#FFFFFF',
          }}>
            {isWaitlisted ? 'You are on the Priority Waitlist' : "You're Registered!"}
          </h1>

          <p style={{ fontSize: '1rem', color: '#94A3B8', maxWidth: '560px', margin: '0 auto' }}>
            {isWaitlisted
              ? 'Thank you for your interest. Capacity is full, but we will notify you immediately if a spot opens up.'
              : 'Your registration is confirmed. A copy has been dispatched to your email address.'}
          </p>
        </div>

        {/* Digital Boarding Pass / Ticket Card */}
        <div
          ref={ticketRef}
          className="printable-ticket"
          style={{
            background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(66, 133, 244, 0.2)',
            marginBottom: '2.5rem',
          }}
        >
          {/* Top 4-color Google bar */}
          <div style={{
            height: '6px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }} />

          {/* Ticket Header */}
          <div style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px dashed rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}>
                🎟️
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>
                  Google Developer Groups on Campus
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  Helwan National University • Campus Event Pass
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.85rem',
                borderRadius: '20px',
                background: isWaitlisted ? 'rgba(251, 188, 4, 0.15)' : 'rgba(52, 168, 83, 0.15)',
                color: isWaitlisted ? '#FBBF24' : '#4ADE80',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: `1px solid ${isWaitlisted ? 'rgba(251, 188, 4, 0.35)' : 'rgba(52, 168, 83, 0.35)'}`,
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isWaitlisted ? '#FBBC04' : '#34A853',
                }} />
                {isWaitlisted ? 'WAITLISTED' : 'CONFIRMED ATTENDEE'}
              </span>
            </div>
          </div>

          {/* Ticket Body: Two-Column Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
            gap: '0',
          }}>
            {/* Left Side: Event & Attendee Details */}
            <div style={{
              padding: '2rem',
              borderRight: '1px dashed rgba(255, 255, 255, 0.12)',
            }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60A5FA', fontWeight: 700, marginBottom: '0.35rem' }}>
                {event.department?.name || 'Chapter Event'}
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFFFFF', marginBottom: '1.5rem', lineHeight: 1.25 }}>
                {event.title}
              </h2>

              {/* Attendee Info Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Attendee Details
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#F8FAFC', marginBottom: '0.25rem' }}>
                  {registration.full_name}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#CBD5E1', marginBottom: '0.2rem' }}>
                  {registration.email}
                </div>
                {registration.phone && (
                  <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                    {registration.phone}
                  </div>
                )}
              </div>

              {/* Logistics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <Calendar size={13} color="#60A5FA" />
                    <span>Date</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F1F5F9' }}>
                    {formattedDate}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <Clock size={13} color="#4ADE80" />
                    <span>Time</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F1F5F9' }}>
                    {event.start_time || '10:00'} {event.end_time ? `– ${event.end_time}` : ''}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94A3B8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.25rem' }}>
                    <MapPin size={13} color="#F87171" />
                    <span>Venue</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#F1F5F9' }}>
                    {event.venue || 'Helwan National University'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: QR Code Pass */}
            <div style={{
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: 'rgba(0, 0, 0, 0.25)',
            }}>
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#94A3B8',
                marginBottom: '1rem',
              }}>
                Scan for Campus Check-in
              </div>

              {/* QR Code Container */}
              <div style={{
                background: '#FFFFFF',
                padding: '12px',
                borderRadius: '16px',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                marginBottom: '1rem',
              }}>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Check-in QR Code"
                    width={220}
                    height={220}
                    style={{ display: 'block', borderRadius: '8px' }}
                  />
                ) : (
                  <div style={{ width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000000' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Pass ID */}
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.25rem' }}>
                Ticket Pass Code:
              </div>
              <code style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#60A5FA',
                wordBreak: 'break-all',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}>
                {registration.qr_code}
              </code>

              <div style={{
                fontSize: '0.76rem',
                color: '#64748B',
                marginTop: '1rem',
                lineHeight: 1.4,
              }}>
                Present this QR code to the reception desk for instant badge check-in.
              </div>
            </div>
          </div>

          {/* Ticket Footer Bar */}
          <div style={{
            padding: '1rem 2rem',
            background: 'rgba(0, 0, 0, 0.4)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.78rem',
            color: '#94A3B8',
          }}>
            <div>
              Registration ID: <strong>{registration.id.slice(0, 18)}...</strong>
            </div>
            <div>
              Registered on: {new Date(registration.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="no-print" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          {/* Share on WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid rgba(37, 211, 102, 0.25)',
              background: 'rgba(37, 211, 102, 0.08)',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#F1F5F9',
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(37, 211, 102, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Share2 size={18} color="#4ADE80" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Share on WhatsApp</div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Invite classmates & friends</div>
            </div>
          </button>

          {/* Copy Ticket Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="glass-panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1.25rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(19, 27, 46, 0.6)',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#F1F5F9',
            }}
          >
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Copy size={18} color={copiedLink ? '#4ADE80' : '#94A3B8'} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                {copiedLink ? 'Ticket Link Copied!' : 'Copy Ticket Link'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Save this link to access your pass anytime</div>
            </div>
          </button>
        </div>

        {/* Check-in Instructions Notice */}
        <div className="glass-panel" style={{
          padding: '1.75rem 2rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(19, 27, 46, 0.5)',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} color="#34A853" />
            <span>Campus Entrance & Check-in Guidelines</span>
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.25rem',
            color: '#CBD5E1',
            fontSize: '0.88rem',
            lineHeight: 1.7,
          }}>
            <li>Please arrive 15 minutes before <strong>{event.start_time || '10:00 AM'}</strong> for smooth check-in.</li>
            <li>Keep this ticket page open or save the QR image to your phone gallery.</li>
            <li>Bring your official Helwan National University Student ID card.</li>
            <li>Certificates of attendance will be issued after event completion based on verified QR check-ins.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
