-- ==============================================================================
-- GDGoC HNU OS — Migration 004: Performance, PR, Media & Operations
-- Step 1.4 of Phase 1 (Database Schema)
-- Spec reference: §3.3, §4.5, §4.6, §4.7, §4.8, §4.9
-- ==============================================================================

-- 1. Create performance_reviews table
CREATE TABLE IF NOT EXISTS public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_month TEXT NOT NULL, -- e.g. '2026-09'
    task_completion_pct NUMERIC DEFAULT 0,
    deadline_adherence_pct NUMERIC DEFAULT 0,
    attendance_pct NUMERIC DEFAULT 0,
    team_contribution_pct NUMERIC DEFAULT 0,
    overall_score NUMERIC DEFAULT 0,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_profile_period UNIQUE (profile_id, period_month)
);

-- 2. Create pr_contacts table
CREATE TABLE IF NOT EXISTS public.pr_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    organization TEXT,
    role_title TEXT,
    email TEXT,
    phone TEXT,
    type TEXT NOT NULL DEFAULT 'speaker', -- speaker, partner, sponsor, venue, other
    pipeline_stage TEXT NOT NULL DEFAULT 'new', -- new, contacted, negotiating, confirmed
    notes TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create pr_interactions table
CREATE TABLE IF NOT EXISTS public.pr_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES public.pr_contacts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL DEFAULT 'email', -- email, call, meeting, message
    summary TEXT NOT NULL,
    next_follow_up TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create media_content table (Content Calendar)
CREATE TABLE IF NOT EXISTS public.media_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'post', -- post, reel, story, poster, other
    platform TEXT NOT NULL DEFAULT 'instagram', -- instagram, linkedin, facebook, youtube
    status TEXT NOT NULL DEFAULT 'draft', -- draft, in_review, approved, published
    publish_date TIMESTAMPTZ,
    copy_text TEXT,
    drive_link TEXT,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create media_assets table (Central Library)
CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'photo', -- brand_kit, template, poster, photo, video, coverage
    mime_type TEXT,
    drive_file_id TEXT,
    drive_file_url TEXT,
    thumbnail_url TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Create operations_checklist_items table
CREATE TABLE IF NOT EXISTS public.operations_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    phase TEXT NOT NULL DEFAULT 'before', -- before, during, after
    task_name TEXT NOT NULL,
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_performance_reviews_updated_at ON public.performance_reviews;
CREATE TRIGGER tr_performance_reviews_updated_at
    BEFORE UPDATE ON public.performance_reviews
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_pr_contacts_updated_at ON public.pr_contacts;
CREATE TRIGGER tr_pr_contacts_updated_at
    BEFORE UPDATE ON public.pr_contacts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_media_content_updated_at ON public.media_content;
CREATE TRIGGER tr_media_content_updated_at
    BEFORE UPDATE ON public.media_content
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tr_ops_checklists_updated_at ON public.operations_checklist_items;
CREATE TRIGGER tr_ops_checklists_updated_at
    BEFORE UPDATE ON public.operations_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 8. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_perf_profile_id ON public.performance_reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_pr_contacts_stage ON public.pr_contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_pr_interactions_contact ON public.pr_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_media_content_status ON public.media_content(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_category ON public.media_assets(category);
CREATE INDEX IF NOT EXISTS idx_ops_checklists_event ON public.operations_checklist_items(event_id);
