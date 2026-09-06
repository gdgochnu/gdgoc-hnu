-- ==============================================================================
-- GDGoC HNU OS — Migration 009: Comprehensive Row Level Security (RLS)
-- Step 1.9 of Phase 1 (Database Schema)
-- Spec reference: §3.8, §9.2, §9.9
-- ==============================================================================

-- ==============================================================================
-- 1. Helper Security Functions (STABLE, SECURITY DEFINER to avoid RLS recursion)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_dept()
RETURNS UUID AS $$
    SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_member()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_president_or_co()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND role IN ('president', 'co_president')
          AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_branch_head_of(target_dept_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles p
        JOIN public.departments my_dept ON p.department_id = my_dept.id
        JOIN public.departments target_dept ON target_dept.id = target_dept_id
        WHERE p.id = auth.uid()
          AND p.role = 'branch_head'
          AND p.status = 'active'
          AND my_dept.branch = target_dept.branch
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_committee_head_of(target_dept_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND department_id = target_dept_id
          AND role IN ('committee_head', 'committee_co_head')
          AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_department_member(target_dept_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
          AND department_id = target_dept_id
          AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Master cascade access check for department-scoped resources
CREATE OR REPLACE FUNCTION public.can_access_dept_data(target_dept_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF public.is_president_or_co() THEN
        RETURN TRUE;
    END IF;
    IF public.is_branch_head_of(target_dept_id) THEN
        RETURN TRUE;
    END IF;
    IF public.is_department_member(target_dept_id) THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 2. Enable RLS on ALL 24 Tables
-- ==============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_instance_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_folder_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. Explicit Policies per Table
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1 departments
-- ------------------------------------------------------------------------------
CREATE POLICY "departments_select_policy" ON public.departments
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "departments_insert_policy" ON public.departments
    FOR INSERT TO authenticated
    WITH CHECK (public.is_president_or_co());

CREATE POLICY "departments_update_policy" ON public.departments
    FOR UPDATE TO authenticated
    USING (public.is_president_or_co())
    WITH CHECK (public.is_president_or_co());

CREATE POLICY "departments_delete_policy" ON public.departments
    FOR DELETE TO authenticated
    USING (public.is_president_or_co());

-- ------------------------------------------------------------------------------
-- 3.2 profiles
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.is_president_or_co()
        OR (public.is_active_member() AND department_id IS NOT NULL AND public.can_access_dept_data(department_id))
    );

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_president_or_co())
    WITH CHECK (id = auth.uid() OR public.is_president_or_co());

-- ------------------------------------------------------------------------------
-- 3.3 tasks
-- ------------------------------------------------------------------------------
CREATE POLICY "tasks_select_policy" ON public.tasks
    FOR SELECT TO authenticated
    USING (public.can_access_dept_data(department_id));

CREATE POLICY "tasks_insert_policy" ON public.tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
    );

CREATE POLICY "tasks_update_policy" ON public.tasks
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
        OR assignee_id = auth.uid()
    )
    WITH CHECK (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
        OR assignee_id = auth.uid()
    );

CREATE POLICY "tasks_delete_policy" ON public.tasks
    FOR DELETE TO authenticated
    USING (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
    );

-- ------------------------------------------------------------------------------
-- 3.4 task_comments
-- ------------------------------------------------------------------------------
CREATE POLICY "task_comments_select_policy" ON public.task_comments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id AND public.can_access_dept_data(t.department_id)
        )
    );

CREATE POLICY "task_comments_insert_policy" ON public.task_comments
    FOR INSERT TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id AND public.can_access_dept_data(t.department_id)
        )
    );

-- ------------------------------------------------------------------------------
-- 3.5 events
-- ------------------------------------------------------------------------------
CREATE POLICY "events_select_policy" ON public.events
    FOR SELECT TO authenticated, anon
    USING (
        status = 'published'
        OR (auth.role() = 'authenticated' AND public.can_access_dept_data(department_id))
    );

CREATE POLICY "events_insert_policy" ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
    );

CREATE POLICY "events_update_policy" ON public.events
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR public.is_branch_head_of(department_id)
        OR public.is_committee_head_of(department_id)
    );

-- ------------------------------------------------------------------------------
-- 3.6 event_registrations
-- ------------------------------------------------------------------------------
CREATE POLICY "event_registrations_select_policy" ON public.event_registrations
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'HR'
        )
    );

CREATE POLICY "event_registrations_insert_policy" ON public.event_registrations
    FOR INSERT TO authenticated, anon
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3.7 attendance
-- ------------------------------------------------------------------------------
CREATE POLICY "attendance_select_policy" ON public.attendance
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'HR'
        )
    );

CREATE POLICY "attendance_insert_policy" ON public.attendance
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'HR'
        )
    );

-- ------------------------------------------------------------------------------
-- 3.8 performance_reviews
-- ------------------------------------------------------------------------------
CREATE POLICY "perf_reviews_select_policy" ON public.performance_reviews
    FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid()
        OR public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'HR'
        )
    );

CREATE POLICY "perf_reviews_insert_update_policy" ON public.performance_reviews
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'HR'
        )
    );

-- ------------------------------------------------------------------------------
-- 3.9 pr_contacts & pr_interactions
-- ------------------------------------------------------------------------------
CREATE POLICY "pr_contacts_policy" ON public.pr_contacts
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'PR'
        )
    );

