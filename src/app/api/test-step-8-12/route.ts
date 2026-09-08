import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  checkUserCheckinAccess,
} from '@/app/events/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const testRunId = Date.now();
  let testEventId: string | null = null;
  const createdRegistrationIds: string[] = [];
  const createdDeptIds: string[] = [];

  // Profiles to restore after test
  let profileToRestoreA: { id: string; role: any; department_id: any } | null = null;
  let profileToRestoreB: { id: string; role: any; department_id: any } | null = null;

  try {
    // 1. Fetch all departments
    const { data: allDepts } = await admin
      .from('departments')
      .select('id, name, code, branch');

    let hrDept = allDepts?.find(d => d.code === 'HR');
    let mediaDept = allDepts?.find(d => d.code === 'MEDIA');

    // Create HR department if not present
    if (!hrDept) {
      const { data: newHr } = await admin
        .from('departments')
        .insert({
          name: 'Human Resources',
          code: 'HR',
          branch: 'non_tech',
        })
        .select()
        .single();

      if (newHr) {
        hrDept = newHr;
        createdDeptIds.push(newHr.id);
      }
    }

    // Create MEDIA department if not present
    if (!mediaDept) {
      const { data: newMedia } = await admin
        .from('departments')
        .insert({
          name: 'Media & Marketing',
          code: 'MEDIA',
          branch: 'non_tech',
        })
        .select()
        .single();

      if (newMedia) {
        mediaDept = newMedia;
        createdDeptIds.push(newMedia.id);
      }
    }

    const hostDept = allDepts?.find(d => d.id !== hrDept?.id && d.id !== mediaDept?.id) || hrDept;

    // 2. Fetch President
    const { data: president } = await admin
      .from('profiles')
      .select('id, role')
      .eq('role', 'president')
      .maybeSingle();

    // 3. Fetch 2 active profiles to act as Media Head and HR Member
    const { data: activeProfiles } = await admin
      .from('profiles')
      .select('id, role, department_id, full_name')
      .eq('status', 'active')
      .neq('role', 'president')
      .limit(2);

    if (!hrDept || !mediaDept || !hostDept || !president || !activeProfiles || activeProfiles.length < 2) {
      return NextResponse.json({
        status: 'error',
        message: 'Prerequisites missing for Step 8.12 test (departments, president, or active profiles missing).',
      }, { status: 500 });
    }

    const mediaHeadProfile = activeProfiles[0];
    const hrMemberProfile = activeProfiles[1];

    // Store original profile states for cleanup
    profileToRestoreA = {
      id: mediaHeadProfile.id,
      role: mediaHeadProfile.role,
      department_id: mediaHeadProfile.department_id,
    };
    profileToRestoreB = {
      id: hrMemberProfile.id,
      role: hrMemberProfile.role,
      department_id: hrMemberProfile.department_id,
    };

    // Configure Profile A as Media Head (committee_head of Media department)
    await admin
      .from('profiles')
      .update({
        role: 'committee_head',
        department_id: mediaDept.id,
      })
      .eq('id', mediaHeadProfile.id);

    // Configure Profile B as HR Member (member of HR department)
    await admin
      .from('profiles')
      .update({
        role: 'member',
        department_id: hrDept.id,
      })
      .eq('id', hrMemberProfile.id);

    // 4. Create Test Event X
    // Check-in duty is assigned ONLY to the HR member: [hrMemberProfile.id]
    // The Media Head has NO check-in duty on Event X
    const eventXSlug = `test-event-x-${testRunId}`;
    const { data: eventX, error: eventXErr } = await admin
      .from('events')
      .insert({
        title: `Test Event X End-to-End ${testRunId}`,
        slug: eventXSlug,
        venue: 'Main Campus Hall',
        event_date: '2026-11-28',
        start_time: '10:00',
        end_time: '14:00',
        capacity: 100,
        department_id: hostDept.id,
        status: 'published',
        created_by: president.id,
        checkin_access_profile_ids: [hrMemberProfile.id], // Spec §4.3 item 5
      })
      .select()
      .single();

    if (eventXErr || !eventX) {
      throw new Error(`Failed to create Event X: ${eventXErr?.message}`);
    }
    testEventId = eventX.id;

    // 5. Test Assertion 1: Media Head with NO check-in duty on Event X is strictly DENIED
    // Spec §4.3 item 5: "a Media Head with no check-in duty on this event simply cannot access that screen for it."
    const mediaHeadAccess = await checkUserCheckinAccess(eventX.id, mediaHeadProfile.id);
    const passedMediaHeadDenied =
      mediaHeadAccess.hasAccess === false &&
      mediaHeadAccess.reason === 'denied';

    // 6. Test Assertion 2: Specifically assigned HR Member CAN access Event X
    // Spec §4.3 item 5: "while the specifically assigned HR member can."
    const hrMemberAccess = await checkUserCheckinAccess(eventX.id, hrMemberProfile.id);
    const passedHrMemberAllowed =
      hrMemberAccess.hasAccess === true &&
      (hrMemberAccess.reason === 'assigned' || hrMemberAccess.reason === 'hr_override');

    // 7. Test Assertion 3: President has standing override
    const presidentAccess = await checkUserCheckinAccess(eventX.id, president.id);
    const passedPresidentAllowed =
      presidentAccess.hasAccess === true &&
      presidentAccess.reason === 'presidential_override';

    // 8. Test Attendee Registration & Check-in Execution for Event X
    const qrTest = `GDGOC-REG-E2E-${testRunId}`;
    const { data: reg, error: regErr } = await admin
      .from('event_registrations')
      .insert({
        event_id: eventX.id,
        full_name: `Attendee E2E ${testRunId}`,
        email: `attendee.e2e.${testRunId}@example.com`,
        qr_code: qrTest,
        status: 'registered',
      })
      .select()
      .single();

    if (reg) createdRegistrationIds.push(reg.id);

    // Record check-in by authorized HR member
    const { data: attRecord, error: attErr } = await admin
      .from('attendance')
      .insert({
        event_id: eventX.id,
        registration_id: reg?.id,
        check_in_time: new Date().toISOString(),
        checked_in_by: hrMemberProfile.id,
        method: 'qr',
      })
      .select()
      .single();

    const passedAttendanceRecorded = !attErr && !!attRecord && attRecord.checked_in_by === hrMemberProfile.id;

    // 9. Clean up test records and restore profile states
    await admin.from('attendance').delete().eq('event_id', eventX.id);
    if (createdRegistrationIds.length > 0) {
      await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
    }
    await admin.from('events').delete().eq('id', eventX.id);

    // Restore Profile A & B
    if (profileToRestoreA) {
      await admin
        .from('profiles')
        .update({
          role: profileToRestoreA.role,
          department_id: profileToRestoreA.department_id,
        })
        .eq('id', profileToRestoreA.id);
    }
    if (profileToRestoreB) {
      await admin
        .from('profiles')
        .update({
          role: profileToRestoreB.role,
          department_id: profileToRestoreB.department_id,
        })
        .eq('id', profileToRestoreB.id);
    }
    if (createdDeptIds.length > 0) {
      await admin.from('departments').delete().in('id', createdDeptIds);
    }

    const allPassed =
      passedMediaHeadDenied &&
      passedHrMemberAllowed &&
      passedPresidentAllowed &&
      passedAttendanceRecorded;

    return NextResponse.json({
      status: allPassed ? 'success' : 'failed',
      step: '8.12',
      description: 'Confirm end-to-end: a Media Head with no check-in duty on Event X cannot open /events/X/attendance, while the specifically assigned HR member can',
      testScenario: {
        event: { id: eventX.id, title: eventX.title, checkin_access: [hrMemberProfile.id] },
        mediaHead: {
          id: mediaHeadProfile.id,
          role: 'committee_head',
          dept: 'MEDIA',
          hasAccess: mediaHeadAccess.hasAccess,
          reason: mediaHeadAccess.reason,
        },
        assignedHrMember: {
          id: hrMemberProfile.id,
          role: 'member',
          dept: 'HR',
          hasAccess: hrMemberAccess.hasAccess,
          reason: hrMemberAccess.reason,
        },
        president: {
          id: president.id,
          hasAccess: presidentAccess.hasAccess,
          reason: presidentAccess.reason,
        },
      },
      results: {
        mediaHeadDenied: {
          passed: passedMediaHeadDenied,
          expected: 'hasAccess: false, reason: denied',
          actual: mediaHeadAccess,
        },
        assignedHrMemberAllowed: {
          passed: passedHrMemberAllowed,
          expected: 'hasAccess: true, reason: assigned or hr_override',
          actual: hrMemberAccess,
        },
        presidentOverrideAllowed: {
          passed: passedPresidentAllowed,
          expected: 'hasAccess: true, reason: presidential_override',
          actual: presidentAccess,
        },
        attendanceRecordedByAssignedMember: {
          passed: passedAttendanceRecorded,
        },
      },
      allPassed,
    });
  } catch (error: any) {
    // Cleanup on error
    if (testEventId) {
      await admin.from('attendance').delete().eq('event_id', testEventId);
      if (createdRegistrationIds.length > 0) {
        await admin.from('event_registrations').delete().in('id', createdRegistrationIds);
      }
      await admin.from('events').delete().eq('id', testEventId);
    }
    if (profileToRestoreA) {
      await admin.from('profiles').update({
        role: profileToRestoreA.role,
        department_id: profileToRestoreA.department_id,
      }).eq('id', profileToRestoreA.id);
    }
    if (profileToRestoreB) {
      await admin.from('profiles').update({
        role: profileToRestoreB.role,
        department_id: profileToRestoreB.department_id,
      }).eq('id', profileToRestoreB.id);
    }
    if (createdDeptIds.length > 0) {
      await admin.from('departments').delete().in('id', createdDeptIds);
    }
    return NextResponse.json({
      status: 'error',
      message: error?.message || 'Unexpected error during Step 8.12 testing',
    }, { status: 500 });
  }
}
