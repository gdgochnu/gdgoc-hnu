-- ==============================================================================
-- GDGoC HNU OS — Migration 006: Multi-Stage Approval Engine
-- Step 1.6 of Phase 1 (Database Schema)
-- Spec reference: §3.4, §4.2, §4.3
-- ==============================================================================

-- 1. Create Enums for Approval Engine
DO $$ BEGIN
    CREATE TYPE approval_workflow_type AS ENUM (
        'task_completion',
        'event_publish',
        'account_approval'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_instance_status AS ENUM (
        'in_progress',
        'approved',
        'rejected',
        'changes_requested'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approver_rule AS ENUM (
        'committee_head',
        'branch_head',
        'president_or_co_president'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_step_status AS ENUM (
        'pending',
        'approved',
        'rejected',
        'changes_requested'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create approval_instances table
CREATE TABLE IF NOT EXISTS public.approval_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type approval_workflow_type NOT NULL,
    entity_id UUID NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 1,
    status approval_instance_status NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ
);

-- 3. Create approval_instance_steps table
CREATE TABLE IF NOT EXISTS public.approval_instance_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.approval_instances(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    approver_rule approver_rule NOT NULL,
    resolved_approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status approval_step_status NOT NULL DEFAULT 'pending',
    notes TEXT,
    acted_at TIMESTAMPTZ,
    CONSTRAINT uq_instance_step_order UNIQUE (instance_id, step_order)
);

-- 4. Wire Foreign Keys from tasks and events to approval_instances
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_tasks_approval_instance'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT fk_tasks_approval_instance 
        FOREIGN KEY (approval_instance_id) 
        REFERENCES public.approval_instances(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_events_approval_instance'
    ) THEN
        ALTER TABLE public.events 
        ADD CONSTRAINT fk_events_approval_instance 
        FOREIGN KEY (approval_instance_id) 
        REFERENCES public.approval_instances(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 5. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_approval_instances_entity ON public.approval_instances(entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_instances_status ON public.approval_instances(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_instance ON public.approval_instance_steps(instance_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON public.approval_instance_steps(resolved_approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_rule ON public.approval_instance_steps(approver_rule);
