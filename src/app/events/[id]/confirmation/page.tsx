import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getEventRegistrationById } from '@/app/events/actions';
import { EventTicketView } from '@/components/events/EventTicketView';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Ticket, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ConfirmationPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EventConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const regId = typeof sParams.reg === 'string' ? sParams.reg : undefined;
  const emailQuery = typeof sParams.email === 'string' ? sParams.email.trim().toLowerCase() : undefined;

  const admin = createAdminClient();
  const context = await getUserContext();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Resolve the Event
  const eventQuery = admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)');

  const { data: eventData } = isUuid
    ? await eventQuery.eq('id', id).maybeSingle()
    : await eventQuery.eq('slug', id).maybeSingle();

  if (!eventData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0F19',
        color: '#F8FAFC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        textAlign: 'center',
      }}>
        <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '3rem 2rem', borderRadius: '16px' }}>
          <ShieldAlert size={36} color="var(--google-red)" style={{ margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Event Not Found</h1>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            The event associated with this confirmation link does not exist.
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // 2. Resolve Registration
  let registration = null;

  // Attempt A: By reg ID
  if (regId) {
    registration = await getEventRegistrationById(regId);
  }

  // Attempt B: By Email search query
  if (!registration && emailQuery) {
    const { data: regByEmail } = await admin
      .from('event_registrations')
      .select('*, event:events(*, department:departments(id, name, code, branch))')
      .eq('event_id', eventData.id)
      .eq('email', emailQuery)
      .maybeSingle();

    if (regByEmail) {
      registration = regByEmail;
    }
  }

  // Attempt C: By logged-in profile ID
  if (!registration && context.user) {
    const { data: myReg } = await admin
      .from('event_registrations')
      .select('*, event:events(*, department:departments(id, name, code, branch))')
      .eq('event_id', eventData.id)
      .eq('profile_id', context.user.id)
      .maybeSingle();

    if (myReg) {
      registration = myReg;
    }
  }

  // If registration is found, render the Ticket Pass
  if (registration) {
    return <EventTicketView registration={registration} />;
  }

  // If no registration is found, render the Lookup Form
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(66, 133, 244, 0.15), transparent 70%), #0B0F19',
      color: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '2.5rem',
        borderRadius: '20px',
        border: '1px solid rgba(66, 133, 244, 0.3)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          background: 'rgba(66, 133, 244, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <Ticket size={28} color="#60A5FA" />
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.4rem' }}>
          Find Your Event Pass
        </h1>

        <p style={{ fontSize: '0.88rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '2rem' }}>
          Enter the email address you used when registering for <strong>{eventData.title}</strong> to retrieve your QR check-in pass.
        </p>

        <form action={`/events/${eventData.slug}/confirmation`} method="GET">
          <div style={{ marginBottom: '1.25rem' }}>
            <input
              type="email"
              name="email"
              required
              placeholder="e.g. omar@example.com"
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: '0.92rem',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          </div>

          <button
            type="submit"
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
            }}
          >
            <Search size={16} />
            <span>Retrieve Ticket Pass</span>
          </button>
        </form>

        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem' }}>
          <Link
            href={`/events/${eventData.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: '#94A3B8',
              fontSize: '0.84rem',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Event Details</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
