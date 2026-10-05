-- ==============================================================================
-- GDGoC HNU OS — Migration 038: Student Social Media Follow Verification System
-- Spec: Single Consolidated Record Per Student with Anti-Cheat & Analytics
-- ==============================================================================

-- 1. Create or Recreate student_social_follows table (Single Record Per Student)
DROP TABLE IF EXISTS public.student_social_follows CASCADE;

CREATE TABLE public.student_social_follows (
    student_id UUID PRIMARY KEY REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    youtube BOOLEAN NOT NULL DEFAULT FALSE,
    facebook BOOLEAN NOT NULL DEFAULT FALSE,
    instagram BOOLEAN NOT NULL DEFAULT FALSE,
    tiktok BOOLEAN NOT NULL DEFAULT FALSE,
    linkedin BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    completed_all BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_student_social_follows_completed_all ON public.student_social_follows(completed_all);

-- 3. Row Level Security (RLS)
ALTER TABLE public.student_social_follows ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT Policy:
-- Students can read their own follow record
-- Leadership / HR can read all follow records for platform analytics
DROP POLICY IF EXISTS "student_social_follows_select_policy" ON public.student_social_follows;
CREATE POLICY "student_social_follows_select_policy" ON public.student_social_follows
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role::text IN ('president', 'co_president', 'lead', 'head')
                OR p.department_id IN (
                    SELECT d.id FROM public.departments d
                    WHERE d.code IN ('HR', 'HUMAN_RESOURCES')
                )
            )
        )
    );

-- 3.2 INSERT Policy:
-- Authenticated student can insert their own record
DROP POLICY IF EXISTS "student_social_follows_insert_policy" ON public.student_social_follows;
CREATE POLICY "student_social_follows_insert_policy" ON public.student_social_follows
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = student_id);

-- 3.3 UPDATE Policy:
-- Authenticated student can update their own follow record
DROP POLICY IF EXISTS "student_social_follows_update_policy" ON public.student_social_follows;
CREATE POLICY "student_social_follows_update_policy" ON public.student_social_follows
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
