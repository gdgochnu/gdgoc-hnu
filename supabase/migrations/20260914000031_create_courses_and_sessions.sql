-- ==============================================================================
-- GDGoC HNU OS — Migration 031: Courses, Sessions, Instructors & Enrollments
-- Step S.B.1 of Phase S (Student Portal)
-- Spec reference: §4.S.3, §4.S.4, §4.S.10, §4.S.11
-- ==============================================================================

-- 1. Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    category TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    capacity INT,
    enrollment_type TEXT NOT NULL DEFAULT 'open' CHECK (enrollment_type IN ('open', 'gated')),
    syllabus TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create course_instructors table (maps instructors and mentors to courses)
CREATE TABLE IF NOT EXISTS public.course_instructors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('instructor', 'mentor')),
    assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_course_instructor UNIQUE (course_id, profile_id)
);

-- 3. Create course_sessions table
CREATE TABLE IF NOT EXISTS public.course_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    session_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('offline', 'online')),
    venue TEXT,
    youtube_url TEXT,
    materials TEXT[] DEFAULT '{}'::TEXT[],
    qr_secret TEXT DEFAULT gen_random_uuid()::TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'withdrawn', 'waitlisted')),
    enrolled_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_course_enrollment UNIQUE (course_id, student_id)
);

-- 5. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_courses_updated_at ON public.courses;
CREATE TRIGGER tr_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_course_sessions_updated_at ON public.course_sessions;
CREATE TRIGGER tr_course_sessions_updated_at
    BEFORE UPDATE ON public.course_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_course_enrollments_updated_at ON public.course_enrollments;
CREATE TRIGGER tr_course_enrollments_updated_at
    BEFORE UPDATE ON public.course_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 6. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON public.course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_profile ON public.course_instructors(profile_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_course ON public.course_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sessions_date ON public.course_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);

-- 7. Enable Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies: courses
-- Published courses readable by everyone
DROP POLICY IF EXISTS "Published courses are publicly readable" ON public.courses;
CREATE POLICY "Published courses are publicly readable"
    ON public.courses FOR SELECT
    USING (status = 'published');

-- Drafts / archived readable by leadership, owning department head, or assigned instructors
DROP POLICY IF EXISTS "Staff read non-published courses" ON public.courses;
CREATE POLICY "Staff read non-published courses"
    ON public.courses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = courses.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = courses.id
                    AND ci.profile_id = p.id
                )
            )
        )
    );

-- Insert/Update/Delete courses by leadership, owning committee head, or assigned instructors
DROP POLICY IF EXISTS "Staff manage courses" ON public.courses;
CREATE POLICY "Staff manage courses"
    ON public.courses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = courses.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = courses.id
                    AND ci.profile_id = p.id
                    AND ci.role = 'instructor'
                )
            )
        )
    );

-- 9. RLS Policies: course_instructors
DROP POLICY IF EXISTS "Read course instructors" ON public.course_instructors;
CREATE POLICY "Read course instructors"
    ON public.course_instructors FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Manage course instructors" ON public.course_instructors;
CREATE POLICY "Manage course instructors"
    ON public.course_instructors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.courses c ON c.id = course_instructors.course_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
            )
        )
    );

-- 10. RLS Policies: course_sessions
-- Sessions readable if course published or by staff
DROP POLICY IF EXISTS "Read course sessions" ON public.course_sessions;
CREATE POLICY "Read course sessions"
    ON public.course_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_sessions.course_id
            AND (
                c.status = 'published'
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND (
                        p.role IN ('president', 'co_president', 'branch_head')
                        OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                        OR EXISTS (
                            SELECT 1 FROM public.course_instructors ci
                            WHERE ci.course_id = c.id
                            AND ci.profile_id = p.id
                        )
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "Manage course sessions" ON public.course_sessions;
CREATE POLICY "Manage course sessions"
    ON public.course_sessions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.courses c ON c.id = course_sessions.course_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = c.id
                    AND ci.profile_id = p.id
                    AND ci.role = 'instructor'
                )
            )
        )
    );

-- 11. RLS Policies: course_enrollments
-- Student reads own enrollments
DROP POLICY IF EXISTS "Student reads own enrollments" ON public.course_enrollments;
CREATE POLICY "Student reads own enrollments"
    ON public.course_enrollments FOR SELECT
    USING (student_id = auth.uid());

-- Staff read enrollments (instructors, committee heads, leadership, HR)
DROP POLICY IF EXISTS "Staff read course enrollments" ON public.course_enrollments;
CREATE POLICY "Staff read course enrollments"
    ON public.course_enrollments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.courses c ON c.id = course_enrollments.course_id
            LEFT JOIN public.departments d ON d.id = p.department_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR d.code = 'HR'
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = c.id
                    AND ci.profile_id = p.id
                )
            )
        )
    );

-- Student inserts own enrollment
DROP POLICY IF EXISTS "Student enrolls in course" ON public.course_enrollments;
CREATE POLICY "Student enrolls in course"
    ON public.course_enrollments FOR INSERT
    WITH CHECK (student_id = auth.uid());

-- Student can withdraw own pending enrollment
DROP POLICY IF EXISTS "Student updates own enrollment status" ON public.course_enrollments;
CREATE POLICY "Student updates own enrollment status"
    ON public.course_enrollments FOR UPDATE
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Staff manage / approve enrollments
DROP POLICY IF EXISTS "Staff manage enrollments" ON public.course_enrollments;
CREATE POLICY "Staff manage enrollments"
    ON public.course_enrollments FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.courses c ON c.id = course_enrollments.course_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = c.id
                    AND ci.profile_id = p.id
                )
            )
        )
    );
