# GDGoC HNU OS & Student Portal — Manual QA Tester Checklist (v4.1)

> **Audience:** President, Co-President, Chapter Leadership, and QA Testers.  
> **Purpose:** Comprehensive, step-by-step manual test scripts to certify all features across the **Team OS** and the newly launched **Student Portal** before full production rollout.

---

## 1. Test Environment Setup & Accounts
Prepare the following test accounts with Google OAuth:
1. **President Account:** `president@gdgoc-hnu.org` (Role: `president`)
2. **Co-President Account:** `copresident@gdgoc-hnu.org` (Role: `co_president`)
3. **Branch Head Account:** `techhead@gdgoc-hnu.org` (Role: `branch_head`, Branch: `tech`)
4. **Committee Head Account:** `mobilehead@gdgoc-hnu.org` (Role: `committee_head`, Department: `Mobile`)
5. **Team Member Account:** `member@gdgoc-hnu.org` (Role: `member`, Department: `Mobile`)
6. **Student Account:** `student@gmail.com` (Student profile registered)
7. **Dual-Role Account:** Team member enrolled as a student (`student_profiles.team_profile_id` linked)

---

## 2. Team OS QA Test Scripts

### 2.1 Onboarding & Multi-Stage Account Approval
- [ ] **Step 1:** Sign in with a new Google Account not yet in the system.
- [ ] **Step 2:** Fill 4-part Arabic Name, 4-part English Name, 14-digit National ID, Faculty dropdown, Phone/WhatsApp.
- [ ] **Step 3:** Submit profile → verify status is `pending_approval`.
- [ ] **Step 4:** Committee Head logs in → sees pending member in Committee roster with recommendation button.
- [ ] **Step 5:** President logs in → navigates to `/admin/approvals` or Command Center → approves member.
- [ ] **Step 6:** Member refreshes page → full member dashboard unlocked with onboarding checklist.

### 2.2 Task Delegation & Multi-Stage Completion
- [ ] **Step 1:** Committee Head creates a task assigned to Member with due date and priority.
- [ ] **Step 2:** Member sees task in "My Tasks", moves status to `in_progress`.
- [ ] **Step 3:** Member completes task, uploads Drive evidence / link, clicks "Submit for Review".
- [ ] **Step 4:** Multi-stage approval triggers: Stage 1 (Committee Head) receives notification.
- [ ] **Step 5:** Head approves → escalates to Stage 2 (President/Co-President) for final sign-off.
- [ ] **Step 6:** President approves → task marked `completed`, gamification points awarded to Member.

### 2.3 Event Lifecycle & Attendance Check-In
- [ ] **Step 1:** Operations/Tech Head creates an Event with venue, budget, agenda.
- [ ] **Step 2:** President approves event publish → event appears on chapter calendar.
- [ ] **Step 3:** During event session, HR opens `/admin/attendance/scan`.
- [ ] **Step 4:** Scans Member's personal QR code → check-in confirmed with timestamp.
- [ ] **Step 5:** Try scanning same QR again → duplicate warning displayed with existing time.

### 2.4 Chapter Certificates & QR Verification
- [ ] **Step 1:** President navigates to `/admin/certificates`.
- [ ] **Step 2:** Selects template, inputs Member name, generates certificate.
- [ ] **Step 3:** Download generated PDF → verify layout, typography, and embedded verification QR.
- [ ] **Step 4:** Scan QR or open `/verify/[code]` in private browser → confirms authenticity, issue date, and recipient details.

---

## 3. Student Portal QA Test Scripts

### 3.1 Public Registration & Dual-Role Membership
- [ ] **Step 1:** Public student visits `/student/login` → signs in with Google.
- [ ] **Step 2:** Completes student registration (Arabic & English 4-part name, National ID, Faculty, Department, Academic Year).
- [ ] **Step 3:** Verify personal student QR code is generated at `/student/my-qr`.
- [ ] **Step 4:** Verify dual-role linking: Team member signs in as student → `team_profile_id` is linked without profile conflicts.

### 3.2 Course & Workshop Browsing & Enrollment
- [ ] **Step 1:** Student navigates to `/student/courses` and `/student/workshops`.
- [ ] **Step 2:** Views course details, prerequisites, instructor bio, session roadmap.
- [ ] **Step 3:** Clicks "Enroll in Course" → enrollment created with status `active`.
- [ ] **Step 4:** Course appears immediately on Student Dashboard under "My Enrolled Courses".

