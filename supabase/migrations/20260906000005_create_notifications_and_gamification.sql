-- ==============================================================================
-- GDGoC HNU OS — Migration 005: Notifications & Gamification Engine
-- Step 1.5 of Phase 1 (Database Schema)
-- Spec reference: §3.3, §4.11, §4.13
-- ==============================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- account_approval, task_review, event_submitted, badge_awarded, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT, -- task, event, account, badge, certificate
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create point_rules table
CREATE TABLE IF NOT EXISTS public.point_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    points INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Create points_log table
CREATE TABLE IF NOT EXISTS public.points_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.point_rules(id) ON DELETE SET NULL,
    action_key TEXT NOT NULL,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    season TEXT NOT NULL DEFAULT '2026-Fall',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    category TEXT NOT NULL DEFAULT 'milestone', -- milestone, attendance, leadership, special
    tier TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum, diamond
    points_reward INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Create member_badges table
CREATE TABLE IF NOT EXISTS public.member_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    notes TEXT,
    CONSTRAINT uq_member_badge UNIQUE (profile_id, badge_id)
);

-- 6. Attach updated_at triggers
DROP TRIGGER IF EXISTS tr_point_rules_updated_at ON public.point_rules;
CREATE TRIGGER tr_point_rules_updated_at
    BEFORE UPDATE ON public.point_rules
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- 7. High-performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(profile_id, is_read);
CREATE INDEX IF NOT EXISTS idx_points_log_profile ON public.points_log(profile_id);
CREATE INDEX IF NOT EXISTS idx_points_log_season ON public.points_log(season);
CREATE INDEX IF NOT EXISTS idx_member_badges_profile ON public.member_badges(profile_id);

-- 8. Seed Initial Point Rules (Tunable by President)
INSERT INTO public.point_rules (action_key, title, description, points)
VALUES
    ('task_completed_on_time', 'Task Completed On-Time', 'Awarded when an assigned task is completed on or before deadline', 25),
    ('task_completed', 'Task Completed', 'Awarded upon general task completion approval', 15),
    ('event_attended', 'Event Attendance', 'Awarded when attendee check-in is verified via QR', 30),
    ('event_speaker_confirmed', 'Confirmed Speaker (PR)', 'Awarded to PR team member for securing an external speaker', 50),
    ('media_coverage_completed', 'Event Media Coverage', 'Awarded for uploading and organizing full event photos/videos', 20),
    ('onboarding_completed', 'Profile & Onboarding Complete', 'Awarded upon initial profile approval and setup checklist completion', 10)
ON CONFLICT (action_key) DO NOTHING;

-- 9. Seed Initial Badge Catalog (from Spec §4.13)
INSERT INTO public.badges (code, name, description, category, tier, points_reward)
VALUES
    ('onboarded', 'Official Chapter Member', 'Completed onboarding checklist and joined committee', 'milestone', 'bronze', 10),
    ('first_event', 'First Event', 'Attended your first GDGoC HNU chapter event', 'attendance', 'bronze', 20),
    ('ten_tasks_done', '10 Tasks Done', 'Successfully executed 10 assigned tasks to completion', 'milestone', 'silver', 50),
    ('perfect_month', 'Perfect Attendance Month', 'Attended 100% of chapter events in a single calendar month', 'attendance', 'gold', 100),
    ('mentor', 'Chapter Mentor', 'Mentored newer members and contributed to technical workshops', 'leadership', 'platinum', 150),
    ('event_mvp', 'Event MVP', 'Recognized by Committee Heads as a standout contributor during an event', 'special', 'gold', 75),
    ('speaker_whisperer', 'Speaker Whisperer', 'Successfully negotiated and confirmed high-profile industry speakers', 'leadership', 'silver', 60)
ON CONFLICT (code) DO NOTHING;
