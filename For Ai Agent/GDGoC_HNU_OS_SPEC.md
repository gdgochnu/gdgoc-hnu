# GDGoC HNU OS — Full Product & Technical Specification (v4)

> **Purpose of this document:** This is a complete, self-contained specification meant to be handed to an AI coding agent (or a dev team) to build the **entire platform end-to-end**. It covers product scope, roles & permissions, database schema, features, workflows, dashboards, storage architecture, security, and non-functional requirements. Every ambiguous point has an explicit **assumption** flagged in §13 so the builder never has to guess silently.
>
> **v4 additions (new in this version):**
> - **§S / §8** — Student Portal: a completely separate public-facing system for university students (not team members) to register, browse and enroll in courses (with sessions) and workshops, attend sessions via QR scanned by HR, submit tasks set by instructors (link or file), and receive certificates. Fully separate auth, DB tables, and routes from the Team OS.
> - **§2.2** — Profile fields updated: Arabic 4-part name + English 4-part name, National ID (14-digit), Faculty as dropdown from `faculty_options` table, Department as free text, Academic year, Mobile, WhatsApp, Facebook, Instagram, LinkedIn.
> - **§3.2** — `profiles` schema updated to reflect new fields.
> - **§3 new** — `faculty_options` table added (President-managed list for the Faculty dropdown).
> - **§6** — Routes updated with Student Portal routes and `/settings/faculties`.
> - **§12** — Build order updated to include Student Portal phases A–F.
> - **§13** — Open assumptions updated with Student Portal assumptions.
>
> **Companion documents (same folder):**
> - `AGENT_BUILD_CHECKLIST.md` — the same scope broken into small, sequential, confirmable build steps for the coding agent to execute one at a time.
> - `TESTER_CHECKLIST.md` — a manual QA checklist for the President (or any tester) to verify every feature after it's built.

---

## 0. Project Snapshot

|   |   |
|---|---|
| **Project name** | GDGoC HNU OS (Operating System for Google Developer Groups on Campus – Helwan National University) |
| **Tagline** | One platform. One source of truth. For people, events, tasks, attendance, growth. |
| **Type** | Internal chapter-management web platform (mobile-first PWA) |
| **Frontend** | Next.js (React), PWA-enabled |
| **Hosting/Deployment** | Vercel (frontend + serverless API routes) — see §13 |
| **Backend** | Supabase (Postgres + Auth + Realtime + Row Level Security) + Next.js API Routes / Server Actions running as Vercel Serverless Functions for all privileged server logic |
| **File storage** | Google Drive (via a Google Apps Script Web App bridge) — see §10 |
| **Auth** | Google OAuth only, via Supabase Auth |
| **Primary users** | President, Co-President, Tech Head, Non-Tech Head, Department Heads/Co-Heads (Media, PR, Operations, HR, Tech sub-teams), Members, Public visitors (recruitment + event registration pages only) |

### Core principle
Every action in the system generates connected data: an application becomes a member, an event registration becomes an attendance record, and completed work becomes performance history — and now, performance + attendance can become a real, verifiable certificate. Nothing lives in isolated spreadsheets, chats, or personal Drive folders.

---

## 1. Roles & Committee Structure (RBAC)

### 1.1 Role hierarchy

```
President
  └─ Full visibility, final approvals, Command Center, certificate issuance, can override any decision
Co-President
  └─ Cross-team visibility + shares final-approval authority with President (see §4.2, §4.3)
Tech Head / Non-Tech Head ("Branch Head")
  └─ Manages all committees under their branch, sees KPIs across those committees, second-stage approver
Committee Head (Media / PR / Operations / HR / each Tech sub-team, e.g. Web / AI / Mobile)
  └─ Manages members, tasks, events within their committee only; first-stage approver for their members' work
Committee Co-Head
  └─ Same visibility scope as Head, execution-focused (e.g. Ops: Head = planning, Co-Head = execution); can also act as first-stage approver when the Head delegates/is unavailable
Member
  └─ Own tasks, own attendance, own profile, own certificates only
```

### 1.2 Committees ("Departments")
Every committee (HR, PR, Media, Operations, and each Tech sub-team) is a first-class entity with:
- Its own **Head** (required) and **Co-Head** (optional but recommended).
- Its own roster of **Members**, visible only to that committee's Head/Co-Head + everyone above them in the chain.
- The Head/Co-Head can create, assign, and manage tasks and events **scoped to their own committee only**.
- Its own dashboard, KPIs, task board, and (where relevant) specialized workspace — PR gets a CRM, Media gets a content calendar + library, Operations gets checklists, HR gets the attendance dashboard.

> This is already modeled by the `departments` table (§3.1) + `profiles.department_id` + `departments.head_id` / `co_head_id` — a committee is just a `departments` row, and "who's under a Head" is simply every `profiles` row with matching `department_id`.

### 1.3 Permission matrix (high-level)

| Capability | President | Co-President | Branch Head | Committee Head | Committee Co-Head | Member |
|---|---|---|---|---|---|---|
| View all committees' data | ✅ | ✅ | ✅ (own branch) | ❌ (own committee only) | ❌ (own committee only) | ❌ |
| Approve new accounts (final) | ✅ | ✅ | ❌ | ➕ (recommend only) | ❌ | ❌ |
| Create/edit committee structure | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Assign roles/positions | ✅ | ❌ | ➖ (propose, within branch) | ❌ | ❌ | ❌ |
| Create/assign tasks | ✅ | ✅ | ✅ | ✅ (own committee) | ✅ (own committee) | ❌ (updates own task status/evidence only) |
| Final task approval (last stage) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create events | ✅ | ✅ | ✅ | ✅ (own committee) | ➕ (support) | ❌ |
| Approve event publish (final) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Take attendance (QR/manual) | ✅ | ✅ | ✅ | ✅ (HR primarily) | ✅ (HR primarily) | ❌ |
| View own attendance rate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View reports & analytics | ✅ (all) | ✅ (all) | ✅ (branch) | ✅ (own committee) | ✅ (own committee) | ✅ (own profile) |
| Manage PR CRM | ✅ | ✅ | ➖ | ✅ if PR | ✅ if PR | ❌ |
| Manage Media library/calendar | ✅ | ✅ | ➖ | ✅ if Media | ✅ if Media | ❌ |
| Manage gamification config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Design certificate templates | ✅ | ➕ (if delegated) | ❌ | ❌ | ❌ | ❌ |
| Issue certificates | ✅ | ➕ (if delegated) | ❌ | ❌ | ❌ | ❌ |
| Configure Google Drive root/settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 1.4 Enum: `user_role`
```
president | co_president | branch_head | committee_head | committee_co_head | member
```
> **Change from v1:** `tech_head`/`non_tech_head` are unified into `branch_head`, distinguished by `departments.branch` (`tech`/`non_tech`) on the committee(s) they oversee, since the escalation logic (§4.2/§4.3) needs a generic "the branch head above this committee" lookup regardless of branch name.

### 1.5 Enum: `department_branch`
```
tech | non_tech
```

---

## 2. Authentication & Onboarding Flow

*(unchanged from v1 — kept here for completeness)*

### 2.1 Flow
1. **Landing page** → "Sign in with Google" (Supabase Auth Google provider).
2. First sign-in → `auth.users` row created → trigger creates `profiles` row, `status = 'incomplete'`.
3. Redirect to **"Complete Your Profile"** form — blocks access to the rest of the app until submitted.
4. On submit → `status = 'pending_review'` → notification/approval request routed to President **and** Co-President (either can act — see §1.3), and to the target committee's Head as a non-binding recommendation.
5. **Approve** → `status = 'active'`, role/committee/position finalized, welcome notification + email.
   **Reject** → `status = 'rejected'`, reason stored, can re-apply anytime.
   **Request changes** → `status = 'changes_requested'`, user edits & resubmits.
6. Only `status = 'active'` can access the authenticated app.
7. **Suspension** → President/Co-President (or delegated Head) can set `status = 'suspended'` anytime — instantly revokes access, reversible.

### 2.2 "Complete Your Profile" form — fields (UPDATED v4)

> ⚠️ **v4 change:** fields have been updated from v1. The exact required fields are below. `custom_fields jsonb` remains for future extension without a migration.

