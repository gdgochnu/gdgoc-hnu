-- ==============================================================================
-- GDGoC HNU OS — Migration 034: Student Attendance System
-- Step S.D.1 of Phase S (Student Portal)
-- Spec reference: §4.S.5, §4.S.10, §4.S.11
-- ==============================================================================

-- 1. Create student_attendance table
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.course_sessions(id) ON DELETE CASCADE,
    workshop_session_id UUID REFERENCES public.workshop_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.student_profiles(id) ON DELETE CASCADE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    method TEXT NOT NULL DEFAULT 'qr' CHECK (method IN ('qr', 'manual')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure either session_id OR workshop_session_id is provided, but not both or neither
    CONSTRAINT chk_student_attendance_target CHECK (
        (session_id IS NOT NULL AND workshop_session_id IS NULL) OR
        (session_id IS NULL AND workshop_session_id IS NOT NULL)
    ),

    -- Unique constraint preventing duplicate attendance for same course session
    CONSTRAINT uq_student_attendance_course_session UNIQUE (session_id, student_id),

    -- Unique constraint preventing duplicate attendance for same workshop session
    CONSTRAINT uq_student_attendance_workshop_session UNIQUE (workshop_session_id, student_id)
);

-- 2. Indexes for fast check-in scanning & roster lookups
CREATE INDEX IF NOT EXISTS idx_student_attendance_session_id ON public.student_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_workshop_session_id ON public.student_attendance(workshop_session_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_checked_in_by ON public.student_attendance(checked_in_by);
CREATE INDEX IF NOT EXISTS idx_student_attendance_check_in_time ON public.student_attendance(check_in_time DESC);

-- 3. Enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

-- 4. RLS SELECT Policy:
-- - Students can view their own attendance records
-- - Authorized Staff (HR, Leadership, assigned Instructors/Mentors, Committee Heads) can view attendance records
DROP POLICY IF EXISTS "Students read own attendance" ON public.student_attendance;
CREATE POLICY "Students read own attendance"
    ON public.student_attendance FOR SELECT
    USING (
        -- Student viewing their own attendance
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.student_attendance.student_id
            AND (
                sp.team_profile_id = auth.uid()
                OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
        )
        OR
        -- Team Staff viewing attendance
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
                OR p.role IN ('committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_sessions cs
                    JOIN public.course_instructors ci ON cs.course_id = ci.course_id
                    WHERE cs.id = public.student_attendance.session_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_sessions ws
                    JOIN public.workshop_instructors wi ON ws.workshop_id = wi.workshop_id
                    WHERE ws.id = public.student_attendance.workshop_session_id AND wi.profile_id = p.id
                )
            )
        )
    );

-- 5. RLS INSERT Policy:
-- Strictly restricted to team members (HR, Leadership, assigned Instructors/Mentors, Committee Heads).
-- Students CANNOT self-insert attendance.
DROP POLICY IF EXISTS "Staff insert student attendance" ON public.student_attendance;
CREATE POLICY "Staff insert student attendance"
    ON public.student_attendance FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
                OR p.role IN ('committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_sessions cs
                    JOIN public.course_instructors ci ON cs.course_id = ci.course_id
                    WHERE cs.id = public.student_attendance.session_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_sessions ws
                    JOIN public.workshop_instructors wi ON ws.workshop_id = wi.workshop_id
                    WHERE ws.id = public.student_attendance.workshop_session_id AND wi.profile_id = p.id
                )
            )
        )
    );

-- 6. RLS UPDATE/DELETE Policy:
-- Leadership, HR, and the staff member who recorded it can update or delete
DROP POLICY IF EXISTS "Staff update or delete attendance" ON public.student_attendance;
CREATE POLICY "Staff update or delete attendance"
    ON public.student_attendance FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
                OR public.student_attendance.checked_in_by = p.id
            )
        )
    );
