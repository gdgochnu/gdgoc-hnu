-- ==============================================================================
-- GDGoC HNU OS — Migration 012: Task Delegation & Broadcast Assignment Upgrade
-- Phase 6 — Step 6.1
-- Spec reference: §3.3, §3.17, §4.2 (Parts A & B)
-- ==============================================================================

-- 1. Update task_status enum to include 'delegated'
DO $$ BEGIN
    ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'delegated';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Enums for Broadcast and Delegation
DO $$ BEGIN
    CREATE TYPE public.task_assignment_mode AS ENUM (
        'single',
        'broadcast'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.task_assignee_status AS ENUM (
        'todo',
        'in_progress',
        'submitted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Upgrade public.tasks table with delegation and broadcast columns
DO $$ BEGIN
    -- Add assignment_mode
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assignment_mode'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN assignment_mode public.task_assignment_mode NOT NULL DEFAULT 'single';
    END IF;

    -- Add delegated_by_id (the profile who delegated this task down)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'delegated_by_id'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN delegated_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Add parent_task_id (self-referencing FK to link delegated child task back to parent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'parent_task_id'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;
    END IF;

    -- Add event_id (FK to events to link task to an event)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE public.tasks 
        ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create public.task_assignees table (populated for broadcast tasks)
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.task_assignee_status NOT NULL DEFAULT 'todo',
    evidence_url TEXT,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_task_assignee UNIQUE (task_id, profile_id)
);

-- 5. Attach updated_at trigger to task_assignees
DROP TRIGGER IF EXISTS tr_task_assignees_updated_at ON public.task_assignees;
CREATE TRIGGER tr_task_assignees_updated_at
    BEFORE UPDATE ON public.task_assignees
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_by_id ON public.tasks(delegated_by_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_mode ON public.tasks(assignment_mode);
CREATE INDEX IF NOT EXISTS idx_tasks_event_id ON public.tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_profile_id ON public.task_assignees(profile_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_status ON public.task_assignees(status);

-- 7. Enable Row Level Security (RLS) on task_assignees (Spec §3.17)
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- 7.1 SELECT Policy:
-- Assignee can view their own row; task creator, delegator, and leadership can view all submissions for the task
DROP POLICY IF EXISTS "task_assignees_select_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_select_policy"
    ON public.task_assignees
    FOR SELECT
    USING (
        -- Assignee can see their own row
        auth.uid() = profile_id
        OR
        -- President & Co-President can view all
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('president', 'co_president')
        )
        OR
        -- Parent task creator or delegator
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_assignees.task_id
            AND (t.created_by = auth.uid() OR t.delegated_by_id = auth.uid() OR t.assignee_id = auth.uid())
        )
        OR
        -- Committee Head/Co-Head of the task's committee
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.departments d ON d.id = t.department_id
            WHERE t.id = task_assignees.task_id
            AND (d.head_id = auth.uid() OR d.co_head_id = auth.uid())
        )
        OR
        -- Branch Head of the task's committee branch
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.departments d ON d.id = t.department_id
            JOIN public.profiles p ON p.id = auth.uid()
            JOIN public.departments ud ON ud.id = p.department_id
            WHERE t.id = task_assignees.task_id
            AND p.role = 'branch_head'
            AND ud.branch = d.branch
        )
    );

-- 7.2 INSERT Policy:
-- Leadership and Task creators can insert assignees for broadcast tasks
DROP POLICY IF EXISTS "task_assignees_insert_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_insert_policy"
    ON public.task_assignees
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_assignees.task_id
            AND (t.created_by = auth.uid() OR t.delegated_by_id = auth.uid() OR t.assignee_id = auth.uid())
        )
    );

-- 7.3 UPDATE Policy:
-- The assignee can update their own status/evidence/submission
-- Leadership/task creator can also update status if reviewing
DROP POLICY IF EXISTS "task_assignees_update_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_update_policy"
    ON public.task_assignees
    FOR UPDATE
    USING (
        auth.uid() = profile_id
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('president', 'co_president')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_assignees.task_id
            AND (t.created_by = auth.uid() OR t.delegated_by_id = auth.uid() OR t.assignee_id = auth.uid())
        )
    );

-- 7.4 DELETE Policy:
-- Task creator or leadership can remove assignees
DROP POLICY IF EXISTS "task_assignees_delete_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_delete_policy"
    ON public.task_assignees
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('president', 'co_president')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_assignees.task_id
            AND (t.created_by = auth.uid() OR t.delegated_by_id = auth.uid())
        )
    );
