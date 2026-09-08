# GDGoC HNU OS — Agent Build Checklist (v3)

> Companion to `GDGoC_HNU_OS_SPEC.md` v4 (the full spec — read it first, and re-read the relevant section before each step below). This file is the **execution plan**: small, sequential, independently-verifiable steps.
>
> **v3 note:** Phases 0–7 below were already completed by a previous agent session (checked off with dates). New requirements arrived in v4:
> 1. **Phase P — ACTIVE NOW:** Profile fields update (Arabic/English 4-part names, 14-digit National ID, Faculty dropdown, WhatsApp, social links) + `faculty_options` table + President faculty management (`/settings/faculties`). This is the immediate prerequisite.
> 2. **Phases 8–24:** Core Team OS execution (Events, Attendance, CRM, Approvals, Gamification, Drive, etc.).
> 3. **Phase S — UPCOMING / NOT ACTIVE NOW:** Student Portal System (spec §4.S) — completely separate system for university students (accounts, courses, workshops, QR check-in by HR, instructor tasks, certificates). Scheduled after Team OS completion.
> 4. **Phase 25:** Final QA across all systems.
>
> **Execution Order:** Phase P ➡️ Phases 8–24 (Team OS) ➡️ Phase S (Student Portal: S.A → S.F) ➡️ Phase 25.

## ⚠️ Working Protocol (read this before starting)

1. **Work on exactly ONE unchecked step at a time.** Never batch multiple steps into a single silent pass.
2. When a step is done, **stop and report** to the project owner: what you built, which files changed, and — critically — **how they can verify it themselves** (a URL to open, a command to run, a screen to look at).
3. **Wait for explicit confirmation** from the project owner (e.g. "tamam", "done", "next", "✅") before touching the next step. Do not assume silence means approval.
4. Once confirmed, **check the box** for that step in this file (`[ ]` → `[x]`) and add the date, then move to the next unchecked step in order.
5. If a step reveals that an earlier step needs a fix, stop, fix it, get it re-confirmed, and only then continue forward — never paper over a broken earlier step to keep moving.
6. Steps are ordered by dependency (matches §11 of the spec) — do not skip ahead even if a later step looks easy.

---

## Phase 0 — Project Setup ✅ (completed)
- [x] 0.1 Initialize Next.js project (PWA-enabled) + repo structure, confirm it runs locally. (2026-09-06)
- [x] 0.2 Create the Supabase project, connect it to the app via environment variables (no secrets committed). (2026-09-06)
- [x] 0.3 Enable Google as an OAuth provider in Supabase Auth (client ID/secret configured). (2026-09-06)

