-- ==============================================================================
-- GDGoC HNU OS — Migration 023: System Settings Table (Drive Bridge & Integrations)
-- Phase 13 — Step 13.1 & 13.4
-- Spec reference: §3.6, §4.16, §8
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- President and Co-President can view system settings
DROP POLICY IF EXISTS "Presidents can read system settings" ON public.system_settings;
CREATE POLICY "Presidents can read system settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president')
        )
    );

-- President and Co-President can insert/update system settings
DROP POLICY IF EXISTS "Presidents can manage system settings" ON public.system_settings;
CREATE POLICY "Presidents can manage system settings"
    ON public.system_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role IN ('president', 'co_president')
        )
    );

-- Default placeholder entries
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('drive_bridge_url', '', 'Google Apps Script Web App URL for Google Drive Bridge'),
    ('drive_bridge_secret', '', 'Shared secret token authenticating requests to Drive Bridge Web App'),
    ('drive_root_folder_id', '', 'Google Drive root folder ID for GDGoC HNU OS Workspace')
ON CONFLICT (key) DO NOTHING;
