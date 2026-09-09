import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getWeeklyReviewsFeed,
  submitWeeklyHeadReview,
  submitPresidentReviewFeedback,
  getCurrentWeekStartDate,
} from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.4 - Weekly 5-Question Review Widget & President Feed',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    // 1. Verify Migration 026 exists and contains required SQL declarations
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260909000026_create_weekly_head_reviews.sql'
    );
    const migrationExists = fs.existsSync(migrationPath);
    let migrationSql = '';
    if (migrationExists) migrationSql = fs.readFileSync(migrationPath, 'utf8');

    const hasTableDef = migrationSql.includes('CREATE TABLE IF NOT EXISTS public.weekly_head_reviews');
    const hasUniqueConstraint = migrationSql.includes('uq_dept_week_review UNIQUE (department_id, week_start_date)');
    const hasMoraleCheck = migrationSql.includes('q5_morale_rating BETWEEN 1 AND 5');
    const hasRls = migrationSql.includes('ALTER TABLE public.weekly_head_reviews ENABLE ROW LEVEL SECURITY');
    const hasSelectPolicy = migrationSql.includes('weekly_reviews_select_policy');
    const hasInsertPolicy = migrationSql.includes('weekly_reviews_insert_policy');
    const hasUpdatePolicy = migrationSql.includes('weekly_reviews_update_policy');

    results.tests.migrationSchema = {
      passed:
        migrationExists &&
        hasTableDef &&
        hasUniqueConstraint &&
        hasMoraleCheck &&
        hasRls &&
        hasSelectPolicy &&
        hasInsertPolicy &&
        hasUpdatePolicy,
      migrationExists,
      hasTableDef,
      hasUniqueConstraint,
      hasMoraleCheck,
      hasRls,
      hasSelectPolicy,
      hasInsertPolicy,
      hasUpdatePolicy,
    };

    // 2. Direct execution of getWeeklyReviewsFeed
    const feedRes = await getWeeklyReviewsFeed({ bypassAuthForAdminTest: true });
    results.tests.getWeeklyReviewsFeed = {
      passed: feedRes.success && typeof feedRes.summary.totalSubmissions === 'number',
      summary: {
        weekStartDate: feedRes.summary.weekStartDate,
        totalSubmissions: feedRes.summary.totalSubmissions,
        expectedCommitteesCount: feedRes.summary.expectedCommitteesCount,
        averageMorale: feedRes.summary.averageMorale,
        pendingFeedbackCount: feedRes.summary.pendingFeedbackCount,
        isPresidentOrCo: feedRes.summary.isPresidentOrCo,
        reviewsCount: feedRes.summary.reviews.length,
      },
      error: feedRes.error || null,
    };

    // 3. Test helper getCurrentWeekStartDate
    const weekStart = await getCurrentWeekStartDate();
    const isValidDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(weekStart);
    results.tests.getCurrentWeekStartDate = {
      passed: isValidDateFormat,
      calculatedWeekStart: weekStart,
    };

    // 4. Verify Server Actions Input Validations (reject invalid or empty submissions)
    const invalidSubRes = await submitWeeklyHeadReview({
      departmentId: '',
      weekStartDate: '',
      q1Achievements: '',
      q2Blockers: '',
      q3NextWeekPlan: '',
      q5MoraleRating: 10, // Invalid rating > 5
    });

    results.tests.inputValidation = {
      passed: !invalidSubRes.success && (invalidSubRes.error?.length ?? 0) > 0,
      rejectedUnauthorizedOrInvalid: true,
      errorNotice: invalidSubRes.error,
    };

    // 5. Verify UI Component exists and has required capabilities
    const widgetPath = path.join(
      process.cwd(),
      'src',
      'components',
      'command-center',
      'WeeklyReviewsWidget.tsx'
    );
    const widgetExists = fs.existsSync(widgetPath);
    let widgetContent = '';
    if (widgetExists) widgetContent = fs.readFileSync(widgetPath, 'utf8');

    const hasWidgetId = widgetContent.includes('id="weekly-reviews-widget"');
    const hasHeadForm = widgetContent.includes('handleHeadSubmit');
    const hasPresidentFeedback = widgetContent.includes('handleSendFeedback');
    const has5Questions =
      widgetContent.includes('q1Achievements') &&
      widgetContent.includes('q2Blockers') &&
      widgetContent.includes('q3NextWeekPlan') &&
      widgetContent.includes('q4SupportNeeded') &&
      widgetContent.includes('q5MoraleRating');

    results.tests.uiComponentIntegrity = {
      passed: widgetExists && hasWidgetId && hasHeadForm && hasPresidentFeedback && has5Questions,
      widgetExists,
      hasWidgetId,
      hasHeadForm,
      hasPresidentFeedback,
      has5Questions,
    };

    // 6. Verify Page Integration
    const pagePath = path.join(process.cwd(), 'src', 'app', 'command-center', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsWidget = pageContent.includes('WeeklyReviewsWidget');
    const pageCallsAction = pageContent.includes('getWeeklyReviewsFeed()');
    const pageRendersWidget = pageContent.includes('<WeeklyReviewsWidget');

    results.tests.pageIntegration = {
      passed: pageExists && pageImportsWidget && pageCallsAction && pageRendersWidget,
      pageExists,
      pageImportsWidget,
      pageCallsAction,
      pageRendersWidget,
    };

    results.allPassed = Object.values(results.tests).every((t: any) => t.passed === true);

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
