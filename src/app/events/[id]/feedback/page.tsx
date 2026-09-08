import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { EventFeedbackForm } from '@/components/events/EventFeedbackForm';
import { getExistingEventFeedback } from '@/app/events/actions';
import { Event, EventFeedback } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EventFeedbackPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: EventFeedbackPageProps): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const query = admin.from('events').select('title');
  const { data: event } = isUuid
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('slug', id).maybeSingle();

  return {
    title: event ? `Feedback — ${event.title} | GDGoC HNU` : 'Event Feedback | GDGoC HNU',
    description: 'Share your feedback and rate your experience at GDGoC Helwan National University.',
  };
}

export default async function EventFeedbackPage({ params, searchParams }: EventFeedbackPageProps) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const registrationId = (sParams.ticket || sParams.registration || sParams.reg) as string | undefined;

  const admin = createAdminClient();
  const context = await getUserContext();

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // 1. Fetch Event Details
  const query = admin
    .from('events')
    .select('*, department:departments(id, name, code, branch)');

  const { data: event, error: eventErr } = isUuid
    ? await query.eq('id', id).maybeSingle()
    : await query.eq('slug', id).maybeSingle();

  if (eventErr || !event) {
    notFound();
  }

  // 2. Check if this attendee or profile has already submitted feedback
  const { feedback: existingFeedback } = await getExistingEventFeedback(
    event.id,
    registrationId
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background Ambient Lighting */}
      <div className="ambient-glow" />

      {/* Header Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(11, 15, 25, 0.85)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            href={`/events/${event.slug || event.id}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color 0.2s ease',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Event Details</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--google-blue)',
                boxShadow: '0 0 10px var(--google-blue)',
              }}
            />
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '0.04em',
              }}
            >
              GDGoC HNU OS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          padding: '2.5rem 1.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <EventFeedbackForm
          event={event as Event}
          existingFeedback={existingFeedback as EventFeedback | null}
          registrationId={registrationId}
          userName={context.profile?.full_name || null}
          userEmail={context.profile?.email || null}
        />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>
          Google Developer Groups on Campus — Helwan National University
        </p>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.72rem', color: '#475569' }}>
          One platform. One source of truth. For people, events, tasks, attendance, growth.
        </p>
      </footer>
    </div>
  );
}
