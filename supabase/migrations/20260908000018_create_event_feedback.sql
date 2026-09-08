-- ==============================================================================
-- GDGoC HNU OS — Migration 018: Event Feedback Table & Survey Trigger Schema
-- Phase 9 — Step 9.1
-- Spec reference: §3.11, §3.17, §4.18
-- ==============================================================================

-- 1. Create event_feedback table
CREATE TABLE IF NOT EXISTS public.event_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_event_feedback_event_id ON public.event_feedback(event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_profile_id ON public.event_feedback(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_feedback_rating ON public.event_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_event_feedback_created_at ON public.event_feedback(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Submitter can always view their own feedback; Leadership and Event Department can view all feedback for the event
DROP POLICY IF EXISTS "event_feedback_select_policy" ON public.event_feedback;
CREATE POLICY "event_feedback_select_policy" ON public.event_feedback
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND public.can_access_dept_data(e.department_id)
        )
    );

-- Any authenticated member or attendee can submit feedback
DROP POLICY IF EXISTS "event_feedback_insert_policy" ON public.event_feedback;
CREATE POLICY "event_feedback_insert_policy" ON public.event_feedback
    FOR INSERT TO authenticated, anon
    WITH CHECK (
        -- If authenticated, either profile_id matches auth.uid() or is null (if anonymous)
        (auth.role() = 'authenticated' AND (profile_id = auth.uid() OR profile_id IS NULL))
        OR
        -- Or anon user submitting with a valid registration_id
        (auth.role() = 'anon' AND registration_id IS NOT NULL)
    );

-- Submitting profile or President/Co-President can update/delete their own feedback
DROP POLICY IF EXISTS "event_feedback_update_policy" ON public.event_feedback;
CREATE POLICY "event_feedback_update_policy" ON public.event_feedback
    FOR UPDATE TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
    );

DROP POLICY IF EXISTS "event_feedback_delete_policy" ON public.event_feedback;
CREATE POLICY "event_feedback_delete_policy" ON public.event_feedback
    FOR DELETE TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
    );

-- 5. Documentation comments
COMMENT ON TABLE public.event_feedback IS 'Attendee satisfaction ratings and feedback comments for completed events.';
COMMENT ON COLUMN public.event_feedback.rating IS 'Attendee satisfaction rating scale 1 to 5.';
COMMENT ON COLUMN public.event_feedback.is_anonymous IS 'Whether respondent opted to submit anonymously without exposing their identity.';
