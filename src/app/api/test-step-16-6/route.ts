import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getNewMemberOnboardingOverview,
  getEventSatisfactionTrend,
} from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.6 - New-Member Onboarding Progress & Event Satisfaction Trend Widgets',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    // 1. Direct execution of getNewMemberOnboardingOverview
    const onboardingRes = await getNewMemberOnboardingOverview({ bypassAuthForAdminTest: true });

    results.tests.getNewMemberOnboardingOverview = {
      passed: onboardingRes.success && typeof onboardingRes.summary.totalInOnboarding === 'number',
      summary: {
        totalInOnboarding: onboardingRes.summary.totalInOnboarding,
        fullyCompletedCount: onboardingRes.summary.fullyCompletedCount,
        inProgressCount: onboardingRes.summary.inProgressCount,
        averageProgressPercentage: onboardingRes.summary.averageProgressPercentage,
      },
      sampleMembersCount: onboardingRes.summary.members.length,
      sampleMembers: onboardingRes.summary.members.slice(0, 3).map((m) => ({
        fullName: m.fullName,
        departmentCode: m.departmentCode,
        progressPercentage: m.progressPercentage,
        isFullyOnboarded: m.isFullyOnboarded,
      })),
      error: onboardingRes.error || null,
    };

    // 2. Direct execution of getEventSatisfactionTrend
    const satisfactionRes = await getEventSatisfactionTrend({ bypassAuthForAdminTest: true });

    results.tests.getEventSatisfactionTrend = {
      passed: satisfactionRes.success && typeof satisfactionRes.summary.overallAverageRating === 'number',
      summary: {
        overallAverageRating: satisfactionRes.summary.overallAverageRating,
        totalFeedbackCount: satisfactionRes.summary.totalFeedbackCount,
        eventsEvaluatedCount: satisfactionRes.summary.eventsEvaluatedCount,
        satisfactionPercentage: satisfactionRes.summary.satisfactionPercentage,
      },
      eventsCount: satisfactionRes.summary.events.length,
      sampleEvents: satisfactionRes.summary.events.slice(0, 3).map((e) => ({
        eventTitle: e.eventTitle,
        averageRating: e.averageRating,
        totalResponses: e.totalResponses,
      })),
      error: satisfactionRes.error || null,
    };

    // 3. Verify NewMemberOnboardingWidget component integrity
    const onboardingWidgetPath = path.join(
      process.cwd(),
      'src',
      'components',
      'command-center',
      'NewMemberOnboardingWidget.tsx'
    );
    const onboardingWidgetExists = fs.existsSync(onboardingWidgetPath);
    let onboardingWidgetContent = '';
    if (onboardingWidgetExists) onboardingWidgetContent = fs.readFileSync(onboardingWidgetPath, 'utf8');

    const hasOnboardingId = onboardingWidgetContent.includes('id="new-member-onboarding-widget"');
    const hasProgressBar = onboardingWidgetContent.includes('progressPercentage');
    const hasFilterPills = onboardingWidgetContent.includes("setFilter('all')");

    results.tests.onboardingWidgetIntegrity = {
      passed: onboardingWidgetExists && hasOnboardingId && hasProgressBar && hasFilterPills,
      onboardingWidgetExists,
      hasOnboardingId,
      hasProgressBar,
      hasFilterPills,
    };

    // 4. Verify EventSatisfactionWidget component integrity
    const satisfactionWidgetPath = path.join(
      process.cwd(),
      'src',
      'components',
      'command-center',
      'EventSatisfactionWidget.tsx'
    );
    const satisfactionWidgetExists = fs.existsSync(satisfactionWidgetPath);
    let satisfactionWidgetContent = '';
    if (satisfactionWidgetExists) satisfactionWidgetContent = fs.readFileSync(satisfactionWidgetPath, 'utf8');

    const hasSatisfactionId = satisfactionWidgetContent.includes('id="event-satisfaction-widget"');
    const hasAverageScore = satisfactionWidgetContent.includes('overallAverageRating');
    const hasQuotes = satisfactionWidgetContent.includes('sampleComments');

    results.tests.satisfactionWidgetIntegrity = {
      passed: satisfactionWidgetExists && hasSatisfactionId && hasAverageScore && hasQuotes,
      satisfactionWidgetExists,
      hasSatisfactionId,
      hasAverageScore,
      hasQuotes,
    };

    // 5. Verify Page Integration
    const pagePath = path.join(process.cwd(), 'src', 'app', 'command-center', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsOnboarding = pageContent.includes('NewMemberOnboardingWidget');
    const pageImportsSatisfaction = pageContent.includes('EventSatisfactionWidget');
    const pageCallsOnboarding = pageContent.includes('getNewMemberOnboardingOverview()');
    const pageCallsSatisfaction = pageContent.includes('getEventSatisfactionTrend()');
    const pageRendersOnboarding = pageContent.includes('<NewMemberOnboardingWidget');
    const pageRendersSatisfaction = pageContent.includes('<EventSatisfactionWidget');

    results.tests.pageIntegration = {
      passed:
        pageExists &&
        pageImportsOnboarding &&
        pageImportsSatisfaction &&
        pageCallsOnboarding &&
        pageCallsSatisfaction &&
        pageRendersOnboarding &&
        pageRendersSatisfaction,
      pageExists,
      pageImportsOnboarding,
      pageImportsSatisfaction,
      pageCallsOnboarding,
      pageCallsSatisfaction,
      pageRendersOnboarding,
      pageRendersSatisfaction,
    };

    results.allPassed = Object.values(results.tests).every((t: any) => t.passed === true);

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
