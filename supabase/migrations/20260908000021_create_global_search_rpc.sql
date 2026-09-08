-- ==============================================================================
-- GDGoC HNU OS — Migration 021: Global Search Full-Text Search RPC
-- Phase 12 — Step 12.1
-- Spec reference: §4.19
-- ==============================================================================

-- 1. Full-text search GIN indexes for fast text search
CREATE INDEX IF NOT EXISTS idx_tasks_fts 
    ON public.tasks 
    USING gin(to_tsvector('simple', title || ' ' || coalesce(description, '')));

CREATE INDEX IF NOT EXISTS idx_profiles_fts 
    ON public.profiles 
    USING gin(to_tsvector('simple', coalesce(full_name_en, '') || ' ' || coalesce(full_name_ar, '') || ' ' || coalesce(email, '')));

CREATE INDEX IF NOT EXISTS idx_events_fts 
    ON public.events 
    USING gin(to_tsvector('simple', title || ' ' || coalesce(description, '') || ' ' || coalesce(venue, '')));

CREATE INDEX IF NOT EXISTS idx_pr_contacts_fts 
    ON public.pr_contacts 
    USING gin(to_tsvector('simple', name || ' ' || coalesce(organization, '') || ' ' || coalesce(role_title, '')));

-- 2. Drop existing global_search function if any
DROP FUNCTION IF EXISTS public.global_search(TEXT, INT);

