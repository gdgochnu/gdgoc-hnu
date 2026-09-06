-- ==============================================================================
-- GDGoC HNU OS — Migration 003: Events, Event Registrations & Attendance
-- Step 1.3 of Phase 1 (Database Schema)
-- Spec reference: §3.3, §4.3, §4.4, §4.5
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE event_status AS ENUM (
        'draft',
        'submitted_for_review',
        'branch_review',
        'pending_final_approval',
        'approved',
        'published',
        'closed',
        'completed',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM (
        'registered',
        'waitlisted',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_method AS ENUM (
        'qr',
        'manual'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    description TEXT,
    venue TEXT,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    capacity INTEGER,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    status event_status NOT NULL DEFAULT 'draft',
    registration_fields JSONB DEFAULT '[]'::jsonb,
    owners JSONB DEFAULT '[]'::jsonb,
    approval_instance_id UUID, -- FK to approval_instances added in Step 1.6
    qr_secret TEXT DEFAULT gen_random_uuid()::text,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create event_registrations table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    custom_answers JSONB DEFAULT '{}'::jsonb,
    qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    status registration_status NOT NULL DEFAULT 'registered',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_event_registration_email UNIQUE (event_id, email)
);

-- 4. Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    registration_id UUID REFERENCES public.event_registrations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    check_in_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    method attendance_method NOT NULL DEFAULT 'qr',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_event_registration_attendance UNIQUE (event_id, registration_id)
);

-- 5. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_event_registrations_updated_at ON public.event_registrations;
CREATE TRIGGER tr_event_registrations_updated_at
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 6. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_events_department_id ON public.events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_qr_code ON public.event_registrations(qr_code);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_profile_id ON public.attendance(profile_id);
