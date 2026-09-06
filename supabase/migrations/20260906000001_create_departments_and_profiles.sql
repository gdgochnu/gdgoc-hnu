-- ==============================================================================
-- GDGoC HNU OS — Migration 001: Departments & Profiles
-- Step 1.1 of Phase 1 (Database Schema)
-- Spec reference: §1.4, §1.5, §3.1, §3.2
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'president',
        'co_president',
        'branch_head',
        'committee_head',
        'committee_co_head',
        'member'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE department_branch AS ENUM (
        'tech',
        'non_tech'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE profile_status AS ENUM (
        'incomplete',
        'pending_review',
        'changes_requested',
        'active',
        'rejected',
        'suspended',
        'alumni'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create departments table (initial creation without head FKs to avoid circular dependency)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    branch department_branch NOT NULL,
    description TEXT,
    drive_folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    university_id TEXT,
    faculty TEXT,
    academic_year TEXT,
    role user_role NOT NULL DEFAULT 'member',
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    position TEXT,
    skills TEXT[] DEFAULT '{}',
    portfolio_url TEXT,
    motivation TEXT,
    how_heard TEXT,
    availability_hours INTEGER,
    status profile_status NOT NULL DEFAULT 'incomplete',
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    join_date TIMESTAMPTZ DEFAULT NOW(),
    overall_score NUMERIC DEFAULT 0,
    attendance_rate NUMERIC DEFAULT 0,
    leaderboard_opt_in BOOLEAN DEFAULT TRUE,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Add Head & Co-Head Foreign Keys to departments
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS co_head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_departments_updated_at ON public.departments;
CREATE TRIGGER tr_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 7. Add helpful indexes for high-frequency queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON public.departments(branch);
