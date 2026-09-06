-- ==============================================================================
-- GDGoC HNU OS — Migration 014: Offboarding & Alumni Archive
-- Phase 7 — Step 7.2
-- Spec reference: §3.2, §3.10, §4.16
-- ==============================================================================

-- 1. Ensure 'alumni' status exists in profile_status enum
DO $$ BEGIN
    ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'alumni';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add offboarding columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS left_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS leave_reason TEXT;

-- 3. Create index for high-performance status filtering (active, alumni, etc.)
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_left_at ON public.profiles(left_at);