CREATE POLICY "pr_interactions_policy" ON public.pr_interactions
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'PR'
        )
    );

-- ------------------------------------------------------------------------------
-- 3.10 media_content & media_assets
-- ------------------------------------------------------------------------------
CREATE POLICY "media_content_policy" ON public.media_content
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'MEDIA'
        )
    );

CREATE POLICY "media_assets_select_policy" ON public.media_assets
    FOR SELECT TO authenticated
    USING (public.is_active_member());

CREATE POLICY "media_assets_write_policy" ON public.media_assets
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'MEDIA'
        )
    );

-- ------------------------------------------------------------------------------
-- 3.11 operations_checklist_items
-- ------------------------------------------------------------------------------
CREATE POLICY "operations_checklists_policy" ON public.operations_checklist_items
    FOR ALL TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.departments d
            JOIN public.profiles p ON p.department_id = d.id
            WHERE p.id = auth.uid() AND d.code = 'OPS'
        )
        OR assigned_to = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 3.12 notifications
-- ------------------------------------------------------------------------------
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3.13 point_rules & points_log
-- ------------------------------------------------------------------------------
CREATE POLICY "point_rules_select_policy" ON public.point_rules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "point_rules_write_policy" ON public.point_rules
    FOR ALL TO authenticated
    USING (public.is_president_or_co());

CREATE POLICY "points_log_select_policy" ON public.points_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "points_log_insert_policy" ON public.points_log
    FOR INSERT TO authenticated
    WITH CHECK (public.is_president_or_co() OR public.is_active_member());

-- ------------------------------------------------------------------------------
-- 3.14 badges & member_badges
-- ------------------------------------------------------------------------------
CREATE POLICY "badges_select_policy" ON public.badges
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "badges_write_policy" ON public.badges
    FOR ALL TO authenticated
    USING (public.is_president_or_co());

CREATE POLICY "member_badges_select_policy" ON public.member_badges
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "member_badges_insert_policy" ON public.member_badges
    FOR INSERT TO authenticated
    WITH CHECK (public.is_president_or_co());

-- ------------------------------------------------------------------------------
-- 3.15 approval_instances & approval_instance_steps
-- ------------------------------------------------------------------------------
CREATE POLICY "approval_instances_select_policy" ON public.approval_instances
    FOR SELECT TO authenticated
    USING (
        public.is_president_or_co()
        OR EXISTS (
            SELECT 1 FROM public.approval_instance_steps s
            WHERE s.instance_id = id AND (s.resolved_approver_id = auth.uid() OR public.is_president_or_co())
        )
    );

CREATE POLICY "approval_instances_write_policy" ON public.approval_instances
    FOR ALL TO authenticated
    USING (public.is_active_member());

CREATE POLICY "approval_steps_select_policy" ON public.approval_instance_steps
    FOR SELECT TO authenticated
    USING (
        public.is_president_or_co()
        OR resolved_approver_id = auth.uid()
    );

CREATE POLICY "approval_steps_update_policy" ON public.approval_instance_steps
    FOR UPDATE TO authenticated
    USING (
        public.is_president_or_co()
        OR resolved_approver_id = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 3.16 certificate_templates & certificates
-- ------------------------------------------------------------------------------
CREATE POLICY "cert_templates_policy" ON public.certificate_templates
    FOR ALL TO authenticated
    USING (public.is_president_or_co());

CREATE POLICY "certificates_select_policy" ON public.certificates
    FOR SELECT TO authenticated
    USING (
        recipient_profile_id = auth.uid()
        OR public.is_president_or_co()
    );

CREATE POLICY "certificates_write_policy" ON public.certificates
    FOR ALL TO authenticated
    USING (public.is_president_or_co());

-- Public RPC for Certificate Verification (No direct table access for anon)
CREATE OR REPLACE FUNCTION public.verify_certificate(lookup_code UUID)
RETURNS TABLE (
    is_valid BOOLEAN,
    certificate_number TEXT,
    recipient_name TEXT,
    title TEXT,
    issue_date DATE,
    pdf_drive_url TEXT
) AS $$
    SELECT 
        TRUE AS is_valid,
        c.certificate_number,
        c.recipient_name,
        c.title,
        c.issue_date,
        c.pdf_drive_url
    FROM public.certificates c
    WHERE c.verification_code = lookup_code;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3.17 drive_folder_map
-- ------------------------------------------------------------------------------
CREATE POLICY "drive_map_select_policy" ON public.drive_folder_map
    FOR SELECT TO authenticated
    USING (public.is_president_or_co() OR public.is_active_member());

CREATE POLICY "drive_map_write_policy" ON public.drive_folder_map
    FOR ALL TO authenticated
    USING (public.is_president_or_co());

-- ------------------------------------------------------------------------------
-- 3.18 audit_logs (append-only, readable only by President/Co-President)
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_president_or_co());

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 4. RLS Verification Inspector (Queries PostgreSQL Internal Catalogs)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (
    table_name TEXT,
    is_rls_enabled BOOLEAN,
    policy_count BIGINT
) AS $$
    SELECT 
        c.relname::text AS table_name,
        c.relrowsecurity AS is_rls_enabled,
        COUNT(p.polname) AS policy_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_policy p ON p.polrelid = c.oid
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r'
    GROUP BY c.relname, c.relrowsecurity
    ORDER BY c.relname;
$$ LANGUAGE sql SECURITY DEFINER;

