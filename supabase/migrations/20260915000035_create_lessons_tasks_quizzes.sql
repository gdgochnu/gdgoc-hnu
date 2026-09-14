-- ==============================================================================
-- GDGoC HNU OS — Migration 035: Lessons, Tasks, Quizzes & Mentorship System
-- Step S.E.1 of Phase S (Student Portal)
-- Spec reference: §4.S.6, §4.S.10, §4.S.11
-- ==============================================================================

-- 1. Create course_lessons table
CREATE TABLE IF NOT EXISTS public.course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
    lesson_number INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    youtube_url TEXT,
    materials UUID[] DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for course_lessons
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON public.course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_session_id ON public.course_lessons(session_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_number ON public.course_lessons(course_id, lesson_number);

-- 2. Create student_tasks table
CREATE TABLE IF NOT EXISTS public.student_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date TIMESTAMPTZ,
    submission_type TEXT NOT NULL DEFAULT 'link' CHECK (submission_type IN ('link', 'file', 'both')),
    max_score NUMERIC DEFAULT 100,
    assigned_to TEXT NOT NULL DEFAULT 'all_enrolled' CHECK (assigned_to IN ('all_enrolled', 'specific')),
    specific_student_ids UUID[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure task belongs to at least a course or a workshop
    CONSTRAINT chk_student_tasks_parent CHECK (course_id IS NOT NULL OR workshop_id IS NOT NULL)
);

-- Indexes for student_tasks
CREATE INDEX IF NOT EXISTS idx_student_tasks_course_id ON public.student_tasks(course_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_workshop_id ON public.student_tasks(workshop_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_lesson_id ON public.student_tasks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_tasks_status ON public.student_tasks(status);

-- 3. Create student_task_submissions table
CREATE TABLE IF NOT EXISTS public.student_task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.student_tasks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    submission_link TEXT,
    submission_file_drive_id TEXT,
    score NUMERIC,
    feedback_comment TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('pending', 'submitted', 'graded', 'needs_revision', 'final')),
    submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Each student has one submission record per task
    CONSTRAINT uq_student_task_submission UNIQUE (task_id, student_id)
);

-- Indexes for student_task_submissions
CREATE INDEX IF NOT EXISTS idx_student_task_submissions_task_id ON public.student_task_submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_student_task_submissions_student_id ON public.student_task_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_task_submissions_status ON public.student_task_submissions(status);

-- 4. Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    time_limit_minutes INT,
    passing_score_percentage NUMERIC NOT NULL DEFAULT 60,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    allow_retakes BOOLEAN NOT NULL DEFAULT false,
    max_attempts INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure quiz belongs to a course or a workshop
    CONSTRAINT chk_quizzes_parent CHECK (course_id IS NOT NULL OR workshop_id IS NOT NULL)
);

