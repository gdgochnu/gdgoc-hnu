-- ==============================================================================
-- GDGoC HNU OS — Migration 007: Certificates & Templates
-- Step 1.7 of Phase 1 (Database Schema)
-- Spec reference: §3.5, §4.14
-- ==============================================================================

-- 1. Create certificate number sequence
CREATE SEQUENCE IF NOT EXISTS certificate_number_seq START 1;

-- 2. Create certificate_templates table
CREATE TABLE IF NOT EXISTS public.certificate_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    background_image_drive_file_id TEXT,
    field_layout JSONB DEFAULT '{}'::jsonb NOT NULL, -- x/y coords for name, title, date, signature, qr
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
    recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    certificate_number TEXT UNIQUE NOT NULL DEFAULT ('GDGOC-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('certificate_number_seq')::TEXT, 6, '0')),
    verification_code UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    pdf_drive_file_id TEXT,
    pdf_drive_url TEXT,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Attach updated_at trigger to templates
DROP TRIGGER IF EXISTS tr_cert_templates_updated_at ON public.certificate_templates;
CREATE TRIGGER tr_cert_templates_updated_at
    BEFORE UPDATE ON public.certificate_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 5. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_certificates_recipient ON public.certificates(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_certificates_event ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verify_code ON public.certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_num ON public.certificates(certificate_number);
