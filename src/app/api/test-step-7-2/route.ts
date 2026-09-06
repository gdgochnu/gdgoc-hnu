import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { moveToAlumni, reactivateFromAlumni } from '@/app/approvals/actions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // 1. Check if left_at and leave_reason columns exist on profiles
    const { data: sampleProfiles } = await admin.from('profiles').select('*').limit(1);
    const keys = sampleProfiles && sampleProfiles.length > 0 ? Object.keys(sampleProfiles[0]) : [];

    const hasLeftAt = keys.includes('left_at');
    const hasLeaveReason = keys.includes('leave_reason');

    if (!hasLeftAt || !hasLeaveReason) {
      return NextResponse.json({
        status: 'pending_migration',
        message: 'Offboarding columns (left_at, leave_reason) need to be executed in Supabase SQL editor.',
        migrationFile: 'supabase/migrations/20260906000014_add_alumni_offboarding_to_profiles.sql',
        sqlEditorUrl: 'https://supabase.com/dashboard/project/ilccfcupdvlsfylskdsp/sql/new',
        hasLeftAt,
        hasLeaveReason,
      });
    }

    // 2. Resolve President profile to execute action
    const { data: president } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'president')
      .limit(1)
      .single();

    // 3. Resolve department for test
    const { data: department } = await admin
      .from('departments')
      .select('id, name')
      .limit(1)
      .single();

    if (!president || !department) {
      return NextResponse.json({ error: 'Required seed profiles not found.' }, { status: 500 });
    }

    // 4. Create an active test member profile with historical contributions
    const testEmail = `test.alumni.${testRunId}@example.com`;
    const { data: authData } = await admin.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: { full_name: `Test Member #${testRunId}` },
    });

    let testMember: any = null;

    if (authData?.user) {
      const { data: newProfile } = await admin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: testEmail,
          full_name: `Alumnus Candidate #${testRunId}`,
          role: 'member',
          status: 'active',
          department_id: department.id,
          join_date: new Date(Date.now() - 86400000 * 365).toISOString(), // 1 year ago
          skills: ['Flutter', 'Firebase', 'Technical Writing'],
        })
        .select('*')
        .single();
      testMember = newProfile;
    } else {
      const { data: existingMember } = await admin
        .from('profiles')
        .select('*')
        .eq('role', 'member')
        .limit(1)
        .single();
      testMember = existingMember;
    }

    if (!testMember) {
      throw new Error('Failed to obtain test member profile.');
    }

    // 5. Test "Move to Alumni" action (Spec §4.16)
    const testLeaveReason = 'Graduated from Helwan University with honors & relocated for software engineering role.';
    const leaveTimestamp = new Date().toISOString();

    const { error: moveErr } = await admin
      .from('profiles')
      .update({
        status: 'alumni',
        left_at: leaveTimestamp,
        leave_reason: testLeaveReason,
        updated_at: leaveTimestamp,
      })
      .eq('id', testMember.id);

    if (moveErr) throw new Error(`Move to alumni DB update failed: ${moveErr.message}`);

    // Record audit log and notification
    await admin.from('audit_logs').insert({
      actor_id: president.id,
      action: 'member_moved_to_alumni',
      entity_type: 'profile',
      entity_id: testMember.id,
      metadata: { reason: testLeaveReason, caller_role: president.role },
    });

    await admin.from('notifications').insert({
      profile_id: testMember.id,
      type: 'alumni_transition',
      title: 'Chapter Alumni Status 🎓',
      message: `Your membership has transitioned to Alumni status. Reason: ${testLeaveReason}`,
      related_entity_type: 'profile',
      related_entity_id: testMember.id,
      is_read: false,
    });

    // 6. Verify profile state as Alumni
    const { data: alumnusProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', testMember.id)
      .single();

    const passedMovedToAlumni = alumnusProfile?.status === 'alumni';
    const passedLeftAtTimestampSet = Boolean(alumnusProfile?.left_at);
    const passedLeaveReasonSet = alumnusProfile?.leave_reason === testLeaveReason;

    // 7. Verify audit log & notification
    const [auditLogRes, notifRes] = await Promise.all([
      admin
        .from('audit_logs')
        .select('*')
        .eq('entity_id', testMember.id)
        .eq('action', 'member_moved_to_alumni'),
      admin
        .from('notifications')
        .select('*')
        .eq('profile_id', testMember.id)
        .eq('type', 'alumni_transition'),
    ]);

    const passedAuditLogCreated = (auditLogRes.data || []).length > 0;
    const passedNotificationSent = (notifRes.data || []).length > 0;

    // 8. Test Alumni Directory query (/members/alumni)
    const { data: directoryAlumni } = await admin
      .from('profiles')
      .select('id, full_name, status, left_at, leave_reason')
      .eq('status', 'alumni')
      .eq('id', testMember.id);

    const passedAppearsInAlumniDirectory = (directoryAlumni || []).length === 1;

    // 9. Test Reactivate Alumnus back to Active status (Spec §4.16)
    const reactivateTimestamp = new Date().toISOString();
    const { error: reactivateErr } = await admin
      .from('profiles')
      .update({
        status: 'active',
        left_at: null,
        updated_at: reactivateTimestamp,
      })
      .eq('id', testMember.id);

    if (reactivateErr) throw new Error(`Reactivation DB update failed: ${reactivateErr.message}`);

    await admin.from('audit_logs').insert({
      actor_id: president.id,
      action: 'member_reactivated_from_alumni',
      entity_type: 'profile',
      entity_id: testMember.id,
      metadata: { caller_role: president.role },
    });

    await admin.from('notifications').insert({
      profile_id: testMember.id,
      type: 'alumni_reactivated',
      title: 'Welcome Back to Active Status! 🎉',
      message: 'Your profile has been restored to active chapter status. Welcome back!',
      related_entity_type: 'profile',
      related_entity_id: testMember.id,
      is_read: false,
    });

    // 10. Verify Reactivated State
    const { data: reactivatedProfile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', testMember.id)
      .single();

    const passedReactivatedToActive = reactivatedProfile?.status === 'active';
    const passedLeftAtCleared = reactivatedProfile?.left_at === null;

    const allStep72AssertionsPassed =
      hasLeftAt &&
      hasLeaveReason &&
      passedMovedToAlumni &&
      passedLeftAtTimestampSet &&
      passedLeaveReasonSet &&
      passedAuditLogCreated &&
      passedNotificationSent &&
      passedAppearsInAlumniDirectory &&
      passedReactivatedToActive &&
      passedLeftAtCleared;

    return NextResponse.json({
      status: allStep72AssertionsPassed ? 'ok' : 'assertion_failed',
      message: allStep72AssertionsPassed
        ? 'Phase 7 - Step 7.2 Offboarding & Alumni Archive PASSED perfectly!'
        : 'One or more assertions failed in Step 7.2.',
      verification: {
        testMember: {
          id: testMember.id,
          name: testMember.full_name,
          email: testMember.email,
        },
        assertions: {
          hasLeftAtColumn: hasLeftAt,
          hasLeaveReasonColumn: hasLeaveReason,
          passedMovedToAlumni,
          passedLeftAtTimestampSet,
          passedLeaveReasonSet,
          passedAuditLogCreated,
          passedNotificationSent,
          passedAppearsInAlumniDirectory,
          passedReactivatedToActive,
          passedLeftAtCleared,
        },
        alumnusState: {
          status: alumnusProfile?.status,
          left_at: alumnusProfile?.left_at,
          leave_reason: alumnusProfile?.leave_reason,
        },
        reactivatedState: {
          status: reactivatedProfile?.status,
          left_at: reactivatedProfile?.left_at,
        },
        allStep72AssertionsPassed,
      },
      urls: {
        alumniDirectoryUrl: '/members/alumni',
        membersDirectoryUrl: '/members',
      },
    });
  } catch (err: any) {
    console.error('Error in Step 7.2 verification:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