### 3.3 QR Attendance Check-In (HR Mobile Scanner)
- [ ] **Step 1:** HR / Assigned Instructor opens `/student-portal/admin/attendance/scan`.
- [ ] **Step 2:** Selects today's course or workshop session.
- [ ] **Step 3:** Points camera at student's QR code on phone screen.
- [ ] **Step 4:** Green confirmation banner displays: student name, national ID, timestamp.
- [ ] **Step 5:** Rescan same student → shows "Already Checked In at [Time]".
- [ ] **Step 6:** Test manual fallback search by name/national ID → records attendance row.
- [ ] **Step 7:** Student opens `/student` dashboard → attendance summary percentage increments.

### 3.4 Course Lessons & Interactive Materials
- [ ] **Step 1:** Instructor opens `/student-portal/admin/courses/[id]/lessons` → adds Lesson with YouTube URL and slides PDF.
- [ ] **Step 2:** Student opens `/student/courses/[id]` → clicks Lesson.
- [ ] **Step 3:** Embedded YouTube video plays cleanly with custom container.
- [ ] **Step 4:** Embedded PDF viewer opens slides with pagination and fullscreen toggle.
- [ ] **Step 5:** Student clicks "Mark as Completed" → course progress bar updates.

### 3.5 Tasks & Submissions
- [ ] **Step 1:** Instructor creates task: "Build landing page with responsive grid", max score 10.
- [ ] **Step 2:** Student dashboard displays "Pending Deliverables" card with deadline countdown.
- [ ] **Step 3:** Student clicks task → inputs GitHub repository URL or Drive file → submits.
- [ ] **Step 4:** Mentor opens `/student-portal/admin/courses/[id]/submissions` → filters by task.
- [ ] **Step 5:** Mentor inspects submission link, grades `9/10`, adds comment: "Great structure and responsive breakpoints!".
- [ ] **Step 6:** Student receives in-app notification and sees grade + mentor comment on dashboard.

### 3.6 Quizzes & Auto-Grading
- [ ] **Step 1:** Instructor builds Quiz with 5 MCQ questions and 1 Open-Ended question, 15 min limit.
- [ ] **Step 2:** Student opens `/student/courses/[id]/quizzes/[quizId]/take`.
- [ ] **Step 3:** Timer counts down smoothly; student answers questions and clicks Submit.
- [ ] **Step 4:** MCQ questions are auto-graded immediately with instant score calculation.
- [ ] **Step 5:** Instructor reviews open-ended answer at `/quizzes/[quizId]/review` → assigns final score.
- [ ] **Step 6:** Student quiz result shows passed badge and breakdown.

### 3.7 Mentorship Tracking & At-Risk Escalation
- [ ] **Step 1:** Mentor opens `/student-portal/admin/mentorship`.
- [ ] **Step 2:** Views progress table of all assigned mentees (attendance %, task avg, quiz avg).
- [ ] **Step 3:** Mentor clicks mentee row → views timeline and writes private mentor note.
- [ ] **Step 4:** Flags student with low attendance as "At Risk" → triggers urgent notification to Committee Head & President.

### 3.8 President-Gated Certificate Issuance & Public Verification
- [ ] **Step 1:** Student meets completion criteria (attendance ≥ 75%, task avg ≥ 70%, quiz avg ≥ 70%).
- [ ] **Step 2:** President opens `/student-portal/admin/certificates`.
- [ ] **Step 3:** Program roster loads → qualifying student appears as "Eligible".
- [ ] **Step 4:** President selects student, reviews completion KPIs, and clicks "Issue Official Certificates".
- [ ] **Step 5:** Background engine generates PDF with serial `GDGOC-STU-YYYY-XXXXXX` and uploads to Drive.
- [ ] **Step 6:** Student opens `/student/certificates` → certificate displayed with Preview, Download, and Share buttons.
- [ ] **Step 7:** Public user navigates to `/verify/[code]` → enters serial or verification code → displays verified student name, course track, and issue date.

---

## 4. Security & RLS Sign-Off
- [ ] **RLS-1:** Student directly invoking `student_attendance` INSERT is rejected with RLS denial (42501).
- [ ] **RLS-2:** Student attempting to view another student's task submission receives 0 rows or permission denied.
- [ ] **RLS-3:** Non-President team member navigating to `/student-portal/admin/certificates` is redirected or blocked.
- [ ] **RLS-4:** Team member token cannot query student private national IDs or phone numbers unless holding HR/Admin role.

---

## 5. Sign-Off Approval

| Role | Name | Signature | Date |
|---|---|---|---|
| **President** | | | |
| **Co-President** | | | |
| **Tech Head** | | | |
| **Lead QA** | | | |
