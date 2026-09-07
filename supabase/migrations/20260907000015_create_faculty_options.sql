-- ==============================================================================
-- GDGoC HNU OS — Migration 015: Create Faculty Options Table & RLS
-- Phase P — Step P.1
-- Spec reference: §2.2, §3.3 (faculty_options), §3.17
-- ==============================================================================

-- 1. Create faculty_options table
CREATE TABLE IF NOT EXISTS public.faculty_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_faculty_options_name_ar UNIQUE (name_ar),
    CONSTRAINT uq_faculty_options_name_en UNIQUE (name_en)
);

-- 2. Attach updated_at trigger
DROP TRIGGER IF EXISTS tr_faculty_options_updated_at ON public.faculty_options;
CREATE TRIGGER tr_faculty_options_updated_at
    BEFORE UPDATE ON public.faculty_options
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 3. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_faculty_options_sort_order ON public.faculty_options(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_faculty_options_is_active ON public.faculty_options(is_active);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.faculty_options ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Readable by all authenticated users (and anon for public join / recruitment forms)
DROP POLICY IF EXISTS "Public and authenticated users can view faculty options" ON public.faculty_options;
CREATE POLICY "Public and authenticated users can view faculty options"
    ON public.faculty_options
    FOR SELECT
    TO public
    USING (true);

-- INSERT restricted strictly to Chapter President
DROP POLICY IF EXISTS "President can insert faculty options" ON public.faculty_options;
CREATE POLICY "President can insert faculty options"
    ON public.faculty_options
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'president'
        )
    );

-- UPDATE restricted strictly to Chapter President
DROP POLICY IF EXISTS "President can update faculty options" ON public.faculty_options;
CREATE POLICY "President can update faculty options"
    ON public.faculty_options
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'president'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'president'
        )
    );

-- DELETE restricted strictly to Chapter President
DROP POLICY IF EXISTS "President can delete faculty options" ON public.faculty_options;
CREATE POLICY "President can delete faculty options"
    ON public.faculty_options
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'president'
        )
    );

-- 6. Seed official Helwan University faculties
INSERT INTO public.faculty_options (name_ar, name_en, sort_order, is_active)
VALUES
    ('كلية الهندسة بحلوان', 'Faculty of Engineering (Helwan)', 1, true),
    ('كلية الحاسبات والذكاء الاصطناعي', 'Faculty of Computers and Artificial Intelligence', 2, true),
    ('كلية العلوم', 'Faculty of Science', 3, true),
    ('كلية التجارة وإدارة الأعمال', 'Faculty of Commerce and Business Administration', 4, true),
    ('كلية الفنون التطبيقية', 'Faculty of Applied Arts', 5, true),
    ('كلية التكنولوجيا والتعليم', 'Faculty of Technology and Education', 6, true),
    ('كلية الهندسة بالمطرية', 'Faculty of Engineering (Mataria)', 7, true)
ON CONFLICT (name_ar) DO UPDATE SET
    name_en = EXCLUDED.name_en,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();
