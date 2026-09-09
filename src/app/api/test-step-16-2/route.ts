import { NextResponse } from 'next/server';
import { getNeedsAttentionFeed } from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.2 - "Needs Attention" Feed',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    // 1. Direct execution of getNeedsAttentionFeed
    const feedRes = await getNeedsAttentionFeed({ bypassAuthForAdminTest: true });

    results.tests.getNeedsAttentionFeed = {
      passed: feedRes.success,
      summary: {
        totalIssuesCount: feedRes.summary.totalIssuesCount,
        urgentCount: feedRes.summary.urgentCount,
        overdueTasksCount: feedRes.summary.overdueTasksCount,
        stalledApprovalsCount: feedRes.summary.stalledApprovalsCount,
        prFollowUpsCount: feedRes.summary.prFollowUpsCount,
        inactiveMembersCount: feedRes.summary.inactiveMembersCount,
        eventsOverBudgetCount: feedRes.summary.eventsOverBudgetCount,
      },
      sampleItems: feedRes.summary.items.slice(0, 5).map((item) => ({
        id: item.id,
        category: item.category,
        severity: item.severity,
        title: item.title,
        subtitle: item.subtitle,
        actionUrl: item.actionUrl,
        actionLabel: item.actionLabel,
      })),
      error: feedRes.error || null,
    };

    // 2. Validate Item Structure Integrity
    const validCategories = [
      'overdue_task',
      'stalled_approval',
      'pr_follow_up',
      'inactive_member',
      'event_over_budget',
    ];
    const validSeverities = ['urgent', 'warning', 'info'];

    let itemsValid = true;
    for (const item of feedRes.summary.items) {
      if (
        typeof item.id !== 'string' ||
        !validCategories.includes(item.category) ||
        !validSeverities.includes(item.severity) ||
        typeof item.title !== 'string' ||
        typeof item.subtitle !== 'string' ||
        typeof item.actionUrl !== 'string' ||
        typeof item.actionLabel !== 'string'
      ) {
        itemsValid = false;
        break;
      }
    }

    results.tests.itemsStructureIntegrity = {
      passed: itemsValid,
      totalChecked: feedRes.summary.items.length,
    };

    results.allPassed =
      results.tests.getNeedsAttentionFeed.passed &&
      results.tests.itemsStructureIntegrity.passed;

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
