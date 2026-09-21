-- ==============================================================================
-- GDGoC HNU OS — Migration 038: Student In-App Notifications Engine
-- Spec reference: §4.S.1, §4.S.10
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'general', -- course, workshop, certificate, task, quiz, system, announcement
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    related_entity_type TEXT, -- course, workshop, session, certificate, task, quiz
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for rapid query performance & badge lookups
CREATE INDEX IF NOT EXISTS idx_student_notifications_student ON public.student_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notifications_unread ON public.student_notifications(student_id, is_read);
CREATE INDEX IF NOT EXISTS idx_student_notifications_created ON public.student_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;

-- Students can read, mark as read, or delete their own notifications
CREATE POLICY "student_notifications_select_own"
    ON public.student_notifications
    FOR SELECT
    USING (auth.uid() = student_id);

CREATE POLICY "student_notifications_update_own"
    ON public.student_notifications
    FOR UPDATE
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);

CREATE POLICY "student_notifications_delete_own"
    ON public.student_notifications
    FOR DELETE
    USING (auth.uid() = student_id);

-- Chapter staff can insert/manage notifications
CREATE POLICY "student_notifications_staff_insert"
    ON public.student_notifications
    FOR INSERT
    WITH CHECK (true);
