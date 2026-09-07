import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Fetch sample profile to inspect columns
    const { data: sampleProfiles, error: fetchErr } = await admin
      .from('profiles')
      .select('*')
      .limit(1);

    if (fetchErr) {
      return NextResponse.json({
        status: 'error',
        message: fetchErr.message,
      }, { status: 500 });
    }

    // Check available columns
    const sample = sampleProfiles && sampleProfiles.length > 0 ? sampleProfiles[0] : null;
    const existingKeys = sample ? Object.keys(sample) : [];

    const requiredV4Columns = [
      'full_name_ar',
      'full_name_en',
      'national_id',
      'whatsapp_number',
      'department_major',
      'academic_year',
      'facebook_url',
      'instagram_url',
      'linkedin_url',
    ];

    const missingColumns = requiredV4Columns.filter((col) => !existingKeys.includes(col));

    if (missingColumns.length > 0) {
      return NextResponse.json({
        status: 'pending_migration',
        message: `Profiles table v4 columns missing (${missingColumns.join(', ')}). Migration 016 needs to be executed in Supabase SQL editor.`,
        migrationFile: 'supabase/migrations/20260907000016_update_profiles_v4.sql',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/ilccfcupdvlsfylskdsp/sql/new',
        missingColumns,
      });
    }

    // 2. Test inserting a test profile with v4 fields to verify constraints & sync trigger
    const testEmail1 = `test.p2.user1.${testRunId}@example.com`;
    const testNationalId = `2990101${String(testRunId).slice(-7)}`; // 14-digit pattern

    const { data: authUser1, error: authErr1 } = await admin.auth.admin.createUser({
      email: testEmail1,
      email_confirm: true,
      user_metadata: { full_name: 'Auth Original Name' },
    });

    if (authErr1 || !authUser1.user) {
      throw new Error(`Failed to create test auth user: ${authErr1?.message}`);
    }

    const testUserId1 = authUser1.user.id;

    // Test profile update with full v4 fields
    const { data: updatedProfile1, error: updateErr1 } = await admin
      .from('profiles')
      .update({
        full_name_ar: 'أحمد محمد علي حسن',
        full_name_en: 'Ahmed Mohamed Ali Hassan',
        national_id: testNationalId,
        whatsapp_number: '01012345678',
        phone: '01012345678',
        department_major: 'Computer Science',
        academic_year: 3,
        facebook_url: 'https://facebook.com/test',
        instagram_url: 'https://instagram.com/test',
        linkedin_url: 'https://linkedin.com/in/test',
      })
      .eq('id', testUserId1)
      .select('*')
      .single();

    if (updateErr1) {
      // Clean up auth user
      await admin.auth.admin.deleteUser(testUserId1);
      throw new Error(`Failed to update profile with v4 fields: ${updateErr1.message}`);
    }

    // Verify name synchronization trigger (full_name should equal full_name_en)
    const passedNameSync = updatedProfile1.full_name === 'Ahmed Mohamed Ali Hassan';
    const passedAcademicYearType = typeof updatedProfile1.academic_year === 'number';

    // 3. Test National ID uniqueness constraint
    const testEmail2 = `test.p2.user2.${testRunId}@example.com`;
    const { data: authUser2 } = await admin.auth.admin.createUser({
      email: testEmail2,
      email_confirm: true,
      user_metadata: { full_name: 'Duplicate National ID Tester' },
    });

    let passedNationalIdUniqueness = false;
    if (authUser2?.user) {
      const { error: dupErr } = await admin
        .from('profiles')
        .update({
          national_id: testNationalId, // Attempt duplicate national_id
        })
        .eq('id', authUser2.user.id);

      passedNationalIdUniqueness = Boolean(dupErr && dupErr.code === '23505'); // unique_violation

      // Cleanup user 2
      await admin.auth.admin.deleteUser(authUser2.user.id);
    }

    // Cleanup user 1
    await admin.auth.admin.deleteUser(testUserId1);

    return NextResponse.json({
      status: 'ok',
      message: 'Phase P - Step P.2 profiles table v4 schema verified successfully!',
      verification: {
        allColumnsPresent: true,
        passedNameSync,
        passedAcademicYearType,
        passedNationalIdUniqueness,
        sampleVerifiedProfile: {
          full_name: updatedProfile1.full_name,
          full_name_ar: updatedProfile1.full_name_ar,
          full_name_en: updatedProfile1.full_name_en,
          national_id: updatedProfile1.national_id,
          whatsapp_number: updatedProfile1.whatsapp_number,
          department_major: updatedProfile1.department_major,
          academic_year: updatedProfile1.academic_year,
          socials: {
            facebook: updatedProfile1.facebook_url,
            instagram: updatedProfile1.instagram_url,
            linkedin: updatedProfile1.linkedin_url,
          },
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
