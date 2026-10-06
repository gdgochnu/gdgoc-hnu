-- ==============================================================================
-- GDGoC HNU OS — Migration 040: Course Groups & Cohort Section Management
-- Adds course_groups table and group tracking fields to course_enrollments
-- ==============================================================================

-- 1. Create course_groups table
CREATE TABLE IF NOT EXISTS public.course_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_number INT NOT NULL DEFAULT 1,
    max_capacity INT NOT NULL DEFAULT 50,
    invitation_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add group assignment & join tracking columns to course_enrollments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'course_enrollments' 
          AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.course_enrollments 
        ADD COLUMN group_id UUID REFERENCES public.course_groups(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'course_enrollments' 
          AND column_name = 'joined_group_at'
    ) THEN
        ALTER TABLE public.course_enrollments 
        ADD COLUMN joined_group_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'course_enrollments' 
          AND column_name = 'group_assigned_at'
    ) THEN
        ALTER TABLE public.course_enrollments 
        ADD COLUMN group_assigned_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_course_groups_course ON public.course_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_group ON public.course_enrollments(group_id);

-- 4. Enable RLS on course_groups
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for course_groups
DROP POLICY IF EXISTS "Enrolled students can view their course groups" ON public.course_groups;
CREATE POLICY "Enrolled students can view their course groups"
    ON public.course_groups FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments ce
            WHERE ce.course_id = course_groups.course_id
              AND ce.student_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff can view and manage course groups" ON public.course_groups;
CREATE POLICY "Staff can view and manage course groups"
    ON public.course_groups FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.status = 'active'
              AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head', 'core_team_member', 'general_member')
        )
    );
