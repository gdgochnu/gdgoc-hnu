-- ==============================================================================
-- GDGoC HNU OS — Migration 010: Profile Creation Trigger on First Sign-in
-- Step 2.2 of Phase 2 (Auth & Onboarding)
-- Spec reference: §2.1 item 2
-- ==============================================================================

-- 1. Create handle_new_user function (SECURITY DEFINER to bypass RLS during auth signup)
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
        avatar_url,
        status,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
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
        END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Attach trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Verification function to confirm trigger status
CREATE OR REPLACE FUNCTION public.check_auth_trigger_status()
RETURNS TABLE (
    trigger_exists BOOLEAN,
    trigger_name TEXT,
    event_manipulation TEXT,
    action_timing TEXT
) AS $$
    SELECT 
        TRUE AS trigger_exists,
        t.tgname::text AS trigger_name,
        CASE t.tgtype::int & 66
            WHEN 2 THEN 'BEFORE'
            WHEN 64 THEN 'INSTEAD OF'
            ELSE 'AFTER'
        END AS action_timing,
        'INSERT' AS event_manipulation
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' 
      AND c.relname = 'users' 
      AND t.tgname = 'on_auth_user_created';
$$ LANGUAGE sql SECURITY DEFINER;
