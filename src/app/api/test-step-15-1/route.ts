import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify ContentCalendarClient component exists
    const clientPath = path.join(process.cwd(), 'src', 'components', 'workspace', 'ContentCalendarClient.tsx');
    const clientExists = fs.existsSync(clientPath);
    let clientContent = '';
    if (clientExists) clientContent = fs.readFileSync(clientPath, 'utf8');

    const hasMonthView = clientContent.includes("view === 'month'");
    const hasListView = clientContent.includes("view === 'list'");
    const hasStatusFilter = clientContent.includes('id="calendar-status-filter"');
    const hasDeptFilter = clientContent.includes('id="calendar-dept-filter"');
    const hasPrevMonth = clientContent.includes('id="calendar-prev-month"');
    const hasNextMonth = clientContent.includes('id="calendar-next-month"');
    const hasDayPanel = clientContent.includes('selectedDayEvents');
    const hasStatusLegend = clientContent.includes('Legend:');

    results['1_content_calendar_client_component'] = {
      pass: clientExists && hasMonthView && hasListView && hasStatusFilter && hasDeptFilter && hasPrevMonth && hasNextMonth && hasDayPanel && hasStatusLegend,
      clientExists,
      hasMonthView,
      hasListView,
      hasStatusFilter,
      hasDeptFilter,
      hasPrevMonth,
      hasNextMonth,
      hasDayPanel,
      hasStatusLegend,
    };

    // 2. Verify page.tsx exists and imports component
    const pagePath = path.join(process.cwd(), 'src', 'app', 'workspace', 'content-calendar', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsClient = pageContent.includes('ContentCalendarClient');
    const pageHasRBAC = pageContent.includes('isPresidential');
    const pageHasForceReload = pageContent.includes("force-dynamic");

    results['2_content_calendar_page'] = {
      pass: pageExists && pageImportsClient && pageHasRBAC && pageHasForceReload,
      pageExists,
      pageImportsClient,
      pageHasRBAC,
      pageHasForceReload,
    };

    // 3. Verify AppNavigation has Content Calendar link
    const navPath = path.join(process.cwd(), 'src', 'components', 'layout', 'AppNavigation.tsx');
    const navContent = fs.readFileSync(navPath, 'utf8');
    const navHasLink = navContent.includes('/workspace/content-calendar');
    const navHasLabel = navContent.includes("'Content Calendar'");

    results['3_nav_link_present'] = {
      pass: navHasLink && navHasLabel,
      navHasLink,
      navHasLabel,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '15.1',
      title: 'Build the Content Calendar',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
