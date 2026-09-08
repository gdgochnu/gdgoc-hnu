-- ==============================================================================
-- GDGoC HNU OS — Migration 024: Google Calendar Integration
-- Phase 14 — Step 14.1: Shared "GDGoC HNU" Calendar & Event Sync
-- Spec reference: §4.17
-- ==============================================================================

-- 1. Add Google Calendar tracking columns to public.events
ALTER TABLE public.events 
    ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
    ADD COLUMN IF NOT EXISTS google_calendar_link TEXT;

-- 2. Add Calendar configuration entries to system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('google_calendar_id', '', 'Google Calendar ID for shared GDGoC HNU Calendar'),
    ('google_calendar_subscribable_link', '', 'Public subscribable web/iCal link for GDGoC HNU Calendar')
ON CONFLICT (key) DO NOTHING;

-- 3. Create index for fast event lookup by calendar event ID
CREATE INDEX IF NOT EXISTS idx_events_google_calendar_id ON public.events(google_calendar_event_id);
