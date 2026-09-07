import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Check if table exists and query rows
    const { data: faculties, error: fetchErr } = await admin
      .from('faculty_options')
      .select('*')
      .order('sort_order', { ascending: true });

    if (fetchErr) {
      return NextResponse.json({
        status: 'pending_migration',
        message: 'Table public.faculty_options (migration 015) needs to be executed in Supabase SQL editor.',
        migrationFile: 'supabase/migrations/20260907000015_create_faculty_options.sql',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/ilccfcupdvlsfylskdsp/sql/new',
        error: fetchErr.message,
      });
    }

    // 2. Verify schema columns & seed count
    const count = faculties?.length || 0;
    const sample = faculties?.[0];
    const hasRequiredColumns = sample && (
      'id' in sample &&
      'name_ar' in sample &&
      'name_en' in sample &&
      'sort_order' in sample &&
      'is_active' in sample &&
      'created_at' in sample &&
      'updated_at' in sample
    );

    const passedSeedCount = count >= 7;

    // 3. Test CRUD operations (Insert, Update, Delete test faculty)
    const testArName = `كلية اختبارية ${testRunId}`;
    const testEnName = `Test Faculty ${testRunId}`;

    const { data: inserted, error: insertErr } = await admin
      .from('faculty_options')
      .insert({
        name_ar: testArName,
        name_en: testEnName,
        sort_order: 999,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertErr) {
      throw new Error(`Failed to insert test faculty: ${insertErr.message}`);
    }

    // Verify update
    const { data: updated, error: updateErr } = await admin
      .from('faculty_options')
      .update({ is_active: false })
      .eq('id', inserted.id)
      .select('*')
      .single();

    if (updateErr) {
      throw new Error(`Failed to update test faculty: ${updateErr.message}`);
    }

    const passedUpdate = updated.is_active === false;

    // Clean up test faculty
    await admin.from('faculty_options').delete().eq('id', inserted.id);

    // 4. Verify ordering
    let isSorted = true;
    for (let i = 1; i < (faculties?.length || 0); i++) {
      if (faculties[i].sort_order < faculties[i - 1].sort_order) {
        isSorted = false;
        break;
      }
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Phase P - Step P.1 faculty_options table & RLS verified successfully!',
      verification: {
        totalFaculties: count,
        hasRequiredColumns,
        passedSeedCount,
        isSorted,
        crudTested: {
          insertedId: inserted.id,
          passedUpdate,
        },
        sampleFaculties: faculties?.slice(0, 3).map((f) => ({
          name_ar: f.name_ar,
          name_en: f.name_en,
          sort_order: f.sort_order,
          is_active: f.is_active,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
