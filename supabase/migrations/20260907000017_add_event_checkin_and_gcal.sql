-- ==============================================================================
-- GDGoC HNU OS — Migration 017: Event Check-in Access & Google Calendar ID
-- Phase 8 — Step 8.3
-- Spec reference: §3.3, §3.17, §4.3 item 5
-- ==============================================================================

-- 1. Add checkin_access_profile_ids and gcal_event_id to public.events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS checkin_access_profile_ids UUID[] DEFAULT '{}'::uuid[],
ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

-- 2. Create GIN index for high-performance array containment search
CREATE INDEX IF NOT EXISTS idx_events_checkin_access_profile_ids ON public.events USING GIN (checkin_access_profile_ids);

-- 3. Comment on column
COMMENT ON COLUMN public.events.checkin_access_profile_ids IS 'Profiles explicitly granted check-in QR scanner and attendance management access for this event.';
COMMENT ON COLUMN public.events.gcal_event_id IS 'Associated Google Calendar event ID for chapter sync.';
