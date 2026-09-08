import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getSharedCalendarInfo,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  generatePersonalCalendarUrl,
} from '@/lib/calendar/calendar-client';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify Google Apps Script includes Calendar integration handlers
    const codeJsPath = path.join(process.cwd(), 'google-apps-script/Code.js');
    const codeGsPath = path.join(process.cwd(), 'google-apps-script/Code.gs');
    const codeJsExists = fs.existsSync(codeJsPath);
    const codeGsExists = fs.existsSync(codeGsPath);

    const scriptContent = codeJsExists ? fs.readFileSync(codeJsPath, 'utf8') : '';
    const hasSharedCal = scriptContent.includes('getOrCreateSharedCalendar') && scriptContent.includes('GDGoC HNU');
    const hasCalActions =
      scriptContent.includes('createCalendarEvent') &&
      scriptContent.includes('updateCalendarEvent') &&
      scriptContent.includes('deleteCalendarEvent') &&
      scriptContent.includes('getSharedCalendar');

    results['1_apps_script_calendar_handlers'] = {
      pass: codeJsExists && codeGsExists && hasSharedCal && hasCalActions,
      codeJsExists,
      codeGsExists,
      hasSharedCal,
      hasCalActions,
    };

    // 2. Verify migration 024 exists
    const migPath = path.join(process.cwd(), 'supabase/migrations/20260908000024_create_calendar_integration.sql');
    const migExists = fs.existsSync(migPath);
    const migContent = migExists ? fs.readFileSync(migPath, 'utf8') : '';
    const hasCol = migContent.includes('google_calendar_event_id') && migContent.includes('google_calendar_link');
    const hasSetting = migContent.includes('google_calendar_id');

    results['2_calendar_migration_024'] = {
      pass: migExists && hasCol && hasSetting,
      migExists,
      hasCol,
      hasSetting,
    };

    // 3. Test getSharedCalendarInfo
    const calInfo = await getSharedCalendarInfo();
    const hasSubLink = calInfo.subscribableLink?.includes('calendar.google.com/calendar/render?cid=');
    const hasIcal = calInfo.icalUrl?.includes('.ics');

    results['3_shared_gdgoc_hnu_calendar'] = {
      pass: calInfo.success && !!calInfo.calendarId && hasSubLink && hasIcal,
      success: calInfo.success,
      calendarId: calInfo.calendarId,
      calendarName: calInfo.calendarName,
      subscribableLink: calInfo.subscribableLink,
      icalUrl: calInfo.icalUrl,
    };

    // 4. Test createCalendarEvent
    const testStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createRes = await createCalendarEvent({
      title: 'GDGoC HNU AI Workshop',
      description: 'Hands-on session building intelligent web agents',
      location: 'Helwan National University Campus',
      startTime: testStartTime,
    });

    results['4_create_calendar_event'] = {
      pass: createRes.success && !!createRes.eventId && !!createRes.htmlLink,
      eventId: createRes.eventId,
      htmlLink: createRes.htmlLink,
      startTime: createRes.startTime,
    };

    // 5. Test updateCalendarEvent & deleteCalendarEvent
    if (createRes.eventId) {
      const updateRes = await updateCalendarEvent(createRes.eventId, {
        title: 'GDGoC HNU AI Workshop (Updated)',
      });
      const deleteRes = await deleteCalendarEvent(createRes.eventId);

      results['5_update_and_delete_calendar_event'] = {
        pass: updateRes.success && deleteRes.success,
        updateSuccess: updateRes.success,
        deleteSuccess: deleteRes.success,
      };
    } else {
      results['5_update_and_delete_calendar_event'] = {
        pass: false,
        error: 'Event creation failed',
      };
    }

    // 6. Test generatePersonalCalendarUrl (One-click Google Calendar link)
    const personalUrl = generatePersonalCalendarUrl({
      title: 'Complete Chapter Onboarding',
      description: 'Review GDGoC HNU guidelines and finish task checklist',
      startDate: new Date(),
    });

    const isUrlValid =
      personalUrl.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE') &&
      personalUrl.includes('text=Complete%20Chapter%20Onboarding');

    results['6_personal_calendar_link_generator'] = {
      pass: isUrlValid,
      urlPrefix: personalUrl.substring(0, 70) + '...',
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '14.1',
      title: 'Enable Google Calendar API on same credentials as Drive bridge; create shared GDGoC HNU calendar',
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
