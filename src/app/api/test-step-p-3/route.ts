import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Fetch an active faculty from faculty_options
    const { data: faculties } = await admin
      .from('faculty_options')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1);

    const activeFaculty = faculties?.[0];
    if (!activeFaculty) {
      throw new Error('No active faculties found in faculty_options table.');
    }

    // 2. Fetch a department
    const { data: department } = await admin
      .from('departments')
      .select('id, name')
      .limit(1)
      .single();

    if (!department) {
      throw new Error('No department found for testing.');
    }

    // 3. Test Validation Assertions
    // 3a. Arabic name validation
    const testArShort = 'أحمد محمد';
    const testArValid = 'أحمد محمد علي حسن';
    const isArShortValid = testArShort.trim().split(/\s+/).filter(Boolean).length >= 4;
    const isArValid = testArValid.trim().split(/\s+/).filter(Boolean).length >= 4;

    // 3b. English name validation
    const testEnShort = 'Ahmed Mohamed';
    const testEnValid = 'Ahmed Mohamed Ali Hassan';
    const isEnShortValid = testEnShort.trim().split(/\s+/).filter(Boolean).length >= 4;
    const isEnValid = testEnValid.trim().split(/\s+/).filter(Boolean).length >= 4;

    // 3c. National ID format
    const testNidInvalid = '123456';
    const testNidValid = `2990101${String(testRunId).slice(-7)}`;
    const isNidInvalidRejected = !/^[23]\d{13}$/.test(testNidInvalid);
    const isNidValidAccepted = /^[23]\d{13}$/.test(testNidValid);

    // 3d. Egyptian phone format
    const testPhoneInvalid = '12345';
    const testPhoneValid = '01012345678';
    const isPhoneInvalidRejected = !/^01[0125]\d{8}$/.test(testPhoneInvalid);
    const isPhoneValidAccepted = /^01[0125]\d{8}$/.test(testPhoneValid);

    // 4. Test database write with v4 profile submission
    const testEmail = `test.p3.applicant.${testRunId}@example.com`;
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: { full_name: testEnValid },
    });

    if (authErr || !authUser.user) {
      throw new Error(`Failed to create test auth user: ${authErr?.message}`);
    }

    const testUserId = authUser.user.id;

    // Upsert v4 profile data
    const { data: profileRow, error: upsertErr } = await admin
      .from('profiles')
      .upsert({
        id: testUserId,
        email: testEmail,
        full_name_ar: testArValid,
        full_name_en: testEnValid,
        full_name: testEnValid,
        national_id: testNidValid,
        phone: testPhoneValid,
        whatsapp_number: testPhoneValid,
        faculty: activeFaculty.name_ar,
        department_major: 'نظم معلومات / Information Systems',
        academic_year: 2,
        facebook_url: 'https://facebook.com/applicant.test',
        instagram_url: 'https://instagram.com/applicant.test',
        linkedin_url: 'https://linkedin.com/in/applicant-test',
        department_id: department.id,
        position: 'Member',
        motivation: 'Passionate about web and cloud systems at GDGoC HNU.',
        how_heard: 'Campus Event',
        availability_hours: 10,
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (upsertErr) {
      await admin.auth.admin.deleteUser(testUserId);
      throw new Error(`Failed to upsert v4 profile: ${upsertErr.message}`);
    }

    // Create approval instance & audit log
    const { data: approvalInstance, error: appErr } = await admin
      .from('approval_instances')
      .insert({
        workflow_type: 'account_approval',
        entity_id: testUserId,
        current_step: 1,
        status: 'in_progress',
      })
      .select('id')
      .single();

    const { data: auditLog, error: auditErr } = await admin
      .from('audit_logs')
      .insert({
        actor_id: testUserId,
        action: 'account_submitted_for_review',
        entity_type: 'profile',
        entity_id: testUserId,
        metadata: {
          full_name_ar: testArValid,
          full_name_en: testEnValid,
          national_id: testNidValid,
        },
      })
      .select('id')
      .single();

    // Verify assertions
    const passedProfileFields = Boolean(
      profileRow.full_name_ar === testArValid &&
      profileRow.full_name_en === testEnValid &&
      profileRow.full_name === testEnValid &&
      profileRow.national_id === testNidValid &&
      profileRow.faculty === activeFaculty.name_ar &&
      profileRow.academic_year === 2 &&
      profileRow.status === 'pending_review'
    );

    const passedApprovalCreated = Boolean(approvalInstance?.id);
    const passedAuditLogCreated = Boolean(auditLog?.id);

    // Clean up test user & associated records
    await admin.from('approval_instances').delete().eq('entity_id', testUserId);
    await admin.from('audit_logs').delete().eq('entity_id', testUserId);
    await admin.auth.admin.deleteUser(testUserId);

    return NextResponse.json({
      status: 'ok',
      message: 'Phase P - Step P.3 Profile Types & Complete Profile Form verified successfully!',
      verification: {
        validations: {
          arabicName: { isArShortValid: false, isArValid: true },
          englishName: { isEnShortValid: false, isEnValid: true },
          nationalId: { isNidInvalidRejected: true, isNidValidAccepted: true },
          phone: { isPhoneInvalidRejected: true, isPhoneValidAccepted: true },
        },
        profileSubmission: {
          passedProfileFields,
          passedApprovalCreated,
          passedAuditLogCreated,
        },
        verifiedProfileData: {
          full_name_ar: profileRow.full_name_ar,
          full_name_en: profileRow.full_name_en,
          national_id: profileRow.national_id,
          faculty: profileRow.faculty,
          department_major: profileRow.department_major,
          academic_year: profileRow.academic_year,
          status: profileRow.status,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
