import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { EventFeedbackForm } from '@/components/events/EventFeedbackForm';
import { getExistingEventFeedback } from '@/app/events/actions';
import { Event, EventFeedback } from '@/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Sparkles, Building2 } from 'lucide-react';

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
  const { hasSubmitted, feedback: existingFeedback } = await getExistingEventFeedback(
    event.id,
    registrationId
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F8FAFC] selection:bg-blue-500/30 selection:text-white">
      {/* Background Decorative Ambient Lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header Bar */}
      <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={`/events/${event.slug || event.id}`}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to</span> Event Details
          </Link>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 tracking-wide">
              GDGoC HNU OS
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <EventFeedbackForm
          event={event as Event}
          existingFeedback={existingFeedback as EventFeedback | null}
          registrationId={registrationId}
          userName={context.profile?.full_name || null}
          userEmail={context.profile?.email || null}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        <p>Google Developer Groups on Campus — Helwan National University</p>
        <p className="mt-1 text-[11px] text-slate-600">
          One platform. One source of truth. For people, events, tasks, attendance, growth.
        </p>
      </footer>
    </div>
  );
}
