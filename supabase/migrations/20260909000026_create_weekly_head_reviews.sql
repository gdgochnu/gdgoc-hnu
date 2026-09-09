-- ==============================================================================
-- GDGoC HNU OS — Migration 026: Weekly Head Reviews (5 Questions)
-- Phase 16 — Step 16.4
-- Spec reference: §4.10 & §5.1 (President Command Center)
-- ==============================================================================

-- 1. Create weekly_head_reviews table
CREATE TABLE IF NOT EXISTS public.weekly_head_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    head_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    q1_achievements TEXT NOT NULL,
    q2_blockers TEXT NOT NULL,
    q3_next_week_plan TEXT NOT NULL,
    q4_support_needed TEXT,
    q5_morale_rating INTEGER NOT NULL CHECK (q5_morale_rating BETWEEN 1 AND 5),
    president_feedback TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_dept_week_review UNIQUE (department_id, week_start_date)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_dept ON public.weekly_head_reviews(department_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON public.weekly_head_reviews(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_head ON public.weekly_head_reviews(head_id);

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS tr_weekly_head_reviews_updated_at ON public.weekly_head_reviews;
CREATE TRIGGER tr_weekly_head_reviews_updated_at
    BEFORE UPDATE ON public.weekly_head_reviews
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.weekly_head_reviews ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "weekly_reviews_select_policy" ON public.weekly_head_reviews;
CREATE POLICY "weekly_reviews_select_policy" ON public.weekly_head_reviews
    FOR SELECT TO authenticated
    USING (
        -- President or Co-President can view all
        public.is_president_or_co()
        -- Committee Head or Co-Head can view their department's reviews
        OR head_id = auth.uid()
        OR public.can_access_dept_data(department_id)
    );

DROP POLICY IF EXISTS "weekly_reviews_insert_policy" ON public.weekly_head_reviews;
CREATE POLICY "weekly_reviews_insert_policy" ON public.weekly_head_reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Committee Heads and Co-Heads can insert for their committee
        head_id = auth.uid()
        OR public.can_access_dept_data(department_id)
        OR public.is_president_or_co()
    );

DROP POLICY IF EXISTS "weekly_reviews_update_policy" ON public.weekly_head_reviews;
CREATE POLICY "weekly_reviews_update_policy" ON public.weekly_head_reviews
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR head_id = auth.uid()
        OR public.can_access_dept_data(department_id)
    )
    WITH CHECK (
        public.is_president_or_co()
        OR head_id = auth.uid()
        OR public.can_access_dept_data(department_id)
    );
