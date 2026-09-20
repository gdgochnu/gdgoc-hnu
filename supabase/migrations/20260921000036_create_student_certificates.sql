-- Migration: 20260921000036_create_student_certificates.sql
-- Description: Creates student_certificates table and RLS policies (Spec §4.S.10, §4.S.11)

CREATE TABLE IF NOT EXISTS public.student_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    certificate_number TEXT UNIQUE NOT NULL,
    verification_code UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    pdf_drive_file_id TEXT,
    pdf_drive_url TEXT,
    completion_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT chk_student_certificates_parent CHECK (course_id IS NOT NULL OR workshop_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_certificates_student_id ON public.student_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_student_certificates_course_id ON public.student_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_student_certificates_workshop_id ON public.student_certificates(workshop_id);
CREATE INDEX IF NOT EXISTS idx_student_certificates_cert_num ON public.student_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_student_certificates_verify_code ON public.student_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_student_certificates_issued_by ON public.student_certificates(issued_by);

-- Enable RLS
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

-- 1. Read policy for students (read own certificates)
DROP POLICY IF EXISTS "Students can view their own certificates" ON public.student_certificates;
CREATE POLICY "Students can view their own certificates"
    ON public.student_certificates FOR SELECT
    USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.student_certificates.student_id
            AND (sp.id = auth.uid() OR sp.team_profile_id = auth.uid())
        )
    );

-- 2. Read policy for staff (President, Co-President, Branch Heads, Committee Heads, Instructors, Mentors)
DROP POLICY IF EXISTS "Staff can view student certificates" ON public.student_certificates;
CREATE POLICY "Staff can view student certificates"
    ON public.student_certificates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
        ) OR
        EXISTS (
            SELECT 1 FROM public.course_instructors ci
            WHERE ci.course_id = public.student_certificates.course_id
            AND ci.profile_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.workshop_instructors wi
            WHERE wi.workshop_id = public.student_certificates.workshop_id
            AND wi.profile_id = auth.uid()
        )
    );

-- 3. Manage policy: President & Co-President can issue & update student certificates
DROP POLICY IF EXISTS "President can manage student certificates" ON public.student_certificates;
CREATE POLICY "President can manage student certificates"
    ON public.student_certificates FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president')
        )
    );

-- Grant permissions to authenticated & anon
GRANT SELECT ON public.student_certificates TO authenticated;
GRANT SELECT ON public.student_certificates TO anon;
