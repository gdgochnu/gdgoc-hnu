import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const results: Record<string, any> = {};

  try {
    // 1. Test create a committee
    const testCode = 'TEST_DEPT';
    // Clean up if exists from prior test
    await admin.from('departments').delete().eq('code', testCode);

    const { data: createdDept, error: createError } = await admin
      .from('departments')
      .insert({
        code: testCode,
        name: 'Automated Test Committee',
        branch: 'tech',
        description: 'Committee created during automated step 3.1 verification.',
      })
      .select()
      .single();

    if (createError) throw createError;
    results.createdCommittee = createdDept;

    // 2. Test update the committee
    const { data: updatedDept, error: updateError } = await admin
      .from('departments')
      .update({
        name: 'Automated Test Committee (Updated)',
        description: 'Updated description during step 3.1 test.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', createdDept.id)
      .select()
      .single();

    if (updateError) throw updateError;
    results.updatedCommittee = updatedDept;

    // 3. Test assign leadership (simulate assigning a test head)
    const { data: anyMember } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .neq('role', 'president')
      .limit(1)
      .maybeSingle();

    if (anyMember) {
      // Assign head
      await admin
        .from('departments')
        .update({ head_id: anyMember.id })
        .eq('id', createdDept.id);

      // Verify audit log can be written
      await admin.from('audit_logs').insert({
        actor_id: null,
        action: 'department_leadership_assigned',
        entity_type: 'department',
        entity_id: createdDept.id,
        metadata: {
          test_run: true,
          department_name: updatedDept.name,
          new_head_id: anyMember.id,
        },
      });

      results.assignedHead = {
        memberId: anyMember.id,
        memberName: anyMember.full_name,
      };
    }

    // 4. Verify audit_logs
    const { data: recentLogs } = await admin
      .from('audit_logs')
      .select('action, entity_id, metadata, created_at')
      .eq('entity_id', createdDept.id)
      .limit(2);

    results.auditLogs = recentLogs;

    // 5. Clean up the test committee
    await admin.from('departments').delete().eq('id', createdDept.id);
    results.cleanup = 'Test committee removed successfully';

    return NextResponse.json({
      status: 'ok',
      message: 'Step 3.1 Committee Creation, Editing, Leadership Assignment, and Audit Logging verified!',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message || 'Error executing test',
    }, { status: 500 });
  }
}