-- 3. Create global_search function (SECURITY INVOKER guarantees RLS enforcement)
CREATE OR REPLACE FUNCTION public.global_search(
    search_query TEXT,
    result_limit INT DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    entity_type TEXT, -- 'task', 'member', 'event', 'pr_contact'
    title TEXT,
    subtitle TEXT,
    description TEXT,
    url TEXT,
    metadata JSONB,
    rank REAL
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    clean_query TEXT;
    search_pattern TEXT;
    ts_query tsquery;
BEGIN
    clean_query := trim(search_query);
    IF clean_query = '' OR clean_query IS NULL THEN
        RETURN;
    END IF;

    search_pattern := '%' || clean_query || '%';
    
    -- Attempt plainto_tsquery for simple dictionary
    BEGIN
        ts_query := plainto_tsquery('simple', clean_query);
    EXCEPTION WHEN OTHERS THEN
        ts_query := NULL;
    END;

    RETURN QUERY
    WITH all_matches AS (
        -- 1. Tasks
        SELECT
            t.id AS id,
            'task'::TEXT AS entity_type,
            t.title AS title,
            ('Task • ' || t.status::TEXT || ' • ' || t.priority::TEXT) AS subtitle,
            coalesce(t.description, '') AS description,
            ('/tasks') AS url,
            jsonb_build_object(
                'status', t.status,
                'priority', t.priority,
                'deadline', t.deadline,
                'department_id', t.department_id
            ) AS metadata,
            CASE
                WHEN t.title ILIKE clean_query THEN 1.0::REAL
                WHEN t.title ILIKE search_pattern THEN 0.8::REAL
                WHEN t.description ILIKE search_pattern THEN 0.5::REAL
                ELSE 0.3::REAL
            END AS rank
        FROM public.tasks t
        WHERE
            t.title ILIKE search_pattern
            OR (t.description IS NOT NULL AND t.description ILIKE search_pattern)
            OR (ts_query IS NOT NULL AND to_tsvector('simple', t.title || ' ' || coalesce(t.description, '')) @@ ts_query)

        UNION ALL

        -- 2. Members
        SELECT
            p.id AS id,
            'member'::TEXT AS entity_type,
            coalesce(nullif(p.full_name_en, ''), nullif(p.full_name_ar, ''), 'Member') AS title,
            (p.role::TEXT || coalesce(' • ' || nullif(p.faculty, ''), '')) AS subtitle,
            coalesce(p.email, '') AS description,
            ('/members/' || p.id::TEXT) AS url,
            jsonb_build_object(
                'role', p.role,
                'email', p.email,
                'avatar_url', p.avatar_url,
                'status', p.status,
                'full_name_ar', p.full_name_ar,
                'full_name_en', p.full_name_en
            ) AS metadata,
            CASE
                WHEN p.full_name_en ILIKE clean_query OR p.full_name_ar ILIKE clean_query THEN 1.0::REAL
                WHEN p.full_name_en ILIKE search_pattern OR p.full_name_ar ILIKE search_pattern THEN 0.8::REAL
                WHEN p.email ILIKE search_pattern THEN 0.7::REAL
                ELSE 0.4::REAL
            END AS rank
        FROM public.profiles p
        WHERE
            p.status IN ('active', 'alumni')
            AND (
                p.full_name_en ILIKE search_pattern
                OR p.full_name_ar ILIKE search_pattern
                OR p.email ILIKE search_pattern
                OR (ts_query IS NOT NULL AND to_tsvector('simple', coalesce(p.full_name_en, '') || ' ' || coalesce(p.full_name_ar, '') || ' ' || coalesce(p.email, '')) @@ ts_query)
            )

        UNION ALL

        -- 3. Events
        SELECT
            e.id AS id,
            'event'::TEXT AS entity_type,
            e.title AS title,
            ('Event • ' || e.status::TEXT || coalesce(' • ' || nullif(e.venue, ''), '')) AS subtitle,
            coalesce(e.description, '') AS description,
            ('/events/' || e.id::TEXT) AS url,
            jsonb_build_object(
                'status', e.status,
                'event_date', e.event_date,
                'venue', e.venue,
                'slug', e.slug
            ) AS metadata,
            CASE
                WHEN e.title ILIKE clean_query THEN 1.0::REAL
                WHEN e.title ILIKE search_pattern THEN 0.8::REAL
                WHEN e.description ILIKE search_pattern THEN 0.5::REAL
                ELSE 0.3::REAL
            END AS rank
        FROM public.events e
        WHERE
            e.title ILIKE search_pattern
            OR (e.description IS NOT NULL AND e.description ILIKE search_pattern)
            OR (e.venue IS NOT NULL AND e.venue ILIKE search_pattern)
            OR (ts_query IS NOT NULL AND to_tsvector('simple', e.title || ' ' || coalesce(e.description, '') || ' ' || coalesce(e.venue, '')) @@ ts_query)

        UNION ALL

        -- 4. PR Contacts
        SELECT
            c.id AS id,
            'pr_contact'::TEXT AS entity_type,
            c.name AS title,
            (c.type || ' • ' || c.pipeline_stage || coalesce(' at ' || nullif(c.organization, ''), '')) AS subtitle,
            coalesce(c.role_title, coalesce(c.notes, '')) AS description,
            ('/pr') AS url,
            jsonb_build_object(
                'type', c.type,
                'pipeline_stage', c.pipeline_stage,
                'organization', c.organization,
                'role_title', c.role_title,
                'email', c.email,
                'phone', c.phone
            ) AS metadata,
            CASE
                WHEN c.name ILIKE clean_query THEN 1.0::REAL
                WHEN c.name ILIKE search_pattern THEN 0.8::REAL
                WHEN c.organization ILIKE search_pattern THEN 0.7::REAL
                ELSE 0.4::REAL
            END AS rank
        FROM public.pr_contacts c
        WHERE
            c.name ILIKE search_pattern
            OR (c.organization IS NOT NULL AND c.organization ILIKE search_pattern)
            OR (c.role_title IS NOT NULL AND c.role_title ILIKE search_pattern)
            OR (c.notes IS NOT NULL AND c.notes ILIKE search_pattern)
            OR (ts_query IS NOT NULL AND to_tsvector('simple', c.name || ' ' || coalesce(c.organization, '') || ' ' || coalesce(c.role_title, '')) @@ ts_query)
    )
    SELECT
        m.id,
        m.entity_type,
        m.title,
        m.subtitle,
        m.description,
        m.url,
        m.metadata,
        m.rank
    FROM all_matches m
    ORDER BY m.rank DESC, m.title ASC
    LIMIT result_limit;
END;
$$;

-- 4. Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(TEXT, INT) TO anon;
