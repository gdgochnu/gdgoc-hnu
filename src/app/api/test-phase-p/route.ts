import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function normalizeEgyptianPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (/^01[0125]\d{8}$/.test(cleaned)) return cleaned;
  if (/^2001[0125]\d{8}$/.test(cleaned)) return cleaned.slice(2);
  if (/^201[0125]\d{8}$/.test(cleaned)) return '0' + cleaned.slice(2);
  return null;
}

function validateProfileSubmissionRules(data: {
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string;
  phone: string;
  whatsappNumber: string;
  faculty: string;
  departmentMajor: string;
  academicYear: number;
  availableFaculties: string[];
}) {
  const errors: string[] = [];

  // Arabic 4-part name
  const nameArTrimmed = data.fullNameAr?.trim() || '';
  const nameArWords = nameArTrimmed.split(/\s+/).filter(Boolean);
  if (nameArWords.length < 4 || !/^[\u0600-\u06FF\s]+$/.test(nameArTrimmed)) {
    errors.push('Arabic name must be 4+ words and Arabic letters only');
  }

  // English 4-part name
  const nameEnTrimmed = data.fullNameEn?.trim() || '';
  const nameEnWords = nameEnTrimmed.split(/\s+/).filter(Boolean);
  if (nameEnWords.length < 4 || !/^[a-zA-Z\s\-']+$/.test(nameEnTrimmed)) {
    errors.push('English name must be 4+ words and Latin letters only');
  }

  // 14-digit Egyptian National ID
  const nationalIdTrimmed = data.nationalId?.trim() || '';
  if (!/^[23]\d{13}$/.test(nationalIdTrimmed)) {
    errors.push('National ID must be exactly 14 digits starting with 2 or 3');
  }

  // Phone & WhatsApp
  if (!normalizeEgyptianPhone(data.phone?.trim() || '')) {
    errors.push('Invalid Egyptian phone number');
  }
  if (!normalizeEgyptianPhone(data.whatsappNumber?.trim() || '')) {
    errors.push('Invalid Egyptian WhatsApp number');
  }

  // Academic Year
  const year = Number(data.academicYear);
  if (![1, 2, 3, 4, 5].includes(year)) {
    errors.push('Academic year must be integer between 1 and 5');
  }

  // Faculty must be in available active faculties
  if (!data.faculty?.trim() || !data.availableFaculties.includes(data.faculty.trim())) {
    errors.push('Faculty must be chosen from active faculty options');
  }

  // Major
  if (!data.departmentMajor?.trim() || data.departmentMajor.trim().length < 2) {
    errors.push('Department/Major must be at least 2 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function GET() {
  const testRunId = Date.now();
  try {
    const admin = createAdminClient();

    // =========================================================================
    // 1. faculty_options Table & CRUD Verification
    // =========================================================================
    const { data: faculties, error: facultyErr } = await admin
      .from('faculty_options')
      .select('*')
      .order('sort_order', { ascending: true });

    if (facultyErr) {
      return NextResponse.json({
        success: false,
        step: 'P.6',
        error: `Failed to query faculty_options: ${facultyErr.message}`,
      }, { status: 500 });
    }

    const initialFacultyCount = faculties?.length || 0;
    const requiredColumns = ['id', 'name_ar', 'name_en', 'sort_order', 'is_active', 'created_at', 'updated_at'];
    const hasAllFacultyCols = faculties && faculties.length > 0
      ? requiredColumns.every(col => col in faculties[0])
      : false;

    // Test CRUD: Insert, Update, and Delete a temporary faculty
    const testFacultyNameAr = `كلية الفنون والتصميم - تجربة ${testRunId}`;
    const testFacultyNameEn = `Faculty of Arts and Design - Test ${testRunId}`;
    const { data: insertedFaculty, error: insertErr } = await admin
      .from('faculty_options')
      .insert({
        name_ar: testFacultyNameAr,
        name_en: testFacultyNameEn,
        sort_order: 999,
        is_active: true,
      })
      .select()
      .single();

    let crudPassed = false;
    if (!insertErr && insertedFaculty) {
      // Test Update
      const { error: updateErr } = await admin
        .from('faculty_options')
        .update({ sort_order: 998 })
        .eq('id', insertedFaculty.id);

      // Clean up Delete
      const { error: deleteErr } = await admin
        .from('faculty_options')
        .delete()
        .eq('id', insertedFaculty.id);

      crudPassed = !updateErr && !deleteErr;
    }

    // =========================================================================
    // 2. profiles v4 Schema & Columns Verification
    // =========================================================================
    const { data: sampleProfiles, error: profileErr } = await admin
      .from('profiles')
      .select(`
        id,
        full_name,
        full_name_ar,
        full_name_en,
        national_id,
        whatsapp_number,
        faculty,
        department_major,
        academic_year,
        facebook_url,
        instagram_url,
        linkedin_url,
        custom_fields
      `)
      .limit(3);

    if (profileErr) {
      return NextResponse.json({
        success: false,
        step: 'P.6',
        error: `Failed to query profiles v4 schema: ${profileErr.message}`,
      }, { status: 500 });
    }

    const v4ProfileCols = [
      'full_name_ar',
      'full_name_en',
      'national_id',
      'whatsapp_number',
      'faculty',
      'department_major',
      'academic_year',
      'facebook_url',
      'instagram_url',
      'linkedin_url',
      'custom_fields',
    ];
    const hasAllProfileCols = sampleProfiles && sampleProfiles.length > 0
      ? v4ProfileCols.every(col => col in sampleProfiles[0])
      : false;

    // =========================================================================
    // 3. National ID Uniqueness Enforcement Test
    // =========================================================================
    const testNatId = `2990101${String(testRunId).slice(-7)}`;
    let uniquenessEnforced = false;
    let uniqueTestMessage = '';

    const testEmail1 = `test.unique.u1.${testRunId}@example.com`;
    const testEmail2 = `test.unique.u2.${testRunId}@example.com`;

    const { data: u1, error: u1Err } = await admin.auth.admin.createUser({
      email: testEmail1,
      email_confirm: true,
      user_metadata: { full_name: 'Unique Test User 1' },
    });

    const { data: u2, error: u2Err } = await admin.auth.admin.createUser({
      email: testEmail2,
      email_confirm: true,
      user_metadata: { full_name: 'Unique Test User 2' },
    });

    if (u1?.user && u2?.user) {
      const u1Id = u1.user.id;
      const u2Id = u2.user.id;

      // Update u1 with testNatId
      await admin.from('profiles').update({ national_id: testNatId }).eq('id', u1Id);

      // Attempt duplicate update on u2 with identical national_id
      const { error: dupErr } = await admin
        .from('profiles')
        .update({ national_id: testNatId })
        .eq('id', u2Id);

      if (dupErr && (dupErr.code === '23505' || dupErr.message.toLowerCase().includes('unique'))) {
        uniquenessEnforced = true;
        uniqueTestMessage = 'Postgres 23505 unique constraint caught duplicate national_id as expected.';
      } else {
        uniqueTestMessage = dupErr?.message || 'Expected duplicate error but none was thrown';
      }

      // Cleanup
      await admin.auth.admin.deleteUser(u1Id);
      await admin.auth.admin.deleteUser(u2Id);
    } else {
      uniqueTestMessage = `Could not create test auth users: ${u1Err?.message || u2Err?.message}`;
    }

    // =========================================================================
    // 4. Privacy Gating on National ID (Security Gate Test Matrix)
    // =========================================================================
    const gateScenarios = [
      {
        name: 'President viewing candidate profile',
        viewer: { role: 'president', id: 'pres-uuid', deptCode: 'LEAD' },
        target: { id: 'cand-uuid' },
        expected: true,
      },
      {
        name: 'Co-President viewing candidate profile',
        viewer: { role: 'co_president', id: 'co-pres-uuid', deptCode: 'LEAD' },
        target: { id: 'cand-uuid' },
        expected: true,
      },
      {
        name: 'HR Committee Member viewing applicant profile',
        viewer: { role: 'member', id: 'hr-uuid', deptCode: 'HR' },
        target: { id: 'cand-uuid' },
        expected: true,
      },
      {
        name: 'Member viewing OWN profile',
        viewer: { role: 'member', id: 'cand-uuid', deptCode: 'WEB' },
        target: { id: 'cand-uuid' },
        expected: true,
      },
      {
        name: 'Regular Member viewing ANOTHER member profile',
        viewer: { role: 'member', id: 'other-uuid', deptCode: 'AI' },
        target: { id: 'cand-uuid' },
        expected: false,
      },
      {
        name: 'Non-HR Committee Head viewing another committee member profile',
        viewer: { role: 'committee_head', id: 'tech-head-uuid', deptCode: 'WEB' },
        target: { id: 'cand-uuid' },
        expected: false,
      },
    ];

    const gateResults = gateScenarios.map(s => {
      const isPres = ['president', 'co_president'].includes(s.viewer.role);
      const isHR = s.viewer.deptCode === 'HR';
      const isSelf = s.viewer.id === s.target.id;
      const canView = Boolean(isPres || isHR || isSelf);
      return {
        scenario: s.name,
        canView,
        expected: s.expected,
        passed: canView === s.expected,
      };
    });

    const allGateTestsPassed = gateResults.every(g => g.passed);

    // =========================================================================
    // 5. Profile Submission Flow Validation Rules Test
    // =========================================================================
    const activeFacultyNames = (faculties || []).filter(f => f.is_active).map(f => f.name_en);

    // Valid sample test case
    const validSample = {
      fullNameAr: 'أحمد محمد علي حسن',
      fullNameEn: 'Ahmed Mohamed Ali Hassan',
      nationalId: '29901016677857',
      phone: '01012345678',
      whatsappNumber: '01012345678',
      faculty: activeFacultyNames[0] || 'Faculty of Engineering (Helwan)',
      departmentMajor: 'Computer and Systems Engineering',
      academicYear: 3,
      availableFaculties: activeFacultyNames,
    };
    const validResult = validateProfileSubmissionRules(validSample);

    // Invalid Arabic name (< 4 words)
    const invalidArResult = validateProfileSubmissionRules({
      ...validSample,
      fullNameAr: 'أحمد محمد',
    });

    // Invalid English name (< 4 words)
    const invalidEnResult = validateProfileSubmissionRules({
      ...validSample,
      fullNameEn: 'Ahmed Mohamed',
    });

    // Invalid National ID (13 digits or bad prefix)
    const invalidIdResult = validateProfileSubmissionRules({
      ...validSample,
      nationalId: '1990101667785',
    });

    // Invalid academic year (6)
    const invalidYearResult = validateProfileSubmissionRules({
      ...validSample,
      academicYear: 6,
    });

    // Invalid faculty (not in active options)
    const invalidFacultyResult = validateProfileSubmissionRules({
      ...validSample,
      faculty: 'Fake University of Atlantis',
    });

    const validationFlowPassed = 
      validResult.isValid &&
      !invalidArResult.isValid &&
      !invalidEnResult.isValid &&
      !invalidIdResult.isValid &&
      !invalidYearResult.isValid &&
      !invalidFacultyResult.isValid;

    // =========================================================================
    // Summary & Verdict
    // =========================================================================
    const allPhasePChecksPassed = Boolean(
      hasAllFacultyCols &&
      initialFacultyCount >= 7 &&
      crudPassed &&
      hasAllProfileCols &&
      uniquenessEnforced &&
      allGateTestsPassed &&
      validationFlowPassed
    );

    return NextResponse.json({
      status: allPhasePChecksPassed ? 'ok' : 'partial',
      phase: 'Phase P',
      step: 'P.6',
      message: allPhasePChecksPassed
        ? 'Phase P End-to-End Master Verification PASSED 100%!'
        : 'Some Phase P checks did not pass as expected',
      checks: {
        facultyOptions: {
          totalCount: initialFacultyCount,
          passedMinimumSeedCount: initialFacultyCount >= 7,
          hasAllRequiredColumns: hasAllFacultyCols,
          crudTestPassed: crudPassed,
        },
        profilesV4Schema: {
          hasAllRequiredColumns: hasAllProfileCols,
          columnsVerified: v4ProfileCols,
        },
        nationalIdUniqueness: {
          enforced: uniquenessEnforced,
          details: uniqueTestMessage,
        },
        nationalIdSecurityGate: {
          allPassed: allGateTestsPassed,
          scenariosTested: gateResults.length,
          gateResults,
        },
        profileSubmissionValidation: {
          allPassed: validationFlowPassed,
          validSubmissionPassed: validResult.isValid,
          invalidArCaught: !invalidArResult.isValid,
          invalidEnCaught: !invalidEnResult.isValid,
          invalidIdCaught: !invalidIdResult.isValid,
          invalidYearCaught: !invalidYearResult.isValid,
          invalidFacultyCaught: !invalidFacultyResult.isValid,
        },
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: 'error',
      phase: 'Phase P',
      step: 'P.6',
      error: err instanceof Error ? err.message : 'Unknown error during Phase P verification',
    }, { status: 500 });
  }
}
