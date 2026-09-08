-- ==============================================================================
-- GDGoC HNU OS — Migration 019: Event Budget Tracking Table & RLS Policies
-- Phase 9 — Step 9.4
-- Spec reference: §3.12, §3.17, §4.20
-- ==============================================================================

-- 1. Create event_budget_items table
CREATE TABLE IF NOT EXISTS public.event_budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('venue', 'catering', 'printing', 'transport', 'other')),
    description TEXT NOT NULL,
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(12, 2) DEFAULT NULL CHECK (actual_cost IS NULL OR actual_cost >= 0),
    paid_by TEXT DEFAULT NULL,
    receipt_drive_file_id TEXT DEFAULT NULL,
    receipt_url TEXT DEFAULT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_event_budget_items_event_id ON public.event_budget_items(event_id);
CREATE INDEX IF NOT EXISTS idx_event_budget_items_category ON public.event_budget_items(category);
CREATE INDEX IF NOT EXISTS idx_event_budget_items_created_at ON public.event_budget_items(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.event_budget_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Readable strictly by: President & Co-President, Event Owners, and Operations Committee members (Spec §3.17 & §4.20)
DROP POLICY IF EXISTS "event_budget_select_policy" ON public.event_budget_items;
CREATE POLICY "event_budget_select_policy" ON public.event_budget_items
    FOR SELECT TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                -- Event owner check
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                -- Or Operations committee member check
                OR public.can_access_dept_data(e.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() AND (d.code = 'OPS' OR d.code = 'OPERATIONS')
                )
            )
        )
    );

-- Editable (INSERT/UPDATE/DELETE) by President/Co-President, Event Owners, and Operations leads
DROP POLICY IF EXISTS "event_budget_insert_policy" ON public.event_budget_items;
CREATE POLICY "event_budget_insert_policy" ON public.event_budget_items
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
                    WHERE p.id = auth.uid() AND (d.code = 'OPS' OR d.code = 'OPERATIONS')
                )
            )
        )
    );

DROP POLICY IF EXISTS "event_budget_update_policy" ON public.event_budget_items;
CREATE POLICY "event_budget_update_policy" ON public.event_budget_items
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                OR public.can_access_dept_data(e.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() AND (d.code = 'OPS' OR d.code = 'OPERATIONS')
                )
            )
        )
    );

DROP POLICY IF EXISTS "event_budget_delete_policy" ON public.event_budget_items;
CREATE POLICY "event_budget_delete_policy" ON public.event_budget_items
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id AND (
                e.owners @> jsonb_build_array(jsonb_build_object('profile_id', auth.uid()::text))
                OR public.can_access_dept_data(e.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    JOIN public.departments d ON p.department_id = d.id
                    WHERE p.id = auth.uid() AND (d.code = 'OPS' OR d.code = 'OPERATIONS')
                )
            )
        )
    );

-- 5. Documentation
COMMENT ON TABLE public.event_budget_items IS 'Line items for event budget tracking (estimated vs actual expenses, receipts).';
COMMENT ON COLUMN public.event_budget_items.category IS 'Expense category: venue, catering, printing, transport, or other.';
COMMENT ON COLUMN public.event_budget_items.estimated_cost IS 'Initial estimated cost in local currency (EGP).';
COMMENT ON COLUMN public.event_budget_items.actual_cost IS 'Final actual expense amount once realized and paid.';
