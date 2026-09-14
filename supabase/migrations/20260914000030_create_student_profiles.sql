-- ==============================================================================
-- GDGoC HNU OS — Migration 030: Create Student Profiles & Permanent QR Engine
-- Step S.A.1 of Phase S (Student Portal System)
-- Spec reference: §4.S.1, §4.S.2, §4.S.10, §4.S.11
-- ==============================================================================

-- 1. Create student_profiles table
CREATE TABLE IF NOT EXISTS public.student_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    team_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name_ar TEXT,
    full_name_en TEXT,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    national_id TEXT UNIQUE,
    university TEXT DEFAULT 'Helwan National University',
    faculty TEXT,
    department_major TEXT,
    academic_year SMALLINT CHECK (academic_year IS NULL OR (academic_year >= 1 AND academic_year <= 5)),
    phone TEXT,
    whatsapp_number TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    linkedin_url TEXT,
    qr_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for efficient lookup
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_qr_code ON public.student_profiles(qr_code);
CREATE INDEX IF NOT EXISTS idx_student_profiles_team_profile_id ON public.student_profiles(team_profile_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_status ON public.student_profiles(status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_national_id ON public.student_profiles(national_id);

-- 3. Automatic unique permanent QR generator trigger
CREATE OR REPLACE FUNCTION generate_student_qr_code()
RETURNS TRIGGER AS $$
DECLARE
    new_qr TEXT;
    done BOOLEAN := FALSE;
BEGIN
    IF NEW.qr_code IS NULL OR NEW.qr_code = '' THEN
        WHILE NOT done LOOP
            new_qr := 'STU-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8));
            IF NOT EXISTS (SELECT 1 FROM public.student_profiles WHERE qr_code = new_qr) THEN
                done := TRUE;
            END IF;
        END LOOP;
        NEW.qr_code := new_qr;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_student_profiles_qr_code ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_qr_code
    BEFORE INSERT ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION generate_student_qr_code();

-- 4. Updated at trigger
DROP TRIGGER IF EXISTS trg_student_profiles_updated_at ON public.student_profiles;
CREATE TRIGGER trg_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- 5.1 SELECT Policy:
-- - Student reads own profile
-- - Team member with dual role reads own student profile via team_profile_id
-- - HR and Leadership (President, Co-President) read all student profiles
DROP POLICY IF EXISTS "student_profiles_select_policy" ON public.student_profiles;
CREATE POLICY "student_profiles_select_policy" ON public.student_profiles
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = id
        OR team_profile_id = (SELECT p.id FROM public.profiles p WHERE p.id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR p.department_id IN (
                    SELECT d.id FROM public.departments d
                    WHERE d.code IN ('HR', 'HUMAN_RESOURCES')
                )
            )
        )
    );

-- 5.2 INSERT Policy:
-- - Authenticated user can create their own student profile row
DROP POLICY IF EXISTS "student_profiles_insert_policy" ON public.student_profiles;
CREATE POLICY "student_profiles_insert_policy" ON public.student_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = id
    );

-- 5.3 UPDATE Policy:
-- - Student can update their own row
-- - HR and Leadership can update student profiles
DROP POLICY IF EXISTS "student_profiles_update_policy" ON public.student_profiles;
CREATE POLICY "student_profiles_update_policy" ON public.student_profiles
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR p.department_id IN (
                    SELECT d.id FROM public.departments d
                    WHERE d.code IN ('HR', 'HUMAN_RESOURCES')
                )
            )
        )
    )
    WITH CHECK (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR p.department_id IN (
                    SELECT d.id FROM public.departments d
                    WHERE d.code IN ('HR', 'HUMAN_RESOURCES')
                )
            )
        )
    );
