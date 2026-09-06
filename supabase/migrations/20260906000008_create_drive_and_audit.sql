-- ==============================================================================
-- GDGoC HNU OS — Migration 008: Drive Folder Map & Immutable Audit Logs
-- Step 1.8 of Phase 1 (Database Schema)
-- Spec reference: §3.6, §3.7, §8, §9.9
-- ==============================================================================

-- 1. Create drive_folder_map table
CREATE TABLE IF NOT EXISTS public.drive_folder_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- department, event, member, media_library, certificates_templates, certificates_issued, reports
    entity_id UUID, -- nullable for singletons
    drive_folder_id TEXT NOT NULL,
    drive_folder_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Unique index ensuring one folder map per entity
CREATE UNIQUE INDEX IF NOT EXISTS uq_drive_folder_entity 
ON public.drive_folder_map(entity_type, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 2. Create audit_logs table (append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- account_approved, task_approved_stage2, certificate_issued, role_changed, etc.
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Immutability Trigger: prevent UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security violation: audit_logs rows are append-only and immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER tr_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_modification();

-- 4. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drive_folder_map_entity ON public.drive_folder_map(entity_type, entity_id);
