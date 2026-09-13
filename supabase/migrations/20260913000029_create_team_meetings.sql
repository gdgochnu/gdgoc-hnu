-- ==============================================================================
-- GDGoC HNU OS — Migration 029: Team Meetings & Attendance Ledger
-- Spec reference: §3.2, §4.4, §4.5, §4.10, §5.1
-- ==============================================================================

-- 1. Create team_meetings table
CREATE TABLE IF NOT EXISTS public.team_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    meeting_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT DEFAULT NULL,
    type TEXT NOT NULL CHECK (type IN ('online', 'offline')),
    online_meeting_url TEXT DEFAULT NULL,
    location TEXT DEFAULT NULL,
    target_audience_type TEXT NOT NULL CHECK (target_audience_type IN ('all_team', 'branch', 'department', 'selected_members')),
    target_branch public.department_branch DEFAULT NULL,
    target_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    facilitator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    agenda TEXT DEFAULT NULL,
    minutes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create team_meeting_attendees table
CREATE TABLE IF NOT EXISTS public.team_meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES public.team_meetings(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'present', 'absent', 'excused', 'late')),
    check_in_time TIMESTAMPTZ DEFAULT NULL,
    marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (meeting_id, profile_id)
);

-- 3. Indexes for fast retrieval and filtering
CREATE INDEX IF NOT EXISTS idx_team_meetings_date ON public.team_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_team_meetings_status ON public.team_meetings(status);
CREATE INDEX IF NOT EXISTS idx_team_meetings_created_by ON public.team_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_team_meetings_target ON public.team_meetings(target_audience_type, target_branch, target_department_id);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON public.team_meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_profile_id ON public.team_meeting_attendees(profile_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_status ON public.team_meeting_attendees(status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.team_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_meeting_attendees ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for team_meetings
DROP POLICY IF EXISTS "team_meetings_select_policy" ON public.team_meetings;
CREATE POLICY "team_meetings_select_policy" ON public.team_meetings
    FOR SELECT TO authenticated
    USING (
        -- President, Co-President, Branch Heads, HR can see all meetings
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                p.role = 'branch_head'
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
            )
        )
        -- Or creator
        OR created_by = auth.uid()
        -- Or facilitator
        OR facilitator_id = auth.uid()
        -- Or attendee invited
        OR EXISTS (
            SELECT 1 FROM public.team_meeting_attendees tma
            WHERE tma.meeting_id = team_meetings.id AND tma.profile_id = auth.uid()
        )
        -- Or target audience includes the user
        OR (target_audience_type = 'all_team')
        OR (
            target_audience_type = 'branch' AND EXISTS (
                SELECT 1 FROM public.profiles p
                JOIN public.departments d ON p.department_id = d.id
                WHERE p.id = auth.uid() AND d.branch::text = team_meetings.target_branch::text
            )
        )
        OR (
            target_audience_type = 'department' AND EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid() AND p.department_id = team_meetings.target_department_id
            )
        )
    );

DROP POLICY IF EXISTS "team_meetings_insert_policy" ON public.team_meetings;
CREATE POLICY "team_meetings_insert_policy" ON public.team_meetings
    FOR INSERT TO authenticated
    WITH CHECK (
        -- Only President, Co-President, or Branch Heads can schedule meetings
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'branch_head'
        )
    );

DROP POLICY IF EXISTS "team_meetings_update_policy" ON public.team_meetings;
CREATE POLICY "team_meetings_update_policy" ON public.team_meetings
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR created_by = auth.uid()
        OR facilitator_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                p.role = 'branch_head'
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
            )
        )
    );

DROP POLICY IF EXISTS "team_meetings_delete_policy" ON public.team_meetings;
CREATE POLICY "team_meetings_delete_policy" ON public.team_meetings
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
        OR created_by = auth.uid()
    );

-- 6. RLS Policies for team_meeting_attendees
DROP POLICY IF EXISTS "team_meeting_attendees_select_policy" ON public.team_meeting_attendees;
CREATE POLICY "team_meeting_attendees_select_policy" ON public.team_meeting_attendees
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                p.role = 'branch_head'
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.team_meetings tm
            WHERE tm.id = team_meeting_attendees.meeting_id AND (
                tm.created_by = auth.uid()
                OR tm.facilitator_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "team_meeting_attendees_insert_policy" ON public.team_meeting_attendees;
CREATE POLICY "team_meeting_attendees_insert_policy" ON public.team_meeting_attendees
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                p.role = 'branch_head'
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.team_meetings tm
            WHERE tm.id = team_meeting_attendees.meeting_id AND (
                tm.created_by = auth.uid()
                OR tm.facilitator_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "team_meeting_attendees_update_policy" ON public.team_meeting_attendees;
CREATE POLICY "team_meeting_attendees_update_policy" ON public.team_meeting_attendees
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            LEFT JOIN public.departments d ON p.department_id = d.id
            WHERE p.id = auth.uid() AND (
                p.role = 'branch_head'
                OR d.code IN ('HR', 'HUMAN_RESOURCES')
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.team_meetings tm
            WHERE tm.id = team_meeting_attendees.meeting_id AND (
                tm.created_by = auth.uid()
                OR tm.facilitator_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "team_meeting_attendees_delete_policy" ON public.team_meeting_attendees;
CREATE POLICY "team_meeting_attendees_delete_policy" ON public.team_meeting_attendees
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.team_meetings tm
            WHERE tm.id = team_meeting_attendees.meeting_id AND tm.created_by = auth.uid()
        )
    );
