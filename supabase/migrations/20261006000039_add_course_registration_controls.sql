-- ==============================================================================
-- GDGoC HNU OS — Migration 039: Course Registration Controls & Deadlines
-- Adds registration_open and registration_deadline to public.courses
-- ==============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'courses' 
          AND column_name = 'registration_open'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN registration_open BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'courses' 
          AND column_name = 'registration_deadline'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN registration_deadline TIMESTAMPTZ;
    END IF;
END $$;
