-- ==============================================================================
-- GDGoC HNU OS — Migration 013: New-Member Onboarding Checklist
-- Phase 7 — Step 7.1
-- Spec reference: §3.9, §3.17, §4.15
-- ==============================================================================

-- 1. Create onboarding_checklist_templates table
CREATE TABLE IF NOT EXISTS public.onboarding_checklist_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE, -- NULL = global default
    item TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create onboarding_checklist_items table (personalized per member)
CREATE TABLE IF NOT EXISTS public.onboarding_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.onboarding_checklist_templates(id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    is_done BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Attach updated_at trigger
DROP TRIGGER IF EXISTS tr_onboarding_checklist_items_updated_at ON public.onboarding_checklist_items;
CREATE TRIGGER tr_onboarding_checklist_items_updated_at
    BEFORE UPDATE ON public.onboarding_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_checklist_templates_dept ON public.onboarding_checklist_templates(department_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_sort ON public.onboarding_checklist_templates(sort_order);
CREATE INDEX IF NOT EXISTS idx_checklist_items_profile ON public.onboarding_checklist_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_template ON public.onboarding_checklist_items(template_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_is_done ON public.onboarding_checklist_items(profile_id, is_done);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.onboarding_checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for onboarding_checklist_templates
-- Authenticated users can view all checklist templates
DROP POLICY IF EXISTS "Anyone authenticated can view templates" ON public.onboarding_checklist_templates;
CREATE POLICY "Anyone authenticated can view templates"
    ON public.onboarding_checklist_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Leadership (President, Co-President, Branch Heads, Committee Heads) can manage templates
DROP POLICY IF EXISTS "Leadership can manage templates" ON public.onboarding_checklist_templates;
CREATE POLICY "Leadership can manage templates"
    ON public.onboarding_checklist_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head')
        )
    );

-- 7. RLS Policies for onboarding_checklist_items
-- Members can view their own checklist items; Leadership can view their members' items
DROP POLICY IF EXISTS "Users and leadership can view checklist items" ON public.onboarding_checklist_items;
CREATE POLICY "Users and leadership can view checklist items"
    ON public.onboarding_checklist_items
    FOR SELECT
    TO authenticated
    USING (
        profile_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head')
        )
    );

-- Members can toggle their own checklist items
DROP POLICY IF EXISTS "Users can update their own checklist items" ON public.onboarding_checklist_items;
CREATE POLICY "Users can update their own checklist items"
    ON public.onboarding_checklist_items
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- Leadership or system can insert checklist items
DROP POLICY IF EXISTS "Leadership can insert checklist items" ON public.onboarding_checklist_items;
CREATE POLICY "Leadership can insert checklist items"
    ON public.onboarding_checklist_items
    FOR INSERT
    TO authenticated
    WITH CHECK (
        profile_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president', 'branch_head', 'committee_head')
        )
    );

-- 8. Seed Default Global Checklist Templates (from Spec §4.15)
INSERT INTO public.onboarding_checklist_templates (department_id, item, sort_order)
VALUES
    (NULL, 'Read the code of conduct', 1),
    (NULL, 'Meet your Committee Head', 2),
    (NULL, 'Join your committee''s Drive folder', 3),
    (NULL, 'Complete your first task', 4)
ON CONFLICT DO NOTHING;
