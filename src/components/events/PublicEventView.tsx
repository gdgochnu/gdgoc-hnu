'use client';

import React, { useState, useEffect } from 'react';
import { Event, EventRegistrationField, EventOwner } from '@/types';
import { registerForEvent } from '@/app/events/actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Share2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Copy,
  ShieldCheck,
  Building2,
  HelpCircle,
  Globe,
  Lock,
  ChevronRight,
  UserCheck,
  Send,
  Loader2,
  CalendarDays,
  Ticket
} from 'lucide-react';

interface PublicEventViewProps {
  event: Event;
  registeredCount: number;
  waitlistCount: number;
  isCapacityFull: boolean;
  spotsRemaining: number | null;
  isPreview?: boolean;
  userContext?: {
    isLoggedIn: boolean;
    fullName?: string;
    email?: string;
    role?: string;
  };
}

export function PublicEventView({
  event,
  registeredCount,
  waitlistCount,
  isCapacityFull: initialIsCapacityFull,
  spotsRemaining: initialSpotsRemaining,
  isPreview = false,
  userContext,
}: PublicEventViewProps) {
  const router = useRouter();

  // Registration form state
  const [fullName, setFullName] = useState(userContext?.fullName || '');
  const [email, setEmail] = useState(userContext?.email || '');
  const [phone, setPhone] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<{
    qrCode: string;
    status: 'registered' | 'waitlisted';
    regId: string;
  } | null>(null);

  // Live countdown state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  // Compute countdown
  useEffect(() => {
    function calculateTime() {
      const eventDateTime = new Date(`${event.event_date}T${event.start_time || '10:00:00'}`);
      const now = new Date();
      const diff = eventDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    }

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [event.event_date, event.start_time]);

  // Copy shareable link
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // WhatsApp share
  const handleWhatsAppShare = () => {
    if (typeof window === 'undefined') return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      `🚀 Join me at "${event.title}" organized by Google Developer Groups on Campus - Helwan National University!\n\n📅 Date: ${event.event_date}\n📍 Venue: ${event.venue || 'Campus Auditorium'}\n\nRegister now here:\n${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Handle Form Submission
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const res = await registerForEvent({
        eventId: event.id,
        fullName,
        email,
        phone,
        customAnswers,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (res.registration) {
        setRegistrationSuccess({
          qrCode: res.registration.qr_code,
          status: res.registration.status as 'registered' | 'waitlisted',
          regId: res.registration.id,
        });

        // Scroll to success banner
        const regSection = document.getElementById('registration-section');
        if (regSection) {
          regSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Capacity calculations
  const capacity = event.capacity;
  const isFull = initialIsCapacityFull;
  const spotsLeft = initialSpotsRemaining;
  const capacityPercent = capacity && capacity > 0 ? Math.min(100, Math.round((registeredCount / capacity) * 100)) : null;

  // Format date nicely
  const formattedDate = new Date(event.event_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(66, 133, 244, 0.15), transparent 70%), #0B0F19',
      color: '#F8FAFC',
      fontFamily: 'inherit',
      paddingBottom: '5rem',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background Decorative Blur Orbs */}
      <div style={{
        position: 'absolute',
        top: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(66, 133, 244, 0.08)',
        filter: 'blur(120px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        top: '30%',
        right: '-180px',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: 'rgba(52, 168, 83, 0.06)',
        filter: 'blur(140px)',
        pointerEvents: 'none',
      }} />

      {/* Admin Preview / Staff Navigation Bar */}
      {userContext?.isLoggedIn && (
        <div style={{
          background: isPreview ? 'rgba(251, 188, 4, 0.15)' : 'rgba(19, 27, 46, 0.95)',
          borderBottom: isPreview ? '1px solid rgba(251, 188, 4, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          padding: '0.65rem 1.5rem',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            fontSize: '0.86rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                background: isPreview ? 'rgba(251, 188, 4, 0.25)' : 'rgba(66, 133, 244, 0.2)',
                color: isPreview ? '#FDE047' : '#93C5FD',
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {isPreview ? <Lock size={12} /> : <ShieldCheck size={12} />}
                {isPreview ? `Preview: ${event.status}` : 'Chapter Staff Mode'}
              </span>
              <span style={{ color: '#94A3B8' }}>
                Viewing public view as <strong>{userContext.fullName}</strong> ({userContext.role})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                href={`/events/${event.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#60A5FA',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                }}
              >
                <span>Back to Event Workspace</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Top Brand Header */}
      <header style={{
        padding: '1.5rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Logo & University badge */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.2rem' }}>🌐</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em', color: '#FFFFFF' }}>
                Google Developer Groups
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>
                on Campus • Helwan National University
              </div>
            </div>
          </Link>

          {/* Quick Register CTA in header */}
          <a
            href="#registration-section"
            className="btn-primary"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.86rem',
              fontWeight: 700,
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Ticket size={15} />
            <span>Register Now</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)',
          gap: '3rem',
          alignItems: 'start',
        }}>
          {/* Left Column: Event Presentation & Details */}
          <div>
            {/* Status & Committee Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                background: 'rgba(66, 133, 244, 0.15)',
                color: '#60A5FA',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid rgba(66, 133, 244, 0.25)',
              }}>
                <Sparkles size={13} />
                {event.department?.name || 'GDGoC HNU Chapter'}
              </span>

              {event.status === 'published' && !isFull && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  color: '#4ADE80',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
                  Registration Open
                </span>
              )}

              {event.status === 'published' && isFull && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(251, 188, 4, 0.15)',
                  color: '#FBBF24',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1px solid rgba(251, 188, 4, 0.3)',
                }}>
                  <AlertCircle size={13} />
                  Capacity Reached (Waitlist Open)
                </span>
              )}

              {event.status === 'completed' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '20px',
                  background: 'rgba(148, 163, 184, 0.15)',
                  color: '#94A3B8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}>
                  Event Completed
                </span>
              )}
            </div>

            {/* Event Title */}
            <h1 style={{
              fontSize: 'clamp(2rem, 4.5vw, 3rem)',
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: '1.25rem',
              color: '#FFFFFF',
            }}>
              {event.title}
            </h1>

            {/* Event Description */}
            <div style={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: '#CBD5E1',
              marginBottom: '2rem',
              whiteSpace: 'pre-line',
            }}>
              {event.description || 'Join us for this exciting Google Developer Groups on Campus event at Helwan National University. Expand your tech skills, network with peers, and build real-world software.'}
            </div>

            {/* Logistics Glass Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2.5rem',
            }}>
              {/* Date Card */}
              <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(19, 27, 46, 0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(66, 133, 244, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Calendar size={17} color="#60A5FA" />
                  </div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700 }}>
                    Date
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#F1F5F9' }}>
                  {formattedDate}
                </div>
              </div>

              {/* Time Card */}
              <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(19, 27, 46, 0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(52, 168, 83, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Clock size={17} color="#4ADE80" />
                  </div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700 }}>
                    Time
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#F1F5F9' }}>
                  {event.start_time || '10:00'} {event.end_time ? `– ${event.end_time}` : ''} (EET)
                </div>
              </div>

              {/* Venue Card */}
              <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(19, 27, 46, 0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(234, 67, 53, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MapPin size={17} color="#F87171" />
                  </div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700 }}>
                    Location
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#F1F5F9' }}>
                  {event.venue || 'Helwan National University'}
                </div>
              </div>

              {/* Spots / Capacity Card */}
              <div className="glass-panel" style={{
                padding: '1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(19, 27, 46, 0.6)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(251, 188, 4, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Users size={17} color="#FBBF24" />
                  </div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', fontWeight: 700 }}>
                    Capacity
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#F1F5F9' }}>
                  {capacity ? (
                    spotsLeft && spotsLeft > 0 ? (
                      <span style={{ color: '#4ADE80' }}>{spotsLeft} spots remaining</span>
                    ) : (
                      <span style={{ color: '#FBBF24' }}>Full ({registeredCount} registered)</span>
                    )
                  ) : (
                    <span>Open Capacity</span>
                  )}
                </div>
                {capacityPercent !== null && (
                  <div style={{
                    width: '100%',
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    marginTop: '0.65rem',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${capacityPercent}%`,
                      height: '100%',
                      background: isFull ? 'var(--google-yellow)' : 'var(--google-green)',
                      borderRadius: '2px',
                    }} />
                  </div>
                )}
              </div>
            </div>

            {/* Countdown Timer Widget */}
            {!timeLeft.isPast && (
              <div className="glass-panel" style={{
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(66, 133, 244, 0.25)',
                background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.8), rgba(15, 23, 42, 0.95))',
                marginBottom: '2.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <CalendarDays size={18} color="#60A5FA" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8' }}>
                    Event Starts In
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  textAlign: 'center',
                }}>
                  {[
                    { label: 'Days', val: timeLeft.days },
                    { label: 'Hours', val: timeLeft.hours },
                    { label: 'Minutes', val: timeLeft.minutes },
                    { label: 'Seconds', val: timeLeft.seconds },
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '0.75rem 0.5rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#60A5FA', lineHeight: 1 }}>
                        {String(item.val).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Event Owners & Organizing Team Section */}
            {event.owners && event.owners.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#F1F5F9' }}>
                  Organizing Leads & Speakers
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  {event.owners.map((owner, idx) => (
                    <div
                      key={idx}
                      className="glass-panel"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: 'rgba(19, 27, 46, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'rgba(66, 133, 244, 0.2)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#60A5FA',
                        fontSize: '0.85rem',
                      }}>
                        {owner.full_name?.charAt(0) || 'O'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}>
                          {owner.full_name || 'Chapter Lead'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                          {owner.committee_role || 'Speaker / Lead'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Social Share Bar */}
            <div className="glass-panel" style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(19, 27, 46, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Share2 size={18} color="#94A3B8" />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#E2E8F0' }}>
                  Share this event with friends
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    background: copiedLink ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: copiedLink ? '#4ADE80' : '#F1F5F9',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Copy size={13} />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(37, 211, 102, 0.18)',
                    border: '1px solid rgba(37, 211, 102, 0.3)',
                    color: '#4ADE80',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <span>WhatsApp</span>
                  <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Registration Card */}
          <div id="registration-section">
            <div className="glass-panel" style={{
              padding: '2rem',
              borderRadius: '20px',
              border: event.status === 'completed'
                ? '1px solid rgba(168, 85, 247, 0.4)'
                : event.status === 'closed'
                ? '1px solid rgba(251, 188, 4, 0.4)'
                : '1px solid rgba(66, 133, 244, 0.35)',
              background: 'linear-gradient(180deg, rgba(19, 27, 46, 0.95), rgba(11, 15, 25, 0.98))',
              boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 35px -10px rgba(66, 133, 244, 0.25)',
              position: 'sticky',
              top: '5rem',
            }}>
              {event.status === 'completed' ? (
                <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                  }}>
                    <CheckCircle2 size={28} color="#D8B4FE" />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                    Event Concluded
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                    This event has officially ended. Online registrations are closed. Thank you to everyone who joined us!
                  </p>
                  <Link
                    href="/"
                    className="btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      width: '100%',
                      padding: '0.75rem 1.25rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    <span>Back to Chapter Home</span>
                  </Link>
                </div>
              ) : event.status === 'closed' ? (
                <div style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'rgba(251, 188, 4, 0.15)',
                    border: '1px solid rgba(251, 188, 4, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.25rem',
                  }}>
                    <Clock size={28} color="#FDE047" />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                    Registrations Closed
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                    Online registrations for this event are currently closed. For inquiries, please reach out to our team.
                  </p>
                </div>
              ) : (
                <>
                  {/* Card Header */}
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}>
                  <Ticket size={24} color="#60A5FA" />
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.35rem' }}>
                  {isFull ? 'Join the Waitlist' : 'Reserve Your Spot'}
                </h2>
                <p style={{ fontSize: '0.86rem', color: '#94A3B8' }}>
                  {isFull
                    ? 'Capacity is currently reached. Fill out this form to be placed on the priority waitlist.'
                    : 'Get your official entry pass with instant QR verification for campus check-in.'}
                </p>
              </div>

              {/* Success Banner if already submitted */}
              {registrationSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(52, 168, 83, 0.15)',
                    border: '2px solid rgba(52, 168, 83, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <CheckCircle2 size={32} color="#4ADE80" />
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                    {registrationSuccess.status === 'waitlisted' ? 'Added to Waitlist!' : 'Registration Confirmed!'}
                  </h3>

                  <p style={{ fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {registrationSuccess.status === 'waitlisted'
                      ? 'You have been added to the waitlist. If a spot opens up, we will contact you via email immediately.'
                      : 'You are all set! Your personal check-in QR code has been generated.'}
                  </p>

                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px dashed rgba(66, 133, 244, 0.3)',
                    marginBottom: '1.5rem',
                  }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      Registration Pass ID
                    </div>
                    <code style={{ fontSize: '0.9rem', color: '#60A5FA', fontWeight: 700, wordBreak: 'break-all' }}>
                      {registrationSuccess.qrCode}
                    </code>
                  </div>

                  <Link
                    href={`/events/${event.slug}/confirmation?reg=${registrationSuccess.regId}`}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.85rem 1.5rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>View Registration Pass & QR</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleSubmitRegistration}>
                  {errorMessage && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.65rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      background: 'rgba(234, 67, 53, 0.15)',
                      border: '1px solid rgba(234, 67, 53, 0.3)',
                      color: '#FCA5A5',
                      fontSize: '0.85rem',
                      marginBottom: '1.25rem',
                      lineHeight: 1.5,
                    }}>
                      <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>{errorMessage}</div>
                    </div>
                  )}

                  {/* Standard Fields: Full Name */}
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Full Name <span style={{ color: 'var(--google-red)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Omar Ahmed"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Standard Fields: Email Address */}
                  <div style={{ marginBottom: '1.1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Email Address <span style={{ color: 'var(--google-red)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. omar@example.com"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Standard Fields: Phone / WhatsApp */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                      Phone / WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +20 10 1234 5678"
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  {/* Dynamic Custom Registration Fields */}
                  {event.registration_fields && event.registration_fields.length > 0 && (
                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '1.25rem',
                      marginBottom: '1.25rem',
                    }}>
                      <div style={{
                        fontSize: '0.76rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#94A3B8',
                        fontWeight: 700,
                        marginBottom: '1rem',
                      }}>
                        Additional Event Questions
                      </div>

                      {event.registration_fields.map((field: EventRegistrationField) => (
                        <div key={field.id} style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                            {field.label}
                            {field.required && <span style={{ color: 'var(--google-red)', marginLeft: '4px' }}>*</span>}
                          </label>

                          {/* Text input */}
                          {field.field_type === 'text' && (
                            <input
                              type="text"
                              required={field.required}
                              placeholder={field.placeholder || ''}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                fontSize: '0.88rem',
                                outline: 'none',
                              }}
                            />
                          )}

                          {/* Number input */}
                          {field.field_type === 'number' && (
                            <input
                              type="number"
                              required={field.required}
                              placeholder={field.placeholder || ''}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                fontSize: '0.88rem',
                                outline: 'none',
                              }}
                            />
                          )}

                          {/* Select dropdown */}
                          {field.field_type === 'select' && (
                            <select
                              required={field.required}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                borderRadius: '8px',
                                background: '#131B2E',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                fontSize: '0.88rem',
                                outline: 'none',
                              }}
                            >
                              <option value="">-- Select an option --</option>
                              {field.options?.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Textarea */}
                          {field.field_type === 'textarea' && (
                            <textarea
                              required={field.required}
                              rows={3}
                              placeholder={field.placeholder || ''}
                              value={customAnswers[field.id] || ''}
                              onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '0.7rem 0.9rem',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFFFFF',
                                fontSize: '0.88rem',
                                outline: 'none',
                                resize: 'vertical',
                              }}
                            />
                          )}

                          {/* Checkbox */}
                          {field.field_type === 'checkbox' && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.86rem', color: '#E2E8F0' }}>
                              <input
                                type="checkbox"
                                required={field.required}
                                checked={!!customAnswers[field.id]}
                                onChange={(e) => setCustomAnswers({ ...customAnswers, [field.id]: e.target.checked })}
                                style={{ width: '16px', height: '16px', accentColor: 'var(--google-blue)' }}
                              />
                              <span>Yes, I confirm</span>
                            </label>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '0.9rem 1.5rem',
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 20px rgba(66, 133, 244, 0.35)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Securing Your Spot...</span>
                      </>
                    ) : (
                      <>
                        <span>{isFull ? 'Join Event Waitlist' : 'Complete Registration'}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    marginTop: '1rem',
                    fontSize: '0.76rem',
                    color: '#94A3B8',
                  }}>
                    <ShieldCheck size={14} color="#34A853" />
                    <span>Free registration. Official QR pass provided.</span>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
        </div>
      </main>

      {/* Public Footer */}
      <footer style={{
        marginTop: '6rem',
        padding: '3rem 1.5rem 1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#CBD5E1', marginBottom: '0.35rem' }}>
            Google Developer Groups on Campus • Helwan National University
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Connecting students with Google technologies, developer tools, and community empowerment.
          </p>
        </div>
      </footer>
    </div>
  );
}
