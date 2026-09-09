-- ==============================================================================
-- GDGoC HNU OS — Migration 027: Public Chapter Stats Aggregate-Only RPC
-- Phase 21 — Step 21.1
-- Spec reference: §4.21
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_public_chapter_stats();

CREATE OR REPLACE FUNCTION public.get_public_chapter_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_count INT;
    v_events_held INT;
    v_total_attendance INT;
    v_certificates_issued INT;
    v_active_committees INT;
    v_top_badge_name TEXT;
    v_top_badge_count INT;
    v_result JSONB;
BEGIN
    -- 1. Total active members
    SELECT COUNT(*)::INT INTO v_member_count
    FROM public.profiles
    WHERE status = 'active';

    -- 2. Events held (published or completed)
    SELECT COUNT(*)::INT INTO v_events_held
    FROM public.events
    WHERE status IN ('published', 'completed');

    -- 3. Total verified attendance across all events
    SELECT COUNT(*)::INT INTO v_total_attendance
    FROM public.attendance
    WHERE status = 'present';

    -- 4. Certificates issued
    SELECT COUNT(*)::INT INTO v_certificates_issued
    FROM public.certificates;

    -- 5. Active committees count
    SELECT COUNT(*)::INT INTO v_active_committees
    FROM public.departments;

    -- 6. Standout achievement: most frequently earned badge
    SELECT b.name, COUNT(mb.id)::INT
    INTO v_top_badge_name, v_top_badge_count
    FROM public.member_badges mb
    JOIN public.badges b ON b.id = mb.badge_id
    GROUP BY b.name
    ORDER BY COUNT(mb.id) DESC
    LIMIT 1;

    -- Assemble clean aggregated JSON with ZERO PII
    v_result := jsonb_build_object(
        'memberCount', COALESCE(v_member_count, 0),
        'eventsHeld', COALESCE(v_events_held, 0),
        'totalAttendance', COALESCE(v_total_attendance, 0),
        'certificatesIssued', COALESCE(v_certificates_issued, 0),
        'activeCommittees', COALESCE(v_active_committees, 0),
        'standoutAchievement', jsonb_build_object(
            'badgeName', COALESCE(v_top_badge_name, 'Chapter Pioneer'),
            'timesEarned', COALESCE(v_top_badge_count, 0)
        ),
        'generatedAt', NOW()
    );

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to public / anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_chapter_stats() TO anon, authenticated, service_role;