-- Indexes for quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_workshop_id ON public.quizzes(workshop_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson_id ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON public.quizzes(status);

-- 5. Create quiz_attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    auto_graded_score NUMERIC,
    manual_graded_score NUMERIC,
    total_score NUMERIC,
    passed BOOLEAN,
    feedback TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    submitted_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for quiz_attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON public.quiz_attempts(status);

-- 6. Create mentor_notes table (Spec §4.S.10)
CREATE TABLE IF NOT EXISTS public.mentor_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    flagged_at_risk BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for mentor_notes
CREATE INDEX IF NOT EXISTS idx_mentor_notes_mentor_id ON public.mentor_notes(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_student_id ON public.mentor_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_notes_course_id ON public.mentor_notes(course_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Spec §4.S.11)
-- ==============================================================================

-- Enable RLS on all 6 tables
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_notes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. course_lessons RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read course lessons" ON public.course_lessons;
CREATE POLICY "Read course lessons"
    ON public.course_lessons FOR SELECT
    USING (
        -- If course is published, any authenticated user or enrolled student can view
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = public.course_lessons.course_id
            AND c.status = 'published'
        )
        OR
        -- Leadership & Department Head can view all (including draft courses)
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.courses c ON c.id = public.course_lessons.course_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.course_lessons.course_id AND ci.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Manage course lessons" ON public.course_lessons;
CREATE POLICY "Manage course lessons"
    ON public.course_lessons FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.courses c ON c.id = public.course_lessons.course_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR (p.role IN ('committee_head', 'committee_co_head') AND p.department_id = c.department_id)
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.course_lessons.course_id 
                    AND ci.profile_id = p.id 
                    AND ci.role = 'instructor'
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 2. student_tasks RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read student tasks" ON public.student_tasks;
CREATE POLICY "Read student tasks"
    ON public.student_tasks FOR SELECT
    USING (
        -- Active tasks readable by enrolled students
        (
            public.student_tasks.status = 'active'
            AND (
                -- Enrolled in course
                (public.student_tasks.course_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.course_enrollments ce
                    JOIN public.student_profiles sp ON ce.student_id = sp.id
                    WHERE ce.course_id = public.student_tasks.course_id
                    AND ce.status = 'confirmed'
                    AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
                ))
                OR
                -- Registered in workshop
                (public.student_tasks.workshop_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.workshop_registrations wr
                    JOIN public.student_profiles sp ON wr.student_id = sp.id
                    WHERE wr.workshop_id = public.student_tasks.workshop_id
                    AND wr.status = 'registered'
                    AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
                ))
            )
        )
        OR
        -- Staff can read all tasks
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.student_tasks.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.student_tasks.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Manage student tasks" ON public.student_tasks;
CREATE POLICY "Manage student tasks"
    ON public.student_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.courses c ON c.id = public.student_tasks.course_id
            LEFT JOIN public.workshops w ON w.id = public.student_tasks.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR (p.role IN ('committee_head', 'committee_co_head') AND (p.department_id = c.department_id OR p.department_id = w.department_id))
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.student_tasks.course_id 
                    AND ci.profile_id = p.id 
                    AND ci.role = 'instructor'
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.student_tasks.workshop_id 
                    AND wi.profile_id = p.id 
                    AND wi.role = 'instructor'
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 3. student_task_submissions RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Student read own submissions" ON public.student_task_submissions;
CREATE POLICY "Student read own submissions"
    ON public.student_task_submissions FOR SELECT
    USING (
        -- Student viewing their own submission
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.student_task_submissions.student_id
            AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
        OR
        -- Staff viewing submissions for their course/workshop
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.student_tasks st ON st.id = public.student_task_submissions.task_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = st.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = st.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Student insert own submission" ON public.student_task_submissions;
CREATE POLICY "Student insert own submission"
    ON public.student_task_submissions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.student_task_submissions.student_id
            AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Update task submissions" ON public.student_task_submissions;
CREATE POLICY "Update task submissions"
    ON public.student_task_submissions FOR UPDATE
    USING (
        -- Student updating their own pending or needs_revision submission
        (
            EXISTS (
                SELECT 1 FROM public.student_profiles sp
                WHERE sp.id = public.student_task_submissions.student_id
                AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
            )
            AND public.student_task_submissions.status IN ('pending', 'submitted', 'needs_revision')
        )
        OR
        -- Staff grading / reviewing submission
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.student_tasks st ON st.id = public.student_task_submissions.task_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = st.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = st.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 4. quizzes RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read quizzes" ON public.quizzes;
CREATE POLICY "Read quizzes"
    ON public.quizzes FOR SELECT
    USING (
        -- Published quizzes readable by enrolled students
        (
            public.quizzes.status = 'published'
            AND (
                (public.quizzes.course_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.course_enrollments ce
                    JOIN public.student_profiles sp ON ce.student_id = sp.id
                    WHERE ce.course_id = public.quizzes.course_id
                    AND ce.status = 'confirmed'
                    AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
                ))
                OR
                (public.quizzes.workshop_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.workshop_registrations wr
                    JOIN public.student_profiles sp ON wr.student_id = sp.id
                    WHERE wr.workshop_id = public.quizzes.workshop_id
                    AND wr.status = 'registered'
                    AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
                ))
            )
        )
        OR
        -- Staff can read all quizzes (including draft)
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.quizzes.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.quizzes.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Manage quizzes" ON public.quizzes;
CREATE POLICY "Manage quizzes"
    ON public.quizzes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.courses c ON c.id = public.quizzes.course_id
            LEFT JOIN public.workshops w ON w.id = public.quizzes.workshop_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head')
                OR (p.role IN ('committee_head', 'committee_co_head') AND (p.department_id = c.department_id OR p.department_id = w.department_id))
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = public.quizzes.course_id 
                    AND ci.profile_id = p.id 
                    AND ci.role = 'instructor'
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = public.quizzes.workshop_id 
                    AND wi.profile_id = p.id 
                    AND wi.role = 'instructor'
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 5. quiz_attempts RLS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Read quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Read quiz attempts"
    ON public.quiz_attempts FOR SELECT
    USING (
        -- Student reading own attempts
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.quiz_attempts.student_id
            AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
        OR
        -- Staff reading quiz attempts
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.quizzes q ON q.id = public.quiz_attempts.quiz_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = q.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = q.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

DROP POLICY IF EXISTS "Student insert quiz attempt" ON public.quiz_attempts;
CREATE POLICY "Student insert quiz attempt"
    ON public.quiz_attempts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_profiles sp
            WHERE sp.id = public.quiz_attempts.student_id
            AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    );

DROP POLICY IF EXISTS "Update quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Update quiz attempts"
    ON public.quiz_attempts FOR UPDATE
    USING (
        -- Student updating in-progress attempt
        (
            EXISTS (
                SELECT 1 FROM public.student_profiles sp
                WHERE sp.id = public.quiz_attempts.student_id
                AND (sp.team_profile_id = auth.uid() OR sp.email = (SELECT email FROM auth.users WHERE id = auth.uid()))
            )
            AND public.quiz_attempts.status = 'in_progress'
        )
        OR
        -- Staff grading / providing feedback
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.quizzes q ON q.id = public.quiz_attempts.quiz_id
            WHERE p.id = auth.uid()
            AND (
                p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
                OR EXISTS (
                    SELECT 1 FROM public.course_instructors ci
                    WHERE ci.course_id = q.course_id AND ci.profile_id = p.id
                )
                OR EXISTS (
                    SELECT 1 FROM public.workshop_instructors wi
                    WHERE wi.workshop_id = q.workshop_id AND wi.profile_id = p.id
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 6. mentor_notes RLS (Spec §4.S.10, §4.S.11)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Mentor read own notes or leadership read all" ON public.mentor_notes;
CREATE POLICY "Mentor read own notes or leadership read all"
    ON public.mentor_notes FOR SELECT
    USING (
        -- Author mentor
        public.mentor_notes.mentor_id = auth.uid()
        OR
        -- Leadership & Committee Heads
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
        )
    );

DROP POLICY IF EXISTS "Manage mentor notes" ON public.mentor_notes;
CREATE POLICY "Manage mentor notes"
    ON public.mentor_notes FOR ALL
    USING (
        public.mentor_notes.mentor_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head')
        )
    );
