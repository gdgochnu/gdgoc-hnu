-- ==============================================================================
-- GDGoC HNU OS — Migration 025: Event Media Coverage Checklists Table & RLS
-- Phase 15 — Step 15.3
-- Spec reference: §4.8, §8.3 (/Events/{event}/Media-Coverage/)
-- ==============================================================================

-- 1. Create event_coverage_items table
CREATE TABLE IF NOT EXISTS public.event_coverage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'photo' CHECK (category IN ('photo', 'video', 'speaker_asset', 'recap', 'other')),
    phase TEXT NOT NULL DEFAULT 'during' CHECK (phase IN ('before', 'during', 'after')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NULL,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    drive_file_id TEXT DEFAULT NULL,
    drive_file_url TEXT DEFAULT NULL,
    thumbnail_url TEXT DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_event_coverage_items_event_id ON public.event_coverage_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_coverage_items_phase ON public.event_coverage_items(phase);
CREATE INDEX IF NOT EXISTS idx_event_coverage_items_category ON public.event_coverage_items(category);
CREATE INDEX IF NOT EXISTS idx_event_coverage_items_completed ON public.event_coverage_items(event_id, is_completed);

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS tr_event_coverage_items_updated_at ON public.event_coverage_items;
CREATE TRIGGER tr_event_coverage_items_updated_at
    BEFORE UPDATE ON public.event_coverage_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.event_coverage_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Readable by all authenticated chapter members
DROP POLICY IF EXISTS "event_coverage_select_policy" ON public.event_coverage_items;
CREATE POLICY "event_coverage_select_policy" ON public.event_coverage_items
    FOR SELECT TO authenticated
    USING (true);

-- Manageable by Leadership, Event Owners, and Media/PR team members
DROP POLICY IF EXISTS "event_coverage_insert_policy" ON public.event_coverage_items;
CREATE POLICY "event_coverage_insert_policy" ON public.event_coverage_items
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                OR public.can_access_dept_data(e.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() AND (d.code = 'MEDIA' OR d.code = 'PR' OR d.code = 'MARKETING')
                )
            )
        )
    );

DROP POLICY IF EXISTS "event_coverage_update_policy" ON public.event_coverage_items;
CREATE POLICY "event_coverage_update_policy" ON public.event_coverage_items
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                OR public.can_access_dept_data(e.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() AND (d.code = 'MEDIA' OR d.code = 'PR')
                )
            )
        )
    );

DROP POLICY IF EXISTS "event_coverage_delete_policy" ON public.event_coverage_items;
CREATE POLICY "event_coverage_delete_policy" ON public.event_coverage_items
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                OR public.can_access_dept_data(e.department_id)
            )
        )
    );
