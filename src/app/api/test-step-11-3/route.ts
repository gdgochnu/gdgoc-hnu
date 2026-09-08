import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPrDashboardMetrics,
  createPrContact,
  createPrInteraction,
  deletePrContact,
} from '@/app/pr/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 11.3 - PR KPI Widgets on PR Dashboard',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('status', 'active')
      .limit(1);
    const authorId = profiles?.[0]?.id;
    // 1. Fetch initial dashboard metrics
    const initialMetricsRes = await getPrDashboardMetrics({ skipAuthCheck: true });
    results.checks.initialMetrics = {
      success: initialMetricsRes.success,
      error: initialMetricsRes.error,
      hasRequiredKeys: initialMetricsRes.data
        ? [
            'totalContacts',
            'confirmedContacts',
            'conversionRate',
            'activeNegotiations',
            'overdueFollowUpsCount',
            'upcomingFollowUpsCount',
            'typeBreakdown',
            'stageBreakdown',
            'interactionChannelBreakdown',
            'teamActivity',
            'urgentFollowUps',
          ].every((k) => k in (initialMetricsRes.data as any))
        : false,
      dataSample: initialMetricsRes.data
        ? {
            totalContacts: initialMetricsRes.data.totalContacts,
            confirmedContacts: initialMetricsRes.data.confirmedContacts,
            conversionRate: initialMetricsRes.data.conversionRate,
            typeBreakdown: initialMetricsRes.data.typeBreakdown,
            stageBreakdown: initialMetricsRes.data.stageBreakdown,
            channelBreakdown: initialMetricsRes.data.interactionChannelBreakdown,
          }
        : null,
    };

    if (!initialMetricsRes.success || !initialMetricsRes.data) {
      throw new Error(`Failed to fetch initial metrics: ${initialMetricsRes.error}`);
    }

    // 2. Create a contact + an overdue interaction to test dynamic recalculation
    const testContactRes = await createPrContact(
      {
        name: `KPI Test Partner ${Date.now()}`,
        organization: 'Global Cloud Sponsors',
        role_title: 'Marketing Director',
        type: 'sponsor',
        pipeline_stage: 'confirmed',
      },
      { skipAuthCheck: true }
    );

    if (!testContactRes.success || !testContactRes.data?.id) {
      throw new Error(`Failed to create test contact: ${testContactRes.error}`);
    }

    const testContactId = testContactRes.data.id;

    // Log an overdue follow-up (3 days ago)
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const interactionRes = await createPrInteraction(
      {
        contact_id: testContactId,
        interaction_type: 'meeting',
        summary: 'Met to sign $2,000 platinum sponsorship agreement.',
        next_follow_up: pastDate,
      },
      { skipAuthCheck: true, authorId }
    );

    results.checks.sampleDataCreated = {
      contactId: testContactId,
      interactionId: interactionRes.data?.id,
    };

    // 3. Re-fetch metrics and verify dynamic update
    const updatedMetricsRes = await getPrDashboardMetrics({ skipAuthCheck: true });
    const updatedData = updatedMetricsRes.data;

    results.checks.dynamicUpdate = {
      success: updatedMetricsRes.success,
      contactsIncremented: (updatedData?.totalContacts || 0) > initialMetricsRes.data.totalContacts,
      confirmedCountIncreased: (updatedData?.confirmedContacts || 0) > initialMetricsRes.data.confirmedContacts,
      sponsorTypeCountIncreased: (updatedData?.typeBreakdown.sponsor || 0) > initialMetricsRes.data.typeBreakdown.sponsor,
      meetingChannelCountIncreased: (updatedData?.interactionChannelBreakdown.meeting || 0) > initialMetricsRes.data.interactionChannelBreakdown.meeting,
      urgentFollowUpsContainsTestContact: !!updatedData?.urgentFollowUps.find((f) => f.contactId === testContactId),
    };

    // 4. Cleanup test data
    const cleanupRes = await deletePrContact(testContactId, { skipAuthCheck: true });
    results.checks.cleanup = {
      success: cleanupRes.success,
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
