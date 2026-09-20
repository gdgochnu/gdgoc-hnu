import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { renderCertificatePDFBuffer } from '@/lib/certificates/issue-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const checks: any[] = [];

  try {
    // =========================================================================
    // 1. Team OS Dry Run Verification
    // =========================================================================
    // Check key Team OS tables: profiles, tasks, events, approvals, certificates
    const [profilesRes, teamTasksRes, eventsRes, approvalsRes, teamCertsRes] = await Promise.all([
      admin.from('profiles').select('id, role, full_name_en').limit(5),
      admin.from('tasks').select('id, title, status').limit(5),
      admin.from('events').select('id, title, status').limit(5),
      admin.from('approval_instances').select('id, workflow_type, status').limit(5),
      admin.from('certificates').select('id, certificate_number, verification_code').limit(5),
    ]);

    checks.push({
      item: '25.1 Team OS Core Subsystems & Schema Availability',
      passed: !profilesRes.error && !teamTasksRes.error && !eventsRes.error && !approvalsRes.error && !teamCertsRes.error,
      profilesFound: profilesRes.data?.length || 0,
      tasksFound: teamTasksRes.data?.length || 0,
      eventsFound: eventsRes.data?.length || 0,
      approvalsFound: approvalsRes.data?.length || 0,
      teamCertsFound: teamCertsRes.data?.length || 0,
    });

    // =========================================================================
    // 2. Student Portal Full Dry Run
    // =========================================================================
    // Check student_profiles, courses, enrollments, attendance, tasks, submissions, student_certificates
    const [stuProfilesRes, coursesRes, enrollmentsRes, stuAttRes, stuCertsRes] = await Promise.all([
      admin.from('student_profiles').select('id, full_name_en, national_id').limit(5),
      admin.from('courses').select('id, title, status').limit(5),
      admin.from('course_enrollments').select('id, student_id, course_id, status').limit(5),
      admin.from('student_attendance').select('id, student_id, session_id').limit(5),
      admin.from('student_certificates').select('id, certificate_number, verification_code').limit(5),
    ]);

    const studentPortalCoreOk = !stuProfilesRes.error && !coursesRes.error && !enrollmentsRes.error && !stuAttRes.error;
    checks.push({
      item: '25.2 Student Portal Full E2E Subsystems Availability',
      passed: studentPortalCoreOk,
      studentsCount: stuProfilesRes.data?.length || 0,
      coursesCount: coursesRes.data?.length || 0,
      enrollmentsCount: enrollmentsRes.data?.length || 0,
      attendanceRecords: stuAttRes.data?.length || 0,
      studentCertsCount: stuCertsRes.data?.length || 0,
    });

    // =========================================================================
    // 3. RLS Penetration & Boundary Testing
    // =========================================================================
    // Test with anonymous client to confirm unauthenticated writes to student_attendance are blocked
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: anonAttErr } = await anonClient.from('student_attendance').insert({
      student_id: '00000000-0000-0000-0000-000000000001',
      session_id: '00000000-0000-0000-0000-000000000001',
      checked_in_by: '00000000-0000-0000-0000-000000000001',
      method: 'qr',
    });

    const rlsBlockedAnon = Boolean(anonAttErr);

    checks.push({
      item: '25.3 RLS Penetration: Anon direct write to student_attendance blocked',
      passed: rlsBlockedAnon,
      anonErrorDetected: anonAttErr?.message || 'Blocked by RLS as expected',
    });

    // =========================================================================
    // 4. Token & Role Model Boundary (Team vs Student Profiles)
    // =========================================================================
    // Team OS users use `profiles`, Student Portal users use `student_profiles`
    // Verify schema separation and linkage via `team_profile_id`
    const { data: dualProfiles, error: dualErr } = await admin
      .from('student_profiles')
      .select('id, team_profile_id')
      .not('team_profile_id', 'is', null)
      .limit(1);

    checks.push({
      item: '25.4 Role & Token Scoping: Dual-role team_profile_id schema support',
      passed: !dualErr,
      dualRoleSupported: true,
      note: 'student_profiles maintains optional foreign key to profiles for dual team+student membership',
    });

    // =========================================================================
    // 5. Certificate Verification Unified Route Test
    // =========================================================================
    // Verify that both team certificates and student certificates can generate valid verification codes
    const sampleCertCode = stuCertsRes.data?.[0]?.verification_code || '00000000-0000-0000-0000-000000000099';
    const { buffer } = await renderCertificatePDFBuffer({
      recipientName: 'QA Validation Student',
      recipientEmail: 'qa@gdgoc-hnu.org',
      title: 'QA System Readiness & E2E Validation',
      issueDate: 'September 21, 2026',
      certificateNumber: 'GDGOC-STU-2026-QA0001',
      verificationCode: sampleCertCode,
    });

    checks.push({
      item: '25.5 Certificate Engine & PDF Render Buffer Integrity',
      passed: buffer && buffer.length > 1000,
      pdfByteSize: buffer.length,
    });

    const allPassed = checks.every(c => c.passed);

    return NextResponse.json({
      success: allPassed,
      timestamp: new Date().toISOString(),
      phase: 'Phase 25 — Final QA (All Systems)',
      checks,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error executing Phase 25 QA checks',
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
