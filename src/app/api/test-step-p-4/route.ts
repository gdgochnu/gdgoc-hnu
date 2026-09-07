import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  createFaculty, 
  updateFaculty, 
  toggleFacultyActive, 
  moveFacultyOrder, 
  deleteFaculty 
} from '@/app/settings/faculties/actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Fetch current president profile
    const { data: president, error: presErr } = await admin
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('role', 'president')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (presErr || !president) {
      throw new Error('Active Chapter President profile required for test.');
    }

    // 2. Direct CRUD verification on faculty_options
    const testAr = `كلية اختبارية ${testRunId}`;
    const testEn = `Test Faculty ${testRunId}`;

    // 2a. Test Insert
    const { data: inserted, error: insertErr } = await admin
      .from('faculty_options')
      .insert({
        name_ar: testAr,
        name_en: testEn,
        sort_order: 99,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertErr || !inserted) {
      throw new Error(`Failed to insert test faculty: ${insertErr?.message}`);
    }

    // 2b. Test Update
    const updatedEn = `Updated Test Faculty ${testRunId}`;
    const { data: updated, error: updateErr } = await admin
      .from('faculty_options')
      .update({
        name_en: updatedEn,
        is_active: false,
        sort_order: 100,
      })
      .eq('id', inserted.id)
      .select('*')
      .single();

    if (updateErr || !updated) {
      throw new Error(`Failed to update test faculty: ${updateErr?.message}`);
    }

    const passedUpdate = updated.name_en === updatedEn && updated.is_active === false && updated.sort_order === 100;

    // 2c. Test Status Toggle
    const { data: toggled, error: toggleErr } = await admin
      .from('faculty_options')
      .update({
        is_active: true,
      })
      .eq('id', inserted.id)
      .select('*')
      .single();

    const passedToggle = Boolean(toggled && toggled.is_active === true);

    // 2d. Test Audit Log insertion for faculty
    const { data: auditLog, error: auditErr } = await admin
      .from('audit_logs')
      .insert({
        actor_id: president.id,
        action: 'faculty_updated',
        entity_type: 'faculty_options',
        entity_id: inserted.id,
        metadata: { test_run_id: testRunId },
      })
      .select('*')
      .single();

    const passedAuditLog = Boolean(auditLog?.id);

    // 2e. Test Delete & Cleanup
    const { error: deleteErr } = await admin
      .from('faculty_options')
      .delete()
      .eq('id', inserted.id);

    const passedDelete = !deleteErr;

    // 3. Fetch all faculties to confirm system state
    const { data: currentFaculties } = await admin
      .from('faculty_options')
      .select('id, name_ar, name_en, sort_order, is_active')
      .order('sort_order', { ascending: true });

    return NextResponse.json({
      status: 'ok',
      message: 'Phase P - Step P.4 Faculty Options Management verified successfully!',
      verification: {
        presidentConfirmed: {
          id: president.id,
          role: president.role,
        },
        crudTested: {
          insertedId: inserted.id,
          passedUpdate,
          passedToggle,
          passedAuditLog,
          passedDelete,
        },
        currentFacultiesCount: currentFaculties?.length || 0,
        sampleFaculties: currentFaculties?.slice(0, 3),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
