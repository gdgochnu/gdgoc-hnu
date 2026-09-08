import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createPrContact,
  deletePrContact,
  getPrContacts,
  getPrInteractions,
  createPrInteraction,
  deletePrInteraction,
} from '@/app/pr/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 11.2 - PR Follow-up + History (Interaction log per contact)',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const admin = createAdminClient();

    // 1. Check pr_interactions table
    const { data: initialInteractions, error: tableError } = await admin
      .from('pr_interactions')
      .select('*')
      .limit(5);

    results.checks.prInteractionsTable = {
      exists: !tableError,
      error: tableError ? tableError.message : null,
      initialCount: initialInteractions?.length || 0,
    };

    // 2. Pick a test profile to act as author
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name_en')
      .eq('status', 'active')
      .limit(1);

    const authorProfile = profiles?.[0];
    const authorId = authorProfile?.id;

    // 3. Create a temporary test contact
    const testContact = await createPrContact(
      {
        name: `Followup Test Contact ${Date.now()}`,
        organization: 'Tech Hub Cairo',
        role_title: 'Sponsorship Director',
        email: 'sponsor.lead@example.com',
        phone: '+201100000000',
        type: 'sponsor',
        pipeline_stage: 'contacted',
        notes: 'Initial outreach sent regarding Fall Hackathon title sponsor.',
      },
      { skipAuthCheck: true, authorId }
    );

    if (!testContact.success || !testContact.data?.id) {
      throw new Error(`Failed to create contact for interaction test: ${testContact.error}`);
    }

    const contactId = testContact.data.id;
    results.checks.testContactCreated = { id: contactId };

    // 4. Test logging all 4 interaction types
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

    // A. Email interaction
    const emailRes = await createPrInteraction(
      {
        contact_id: contactId,
        interaction_type: 'email',
        summary: 'Sent sponsorship brochure v3 with Bronze/Silver/Gold options.',
        next_follow_up: futureDate,
      },
      { skipAuthCheck: true, authorId }
    );

    // B. Call interaction
    const callRes = await createPrInteraction(
      {
        contact_id: contactId,
        interaction_type: 'call',
        summary: 'Intro call with sponsorship director. Expressed high interest in Gold tier ($1,500).',
        update_stage: 'negotiating',
      },
      { skipAuthCheck: true, authorId }
    );

    // C. Meeting interaction
    const meetingRes = await createPrInteraction(
      {
        contact_id: contactId,
        interaction_type: 'meeting',
        summary: 'In-person meeting at university campus with President to finalize banner logos.',
      },
      { skipAuthCheck: true, authorId }
    );

    // D. Direct Message interaction
    const messageRes = await createPrInteraction(
      {
        contact_id: contactId,
        interaction_type: 'message',
        summary: 'WhatsApp message confirming contract signature link.',
      },
      { skipAuthCheck: true, authorId }
    );

    results.checks.logInteractions = {
      emailLogged: emailRes.success,
      callLogged: callRes.success,
      meetingLogged: meetingRes.success,
      messageLogged: messageRes.success,
      emailInteractionId: emailRes.data?.id,
    };

    // 5. Test getPrInteractions
    const interactionsListRes = await getPrInteractions(contactId, { skipAuthCheck: true });
    results.checks.getPrInteractions = {
      success: interactionsListRes.success,
      count: interactionsListRes.data.length,
      hasAuthor: !!interactionsListRes.data[0]?.author,
      hasFollowUp: !!interactionsListRes.data.find((i) => i.next_follow_up),
    };

    // 6. Test getPrContacts reflects interactions count and next_follow_up
    const contactsRes = await getPrContacts({ search: 'Followup Test Contact' }, { skipAuthCheck: true });
    const foundContact = contactsRes.data.find((c) => c.id === contactId);

    results.checks.contactReflection = {
      found: !!foundContact,
      stageUpdatedToNegotiating: foundContact?.pipeline_stage === 'negotiating',
      interactionsCountMatch: foundContact?.interactions_count === 4,
      hasNextFollowUp: !!foundContact?.next_follow_up,
    };

    // 7. Test deletePrInteraction
    if (messageRes.data?.id) {
      const deleteInterRes = await deletePrInteraction(messageRes.data.id, { skipAuthCheck: true });
      results.checks.deleteInteraction = {
        success: deleteInterRes.success,
      };
    }

    // 8. Cleanup test contact
    const deleteContactRes = await deletePrContact(contactId, { skipAuthCheck: true });
    results.checks.cleanup = {
      contactDeleted: deleteContactRes.success,
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
