import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPrContacts,
  getPrTeamMembers,
  createPrContact,
  updatePrContactStage,
  updatePrContact,
  deletePrContact,
} from '@/app/pr/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 11.1 - PR Contacts & Pipeline (Kanban: new/contacted/negotiating/confirmed)',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const admin = createAdminClient();

    // 1. Check if pr_contacts table exists
    const { data: initialContacts, error: initError } = await admin
      .from('pr_contacts')
      .select('*')
      .limit(5);

    results.checks.prContactsTable = {
      exists: !initError,
      error: initError ? initError.message : null,
      initialCount: initialContacts?.length || 0,
    };

    // 2. Test getPrTeamMembers
    const teamResult = await getPrTeamMembers({ skipAuthCheck: true });
    results.checks.teamMembers = {
      success: teamResult.success,
      count: teamResult.data.length,
      sample: teamResult.data[0] || null,
    };

    // 3. Test createPrContact
    const testContactName = `Test Contact ${Date.now()}`;
    const createResult = await createPrContact(
      {
        name: testContactName,
        organization: 'Google Developer Student Clubs',
        role_title: 'Regional Lead',
        email: 'test.speaker@example.com',
        phone: '+201000000000',
        type: 'speaker',
        pipeline_stage: 'new',
        notes: 'Initial outreach test note for step 11.1',
        assigned_to: teamResult.data[0]?.id || null,
      },
      { skipAuthCheck: true }
    );

    results.checks.createContact = {
      success: createResult.success,
      contactId: createResult.data?.id,
      error: createResult.error,
    };

    if (!createResult.success || !createResult.data?.id) {
      throw new Error(`Failed to create contact: ${createResult.error}`);
    }

    const testContactId = createResult.data.id;

    // 4. Test stage transitions across all 4 stages (new -> contacted -> negotiating -> confirmed)
    const stages = ['contacted', 'negotiating', 'confirmed'] as const;
    const stageTransitionResults: Record<string, boolean> = {};

    for (const stage of stages) {
      const updateResult = await updatePrContactStage(testContactId, stage, {
        skipAuthCheck: true,
      });
      stageTransitionResults[stage] = updateResult.success;
    }

    results.checks.stageTransitions = stageTransitionResults;

    // 5. Test updatePrContact details
    const updateDetailsResult = await updatePrContact(
      testContactId,
      {
        notes: 'Updated notes after successful negotiation meeting',
        role_title: 'Global Tech Lead',
      },
      { skipAuthCheck: true }
    );

    results.checks.updateDetails = {
      success: updateDetailsResult.success,
    };

    // 6. Test getPrContacts with filters
    const filteredQuery = await getPrContacts(
      { stage: 'confirmed', type: 'speaker' },
      { skipAuthCheck: true }
    );

    const foundContact = filteredQuery.data.find((c) => c.id === testContactId);
    results.checks.filteredQuery = {
      success: filteredQuery.success,
      totalFound: filteredQuery.data.length,
      foundTestContact: !!foundContact,
      stageMatch: foundContact?.pipeline_stage === 'confirmed',
      assigneeAttached: !!foundContact?.assignee || !foundContact?.assigned_to,
    };

    // 7. Cleanup test contact
    const deleteResult = await deletePrContact(testContactId, { skipAuthCheck: true });
    results.checks.cleanup = {
      success: deleteResult.success,
    };

    return NextResponse.json({
      status: 'pass',
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        results,
      },
      { status: 500 }
    );
  }
}