**Required fields (all required unless marked optional):**
1. **Full name in Arabic (4-part)** — e.g. أحمد محمد علي حسن — minimum four words
2. **Full name in English (4-part)** — e.g. Ahmed Mohamed Ali Hassan — minimum four words
3. **National ID** — 14-digit Egyptian national ID number, validated format
4. **Faculty / College** — dropdown (multiple choice), values managed by President at `/settings/faculties` (e.g. كلية الهندسة, كلية الحاسبات والمعلومات, كلية العلوم, etc.)
5. **Department / Major** — free-text field (student types their own, e.g. "هندسة الحاسبات", "نظم معلومات")
6. **Academic year (Grade)** — dropdown: 1st / 2nd / 3rd / 4th / 5th year
7. **Mobile number** — Egyptian mobile number (validated)
8. **WhatsApp number** — Egyptian mobile number (pre-filled same as mobile, editable if different)
9. **Facebook profile URL** — optional
10. **Instagram handle/URL** — optional
11. **LinkedIn profile URL** — optional
12. **Committee applying to** — dropdown (from active departments)
13. **Preferred position** — free text
14. **Motivation ("Why join?")** — free text
15. **How did you hear about us** — dropdown
16. **Availability (hrs/week)** — number input
17. **Agree to code of conduct** — required checkbox

**Read-only (from Google OAuth):**
- Email address

### 2.3 Public Recruitment Page
Public marketing + "Join Us" page → triggers Google sign-in → funnels into §2.1 step 3. One funnel, no separate disconnected Google Form.

---

## 3. Database Schema (Supabase / Postgres)

> All tables: `uuid` PK (`default gen_random_uuid()`), `created_at`/`updated_at` timestamps, RLS enabled (policies in §3.17).

### 3.1 `departments` (= committees)
`id, code (unique), name, branch (department_branch), head_id (FK profiles), co_head_id (FK profiles), description, drive_folder_id (nullable, see §10)`

### 3.2 `profiles`
`id (= auth.users.id), full_name_ar (text — Arabic 4-part name), full_name_en (text — English 4-part name), email (unique), avatar_url, national_id (text, 14 chars, unique), phone (text), whatsapp_number (text), faculty (text — value chosen from faculty_options list), department_major (text — free text major/department), academic_year (smallint 1-5), facebook_url (text nullable), instagram_url (text nullable), linkedin_url (text nullable), role (user_role), department_id (FK departments, nullable until approved), position (text), motivation (text), how_heard (text), availability_hours (int), status (incomplete/pending_review/changes_requested/active/rejected/suspended/alumni), approved_by, approved_at, rejection_reason, join_date, left_at (nullable, set when moved to alumni), leave_reason (nullable), overall_score (numeric, cached), attendance_rate (numeric, cached — see §4.6), leaderboard_opt_in (bool), custom_fields (jsonb)`

> **v4 note:** `full_name` replaced by `full_name_ar` + `full_name_en`. `university_id` replaced by `national_id`. `skills` and `portfolio_url` moved into `custom_fields` if needed. `phone` split into `phone` + `whatsapp_number`. Social media fields added. `faculty` is a controlled text value chosen from the `faculty_options` table. `department_major` is free text.

### 3.3 Core operational tables

**`tasks`**
`id, title, description, department_id, assignee_id (nullable when assignment_mode='broadcast' — see task_assignees below), created_by, delegated_by_id (nullable — the profile who delegated this task down to the assignee, see §4.2), parent_task_id (nullable, self-referencing FK — links a delegated child task back to the task it was delegated from), assignment_mode (single/broadcast), event_id (nullable FK events — links a task to the event it belongs to, see §4.3), priority (low/medium/high), status (todo/in_progress/review/delegated/done/rejected), deadline, evidence_url, approval_instance_id (FK approval_instances, nullable), created_at, updated_at`

**`task_assignees`** *(only populated when `tasks.assignment_mode = 'broadcast'`)*
`id, task_id, profile_id, status (todo/in_progress/submitted), evidence_url, submitted_at, created_at`
> Every member targeted by a broadcast task gets their own row here and works their own copy independently — see §4.2.

**`task_comments`**
`id, task_id, author_id, body, created_at`

**`events`**
`id, title, description, venue, event_date, start_time, end_time, capacity, department_id (owning committee), status (draft/submitted_for_review/branch_review/pending_final_approval/approved/published/closed/completed/rejected), registration_fields (jsonb), owners (jsonb array: {profile_id, committee_role}), checkin_access_profile_ids (uuid[] — profiles allowed to operate this event's check-in screen, see §4.3), approval_instance_id (FK approval_instances, nullable), qr_secret, gcal_event_id (nullable, see §4.17), created_by, created_at`

**`event_registrations`**
`id, event_id, profile_id (nullable — guests), full_name, email, phone, custom_answers (jsonb), qr_code (unique), status (registered/waitlisted/cancelled), created_at`

**`attendance`**
`id, event_id, registration_id (nullable), profile_id (nullable — resolved when known, applies to Members AND Heads/President/Co-President alike), check_in_time, checked_in_by, method (qr/manual), created_at`
> Unique constraint on `(event_id, registration_id)`.
> **Important:** attendance is tracked for every role, not just Members — a Head's or the President's own check-in at an event is a normal `attendance` row like anyone else's, which is what makes an org-wide attendance-rate leaderboard (§4.6) possible.

**`performance_reviews`**
`id, profile_id, period_month, task_completion_pct, deadline_adherence_pct, attendance_pct, team_contribution_pct, overall_score, reviewer_id, notes, created_at`

**`pr_contacts`** / **`pr_interactions`** / **`media_content`** / **`media_assets`** / **`operations_checklist_items`** — unchanged from v1 (see §4.7–§4.9).

**`notifications`**
`id, profile_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at`

**`badges`** / **`member_badges`** / **`points_log`** — see §4.13 (expanded).

**`faculty_options`** *(new in v4 — managed by President at `/settings/faculties`)*
`id, name_ar (text — Arabic faculty name), name_en (text — English faculty name), sort_order (int), is_active (bool default true), created_at`
> President can add, edit, reorder, and deactivate faculty options. The Faculty/College dropdown in the profile form and student registration form pulls from active rows ordered by `sort_order`. Deactivating a faculty hides it from new selections but does not affect existing profile rows.

### 3.9 New-member Onboarding Checklist tables

**`onboarding_checklist_templates`**
`id, department_id (nullable — null means it applies globally to everyone), item, sort_order, created_by`

**`onboarding_checklist_items`**
`id, profile_id, template_id (nullable, if generated from a template), label, is_done, completed_at, created_at`

### 3.10 Offboarding / Alumni
No new table needed — modeled entirely via `profiles.status = 'alumni'` + `left_at` + `leave_reason` (§3.2). History (tasks, attendance, certificates, badges) is simply left untouched and still queryable.

### 3.11 Event Feedback

**`event_feedback`**
`id, event_id, profile_id (nullable if submitted anonymously), rating (1-5), comment, is_anonymous (bool), created_at`

### 3.12 Event Budget

**`event_budget_items`**
`id, event_id, category (venue/catering/printing/transport/other), description, estimated_cost (numeric), actual_cost (numeric, nullable until spent), paid_by (nullable text or FK profiles), receipt_drive_file_id (nullable), created_by, created_at`

### 3.13 Generic multi-stage Approval/Escalation engine

This one engine powers **task completion approval** (for tasks that are *not* delegated further down — see §4.2 for how delegation and this fixed escalation chain relate), **event publish approval**, and can power future workflows (e.g. large expense sign-off) without new tables.

**`approval_instances`**
`id, workflow_type (task_completion / event_publish / account_approval), entity_id, current_step (int), status (in_progress/approved/rejected/changes_requested), created_at, resolved_at`

**`approval_instance_steps`**
`id, instance_id, step_order (int), approver_rule (committee_head / branch_head / president_or_co_president), resolved_approver_id (nullable — filled in when the actual person is known), status (pending/approved/rejected/changes_requested), notes, acted_at`

> See §4.2 and §4.3 for the exact rules that generate these steps for tasks and events.

### 3.14 Certificates

**`certificate_templates`**
`id, name, background_image_drive_file_id, field_layout (jsonb — x/y positions for name, event, date, signature, QR), created_by, created_at`

**`certificates`**
`id, template_id, recipient_profile_id (nullable), recipient_name, recipient_email, event_id (nullable), title, issue_date, certificate_number (unique, human-readable, e.g. GDGOC-2026-000123), verification_code (uuid, embedded as QR on the PDF), pdf_drive_file_id, pdf_drive_url, issued_by, created_at`

### 3.15 Google Drive folder map

**`drive_folder_map`**
`id, entity_type (department/event/member/media_library/certificates_templates/certificates_issued/reports), entity_id (nullable — some are singletons), drive_folder_id, drive_folder_url, created_at`

### 3.16 Audit log

**`audit_logs`**
`id, actor_id, action (e.g. 'account_approved', 'task_approved_stage2', 'task_delegated', 'certificate_issued', 'role_changed', 'member_archived'), entity_type, entity_id, metadata (jsonb), created_at`
> Append-only, never updated or deleted — see §9 Security.