> **Note added in v2:** Vercel deployment steps (0.4–0.6 in the spec's recommended setup) were not part of the original Phase 0 — add them now if not already done: push repo to GitHub, connect to Vercel, add env vars from spec §10.2, set up a staging Supabase project for previews. Confirm with the project owner before marking as done.
- [x] 0.4 Push the repo to GitHub and connect it to a new Vercel project; confirm the skeleton app deploys successfully to a live Vercel URL. (2026-09-07)
- [x] 0.5 Add all environment variables from spec §10.2 to the Vercel project (Production + Preview), confirm none are committed to the repo. (2026-09-07)
- [x] 0.6 Set up a separate staging Supabase project and confirm Vercel Preview deployments point to it, not production data. (2026-09-07)

## Phase 1 — Database Schema & RLS ✅ (completed)
- [x] 1.1 Create `departments`, `profiles` tables + `user_role`/`department_branch` enums (spec §3.1–§3.2). (2026-09-06)
- [x] 1.2 Create `tasks`, `task_comments` tables (spec §3.3). (2026-09-06)
- [x] 1.3 Create `events`, `event_registrations`, `attendance` tables (spec §3.3). (2026-09-06)
- [x] 1.4 Create `performance_reviews`, `pr_contacts`, `pr_interactions`, `media_content`, `media_assets`, `operations_checklist_items` tables. (2026-09-06)
- [x] 1.5 Create `notifications`, `badges`, `member_badges`, `points_log`, `point_rules` tables. (2026-09-06)
- [x] 1.6 Create the approval engine tables: `approval_instances`, `approval_instance_steps` (spec §3.13). (2026-09-06)
- [x] 1.7 Create `certificate_templates`, `certificates` tables (spec §3.14). (2026-09-06)
- [x] 1.8 Create `drive_folder_map` and `audit_logs` tables (spec §3.15–§3.16). (2026-09-06)
- [x] 1.9 Write and apply RLS policies for every table above (spec §3.17) — no table left without an explicit policy. (2026-09-06)
- [x] 1.10 Verify with a quick manual test: a second test user genuinely cannot `SELECT` another committee's `tasks` row via the anon/authenticated client. (2026-09-06)

> **Schema additions needed in v2** (new tables/columns — build in Phase 6+ alongside their features): `tasks.event_id`/`parent_task_id`/`assignment_mode`/`delegated_by_id`, `task_assignees`, `events.checkin_access_profile_ids`/`gcal_event_id`, `onboarding_checklist_templates`, `onboarding_checklist_items`, `profiles.status='alumni'`/`left_at`/`leave_reason`, `event_feedback`, `event_budget_items`. See spec §3 for exact columns.

> **Schema additions needed in v4** (new in this update — build alongside their features in the phases below): `faculty_options` (Phase P.1), updated `profiles` columns (Phase P.2 migration), Student Portal tables `student_profiles`, `courses`, `course_sessions`, `course_enrollments`, `workshops`, `workshop_registrations`, `student_attendance`, `student_tasks`, `student_task_submissions`, `student_certificates` (Student Portal Phases A–F). See spec §3, §4.S.10 for exact columns.

## Phase 2 — Auth & Onboarding ✅ (completed)
- [x] 2.1 Build the landing page + "Sign in with Google" button. (2026-09-06)
- [x] 2.2 Build the trigger that creates a `profiles` row (`status='incomplete'`) on first sign-in. (2026-09-06)
- [x] 2.3 Build the "Complete Your Profile" form (all fields from spec §2.2) and the submit → `pending_review` transition. (2026-09-06)
- [x] 2.4 Build the Approvals inbox screen for President/Co-President: list pending accounts, Approve / Reject / Request-changes actions. (2026-09-06)
- [x] 2.5 Build the account status page (`/onboarding/status`) shown to non-active users. (2026-09-06)
- [x] 2.6 Wire up welcome/rejection/changes-requested notifications + emails. (2026-09-06)
- [x] 2.7 Build the Suspend/Reactivate action for President/Co-President/Heads. (2026-09-06)

> **v4 note:** The profile fields from spec §2.2 have been updated (Arabic/English names, National ID, Faculty dropdown, WhatsApp, social media). Phase P below covers the migration + updated form. The existing Phase 2 checks remain since the original form was built — the field updates are tracked separately in Phase P.

## Phase 3 — Committee & Member Management ✅ (completed)
- [x] 3.1 Build `/settings/committees` (President-only): create/edit committees, assign Head/Co-Head. (2026-09-06)
- [x] 3.2 Build the role-aware app shell/navigation (menu items differ per role). (2026-09-06)
- [x] 3.3 Build `/members` directory (scoped by RLS) with filters. (2026-09-06)
- [x] 3.4 Build `/members/[id]` profile page (base info tabs only for now — performance/certificates tabs come later). (2026-09-06)

## Phase 4 — Generic Approval/Escalation Engine ✅ (completed)
- [x] 4.1 Implement the dynamic step-generation algorithm from spec §4.2 part C (committee-head → branch-head → president/co-president, skip-aware). (2026-09-06)
- [x] 4.2 Build the reusable "Approval stage tracker" UI component (shows current stage, history, Approve/Reject/Request-changes buttons for whoever is the current approver). (2026-09-06)
- [x] 4.3 Wire `audit_logs` writes into every approve/reject/request-changes action. (2026-09-06)

## Phase 5 — Tasks (basic, single-assignee) ✅ (completed)
- [x] 5.1 Build the Kanban board (To Do/In Progress/Review/Done) scoped per committee. (2026-09-06)
- [x] 5.2 Build task creation/assignment (Heads/Co-Heads/Branch Heads/President/Co-President only). (2026-09-06)
- [x] 5.3 Wire "move to Review" → creates an `approval_instances` row using the Phase 4 engine. (2026-09-06)
- [x] 5.4 Build task detail page with comment thread + evidence upload + the stage tracker component. (2026-09-06)
- [x] 5.5 Confirm end-to-end: a Member's task escalates Head → Branch Head → President/Co-President and correctly reaches `done`. (2026-09-06)

---

## Phase 6 — Task Delegation & Broadcast Assignment Upgrade (spec §4.2 parts A & B) ✅ (completed)
*This must be built before Phase 8 (Events), since events will link to tasks created by this upgraded system.*
- [x] 6.1 Migrate the `tasks` table: add `event_id`, `parent_task_id`, `assignment_mode`, `delegated_by_id`; create the `task_assignees` table (spec §3.3). (2026-09-07)
- [x] 6.2 Build **Broadcast assignment**: when creating a task, let the creator pick `assignment_mode = broadcast` + a target committee; generate a `task_assignees` row per member; each member gets their own independent To Do/In Progress/Submitted status + evidence on their personal task view. (2026-09-07)
- [x] 6.3 Build the task owner's **"Review submissions" screen** for a broadcast task: see every member's submission side-by-side, pick/write a consolidated best answer, attach it as the task's own evidence, move the task to `Review`. (2026-09-07)
- [x] 6.4 Build the **"Delegate" action** on a task detail page (visible only to assignees who have people below them): choose a recipient (single person / a specific Head one level down / broadcast to a chosen committee), add optional notes, and create the child task (`parent_task_id` set, original task status → `delegated`). (2026-09-07)
- [x] 6.5 Wire the **upward auto-submit**: when a child task is marked done/submitted, automatically flip its `parent_task_id` task to `Review` and notify whoever delegated it, repeating until the chain reaches the original root creator for final closure. (2026-09-07)
- [x] 6.6 Confirm end-to-end with the exact scenario from the spec: President creates a task for the Non-Tech Head → Non-Tech Head delegates to the Media Head (with notes) → Media Head broadcasts to all Media members → members submit → Media Head picks the best and submits up → Non-Tech Head reviews and submits up → President gives final approval → task closes `Done`. (2026-09-07)
- [x] 6.7 Confirm the original fixed 3-stage escalation chain (spec §4.2 part C) still works unchanged for a task that is assigned directly to one Member and never delegated further. (2026-09-07)

## Phase 7 — Low-Dependency Feature Additions ✅ (completed)
- [x] 7.1 Build the **New-Member Onboarding Checklist** (spec §4.15): `onboarding_checklist_templates` + `onboarding_checklist_items` tables, auto-generate a checklist on account approval, progress widget on the Member dashboard, "Onboarded" badge on completion. (2026-09-07)
- [x] 7.2 Build **Offboarding & Alumni Archive** (spec §4.16): add `alumni` to `profiles.status` + `left_at`/`leave_reason`, the "Move to Alumni" action (Head recommends, President/Co-President confirms — same pattern as account approval), and the read-only `/members/alumni` directory. (2026-09-07)
- [x] 7.3 Apply the **Dark Mode** theme (spec §7) as the platform's single design theme across all existing screens built so far. (2026-09-07)

## ▶️ ACTIVE NOW — Phase P — Profile Fields Update & Faculty Options Management (v4 new)
*Read spec §2.2, §3.2, §3.3 (`faculty_options`), and `implementation_plan.md` before starting. This is the immediate prerequisite before Phase 8 (Events) since profile data is used org-wide.*
- [x] P.1 **Create `faculty_options` table & RLS**: (2026-09-07)
  - File: `supabase/migrations/20260907000015_create_faculty_options.sql`
  - Columns: `id (uuid PK)`, `name_ar (text)`, `name_en (text)`, `sort_order (int)`, `is_active (bool default true)`, `created_at (timestamptz)`, `updated_at (timestamptz)`.
  - Seed initial HNU faculties (Engineering Helwan, Computers & AI, Science, Commerce, Applied Arts, Technology & Education).
  - RLS: Readable by all authenticated users; INSERT/UPDATE/DELETE strictly restricted to Chapter President (`role = 'president'`).
- [x] P.2 **Supabase Migration for `profiles` Table Alterations (v4 schema)**: (2026-09-07)
  - File: `supabase/migrations/20260907000016_update_profiles_v4.sql`
  - Add columns: `full_name_ar (text)`, `full_name_en (text)`, `national_id (text unique)`, `whatsapp_number (text)`, `department_major (text)`, `academic_year (smallint 1-5)`, `facebook_url (text)`, `instagram_url (text)`, `linkedin_url (text)`.
  - Data preservation: Copy existing `full_name` data to `full_name_ar` and `full_name_en`; keep `full_name` synchronized/accessible for backward compatibility with existing Phases 0–7.
  - Move legacy `skills` and `portfolio_url` into `custom_fields` jsonb.
  - Update `handle_new_user()` trigger to populate both `full_name` and `full_name_en` from OAuth metadata seamlessly.
- [x] P.3 **Update Profile Types & "Complete Your Profile" Form**: (2026-09-07)
  - Update `src/types/index.ts` with `FacultyOption` interface and v4 `Profile` properties.
  - Update `/onboarding/complete-profile/actions.ts` with server-side validation: Arabic 4-part name (min 4 words), English 4-part name (min 4 words), National ID (14 digits Egyptian ID), valid Egyptian mobile & WhatsApp, academic year (1st–5th), department/major free text, faculty from active `faculty_options`, optional social links.
  - Update `src/app/onboarding/complete-profile/page.tsx` & `src/components/CompleteProfileForm.tsx`: Clean dark mode layout with Arabic/English inputs, dynamic faculty select, synced WhatsApp field, and validation feedback.
- [x] P.4 **Build `/settings/faculties` (President-Only Faculty Management)**: (2026-09-07)
  - Routes & Components: `src/app/settings/faculties/page.tsx`, `actions.ts`, and `src/components/FacultiesManagementClient.tsx`.
  - President-gated access (same authentication pattern as `/settings/committees`).
  - Faculty list displaying Arabic name, English name, sort order, and active/inactive status.
  - Add Faculty modal, Edit Faculty modal, quick Active/Inactive toggle, and sort order controls.
  - Instant cache revalidation so updates reflect immediately in the profile form dropdown.
- [x] P.5 **Update Member Profile Page (`/members/[id]`) & Account Approvals List**: (2026-09-07)
  - Update `src/components/MemberProfileView.tsx` & `src/app/members/[id]/page.tsx`: Display dual Arabic/English names, Faculty, Major, Academic Year, WhatsApp, and social media icons.
  - **Security Gate for National ID**: Strictly render National ID only if viewer is President, Co-President, or a member of the HR committee (`code === 'HR'`). Gated from regular members.
  - Update `src/components/AccountApprovalsList.tsx` so President and Leadership see complete v4 applicant details during review.
- [x] P.6 **Confirm End-to-End via Automated Verification Route & UI**: (2026-09-07)
  - Create test verification endpoint `src/app/api/test-phase-p/route.ts` validating: `faculty_options` CRUD, profile v4 schema, National ID uniqueness, privacy gating on National ID, and profile submission flow.
  - Manual UI verification: complete profile form → check `/settings/faculties` → check `/members/[id]`.

## Phase 8 — Events (full lifecycle, upgraded)
- [x] 8.1 Build the internal Event Builder (draft creation: details, capacity, custom registration fields, owners). (2026-09-07)
- [x] 8.2 Add the **Event Task List** to the event builder — create/link tasks with `tasks.event_id` set (reuses the Phase 6 task system, including delegation/broadcast). (2026-09-07)
- [x] 8.3 Build the **check-in access assignment** step: assigning the "Attendance Check-in" task to specific people also adds them to `events.checkin_access_profile_ids`. (2026-09-07)
- [x] 8.4 Wire "Submit for Review" → approval engine (Branch Head → President/Co-President stages). (2026-09-07)
- [x] 8.5 Build the event review/approval screen (`/events/[id]/review`). (2026-09-07)
- [x] 8.6 Build the "Publish" action (only enabled once `status = approved`). (2026-09-08)
- [x] 8.7 Build the Public Event Page (`/events/[slug]`) with the registration form. (2026-09-08)
- [x] 8.8 Build the registration confirmation page + QR-code email. (2026-09-08)
- [x] 8.9 Build the QR check-in screen (`/events/[id]/attendance`) — **gate access** so only profiles in `checkin_access_profile_ids` (plus HR role and President/Co-President) can open it for that specific event. (2026-09-08)
- [x] 8.10 Build walk-in manual check-in (search by name/phone/email). (2026-09-08)
- [x] 8.11 Build the auto/manual transition to `completed` after the event date. (2026-09-08)
- [x] 8.12 Confirm end-to-end: a Media Head with no check-in duty on Event X cannot open `/events/X/attendance`, while the specifically assigned HR member can. (2026-09-08)

## Phase 9 — Event Feedback & Budget (spec §4.18, §4.20)
- [x] 9.1 Create the `event_feedback` table; auto-send the survey (in-app + email) to all attendees when an event flips to `completed`. (2026-09-08)
- [x] 9.2 Build the feedback submission form (1–5 rating + comment, anonymous-by-default toggle). (2026-09-08)
- [ ] 9.3 Build the feedback results view on the event detail page (average score + comment highlights).
- [ ] 9.4 Create the `event_budget_items` table + the event budget tab (line items, estimated vs actual, receipt upload).
- [ ] 9.5 Wire the "actual spend exceeds estimate" flag into the President Command Center's "Needs Attention" feed (built fully in Phase 16).

## Phase 10 — HR Dashboard & Attendance
- [ ] 10.1 Build the HR dashboard KPI cards + event attendance view + export.
- [ ] 10.2 Build the org-wide Attendance Rate leaderboard (all roles, including Heads/President/Co-President).
- [ ] 10.3 Build low-engagement alerts + HR notes/follow-up log.
- [ ] 10.4 Build the monthly `performance_reviews` computation job.
- [ ] 10.5 Add the performance trend chart + attendance rate + certificates tab to every profile page.

## Phase 11 — PR CRM
- [ ] 11.1 Build Contacts + Pipeline (Kanban: new/contacted/negotiating/confirmed).
- [ ] 11.2 Build Follow-up + History (interaction log) per contact.
- [ ] 11.3 Build PR KPI widgets on the PR dashboard.

## Phase 12 — Global Search (spec §4.19)
- [ ] 12.1 Build the Postgres full-text search RPC across Tasks, Members, Events, and PR Contacts.
- [ ] 12.2 Build the search bar in the app header + the `/search` results page.
- [ ] 12.3 Confirm results are correctly scoped by the viewer's existing RLS permissions (no data leaks through search).

## Phase 13 — Google Drive Bridge
- [ ] 13.1 Create the root Drive folder + the Google Apps Script bound to it.
- [ ] 13.2 Deploy the Apps Script as a Web App exposing `ensureFolderPath`, `uploadFile`, `listFiles`, `deleteFile`, `getShareableLink`, secured by a shared secret token.
- [ ] 13.3 Build the server-side API Route/Server Action client that calls the Web App and stores results in `drive_folder_map`.
- [ ] 13.4 Build `/settings/drive` (President-only) to input/rotate the Web App URL + secret.
- [ ] 13.5 Confirm end-to-end: uploading a file from the app creates it in the correct auto-created Drive subfolder.

## Phase 14 — Google Calendar Integration (spec §4.17)
- [ ] 14.1 Enable the Google Calendar API on the same Google account/credentials as the Drive bridge; create the shared "GDGoC HNU" calendar.
- [ ] 14.2 Wire event publish/unpublish/edit to create/update/remove the corresponding Calendar entry.
- [ ] 14.3 Expose the shared calendar's subscribable link on the dashboard.
- [ ] 14.4 Add the "Add to my Google Calendar" one-click action on task deadlines (simple calendar link/.ics, no extra API scope).

## Phase 15 — Media Workspace & Operations
- [ ] 15.1 Build the Content Calendar.
- [ ] 15.2 Build the Central Media Library UI backed by the Drive bridge (browse/search/filter by committee/event/type).
- [ ] 15.3 Build Event Coverage checklists tied to the Drive `/Media-Coverage/` folder per event.
- [ ] 15.4 Build Operations checklists (Before/During/After) per event.

## Phase 16 — President Command Center
- [ ] 16.1 Build committee health scorecards.
- [ ] 16.2 Build the "Needs Attention" feed (overdue tasks, stalled approvals/delegations, PR follow-ups, inactive members, events over budget).
- [ ] 16.3 Build the "Upcoming" feed (synced with Google Calendar).
- [ ] 16.4 Build the weekly 5-question review widget for Heads + the feed of answers for the President.
- [ ] 16.5 Build the unified pending-approvals queue (accounts + tasks + events).
- [ ] 16.6 Build the new-member onboarding progress overview + average event satisfaction trend widgets.

## Phase 17 — Notifications
- [ ] 17.1 Build the in-app notification center (bell + unread badge).
- [ ] 17.2 Wire every trigger from spec §4.11's table (incl. delegation, broadcast assignment, check-in duty, onboarding checklist, feedback survey, budget alerts, alumni archived) to create a `notifications` row.
- [ ] 17.3 Wire email delivery via the chosen provider for the same triggers.

## Phase 18 — Reports
- [ ] 18.1 Build the weekly/monthly committee report generator.
- [ ] 18.2 Build event performance + attendance analytics reports (incl. feedback scores + budget summary).
- [ ] 18.3 Build PDF export.
- [ ] 18.4 Build Excel export.

## Phase 19 — Gamification
- [ ] 19.1 Build the `point_rules`-driven points engine (award points on the defined actions).
- [ ] 19.2 Build levels/tiers + streak tracking.
- [ ] 19.3 Build the badge system incl. the initial badge set from spec §4.13 (add an "Onboarded" badge from Phase 7).
- [ ] 19.4 Build the seasonal leaderboard + reset job, and the all-time Hall of Fame.
- [ ] 19.5 Build the committee leaderboard.
- [ ] 19.6 Build the "How Points & Levels Work" transparency page.
- [ ] 19.7 Build the recognition wall / live feed widget.

## Phase 20 — Certificates
- [ ] 20.1 Build the Template Builder (upload background, place field markers, save).
- [ ] 20.2 Build the recipient-selection flow (manual search + "bulk from event attendance ≥ X%").
- [ ] 20.3 Build the PDF generation API Route (template + data + verification QR) and Drive upload.
- [ ] 20.4 Build the recipient notification (in-app + email) and the profile Certificates tab.
- [ ] 20.5 Build the public `/verify/[code]` page.

## Phase 21 — Public Chapter Stats Page (spec §4.21)
- [ ] 21.1 Build the public aggregate-only RPC (member count, events held, total attendance, certificates issued, standout achievement).
- [ ] 21.2 Build the public `/stats` page, linked from the landing page.

## Phase 22 — Scheduled Jobs (Vercel Cron)
- [ ] 22.1 Build the protected cron API route + `vercel.json` schedule for monthly `performance_reviews` computation.
- [ ] 22.2 Build the cron route for daily event auto-completion (spec §4.3).
- [ ] 22.3 Build the cron route for daily SLA escalation reminders (spec §4.2).
- [ ] 22.4 Build the seasonal leaderboard reset job (spec §4.13).
- [ ] 22.5 Build the daily `profiles.attendance_rate` cache-refresh job.
- [ ] 22.6 Confirm every cron route rejects requests missing/mismatching `CRON_SECRET`.

## Phase 23 — Security Hardening Pass
- [ ] 23.1 Re-audit every table's RLS policy against spec §3.17 — no gaps, including all new v2 tables (`task_assignees`, `event_feedback`, `event_budget_items`, `onboarding_checklist_items`).
- [ ] 23.2 Add rate limiting + CAPTCHA to the Recruitment and public Event Registration pages.
- [ ] 23.3 Add input sanitization on all rich-text fields.
- [ ] 23.4 Add file-upload MIME/size validation before the Drive bridge call.
- [ ] 23.5 Confirm all privileged actions run through API Routes/Server Actions with server-side role checks, not client-only checks.
- [ ] 23.6 Confirm `audit_logs` has no update/delete policy for any role.
- [ ] 23.7 Confirm check-in access gating (Phase 8.9) cannot be bypassed by a direct API call from an unassigned profile.

## Phase 24 — Final QA
- [ ] 24.1 Full onboarding → approval dry run (new Google account to active member, incl. onboarding checklist appearing).
- [ ] 24.2 Full task delegation + broadcast dry run (President → Non-Tech Head → Media Head → broadcast Members → back up to President → Done).
- [ ] 24.3 Full fixed-escalation dry run for a directly-assigned task (Member → Committee Head → Branch Head → President/Co-President → Done).
- [ ] 24.4 Full event lifecycle dry run (draft → review → approval → publish → registration → gated QR check-in → completed → feedback survey → certificates).
- [ ] 24.5 Mobile QR check-in timing test (confirm under ~10 seconds per attendee).
- [ ] 24.6 Certificate issue-and-verify dry run.
- [ ] 24.7 RLS penetration checks from spec §10 item 14, confirmed blocked, including the check-in access gate.
- [ ] 24.8 Confirm production Vercel deployment + custom domain + HTTPS are live and preview deployments still point to staging.
- [ ] 24.9 Hand off `TESTER_CHECKLIST.md` for full manual QA sign-off.

---

## Phase S — Student Portal System (Upcoming Milestone — NOT ACTIVE NOW)
> ⏸️ **Status:** Scheduled for execution AFTER Team OS Phases 8–24 are completed and verified.
> Spec Reference: `GDGoC_HNU_OS_SPEC.md` §4.S
> Summary: Dedicated system for university students covering accounts, courses, workshops, HR QR attendance scanning, instructor tasks, and certificates.

### Sub-Phase S.A: Student Auth & Profile
*Read spec §4.S.1, §4.S.2, §4.S.10 before starting.*
- [ ] S.A.1 Create `student_profiles` table (spec §4.S.10) with all fields incl. `qr_code` (unique text, generated with `gen_random_uuid()` or similar on account creation); RLS as per spec §4.S.11.
- [ ] S.A.2 Build the Student Portal landing page at `/student` — public page with overview of courses/workshops and a "Register / Sign In" button.
- [ ] S.A.3 Wire Google sign-in for students: first sign-in → create `student_profiles` row (`status='incomplete'`) → redirect to `/student/onboarding`.
- [ ] S.A.4 Build the "Complete Your Student Profile" form at `/student/onboarding` using the exact fields from spec §4.S.2; on submit → `status='active'` (no approval needed) → redirect to `/student/dashboard`.
- [ ] S.A.5 Build the student dashboard skeleton at `/student/dashboard` with placeholder sections: My Courses, My Workshops, My Tasks, Attendance Summary, Certificates, My QR Code.
- [ ] S.A.6 Build `/student/my-qr`: displays the student's `student_profiles.qr_code` as a large scannable QR (use a client-side QR library) with a download button.
- [ ] S.A.7 Confirm end-to-end: student registers with Google → completes profile form → lands on dashboard → can see personal QR code.

### Sub-Phase S.B: Courses & Sessions
*Read spec §4.S.3, §4.S.4, §4.S.10 before starting.*
- [ ] S.B.1 Create `courses`, `course_sessions`, `course_enrollments` tables (spec §4.S.10); RLS as per spec §4.S.11.
- [ ] S.B.2 Build team admin Course CRUD at `/student-portal/admin/courses`: list, create, edit, publish, archive; access gated to HR Head/Co-Head + assigned Instructors (own courses only) + President/Co-President.
- [ ] S.B.3 Build Session management within `/student-portal/admin/courses/[id]`: add/edit/delete sessions with session number, title, date, time, venue/link; mark sessions as completed/cancelled.
- [ ] S.B.4 Build student-facing course browse at `/student/courses` and course detail at `/student/courses/[id]` (shows sessions list + Enroll button).
- [ ] S.B.5 Wire enrollment flow: open enrollment → immediately `confirmed`; gated enrollment → `pending` → instructor approves via admin page. Waitlist when at capacity.
- [ ] S.B.6 Show enrolled courses on student dashboard with progress bar (sessions attended / total) and next session info.
- [ ] S.B.7 Confirm end-to-end: admin creates a published course with 3 sessions → student enrolls → student sees course on dashboard.

### Sub-Phase S.C: Workshops
*Read spec §4.S.3, §4.S.4, §4.S.10 before starting.*
- [ ] S.C.1 Create `workshops`, `workshop_registrations` tables (spec §4.S.10); RLS as per spec §4.S.11.
- [ ] S.C.2 Build team admin Workshop CRUD at `/student-portal/admin/workshops`: list, create, edit, publish, archive; toggle `registration_open`; same role-gating as courses.
- [ ] S.C.3 Build student-facing workshop browse at `/student/workshops` and detail at `/student/workshops/[id]` with Register button (disabled when registration is closed or capacity full).
- [ ] S.C.4 On registration: create `workshop_registrations` row with unique `qr_code`; show QR at `/student/workshops/[id]/confirmation`; send confirmation email with QR.
- [ ] S.C.5 Show registered workshops on student dashboard under "My Workshops" with status (upcoming / attended / missed).
- [ ] S.C.6 Confirm end-to-end: admin creates + publishes workshop → student registers → sees QR confirmation → admin sees student in registrations list.

### Sub-Phase S.D: Student Attendance (QR Scan by HR)
*Read spec §4.S.5, §4.S.10, §4.S.11 before starting.*
- [ ] S.D.1 Create `student_attendance` table (spec §4.S.10); RLS: INSERT restricted to authenticated team members (HR/Instructor/President) — students cannot self-insert; students read own rows only.
- [ ] S.D.2 Build team admin QR scan screen at `/student-portal/admin/attendance/[sessionId]` — mobile-optimised camera UI using a JS QR scanner library; access gated to HR role, the session's assigned instructor, and President/Co-President.
- [ ] S.D.3 Wire QR scan: reads `student_profiles.qr_code` → looks up student → creates `student_attendance` row → shows confirmation; block duplicate scans with a clear warning message.
- [ ] S.D.4 Build manual check-in on the same screen: search student by name, national ID, or phone → same attendance row creation.
- [ ] S.D.5 Build post-session summary panel on the scan screen: present count, absent list (enrolled but not scanned).
- [ ] S.D.6 Build student attendance history at `/student/my-attendance`: list of all sessions and workshops with present/absent/not-enrolled status + attendance rate.
- [ ] S.D.7 Confirm end-to-end: HR opens scan screen on mobile → scans student's personal QR → attendance recorded → student's dashboard shows updated rate → duplicate scan blocked.

### Sub-Phase S.E: Instructor Tasks
*Read spec §4.S.6, §4.S.10, §4.S.11 before starting.*
- [ ] S.E.1 Create `student_tasks`, `student_task_submissions` tables (spec §4.S.10); RLS as per spec §4.S.11.
- [ ] S.E.2 Build task creation in course admin page (`/student-portal/admin/courses/[id]/tasks`): title, description, due date, submission type (link / file), max score (optional), assigned to (all enrolled / specific students).
- [ ] S.E.3 Build submission review screen (`/student-portal/admin/courses/[id]/tasks/[tid]/submissions`): see all submissions; enter score + feedback comment per student; mark graded / needs_revision / final.
- [ ] S.E.4 Build student task list at `/student/my-tasks`: pending tasks with due date, submitted tasks awaiting grade, graded tasks with score and feedback.
- [ ] S.E.5 Build task detail + submission page at `/student/my-tasks/[taskId]`: description, deadline, submission type → URL input field OR file upload → Submit button.
- [ ] S.E.6 Wire instructor notification on submission, and student notification when graded (in-app + email).
- [ ] S.E.7 Confirm end-to-end: instructor creates task → enrolled student submits (link) → instructor grades + leaves feedback → student receives notification and sees score.

### Sub-Phase S.F: Student Certificates
*Read spec §4.S.8, §4.S.10, §4.S.11, and §4.14 (Team OS cert system) before starting.*
- [ ] S.F.1 Create `student_certificates` table (spec §4.S.10); RLS as per spec §4.S.11.
- [ ] S.F.2 Build student certificate issuance flow at `/student-portal/admin/certificates`: choose course/workshop → system shows students meeting attendance threshold → President/Co-President selects recipients → generate PDFs (reuse §4.14 engine with shared `certificate_templates`) → create `student_certificates` rows.
- [ ] S.F.3 Wire `/verify/[code]` public page to also resolve `student_certificates.verification_code` and show authenticity details (same page works for both team and student certificates).
- [ ] S.F.4 Build student certificates list at `/student/certificates`: all received certificates with download links and verification QR/link.
- [ ] S.F.5 Wire student certificate notification: when issued, notify student in-app + by email with download link.
- [ ] S.F.6 Confirm end-to-end: mark course completed → issue certificates to qualifying students → student receives notification → student downloads certificate → QR on PDF resolves correctly at `/verify/[code]`.

## Phase 25 — Final QA (All Systems)
- [ ] 25.1 All Phase 24 Team OS dry runs (onboarding → approval, delegation + broadcast, fixed-escalation, event lifecycle, QR check-in timing, certificate issue + verify).
- [ ] 25.2 Student Portal full dry run: student registers → completes profile → enrolls in course → HR scans QR at a session → student submits a task → instructor grades → certificate issued → student downloads certificate → `/verify/[code]` confirms authenticity.
- [ ] 25.3 RLS penetration: student calls `student_attendance` INSERT directly → confirm server blocks it; student reads another student's submission → confirm RLS blocks it.
- [ ] 25.4 Confirm team member token cannot access student-only data endpoints and vice versa (tokens are scoped by `profiles` vs `student_profiles`).
- [ ] 25.5 Hand off updated `TESTER_CHECKLIST.md` (which now includes Student Portal section) for full manual QA sign-off.