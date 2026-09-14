-- ==============================================================================
-- GDGoC HNU OS — Migration 033: Workshops System
-- Step S.C.1 of Phase S (Student Portal)
-- Tables: workshops, workshop_instructors, workshop_sessions, workshop_registrations
-- Spec reference: §4.S.3, §4.S.4, §4.S.10, §4.S.11
-- ==============================================================================

-- 1. Create workshops table
CREATE TABLE IF NOT EXISTS public.workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    category TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    capacity INT,
    registration_deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'completed')),
    registration_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create workshop_instructors table (maps instructors/mentors to workshops)
CREATE TABLE IF NOT EXISTS public.workshop_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('instructor', 'mentor')),
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_workshop_instructor UNIQUE (workshop_id, profile_id)
);

-- 3. Create workshop_sessions table (multi-session workshop support)
CREATE TABLE IF NOT EXISTS public.workshop_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    session_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('offline', 'online')),
    venue TEXT,
    youtube_url TEXT,
    online_meeting_url TEXT,
    duration_minutes INT,
    materials TEXT[] DEFAULT '{}'::TEXT[],
    qr_secret TEXT DEFAULT gen_random_uuid()::TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create workshop_registrations table (per-registration confirmation with QR)
CREATE TABLE IF NOT EXISTS public.workshop_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL DEFAULT ('WS-REG-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10))),
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'waitlisted', 'cancelled')),
    registered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_workshop_registration UNIQUE (workshop_id, student_id)
);

-- 5. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_workshops_updated_at ON public.workshops;
CREATE TRIGGER tr_workshops_updated_at
    BEFORE UPDATE ON public.workshops
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_workshop_sessions_updated_at ON public.workshop_sessions;
CREATE TRIGGER tr_workshop_sessions_updated_at
    BEFORE UPDATE ON public.workshop_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_workshop_registrations_updated_at ON public.workshop_registrations;
CREATE TRIGGER tr_workshop_registrations_updated_at
    BEFORE UPDATE ON public.workshop_registrations
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 6. Indexes for queries & performance
CREATE INDEX IF NOT EXISTS idx_workshops_status ON public.workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_dept ON public.workshops(department_id);
CREATE INDEX IF NOT EXISTS idx_workshops_registration_open ON public.workshops(registration_open);
CREATE INDEX IF NOT EXISTS idx_workshop_instructors_ws ON public.workshop_instructors(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_instructors_prof ON public.workshop_instructors(profile_id);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_ws ON public.workshop_sessions(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_sessions_date ON public.workshop_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_ws ON public.workshop_registrations(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_student ON public.workshop_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_status ON public.workshop_registrations(status);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_qr ON public.workshop_registrations(qr_code);

-- 7. Enable Row Level Security
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: workshops
-- Published workshops are readable by everyone
DROP POLICY IF EXISTS "Published workshops are readable" ON public.workshops;
CREATE POLICY "Published workshops are readable"
    ON public.workshops FOR SELECT
    USING (status = 'published');

-- Staff read non-published workshops
DROP POLICY IF EXISTS "Staff read non-published workshops" ON public.workshops;
CREATE POLICY "Staff read non-published workshops"
    ON public.workshops FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead', 'core_team')
                OR (p.department_id = public.workshops.department_id AND p.role IN ('head', 'co_head'))
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.workshops.id AND wi.profile_id = p.id
                )
            )
        )
    );

-- Authorized staff can create workshops
DROP POLICY IF EXISTS "Staff create workshops" ON public.workshops;
CREATE POLICY "Staff create workshops"
    ON public.workshops FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead')
                OR (p.department_id = public.workshops.department_id AND p.role IN ('head', 'co_head'))
            )
        )
    );

-- Authorized staff can update workshops
DROP POLICY IF EXISTS "Staff update workshops" ON public.workshops;
CREATE POLICY "Staff update workshops"
    ON public.workshops FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead')
                OR (p.department_id = public.workshops.department_id AND p.role IN ('head', 'co_head'))
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.workshops.id AND wi.profile_id = p.id
                )
            )
        )
    );

-- Leadership or Committee Head can delete workshops
DROP POLICY IF EXISTS "Leadership delete workshops" ON public.workshops;
CREATE POLICY "Leadership delete workshops"
    ON public.workshops FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR (p.department_id = public.workshops.department_id AND p.role = 'head')
            )
        )
    );

-- 9. RLS Policies: workshop_instructors
DROP POLICY IF EXISTS "Workshop instructors are readable" ON public.workshop_instructors;
CREATE POLICY "Workshop instructors are readable"
    ON public.workshop_instructors FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Manage workshop instructors" ON public.workshop_instructors;
CREATE POLICY "Manage workshop instructors"
    ON public.workshop_instructors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.workshops w ON w.id = public.workshop_instructors.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead')
                OR (p.department_id = w.department_id AND p.role IN ('head', 'co_head'))
            )
        )
    );

-- 10. RLS Policies: workshop_sessions
DROP POLICY IF EXISTS "Workshop sessions follow workshop read" ON public.workshop_sessions;
CREATE POLICY "Workshop sessions follow workshop read"
    ON public.workshop_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workshops w
            WHERE w.id = public.workshop_sessions.workshop_id
            AND (
                w.status = 'published'
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND (
                        p.role IN ('president', 'co_president', 'vice_president', 'lead', 'core_team')
                        OR (p.department_id = w.department_id AND p.role IN ('head', 'co_head'))
                        OR EXISTS (
                            SELECT 1 FROM public.workshop_instructors wi
                            WHERE wi.workshop_id = w.id AND wi.profile_id = p.id
                        )
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Instructors manage workshop sessions" ON public.workshop_sessions;
CREATE POLICY "Instructors manage workshop sessions"
    ON public.workshop_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.workshops w ON w.id = public.workshop_sessions.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead')
                OR (p.department_id = w.department_id AND p.role IN ('head', 'co_head'))
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = w.id AND wi.profile_id = p.id
                )
            )
        )
    );

-- 11. RLS Policies: workshop_registrations
DROP POLICY IF EXISTS "Students view own registrations" ON public.workshop_registrations;
CREATE POLICY "Students view own registrations"
    ON public.workshop_registrations FOR SELECT
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view workshop registrations" ON public.workshop_registrations;
CREATE POLICY "Instructors view workshop registrations"
    ON public.workshop_registrations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.workshops w ON w.id = public.workshop_registrations.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead', 'core_team')
                OR (p.department_id = w.department_id AND p.role IN ('head', 'co_head'))
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = w.id AND wi.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Students self register" ON public.workshop_registrations;
CREATE POLICY "Students self register"
    ON public.workshop_registrations FOR INSERT
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.workshops w
            WHERE w.id = workshop_id
            AND w.status = 'published'
            AND w.registration_open = TRUE
        )
    );

DROP POLICY IF EXISTS "Students cancel own registration" ON public.workshop_registrations;
CREATE POLICY "Students cancel own registration"
    ON public.workshop_registrations FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Staff manage workshop registrations" ON public.workshop_registrations;
CREATE POLICY "Staff manage workshop registrations"
    ON public.workshop_registrations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.workshops w ON w.id = public.workshop_registrations.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'vice_president', 'lead')
                OR (p.department_id = w.department_id AND p.role IN ('head', 'co_head'))
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = w.id AND wi.profile_id = p.id
                )
            )
        )
    );
