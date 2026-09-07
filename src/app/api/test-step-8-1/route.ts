import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const testRunId = Date.now();
  const admin = createAdminClient();
  const createdEventIds: string[] = [];

  try {
    // 1. Check departments to attach test events to
    const { data: depts, error: deptErr } = await admin
      .from('departments')
      .select('id, name')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({
        success: false,
        step: '8.1',
        error: 'No departments found to test event creation.',
      }, { status: 500 });
    }

    const testDept = depts[0];

    // 2. Fetch sample profile to attach as creator & owner
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .limit(1);

    const testProfile = profiles?.[0];

    // 3. Test Draft Creation with complete Step 8.1 specifications
    const testTitle = `Flutter & Cloud Study Jam ${testRunId}`;
    const testSlug = `flutter-cloud-study-jam-${testRunId}`;
    const testRegistrationFields = [
      {
        id: 'field_github',
        label: 'GitHub Profile URL',
        field_type: 'text',
        options: [],
        required: true,
        placeholder: 'https://github.com/username',
      },
      {
        id: 'field_tshirt',
        label: 'T-Shirt Size',
        field_type: 'select',
        options: ['S', 'M', 'L', 'XL', '2XL'],
        required: true,
        placeholder: 'Select size',
      },
      {
        id: 'field_experience',
        label: 'Experience with Flutter',
        field_type: 'number',
        options: [],
        required: false,
        placeholder: 'Years of experience',
      },
    ];

    const testOwners = [
      {
        profile_id: testProfile?.id || '00000000-0000-0000-0000-000000000000',
        committee_role: 'Event Lead & Speaker',
        full_name: testProfile?.full_name || 'Chapter Lead',
        email: testProfile?.email || 'lead@gdgoc-hnu.com',
      },
    ];

    const { data: draftEvent, error: draftErr } = await admin
      .from('events')
      .insert({
        title: testTitle,
        slug: testSlug,
        description: 'Comprehensive hands-on study jam covering Flutter architecture, Firebase, and Cloud Run deployment.',
        venue: 'Auditorium 2 - Helwan Campus & Google Meet Stream',
        event_date: '2026-11-20',
        start_time: '10:00:00',
        end_time: '16:00:00',
        capacity: 150,
        department_id: testDept.id,
        status: 'draft',
        registration_fields: testRegistrationFields,
        owners: testOwners,
        created_by: testProfile?.id || null,
      })
      .select()
      .single();

    if (draftErr || !draftEvent) {
      return NextResponse.json({
        success: false,
        step: '8.1',
        error: `Failed to insert event draft: ${draftErr?.message}`,
      }, { status: 500 });
    }

    createdEventIds.push(draftEvent.id);

    // Verify draft event attributes
    const passedStatusDraft = draftEvent.status === 'draft';
    const passedCapacity = draftEvent.capacity === 150;
    const passedRegistrationFields = Array.isArray(draftEvent.registration_fields) && draftEvent.registration_fields.length === 3;
    const passedOwners = Array.isArray(draftEvent.owners) && draftEvent.owners.length === 1;
    const passedQrSecret = Boolean(draftEvent.qr_secret);

    // 4. Test Slug Uniqueness Conflict Handling
    const duplicateSlug = testSlug;
    const { data: secondEvent, error: secondErr } = await admin
      .from('events')
      .insert({
        title: `${testTitle} Duplicate Test`,
        slug: duplicateSlug,
        event_date: '2026-11-21',
        department_id: testDept.id,
        status: 'draft',
      })
      .select()
      .single();

    // Postgres should prevent duplicate slug due to UNIQUE constraint on slug
    let passedSlugUniqueness = false;
    if (secondErr && (secondErr.code === '23505' || secondErr.message.includes('unique'))) {
      passedSlugUniqueness = true;
    } else if (secondEvent) {
      createdEventIds.push(secondEvent.id);
    }

    // 5. Cleanup test events
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }

    const allPassed = Boolean(
      passedStatusDraft &&
      passedCapacity &&
      passedRegistrationFields &&
      passedOwners &&
      passedQrSecret &&
      passedSlugUniqueness
    );

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      step: '8.1',
      message: allPassed
        ? 'Step 8.1 Internal Event Builder (draft creation) verified successfully!'
        : 'Some Step 8.1 verifications did not pass',
      verification: {
        draftCreationSuccess: true,
        passedStatusDraft,
        passedCapacity,
        passedRegistrationFields,
        passedOwners,
        passedQrSecret,
        passedSlugUniqueness,
        sampleDraftEvent: {
          id: draftEvent.id,
          title: draftEvent.title,
          slug: draftEvent.slug,
          status: draftEvent.status,
          capacity: draftEvent.capacity,
          registrationFieldsCount: draftEvent.registration_fields?.length,
          ownersCount: draftEvent.owners?.length,
        },
      },
    });
  } catch (err: unknown) {
    // Cleanup on error
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }

    return NextResponse.json({
      status: 'error',
      step: '8.1',
      error: err instanceof Error ? err.message : 'Unknown error during Step 8.1 verification',
    }, { status: 500 });
  }
}
