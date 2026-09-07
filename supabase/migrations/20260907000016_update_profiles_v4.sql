-- ==============================================================================
-- GDGoC HNU OS — Migration 016: Update Profiles Table to v4 Schema
-- Phase P — Step P.2
-- Spec reference: §2.2 (v4), §3.2 (v4)
-- ==============================================================================

-- 1. Add new columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
ADD COLUMN IF NOT EXISTS full_name_en TEXT,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS department_major TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- 2. Ensure national_id has unique constraint (allowing nulls for incomplete profiles)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_profiles_national_id' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT uq_profiles_national_id UNIQUE (national_id);
    END IF;
END $$;

-- 3. Safely convert academic_year to SMALLINT (1 to 5) if it was TEXT
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'academic_year' 
          AND data_type = 'text'
    ) THEN
        ALTER TABLE public.profiles 
        ALTER COLUMN academic_year TYPE SMALLINT USING (
            CASE 
                WHEN academic_year ~ '^[1-5]$' THEN academic_year::SMALLINT
                WHEN academic_year ILIKE '1%' THEN 1::SMALLINT
                WHEN academic_year ILIKE '2%' THEN 2::SMALLINT
                WHEN academic_year ILIKE '3%' THEN 3::SMALLINT
                WHEN academic_year ILIKE '4%' THEN 4::SMALLINT
                WHEN academic_year ILIKE '5%' THEN 5::SMALLINT
                ELSE NULL
            END
        );
    END IF;
END $$;

-- Add check constraint for academic_year between 1 and 5
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_profiles_academic_year' AND conrelid = 'public.profiles'::regclass
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT chk_profiles_academic_year 
        CHECK (academic_year IS NULL OR (academic_year >= 1 AND academic_year <= 5));
    END IF;
END $$;

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_national_id ON public.profiles(national_id);
CREATE INDEX IF NOT EXISTS idx_profiles_academic_year ON public.profiles(academic_year);

-- 5. Data Preservation & Migration:
-- 5a. Populate full_name_ar and full_name_en from existing full_name
UPDATE public.profiles
SET 
    full_name_en = COALESCE(full_name_en, NULLIF(full_name, '')),
    full_name_ar = COALESCE(full_name_ar, NULLIF(full_name, ''))
WHERE full_name IS NOT NULL AND full_name <> '';

-- 5b. Default whatsapp_number from existing phone if not set
UPDATE public.profiles
SET whatsapp_number = phone
WHERE whatsapp_number IS NULL AND phone IS NOT NULL AND phone <> '';

-- 5c. Move legacy skills and portfolio_url into custom_fields JSONB
UPDATE public.profiles
SET custom_fields = COALESCE(custom_fields, '{}'::jsonb) || jsonb_build_object(
    'legacy_skills', skills,
    'legacy_portfolio_url', portfolio_url
)
WHERE (skills IS NOT NULL AND array_length(skills, 1) > 0)
   OR (portfolio_url IS NOT NULL AND portfolio_url <> '');

-- 6. Trigger to keep full_name synchronized for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_profile_full_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize full_name with full_name_en (or full_name_ar as fallback)
    IF NEW.full_name_en IS NOT NULL AND NEW.full_name_en <> '' THEN
        NEW.full_name := NEW.full_name_en;
    ELSIF NEW.full_name_ar IS NOT NULL AND NEW.full_name_ar <> '' THEN
        NEW.full_name := NEW.full_name_ar;
    ELSIF NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
        IF NEW.full_name_en IS NULL OR NEW.full_name_en = '' THEN
            NEW.full_name_en := NEW.full_name;
        END IF;
        IF NEW.full_name_ar IS NULL OR NEW.full_name_ar = '' THEN
            NEW.full_name_ar := NEW.full_name;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_profile_full_name ON public.profiles;
CREATE TRIGGER tr_sync_profile_full_name
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_full_name();

-- 7. Update handle_new_user() trigger for OAuth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    extracted_name TEXT;
    extracted_avatar TEXT;
BEGIN
    -- Extract full name from Google OAuth metadata
    extracted_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract avatar URL from Google OAuth metadata
    extracted_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- Insert new profile with status = 'incomplete' and role = 'member'
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        full_name_en,
        avatar_url,
        status,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        extracted_name,
        extracted_name,
        extracted_avatar,
        'incomplete'::profile_status,
        'member'::user_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        full_name_en = CASE 
            WHEN public.profiles.full_name_en IS NULL OR public.profiles.full_name_en = '' 
            THEN EXCLUDED.full_name_en 
            ELSE public.profiles.full_name_en 
        END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
