-- ==============================================================================
-- Migration: 20260921000037_fix_student_certificates_cascade.sql
-- Fix foreign key constraints on student_certificates to ON DELETE CASCADE
-- This prevents violation of chk_student_certificates_parent when a course or workshop is deleted.
-- ==============================================================================

ALTER TABLE public.student_certificates
    DROP CONSTRAINT IF EXISTS student_certificates_course_id_fkey,
    ADD CONSTRAINT student_certificates_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.student_certificates
    DROP CONSTRAINT IF EXISTS student_certificates_workshop_id_fkey,
    ADD CONSTRAINT student_certificates_workshop_id_fkey
        FOREIGN KEY (workshop_id) REFERENCES public.workshops(id) ON DELETE CASCADE;