### 3.17 Row Level Security — principles
- `profiles`: own row always readable/editable (limited fields while pending); President/Co-President see all (incl. `alumni`); Branch Head sees their branch's committees; Committee Head/Co-Head see their own committee. `alumni` profiles remain readable (read-only) to President/Co-President and, read-only, to Branch/Committee Heads via the Alumni Directory (§4.16).
- `tasks`, `task_assignees`, `events`, `pr_*`, `media_*`, `operations_checklist_items`: scoped by `department_id`, same visibility cascade as above. A `task_assignees` row is always readable/editable by its own `profile_id` in addition to whoever can see the parent task.
- `attendance`, `event_registrations`: readable by HR role + President/Co-President + event owners; any profile can read its **own** attendance rows regardless of role (so Heads/President see their own attendance too). **Check-in write access** (`INSERT` on `attendance` for a given event) is restricted to profiles listed in that event's `checkin_access_profile_ids`, plus HR role and President/Co-President as a standing override (§4.3).
- `approval_instances`/`approval_instance_steps`: visible to the entity's stakeholders (task assignee, event creator) and to the resolved approver at each step; President/Co-President always see everything.
- `event_feedback`: the submitting profile can always see their own submission (even if anonymous); event owners/President/Co-President see aggregate results, and see the identity of a submission only when `is_anonymous = false`.
- `event_budget_items`: readable/editable by the event's Operations owners + President/Co-President only — not by general committee members.
- `certificates`: recipient can read their own; President/Co-President see all; public verification page uses a narrow `SELECT`-only RPC that returns just the fields needed to prove authenticity (no PII beyond name/event/date).
- `audit_logs`: readable only by President/Co-President; insert-only for the system, no client-side update/delete policy exists at all.
- `faculty_options`: readable by all authenticated users (for the dropdown); writable only by President.
- Public-facing surfaces (Recruitment Page, Event Registration Page, Certificate Verification Page, Public Stats Page, **Student Portal public pages**) use a restricted `anon` policy: `INSERT`-only where applicable, or a narrow `SELECT` via a security-definer RPC — never direct table `SELECT` access to `anon`.

---

## 4. Feature Modules (Full Scope)

### 4.1 Member & Committee Management
- Full profile + performance tab + attendance-history tab + events-participated tab + awards/certificates tab.
- Committee roster view: every committee shows its Head, Co-Head, and full member list — visible per RLS scope in §3.17.
- Bulk actions for President/Co-President/Heads: change committee, change role, suspend, export list.

### 4.2 Task & Workflow Management — Delegation, Broadcast Assignment & Escalation

- Kanban: **To Do → In Progress → Review → Done** (plus `Rejected`, which sends it back to `In Progress` with the rejecting note attached, and `Delegated`, a task whose owner has pushed it down to someone else — see below).
- Every task: owner, deadline, priority, status, evidence attachment, comment thread.

**A. Broadcast assignment ("everyone tries it")**
When a Head (or any assigner) creates a task, they choose `assignment_mode`:
- **Single** (default): one `assignee_id`, exactly as before.
- **Broadcast**: the task is opened to an entire committee's members at once. A `task_assignees` row is created for every targeted member; each works and submits **their own** attempt independently (own status, own evidence, own submitted-at time) without seeing or being blocked by anyone else's. The task's owner (whoever created it) reviews all individual submissions side-by-side once ready, picks the best one (or writes a short consolidated summary referencing multiple contributions), attaches that as the task's own `evidence_url`, and moves the task itself into `Review` — from that point it follows the same approval path as any other task (part C below).

