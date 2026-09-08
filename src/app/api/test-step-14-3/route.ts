import { NextResponse } from 'next/server';
import { getSharedCalendarInfo } from '@/lib/calendar/calendar-client';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify getSharedCalendarInfo returns valid subscription metadata
    const calInfo = await getSharedCalendarInfo();
    const hasValidCid = calInfo.subscribableLink.includes('calendar.google.com/calendar/render?cid=');
    const hasValidIcal = calInfo.icalUrl.includes('.ics');

    results['1_shared_calendar_metadata'] = {
      pass: !!calInfo.calendarId && hasValidCid && hasValidIcal,
      calendarId: calInfo.calendarId,
      subscribableLink: calInfo.subscribableLink,
      icalUrl: calInfo.icalUrl,
    };

    // 2. Verify SharedCalendarSubscribeBanner component file exists with correct IDs
    const bannerPath = path.join(process.cwd(), 'src', 'components', 'dashboard', 'SharedCalendarSubscribeBanner.tsx');
    const bannerExists = fs.existsSync(bannerPath);
    let bannerContent = '';
    if (bannerExists) {
      bannerContent = fs.readFileSync(bannerPath, 'utf8');
    }

    const hasSubscribeBtn = bannerContent.includes('id="subscribe-google-calendar-btn"');
    const hasCopyIcalBtn = bannerContent.includes('id="copy-ical-calendar-btn"');
    const hasAppleGoogleSync = bannerContent.includes('Add to Google Calendar') && bannerContent.includes('Copy iCal Feed');

    results['2_banner_component_spec'] = {
      pass: bannerExists && hasSubscribeBtn && hasCopyIcalBtn && hasAppleGoogleSync,
      bannerExists,
      hasSubscribeBtn,
      hasCopyIcalBtn,
      hasAppleGoogleSync,
    };

    // 3. Verify src/app/dashboard/page.tsx mounts SharedCalendarSubscribeBanner
    const dashboardPagePath = path.join(process.cwd(), 'src', 'app', 'dashboard', 'page.tsx');
    const dashboardContent = fs.readFileSync(dashboardPagePath, 'utf8');
    const importsBanner = dashboardContent.includes('SharedCalendarSubscribeBanner');
    const importsCalClient = dashboardContent.includes('getSharedCalendarInfo');
    const rendersBanner = dashboardContent.includes('<SharedCalendarSubscribeBanner') && dashboardContent.includes('calendarInfo={');

    results['3_dashboard_integration'] = {
      pass: importsBanner && importsCalClient && rendersBanner,
      importsBanner,
      importsCalClient,
      rendersBanner,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '14.3',
      title: 'Expose a subscribable shared chapter Google Calendar link on the dashboard',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
