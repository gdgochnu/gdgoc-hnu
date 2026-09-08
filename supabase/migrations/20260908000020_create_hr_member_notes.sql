-- ==============================================================================
-- GDGoC HNU OS — Migration 020: HR Member Notes & Low Engagement Follow-up Log
-- Phase 10 — Step 10.3
-- Spec reference: §4.5, §4.11, §3.17
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hr_member_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note_type TEXT NOT NULL DEFAULT 'low_engagement' CHECK (note_type IN ('low_engagement', 'attendance_follow_up', 'performance', 'general')),
    note TEXT NOT NULL,
    action_taken TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    missed_events_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hr_member_notes_profile_id ON public.hr_member_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_hr_member_notes_status ON public.hr_member_notes(status);
CREATE INDEX IF NOT EXISTS idx_hr_member_notes_created_at ON public.hr_member_notes(created_at DESC);

ALTER TABLE public.hr_member_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Readable by HR members, Non-Tech Branch Head, President/Co-President
DROP POLICY IF EXISTS "hr_notes_select_policy" ON public.hr_member_notes;
CREATE POLICY "hr_notes_select_policy" ON public.hr_member_notes
    FOR SELECT TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                d.code IN ('HR', 'HUMAN_RESOURCES')
                OR (p.role = 'branch_head' AND d.branch = 'non_tech')
            )
        )
    );

-- RLS: Insert by HR members, Non-Tech Branch Head, President/Co-President
DROP POLICY IF EXISTS "hr_notes_insert_policy" ON public.hr_member_notes;
CREATE POLICY "hr_notes_insert_policy" ON public.hr_member_notes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                d.code IN ('HR', 'HUMAN_RESOURCES')
                OR (p.role = 'branch_head' AND d.branch = 'non_tech')
            )
        )
    );

-- RLS: Update by HR members, Non-Tech Branch Head, President/Co-President
DROP POLICY IF EXISTS "hr_notes_update_policy" ON public.hr_member_notes;
CREATE POLICY "hr_notes_update_policy" ON public.hr_member_notes
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                d.code IN ('HR', 'HUMAN_RESOURCES')
                OR (p.role = 'branch_head' AND d.branch = 'non_tech')
            )
        )
    );

-- RLS: Delete restricted to President/Co-President
DROP POLICY IF EXISTS "hr_notes_delete_policy" ON public.hr_member_notes;
CREATE POLICY "hr_notes_delete_policy" ON public.hr_member_notes
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
    );