**B. Downward delegation ("pass it down the chain, with edits")**
Any assignee who has people *below* them in the hierarchy (a Branch Head, a Committee Head/Co-Head, the President/Co-President) can, instead of doing a task personally, **delegate** it:
1. Click **"Delegate"** on a task assigned to them.
2. Choose a recipient: a specific person, a specific Committee Head one level down, or **broadcast to all members of a chosen committee** (reuses part A).
3. Optionally append notes/additional requirements — these are shown alongside the original description, never overwrite it.
4. This creates a new **child task** (`parent_task_id` = the original task's id, `delegated_by_id` = the delegator) assigned to the chosen recipient(s); the original (parent) task's status becomes `delegated` and simply waits.
5. This can repeat across multiple levels — e.g. **President → Non-Tech Head → Media Head → all Media Members (broadcast)** — exactly mirroring the org chart, as many levels deep as needed.
6. When a child task is finished (single: the one assignee submits; broadcast: the owner has picked/consolidated the best submission per part A) and its owner clicks **"Submit,"** the **parent task automatically moves to `Review`**, and the person who delegated it to them (the parent task's own assignee) is notified to review it. This repeats going back up exactly the same path it went down, until it reaches whoever created the very first (root) task, who gives the final sign-off and closes it as `Done`.
7. **Example matching your exact scenario:** President creates a task and assigns it to the Non-Tech Head → Non-Tech Head delegates it to the Media Head (adding notes) → Media Head delegates it as a **broadcast** to all Media members → every Media member attempts it and submits → Media Head reviews all submissions, picks the best, submits upward → Non-Tech Head reviews and submits upward → President gives final approval and the whole chain closes as `Done`.

**C. Fixed escalation chain (default — used whenever a task is *not* delegated, e.g. a Head assigns something directly to one Member)**
This is the automatic path from v2, kept as the standard behavior for the common case where nobody delegates further:
1. When such a task moves to "Review," an `approval_instances` row is created (`workflow_type = 'task_completion'`), with steps computed dynamically from the assignee's position in the hierarchy — skipping any stage the assignee already outranks or *is*:
   - **Step 1 — Committee Head** of the assignee's own committee (skipped if the assignee *is* the Head/Co-Head).
   - **Step 2 — Branch Head** of that committee's branch (skipped if the assignee *is* the Branch Head).
   - **Step 3 — President or Co-President** (either one approving is sufficient — final stage, always required unless the assignee is the President/Co-President themself, in which case the task auto-completes).
2. Example: an HR Member's task (assigned directly, no delegation involved) → Step 1 = HR Head → Step 2 = Non-Tech Head → Step 3 = President/Co-President → `status = done`.
3. Any step, or any level in a delegation chain, can **Reject** (task returns to the assignee/recipient with notes) or **Request changes**. Approval/submission only advances forward on explicit action.
4. Every delegation, broadcast submission, and approval action is written to `audit_logs`.
5. Overdue tasks *and* tasks stuck (in review, or waiting on a delegated sub-tree) beyond a configurable SLA (default: 3 days) are surfaced on the President Command Center's "Needs Attention" feed and on the current responsible person's dashboard.

**D. Event-linked tasks**
A task can optionally be tied to a specific event (`tasks.event_id`) — e.g. "Design the poster for Flutter Workshop," "Confirm the venue," "Prepare the check-in station." These appear both on the normal Kanban board and grouped together on that event's own page as its **Event Task List**, and follow the exact same delegation/broadcast/escalation rules as any other task. See §4.3 for the special case of the check-in task.

### 4.3 Events — Full Lifecycle (Review → Approval → Publish → Registration → QR)

**Status flow:** `draft → submitted_for_review → branch_review → pending_final_approval → approved → published → closed → completed` (or `rejected` at any review stage, returning to `draft` with notes).

1. **Draft:** Committee Head/Co-Head builds the event (title, date, venue, capacity, custom registration fields, owners per committee), and can attach an **Event Task List** — a set of tasks tied to this event via `tasks.event_id` (§4.2 part D), e.g. design, logistics, PR outreach, and a dedicated **check-in task** (see below).
2. **Submit for Review:** creates an `approval_instances` row (`workflow_type = 'event_publish'`) with the same skip-aware two-stage chain as tasks, minus the committee-head stage (the Head is the creator): **Step 1 — Branch Head**, **Step 2 — President or Co-President**.
3. **Approved:** event unlocks the **Publish** action.
4. **Published:** the **Public Event Page** goes live at `/events/[slug]` with:
   - Full event details + speaker info
   - A **shareable registration link** (this is the link you post everywhere — WhatsApp groups, social, etc.)
   - The registration form (rendered from `registration_fields`)
   - On submit → confirmation page + email with a **unique QR code** (from `event_registrations.qr_code`)
5. **Check-in access is task-gated, not open to every Head by default:** the Head assigns the "Attendance Check-in" duty to specific people for this event (typically HR, but can be anyone) — this both creates a normal task for them **and** adds them to `events.checkin_access_profile_ids`. Only those listed profiles (plus HR role and President/Co-President as a standing override, §3.17) can open `/events/[id]/attendance` and record check-ins for that specific event — a Media Head with no check-in duty on this event simply cannot access that screen for it.
6. **Check-in day:** the assigned people scan QR → `attendance` row created, duplicate-scan blocked, walk-ins supported manually (§4.4).
7. **Closed → Completed:** after the event date, status auto-flips to `completed`, which:
   - Triggers the Operations "After" checklist reminder (§4.9)
   - Sends the Event Feedback Survey to attendees (§4.18)
   - Unlocks bulk **certificate generation** for this event's attendees (§4.14)
   - Feeds the event's numbers (incl. budget §4.20 and feedback §4.18) into Reports (§4.12)

### 4.4 Smart Attendance (QR)
*(unchanged from v1)* Register → Receive QR → Check-in (scan) → Validate (duplicate prevention) → Record (linked to profile, works identically for a Member, a Head, or the President). Walk-in manual check-in supported via name/phone/email search. Target: under 10 seconds per attendee.

### 4.5 HR Dashboard
- KPI cards: total registrations, checked-in, attendance rate %, active members.
- **Event attendance view:** attended/registered/absent, check-in timestamps, duplicate-scan log, CSV/Excel export.
- **Org-wide Attendance Rate view (new):** a single table/leaderboard ranking **every profile regardless of role** — Members, Committee Heads/Co-Heads, Branch Heads, even President/Co-President — by attendance rate, with filters by committee/branch. This is the view that satisfies "attendance rate for everyone, even the Heads."
- Low-engagement alerts (3+ missed events), HR notes/follow-ups feeding into `performance_reviews`.

### 4.6 Member Profiles & Performance
- Metrics: task completion %, deadline adherence %, **attendance % (own, always visible on every profile, every role)**, team contribution %, overall score — computed monthly into `performance_reviews`, trend chart on profile.
- Growth section: review notes, suggested skills, training record, leadership-readiness flag, peer/HR feedback, Member-of-the-Month history, path toward Head/Co-Head.
- Certificates tab: every certificate ever issued to this person, downloadable, each with its public verification link.

### 4.7 PR Relationship Management (CRM)
*(unchanged from v1)* Contacts → Pipeline → Follow-up → History. KPIs: confirmed speakers, active partnerships, follow-up completion rate.

### 4.8 Media Workspace & Central Library

- **Content Calendar:** post/reel/story, owner, deadline, review status, publish date, campaign/event tag.
- **Central Media Library (expanded):** one browsable, searchable library backed by Google Drive (§10) holding *everything* that belongs to the chapter's visual identity and history — brand kit & logos, design templates, event posters, photos, videos, certificates issued, past reports. Organized automatically into the Drive folder structure in §10.3, filterable in-app by committee/event/type/date without needing to open Drive directly.
- **Event Coverage:** photo/video/shot-list checklists, speaker assets, post-event recap, archived per event (mirrors the Drive `/Events/{event}/Media-Coverage/` folder).

### 4.9 Operations Event Control
*(unchanged from v1)* Digital checklist per event: **Before / During / After**, each item assignable and checkable off. Head = planning, Co-Head = execution (default, editable).

### 4.10 President Command Center
- Committee health scorecards (%) per committee — now including **attendance rate of that committee's own Head/Co-Head**, not just members.
- "Needs Attention": overdue tasks, tasks stuck mid-approval past SLA, pending approvals (accounts/tasks/events), PR follow-ups due, inactive members.
- "Upcoming": events + deadlines.
- Weekly 5-question review feed from every Head.
- Pending approvals queue (accounts, task final-stage, event final-stage) — actionable directly from this screen.

### 4.11 Notifications & Approvals
- In-app notification center + email (Edge Function + email provider).
- Trigger matrix (extended):

| Event | Notify | Action available |
|---|---|---|
| New account pending review | President + Co-President (+ recommending Head) | Approve / Reject / Request changes |
| Task delegated to you | Recipient (single or every broadcast member) | Accept & work on it |
| Task submitted back up a delegation level | The delegator (whoever pushed it down to this person) | Review / Reject / Request changes |
| Task submitted for review — Stage 1 (fixed chain) | Committee Head | Approve / Reject / Request changes |
| Task advanced — Stage 2 (fixed chain) | Branch Head | Approve / Reject / Request changes |
| Task advanced — Stage 3 (final) | President + Co-President | Approve / Reject |
| Task rejected at any stage/level | Original assignee/recipient | Revise & resubmit |
| Event submitted for review | Branch Head | Approve / Reject / Request changes |
| Event advanced to final approval | President + Co-President | Approve / Reject |
| Event approved | Creating Head | Publish |
| Event nears capacity | PR + Operations owners | Close registration |
| Assigned check-in duty for an event | Assigned profile(s) | View event + open check-in screen |
| Member missed 3+ events | HR | Follow up |
| Speaker confirmed | President + PR | Finalize logistics |
| Task/Event stuck past SLA | Current approver + President | Escalate reminder |
| New member's onboarding checklist ready | New member (+ their Head) | Complete checklist items |
| Event completed — feedback survey open | All event attendees | Submit feedback |
| Event actual spend exceeds estimate | Event owners + President | Review budget |
| Member archived to alumni | The member (+ their former Head) | View alumni status |
| Certificate issued | Recipient | View/download |
| Points/Badge awarded | Recipient | View in Gamification hub |

- WhatsApp channel remains schema-ready but out of scope for this build (§12).

### 4.12 Reports & Analytics
*(unchanged from v1)* Weekly/monthly committee report, event performance report, attendance analytics, member performance summary, PDF/Excel export, leadership-ready summary view.

### 4.13 Gamification — Premium Edition

Designed to feel like a genuine, distinctive system rather than a bolted-on points counter:

- **Points:** earned from task completion, attendance, volunteering, PR/media contributions — point values per action stored in an admin-editable `point_rules` table (not hardcoded), so the President can tune the economy over time.
- **Levels/Tiers:** cumulative points map to named tiers (e.g. *Newcomer → Contributor → Achiever → Leader → Legend*), each with a distinct badge color/icon shown next to the person's name across the app.
- **Streaks:** consecutive-event-attendance and consecutive-task-on-time streaks tracked and shown with a small flame/streak indicator; streak breaks are visible but never punitive (no point loss).
- **Badges:** rich, specific badges beyond generic ones — e.g. "First Event", "10 Tasks Done", "Perfect Attendance Month", "Mentor", "Event MVP" (awarded by Heads after an event), "Speaker Whisperer" (PR-specific). Each badge has a distinct icon and a transparent, published criteria description.
- **Seasonal Leaderboard:** resets each semester so new members can compete fairly, alongside an **All-Time Hall of Fame** that never resets.
- **Department Leaderboard:** committees ranked by aggregate/average member engagement — celebrates team effort, not just individuals.
- **Recognition wall:** "Member of the Month," event shout-outs, and newly-awarded badges surface as a live feed on the dashboard.
- **Full transparency:** a public-within-the-app "How Points & Levels Work" page lists every rule — no hidden scoring.
- **Opt-in leaderboard visibility** (`profiles.leaderboard_opt_in`) — points/badges still accrue either way, but appearing on the public leaderboard is optional.

### 4.14 Certificates

- **President-only module** (Co-President if delegated) to design templates and issue verifiable certificates directly from the platform — no external design tool round-trip needed for issuing (templates themselves can be uploaded as a background image + field positions).
- **Template Builder:** upload a background image (stored on Drive via §10), place text fields (recipient name, event/title, date, signature image) by dragging position markers, save as a reusable `certificate_templates` row.
- **Issuing flow:**
  1. Choose a template.
  2. Choose recipients — manually search members, or **bulk-select "everyone who attended Event X with attendance ≥ Y%"** (pulls straight from `attendance`).
  3. Fill in the reason/title (e.g. "Certificate of Completion — Flutter Workshop").
  4. Generate — an Edge Function renders each recipient's PDF (template + their data + a unique QR linking to the verification page), uploads it to Drive (`/Certificates/Issued/{Year}/`), and creates a `certificates` row.
  5. Each recipient is notified in-app + by email with a download link; it also appears on their profile's Certificates tab (§4.6).
- **Public Verification Page** (`/verify/[verification_code]`): anyone with the code (or scanning the QR on the printed/PDF certificate) sees a simple authenticity confirmation — recipient name, certificate title, event, issue date, issuer — with no other private data exposed.

### 4.15 New-Member Onboarding Checklist
- The moment an account is approved (`status = 'active'`), a personalized checklist is generated from an admin-editable `onboarding_checklist_templates` list (global default + optional per-committee additions), e.g.: "Meet your Committee Head," "Read the code of conduct" (auto-checked, since it was required at signup), "Join your committee's Drive folder," "Complete your first task."
- Shown as a small progress widget on the Member's dashboard until 100% complete; completing it awards the "Onboarded" badge (§4.13).
- Heads see a simple view of which of their new members still have incomplete onboarding items — useful for the first weeks after recruitment.

### 4.16 Offboarding & Alumni Archive
- `profiles.status` gains an `alumni` value alongside the existing ones. A President/Co-President (or a Committee Head for their own committee, subject to final President confirmation — same pattern as account approval) can move an active member to `alumni` when they leave, capturing `left_at` and an optional `leave_reason`.
- An alumni's login access is revoked immediately, but their **history is preserved and remains read-only**: performance record, attendance history, certificates, badges — nothing is deleted.
- A dedicated **Alumni Directory** (`/members/alumni`, visible to President/Co-President and, read-only, to Branch/Committee Heads) lists past members with their tenure and a summary of their contribution — useful for reunions, references, or re-inviting strong former members as mentors.
- Re-activation is possible (e.g., an alumnus rejoins) — moves them back to `active` without losing their historical record.

### 4.17 Google Calendar Integration
- Every **published** event automatically creates/updates a corresponding entry on a shared **"GDGoC HNU"** Google Calendar (via the Google Calendar API, using the same Google account/credentials as the Drive bridge in §10); cancelling/unpublishing an event removes it.
- The shared calendar is exposed as a subscribable link so any member can add it to their own Google Calendar app once and always stay in sync — no manual re-adding per event.
- Every task also gets a one-click **"Add to my Google Calendar"** action on its deadline (a simple calendar-event link/`.ics` download — no extra API scope needed for this personal case, since it only creates an event in the *viewer's own* calendar).

### 4.18 Event Feedback Survey
- When an event's status flips to `completed` (§4.3), the system automatically sends a short feedback survey (in-app notification + email) to everyone in that event's `attendance` records.
- Survey: a 1–5 satisfaction rating + an optional comment, with an **anonymous-by-default** toggle the respondent can turn off if they want their name attached (stored in a new `event_feedback` table, §3.9).
- Average satisfaction score + comment highlights surface on the event's detail page and roll up into the event performance report (§4.12) — turning "how did the event go?" into a real number instead of a guess.

### 4.19 Global Search
- A single search bar in the app header, available to every authenticated role, searching across **Tasks, Members, Events, and PR Contacts** at once (Media assets included if practical) — powered by Postgres full-text search (`tsvector`) behind a single search RPC.
- Results are **automatically scoped by the same RLS rules as everywhere else** — a Committee Head searching "poster" only ever sees tasks/assets their role can already see; the search never becomes a side-door around permissions.

### 4.20 Event Budget Tracking
- A simple budget tab per event (owned by Operations, editable by the event's owners + President/Co-President): line items with category (venue/catering/printing/transport/other), description, estimated cost, actual cost, who paid, and an optional receipt image/PDF uploaded straight to that event's Drive folder (§10.3).
- The event detail page shows **estimated vs. actual** totals at a glance; the President Command Center's "Needs Attention" feed flags any event whose actual spend has exceeded its estimate.
- This is intentionally a lightweight tracker, not full accounting software — no invoicing, reimbursement workflow, or multi-currency support.

### 4.21 Public Chapter Stats Page
- A public, unauthenticated page (`/stats`, linked from the landing page) showing chapter-pride numbers for visitors, prospective members, and university stakeholders: total members, events held, total attendance across all events, certificates issued, and a few standout achievements (e.g. top badge earned this term) — **counts and aggregates only, zero personally identifiable data**.
- Backed by a narrow public RPC that returns pre-aggregated numbers, never raw table access.

---

## 4.S Student Portal — Full Feature Specification (v4 New)

> The Student Portal is a **completely separate system** from the Team OS. It is a public-facing platform for **university students** (who are NOT GDGoC team members) to register, attend courses and workshops, submit tasks assigned by instructors, and track their own learning journey.
>
> A team member (e.g. a Head or President) can be an Instructor in the Student Portal, but a student cannot access the Team OS, and a team member does not automatically become a student.

### 4.S.1 Purpose & Audience

| | |
|---|---|
| **Who uses it** | Any university student — not limited to GDGoC team members |
| **What they do** | Register → browse & enroll in courses/workshops → attend sessions (HR scans their QR) → submit tasks → receive certificates |
| **Who manages it** | GDGoC team members acting as Instructors or HR Admins via `/student-portal/admin` |
| **Auth** | Students register with Google OAuth — stored in separate `student_profiles` table (NOT the same `profiles` table as team members) |
| **Access** | Routes prefixed with `/student` — students never see the Team OS routes |

### 4.S.2 Student Registration & Profile

**Flow:**
1. Student visits `/student` (Student Portal landing page).
2. Clicks "سجّل الآن / Register" → Google sign-in.
3. First sign-in → redirect to **"Complete Your Student Profile"** form (blocks until submitted).
4. On submit → account is **immediately active** (no manual approval required — unlike team member onboarding).
5. Student lands on their **Student Dashboard**.

**Student Profile fields — same field set as §2.2 minus the committee/role-specific fields:**
1. Full name in Arabic (4-part) — required
2. Full name in English (4-part) — required
3. National ID (14-digit) — required
4. University — dropdown (HNU + others, configurable in portal settings)
5. Faculty / College — dropdown (from same `faculty_options` table used by team profiles)
6. Department / Major — free text
7. Academic year (1st–5th) — required
8. Mobile number — required
9. WhatsApp number — required (pre-filled same as mobile, editable)
10. Facebook URL — optional
11. Instagram URL — optional
12. LinkedIn URL — optional

### 4.S.3 Content Types

#### Courses (with Sessions)
- **Course:** a structured multi-session learning program. Fields: title, description, instructor(s), capacity, cover image, category/track, enrollment_type (open/gated), status (draft/published/archived).
- **Session:** one class within a course. Fields: session number, title, date, start/end time, venue or online link, qr_secret, status (scheduled/completed/cancelled).
- Students **enroll** in a course once and then attend individual sessions separately.

#### Workshops (Standalone)
- A **Workshop** is a single-session event (not a course series). Fields: title, description, instructor(s), date, start/end time, venue, capacity, registration deadline, status, registration_open flag, qr_secret.
- Students register for workshops individually; on registration → unique QR code shown + emailed.

### 4.S.4 Enrollment & Registration
- **Course enrollment:** browse → enroll → if open: immediately confirmed; if gated: instructor approves → confirmation.
- **Workshop registration:** browse → register → QR confirmation page + email.
- Waitlist supported when capacity is full. Students can cancel their own enrollment/registration.

### 4.S.5 Student Attendance — QR Scan by HR/Instructor

> **Key difference from Team OS events:** the student does NOT scan any QR themselves. Instead, **HR or the Instructor scans the student's permanent personal QR** to record attendance.

**Flow:**
1. HR/Instructor opens `/student-portal/admin/attendance/[sessionId]` on their mobile device.
2. This screen is **access-gated** — only HR role, the session's assigned Instructor, or President/Co-President.
3. Student shows their **personal QR** (from `/student/my-qr` or confirmation email).
4. HR/Instructor scans it → `student_attendance` row created → duplicate scan blocked.
5. Manual check-in: search by name, national ID, or phone number.
6. Attendance recorded per session (for courses) or per workshop.
7. After the session, instructor sees: total present, absent list, latecomers.

**Student QR:** each student has one **permanent QR** (`student_profiles.qr_code`) generated at account creation. This single QR is reused for every session and workshop — no separate QR per enrollment/event.

### 4.S.6 Instructor Tasks

Instructors assign **tasks** to students enrolled in a specific course or workshop (separate from the Team OS task system).

- **Task fields:** title, description, due date, course/workshop link, submission type (link / file), max score (optional), assigned_to (all enrolled / specific students).
- **Student flow:** sees task at `/student/my-tasks` → submits a URL or uploads a file → instructor grades and leaves feedback → student notified.
- **Task statuses:** `pending` → `submitted` → `graded` / `needs_revision` → `final`.

### 4.S.7 Student Dashboard (at `/student/dashboard`)
- **My Courses:** progress bar per course (sessions attended / total), next session date
- **My Workshops:** upcoming / attended / missed list
- **My Tasks:** pending (with due date), submitted (awaiting grade), graded (with score)
- **Attendance Summary:** overall rate + per-course breakdown
- **Certificates:** received certificates with download links
- **My QR Code:** large permanent QR with download button (for showing to HR on check-in day)

### 4.S.8 Student Certificates
- When a course/workshop is marked completed, Instructor/President bulk-issues certificates to students with attendance ≥ configured threshold (default 75%).
- Uses the **same certificate template + PDF generation system** as Team OS (§4.14), but stored in `student_certificates` (separate table).
- Student notified in-app + by email with download link.
- Certificate appears on student dashboard + verified on public `/verify/[code]` page.

### 4.S.9 Team Admin — Student Portal Management Panel

At `/student-portal/admin`:

| Action | President/Co-Pres | HR Head/Co-Head | Assigned Instructor | HR Member |
|---|---|---|---|---|
| Create/publish courses & workshops | ✅ | ✅ | ✅ (own only) | ❌ |
| Scan student QR for check-in | ✅ | ✅ | ✅ (own sessions) | ✅ |
| View all students | ✅ | ✅ | ✅ (own course/workshop) | ✅ |
| Grade student tasks | ✅ | ❌ | ✅ (own course) | ❌ |
| Issue student certificates | ✅ | ❌ | ❌ (request only) | ❌ |
| Configure portal settings | ✅ | ❌ | ❌ | ❌ |

### 4.S.10 Student Portal — Database Schema

**`student_profiles`**
`id (= auth.users.id), full_name_ar, full_name_en, email (unique), avatar_url, national_id (text, 14 chars, unique), university, faculty, department_major, academic_year (smallint 1-5), phone, whatsapp_number, facebook_url, instagram_url, linkedin_url, qr_code (text unique — permanent QR identifier generated on account creation), status (incomplete/active/suspended), created_at, updated_at`

**`courses`**
`id, title, description, cover_image_url, category, instructor_ids (uuid[]), capacity (nullable), enrollment_type (open/gated), status (draft/published/archived), created_by, created_at`

**`course_sessions`**
`id, course_id (FK courses), session_number (int), title, description, session_date, start_time, end_time, venue (text), online_link (nullable), qr_secret, status (scheduled/completed/cancelled), created_at`

**`course_enrollments`**
`id, course_id, student_id (FK student_profiles), status (pending/confirmed/rejected/withdrawn/waitlisted), enrolled_at, confirmed_at, created_at`

**`workshops`**
`id, title, description, cover_image_url, category, instructor_ids (uuid[]), date, start_time, end_time, venue, online_link (nullable), capacity (nullable), registration_deadline (timestamptz nullable), status (draft/published/archived/completed), registration_open (bool), qr_secret, created_by, created_at`

**`workshop_registrations`**
`id, workshop_id, student_id (FK student_profiles), qr_code (text unique — per-registration confirmation QR for the email), status (registered/waitlisted/cancelled), registered_at, created_at`

**`student_attendance`**
`id, session_id (FK course_sessions, nullable — null when it's a workshop attendance), workshop_id (FK workshops, nullable), student_id (FK student_profiles), check_in_time, checked_in_by (FK profiles — the team member who scanned), method (qr/manual), created_at`
> Unique constraints: `(session_id, student_id)` and `(workshop_id, student_id)`.
> INSERT is allowed only by authenticated team members (HR/Instructor/President/Co-President) — students cannot self-insert.

**`student_tasks`**
`id, course_id (FK courses, nullable), workshop_id (FK workshops, nullable), title, description, due_date, submission_type (link/file), max_score (numeric nullable), assigned_to (all_enrolled/specific), specific_student_ids (uuid[] nullable), status (active/closed), created_by (FK profiles — the instructor), created_at`

**`student_task_submissions`**
`id, task_id (FK student_tasks), student_id (FK student_profiles), submission_link (nullable), submission_file_url (nullable), score (numeric nullable), feedback_comment (text nullable), status (submitted/graded/needs_revision/final), submitted_at, graded_at, graded_by (FK profiles — the instructor), created_at`

**`student_certificates`**
`id, template_id (FK certificate_templates — shared with Team OS), student_id (FK student_profiles), course_id (FK courses, nullable), workshop_id (FK workshops, nullable), title, issue_date, certificate_number (unique, format GDGOC-STU-2026-000001), verification_code (uuid — embedded as QR on the PDF, verified at /verify/[code]), pdf_drive_file_id, pdf_drive_url, issued_by (FK profiles — team member who issued), created_at`

### 4.S.11 Student Portal — RLS Principles
- `student_profiles`: student reads/edits own row; HR + assigned Instructors + President/Co-President read all students.
- `courses`, `workshops`: published ones readable by all authenticated users (students + team); drafts readable only by admins/instructors.
- `course_enrollments`, `workshop_registrations`: student reads own records; instructors read their course's/workshop's records; HR + President read all.
- `student_attendance`: student reads own records; instructors read records for their own sessions; HR + President read all; **INSERT strictly restricted to team members** (HR/Instructor/President) — students cannot self-record attendance.
- `student_tasks`: active tasks readable by enrolled students; instructors + admins read/write all.
- `student_task_submissions`: student reads/creates/edits own submission (until graded); instructors read all submissions for their course; HR + President read all; grade + feedback write only by instructors/President.
- `student_certificates`: student reads own; President/Co-President read all; public `/verify/[code]` uses narrow security-definer RPC.

---

## 5. Dashboards — Per Role (stats & widgets)

### 5.1 President / Co-President Dashboard
- Total members / active members, total tasks / completion %, committee health scorecards
- "Needs Attention" (overdue tasks, stalled approvals, PR follow-ups, inactive members, **events over budget**)
- Upcoming events/deadlines (synced with Google Calendar), weekly 5-question review feed
- Pending approvals queue: accounts, task final-stage, event final-stage
- **Org-wide attendance-rate leaderboard, including Heads and themselves**
- Certificates issued this term (count + quick "Issue new" shortcut)
- Gamification snapshot: current Hall-of-Fame leaders, most-awarded badge this month
- New-member onboarding progress overview (who's still mid-checklist)
- Average event satisfaction score trend (from Event Feedback)

### 5.2 Branch Head Dashboard
- KPIs aggregated across their branch's committees, committee comparison chart (completion %, attendance %)
- Pending Stage-2 approvals (tasks/events awaiting them)
- Escalations from their branch's Committee Heads

### 5.3 Committee Head / Co-Head Dashboard
- Committee roster, task board, upcoming events owned, committee KPI trend
- Pending Stage-1 approvals (their own members' tasks)
- Committee-specific module (PR → CRM pipeline, Media → calendar + library, Ops → checklists, HR → attendance dashboard)
- **Own attendance rate** shown just like a Member's

### 5.4 Member Dashboard
- My tasks (Kanban filtered to me) + current stage if a task is mid-approval
- My attendance history + attendance rate + upcoming registered events
- My profile + performance trend + certificates tab
- My points, level/tier, badges, streaks

---

## 6. Site Map / Routes

```
Public:
  /                              → Landing / chapter info
  /join                          → Recruitment CTA → Google sign-in
  /stats                         → Public chapter stats page (spec §4.21)
  /events/[slug]                 → Public event page + registration (only once event.status = published)
  /events/[slug]/confirmation
  /verify/[verification_code]    → Certificate authenticity check (team members + students share this)

Auth-gated (any status):
  /onboarding/complete-profile
  /onboarding/status

Authenticated app — Team OS (status = active):
  /dashboard                     → role-aware landing
  /search                        → global search results (spec §4.19)
  /members                       → directory (scoped by RLS)
  /members/[id]                  → profile incl. performance + certificates tab
  /members/alumni                → alumni directory (President/Co-President, read-only for Heads)
  /tasks                         → Kanban board
  /tasks/[id]                    → detail + delegation controls + approval-stage tracker
  /events                        → internal list/builder
  /events/[id]/edit
  /events/[id]/review            → branch/president approval screen
  /events/[id]/tasks             → this event's Event Task List
  /events/[id]/attendance        → QR scan + walk-in check-in (access gated per §4.3)
  /events/[id]/budget            → event budget tracker
  /events/[id]/feedback          → feedback results (owners/President)
  /hr/attendance                 → HR dashboard incl. org-wide attendance leaderboard
  /pr/crm
  /media/calendar
  /media/library                 → central Drive-backed library
  /operations/checklists/[eventId]
  /command-center                → President/Co-President only
  /approvals                     → inbox, filtered by role + pending stage
  /certificates                  → President-only: templates + issue flow
  /certificates/issue
  /notifications
  /reports
  /gamification                  → points/levels/badges hub
  /gamification/leaderboard
  /gamification/hall-of-fame
  /settings/profile
  /settings/committees            → President-only structure editor
  /settings/drive                 → President-only Drive/Apps-Script connection settings
  /settings/faculties             → President-only faculty/college list editor (v4 NEW)

Student Portal — Student-facing (separate auth context):
  /student                          → Student Portal landing page
  /student/register                 → Google sign-in → student profile form
  /student/onboarding               → Complete student profile (blocks until done)
  /student/dashboard                → Student home: courses, tasks, attendance, QR
  /student/courses                  → Browse all published courses
  /student/courses/[id]             → Course detail + sessions list + enroll button
  /student/workshops                → Browse all published workshops
  /student/workshops/[id]           → Workshop detail + register button
  /student/workshops/[id]/confirmation  → QR confirmation page after registration
  /student/my-tasks                 → All assigned tasks + submission interface
  /student/my-tasks/[taskId]        → Task detail + submission form (link or file upload)
  /student/my-attendance            → Attendance history across all courses/workshops
  /student/my-qr                    → Student's permanent personal QR code (full-screen, downloadable)
  /student/certificates             → Certificates received
  /student/profile                  → Edit own student profile

Student Portal — Team Admin-facing (authenticated team member with appropriate role):
  /student-portal/admin                              → Admin home: stats + quick links
  /student-portal/admin/courses                      → Course list (team view)
  /student-portal/admin/courses/new
  /student-portal/admin/courses/[id]                 → Edit course + manage sessions
  /student-portal/admin/courses/[id]/tasks           → Tasks for this course + all submissions
  /student-portal/admin/courses/[id]/tasks/[tid]/submissions → All student submissions + grading
  /student-portal/admin/workshops                    → Workshop list (team view)
  /student-portal/admin/workshops/new
  /student-portal/admin/workshops/[id]               → Edit workshop + manage registrations
  /student-portal/admin/students                     → All students directory + search + export
  /student-portal/admin/students/[id]                → Individual student: courses, attendance, tasks, certs
  /student-portal/admin/attendance/[sessionId]       → Live QR scan screen + manual check-in
  /student-portal/admin/certificates                 → Issue certificates to course/workshop attendees
  /student-portal/admin/settings                     → Portal settings (roles, thresholds, etc.)
```

---

## 7. Non-Functional Requirements

- **Mobile-first PWA**, installable, QR scanning smooth on phone cameras.
- **Performance target:** event check-in under 10 seconds per attendee.
- **Accessibility:** WCAG AA color contrast on all dashboard widgets.
- **Theme:** Dark mode only — the platform ships a single, polished dark theme (no light/dark toggle), per project decision.
- **Localization:** i18n-ready structure, default UI language English (flag if Arabic-first is actually required — see §12).
- **Reliability:** every state-changing action that matters for accountability (approvals, delegations, certificate issuance, role changes) is logged to `audit_logs` and is never silently lost.

---

## 8. Storage Architecture — Google Drive Integration

### 8.1 Why Drive, and how it's wired in
Supabase Storage is used only for small, latency-sensitive assets (avatars, thumbnails). Everything else — evidence uploads, media assets, reports, certificates — lives in **Google Drive**, inside one root folder named after the platform, organized automatically by the app itself (not manually by any human).

### 8.2 Integration approach — Google Apps Script Web App bridge
1. Create the root Drive folder (e.g. **"GDGoC HNU OS"**) once, under a Google account that should ideally be a **dedicated chapter account** rather than a personal one (see assumption in §12 — a personal President account works but doesn't survive leadership transitions cleanly).
2. Build a **Google Apps Script** bound to that folder, deployed as a **Web App** (`doPost(e)` handler), exposing:
   - `ensureFolderPath(pathArray)` — creates any missing folders along a path and returns the final folder's ID (this is the "app organizes the folders it needs" behavior).
   - `uploadFile(parentFolderId, base64Data, filename, mimeType)` → returns `{fileId, url}`.
   - `listFiles(folderId)`
   - `deleteFile(fileId)`
   - `getShareableLink(fileId)`
3. Every request to the Web App must include a **shared secret token**; the script rejects any call missing/mismatching it. The Web App URL + secret are stored **only** as server-side environment variables (Supabase Edge Function secrets) — never sent to the browser.
4. The Next.js/Supabase backend calls this Web App over HTTPS whenever a file needs to be stored or a folder needs to exist; results (`drive_folder_id`/`drive_file_id`) are cached in `drive_folder_map` (§3.15) or on the owning row (e.g. `certificates.pdf_drive_file_id`) so the app rarely needs to re-resolve a path.

### 8.3 Default folder structure (auto-created on first need — nobody creates these by hand)
```
/GDGoC HNU OS  (root)
  /Departments/{CommitteeName}/
  /Events/{EventName}-{Date}/
      /Registrations-Exports/
      /Media-Coverage/
  /Members/{MemberName}/Evidence/
  /Media-Library/
      /Brand-Kit/
      /Templates/
      /Posters/  /Photos/  /Videos/
  /Certificates/
      /Templates/
      /Issued/{Year}/
  /Reports/{Year}/{Month}/
```

---

## 9. Security & Hardening

A dedicated, non-negotiable checklist — every item below must be true before launch:

1. **Auth:** Google OAuth only, no password login path exists at all; Supabase-managed session/JWT with short-lived access tokens + refresh rotation.
2. **RLS everywhere:** every table has RLS enabled with an explicit policy — no table is ever left open by omission. The `service_role` key is used **only** inside server-side Edge Functions, never shipped to any client bundle.
3. **Privileged writes go through Edge Functions**, not direct client `INSERT`/`UPDATE` — account approval, task/event stage-approval, role changes, certificate issuance, and anything touching Drive are all server-validated against the caller's real role (never trust a client-supplied role claim).
4. **Public form abuse prevention:** rate limiting + CAPTCHA (e.g. hCaptcha/reCAPTCHA) on the Recruitment Page and public Event Registration Page to block bot spam.
5. **Input sanitization:** all rich text (task descriptions, comments, event descriptions) sanitized against XSS before render; Supabase's parameterized queries prevent SQL injection by default — never build raw SQL strings from user input.
6. **File upload validation:** MIME-type and size-limit checks before anything is forwarded to the Drive bridge; reject executable/script file types outright.
7. **Google Drive bridge security:** shared-secret token required on every Apps Script call, all Drive operations logged, secret rotated periodically, Web App restricted so only the backend's server IP context ever calls it (never exposed to the browser).
8. **Certificate integrity:** `verification_code` is a non-guessable UUID, never sequential; the public verify endpoint only ever returns the minimal authenticity fields, never the recipient's contact info or other private data.
9. **Audit trail:** every approval action, status/role change, and certificate issuance writes an immutable `audit_logs` row — no update/delete policy exists on that table for any role, including President.
10. **Transport & session security:** HTTPS enforced everywhere, secure/HttpOnly cookies, CSRF protection on all state-changing requests.
11. **Secrets management:** all API keys/tokens (Supabase service role, Drive Apps Script secret, email provider key) live only in environment variables on the server side, never committed to the repo, rotated on any suspected exposure.
12. **Backups:** scheduled Supabase Postgres backups (point-in-time recovery if the plan supports it); Drive files are inherently redundant on Google's side, but a periodic export/archive job is still recommended for disaster recovery.
13. **Least privilege, enforced twice:** every role check exists both in the UI (for good UX) **and** independently in RLS/Edge Functions (for real security) — the UI check is never the only gate.
14. **Pre-launch penetration pass:** before go-live, explicitly attempt (and confirm blocked) the following: a Member reading another committee's tasks, a Member calling an approval Edge Function directly, an unauthenticated request reading `profiles`/`attendance`/`certificates` tables directly, and a forged/guessed certificate verification code.

---

## 10. Deployment — Vercel

### 10.1 Hosting model
- The Next.js app (frontend + all server-side logic) is deployed on **Vercel**.
- All privileged server logic that this spec earlier referred to generically as "Edge Functions" (account approval, task/event stage-approval actions, certificate PDF generation, Google Drive bridge calls, report generation) is implemented as **Next.js API Routes / Server Actions**, which Vercel automatically deploys as **Serverless Functions**. Supabase itself is used purely as the database/Auth/Realtime layer — it does not need to also host Supabase Edge Functions unless the builder prefers to split logic that way.
- The `service_role` Supabase key is set as a **server-only** environment variable in Vercel (never prefixed `NEXT_PUBLIC_`) and is only ever read inside API Routes/Server Actions, never sent to the browser.

### 10.2 Environment variables (set in the Vercel project, not committed to the repo)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY          (server-only)
GOOGLE_DRIVE_SCRIPT_URL            (server-only)
GOOGLE_DRIVE_SCRIPT_SECRET         (server-only)
EMAIL_PROVIDER_API_KEY             (server-only)
CAPTCHA_SITE_KEY
CAPTCHA_SECRET_KEY                 (server-only)
CRON_SECRET                        (server-only — protects scheduled endpoints, §10.4)
```

### 10.3 Environments & preview deployments
- **Production:** the `main` branch auto-deploys to the production domain, connected to the production Supabase project.
- **Preview:** every other branch/PR gets an automatic Vercel preview URL. Recommend a **separate staging Supabase project** for previews (or at minimum a clearly test-flagged dataset) so QA/testing never touches real member data, real Drive folders, or sends real emails to real members.
- **Custom domain:** attach the chapter's domain (or a free subdomain) to the production deployment; Vercel issues HTTPS automatically.

### 10.4 Scheduled jobs — Vercel Cron
Several recurring jobs in this spec need to run on a schedule rather than in response to a user action. Implement each as a protected API route (checks `CRON_SECRET`) and schedule it via `vercel.json` Cron Jobs:

| Job | Purpose | Suggested schedule |
|---|---|---|
| Monthly performance computation (§4.6) | Recomputes `performance_reviews` for every profile | 1st of each month |
| Event auto-completion (§4.3) | Flips `events.status` to `completed` after the event date passes | Daily |
| SLA escalation reminder (§4.2, §9 item 9 in §12) | Pings the current approver + President if a task/event has sat in one stage past the SLA | Daily |
| Seasonal leaderboard reset (§4.13) | Archives the current season's leaderboard into the Hall of Fame and starts a new season | Once per semester (manually triggered or scheduled at term start) |
| Attendance-rate cache refresh (`profiles.attendance_rate`) | Keeps the cached column in sync so dashboards stay fast | Daily |

### 10.5 PWA on Vercel
Vercel serves the service worker and manifest correctly out of the box — just confirm the service-worker file's cache headers aren't overridden by a custom `vercel.json` headers rule, and re-test "Add to Home Screen" after each deploy that touches the manifest.

---

## 11. Build Order Recommendation

Even though scope is delivered in full, build in this dependency-safe order (this is also the exact order `AGENT_BUILD_CHECKLIST.md` follows):

**Team OS Phases:**
1. Vercel project set up + skeleton app deployed + Supabase schema (§3) + RLS (§3.17) + Google OAuth provider config.
2. `faculty_options` table + `/settings/faculties` page — must exist before profile form is built.
3. Auth + onboarding flow (§2) incl. approvals inbox — with **updated profile fields** (§2.2 v4).
4. Committee/member management (§4.1) + role-aware app shell + routing (§6).
5. Generic approval/escalation engine (§3.13) — built once, used as the fixed-chain fallback for Tasks and Events.
6. Task & Kanban module — basic single-assignee tasks with the fixed escalation chain wired in (§4.2 part C).
7. **Task Delegation & Broadcast Assignment upgrade** (§4.2 parts A & B) — extends the basic task module before Events is built, since Events depend on linkable tasks.
8. New-Member Onboarding Checklist (§4.15), Offboarding & Alumni Archive (§4.16), and Dark Mode theme (§7) — low-dependency features slotted in early.
9. Events full lifecycle incl. review/approval/publish + public registration + QR attendance + Event Task List + check-in access gating (§4.3, §4.4).
10. Event Feedback Survey (§4.18) and Event Budget Tracking (§4.20) — both depend directly on Events.
11. HR dashboard incl. org-wide attendance leaderboard (§4.5) + Member performance (§4.6).
12. PR CRM (§4.7).
13. Global Search (§4.19) — once Tasks, Members, Events, and PR Contacts all exist to search across.
14. Google Drive bridge (§9) — needed before Media Library and Certificates can store real files.
15. Google Calendar Integration (§4.17) — reuses the Drive bridge's Google account/credentials.
16. Media workspace + central library (§4.8), Operations checklists (§4.9).
17. President Command Center (§4.10) — depends on data from everything above.
18. Notifications & approvals wiring across every module (§4.11).
19. Reports & exports (§4.12).
20. Gamification (§4.13).
21. Certificates (§4.14) — depends on Drive bridge + attendance data.
22. Public Chapter Stats Page (§4.21) — depends on aggregate data from most modules above.
23. Vercel Cron jobs (§11.4) wired to their respective modules.
24. Security hardening pass + audit log wiring across all of the above (§10).

**Student Portal Phases (build after Team OS is stable):**
25. **Phase A — Student Auth & Profile:** `student_profiles` table + RLS + `student_profiles.qr_code` generation on signup; student Google sign-in flow; student profile form (same faculty_options, separate table); student dashboard skeleton.
26. **Phase B — Courses & Sessions:** `courses` + `course_sessions` + `course_enrollments` tables + RLS; team admin CRUD for courses/sessions; student browse + enroll; session schedule view on student dashboard.
27. **Phase C — Workshops:** `workshops` + `workshop_registrations` tables + RLS; team admin CRUD for workshops; student browse + register; QR confirmation page + email.
28. **Phase D — Student Attendance (QR scan by HR):** `student_attendance` table + RLS; team admin QR scan screen per session/workshop (mobile-optimised camera UI); manual check-in by name/national ID/phone; student attendance history on student dashboard.
29. **Phase E — Instructor Tasks:** `student_tasks` + `student_task_submissions` tables + RLS; instructor creates tasks per course/workshop; student submits via link or file upload; instructor grades + leaves feedback; student notification on grading.
30. **Phase F — Student Certificates:** `student_certificates` table + RLS; issue flow reusing §4.14 certificate system; student certificate dashboard; `/verify/[code]` integration for student certs.
31. **Final QA (all systems):** RLS penetration checks, full Team OS dry runs, Student Portal dry run (registration → enrollment → session check-in by HR → task submission → grading → certificate issue → verify).

---

## 12. Open Assumptions Recap (confirm or override before/while building)

**Team OS Assumptions:**
1. **Task final approval** requires either the President *or* Co-President (not both) — flag if you want both required.
2. **Event final approval** — same rule: either President or Co-President suffices.
3. **Google Drive root account** — assumed to be run under a Google account you control (ideally a dedicated chapter account, not a personal one that leaves with a graduating President) — flag if you already have a Google Workspace org to use instead of a personal Drive + Apps Script bridge.
4. **Certificate issuance** is President-only by default, with optional Co-President delegation — flag if Heads should ever be allowed to issue their own committee's certificates.
5. Default UI language is English with i18n-ready structure — flag if Arabic-first UI is actually required.
6. WhatsApp notification channel is schema-ready but not built in this version.
7. AI Assistant / data-query chatbot remains fully excluded from this build.
8. SLA for "stuck in approval" escalation reminders defaults to 3 days — adjust if a different threshold is wanted.
9. **Hosting:** Vercel is the deployment target for the whole app (§11); Supabase remains database/Auth/Realtime only — flag if Supabase Edge Functions are preferred over Next.js API Routes for any specific piece of server logic.
10. **Delegation vs. fixed escalation:** a task follows the fixed 3-stage chain (§4.2 part C) only when nobody delegates it further; the moment someone delegates it downward, the chain that eventually approves it is exactly the reverse of the delegation path (§4.2 part B) — the fixed chain and manual delegation are not both applied to the same task.
11. **Broadcast task consolidation** is manual: the task owner personally reviews all individual submissions and picks/summarizes the one that represents the task — there's no automatic "best answer" selection.
12. **Check-in access** defaults to whoever is explicitly assigned the check-in task for that specific event, plus HR role and President/Co-President as a standing override — flag if you want a different default override set.
13. **Offboarding authority** follows the same pattern as account approval: a Committee Head can recommend moving a member to alumni, but the President/Co-President has final say — flag if Heads should have unilateral authority within their own committee.
14. **Dark mode only** — no light theme is planned; flag if a light/dark toggle is wanted after all.
15. **Google Calendar** uses the same Google account/credentials as the Drive bridge for simplicity — flag if you'd rather keep Calendar and Drive on separate accounts.
16. **Event feedback** defaults to anonymous unless the respondent opts to attach their name — flag if you'd rather default to attributed feedback.

**Student Portal Assumptions (v4 new):**
17. **Student registration:** open self-registration by default (any student can register immediately without manual approval). Flag if invite-only or admin-approval-required registration is preferred.
18. **Student QR:** each student has one **permanent personal QR** (`student_profiles.qr_code`) used across all sessions and workshops — HR/Instructor scans this one QR to record any attendance, rather than generating a new QR per event. Flag if per-enrollment QR codes are preferred instead.
19. **Student-team account linkage:** a GDGoC team member can also create a student account using the same Google email — they are treated as two separate roles (one `profiles` row + one `student_profiles` row). Flag if a unified single account with role toggle is preferred.
20. **Faculty options list:** the same `faculty_options` table is shared between the team profile form and the student profile form by default. Flag if separate faculty lists are needed for team members vs. students.
21. **Student task submission:** both link (URL) and file upload are supported as submission types, selectable per task. Flag if only one type is needed to simplify.
22. **Profile field — National ID:** stored as text, validated to exactly 14 digits. Flag if full Egyptian NID checksum/format validation is required.
23. **Profile fields — social media:** Facebook, Instagram, and LinkedIn are all optional for both team members and students — no minimum required.
24. **Student attendance threshold for certificate:** default is ≥ 75% of sessions attended to qualify for a course certificate. Configurable per course in Student Portal settings. Flag if a different default is preferred.
25. **Student Portal instructor role:** any team member can be assigned as an Instructor for a specific course or workshop. The assignment is per-course/per-workshop, not a global role change. Flag if a dedicated global "Instructor" role is preferred.