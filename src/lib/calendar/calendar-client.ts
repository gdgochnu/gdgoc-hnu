import { getDriveBridgeConfig, callDriveBridge, DriveBridgeResponse } from '@/lib/drive/drive-client';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SharedCalendarInfo {
  calendarId: string;
  calendarName: string;
  timeZone: string;
  subscribableLink: string;
  icalUrl: string;
}

export interface CalendarEventData {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601 or YYYY-MM-DD
  endTime?: string;
  isAllDay?: boolean;
}

export interface CalendarEventResult {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  htmlLink: string;
}

// In-memory mock calendar store for local/testing environments
const mockCalendarStore = {
  calendarId: 'mock-gdgoc-hnu-calendar-id@group.calendar.google.com',
  calendarName: 'GDGoC HNU',
  timeZone: 'Africa/Cairo',
  events: new Map<string, CalendarEventResult & { description?: string; location?: string }>(),
};

/**
 * Get or create the shared chapter "GDGoC HNU" Google Calendar
 */
export async function getSharedCalendarInfo(): Promise<DriveBridgeResponse<SharedCalendarInfo>> {
  try {
    const admin = createAdminClient();

    // Check system_settings first for cached calendar ID
    const { data: calSetting } = await admin
      .from('system_settings')
      .select('value')
      .eq('key', 'google_calendar_id')
      .maybeSingle();

    if (calSetting && calSetting.value && calSetting.value.trim()) {
      const calId = calSetting.value.trim();
      const subLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calId)}`;
      const ical = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;
      return {
        success: true,
        calendarId: calId,
        calendarName: 'GDGoC HNU',
        timeZone: 'Africa/Cairo',
        subscribableLink: subLink,
        icalUrl: ical,
      };
    }

    // Call bridge
    const config = await getDriveBridgeConfig();
    if (!config.isMock && config.webAppUrl) {
      const res = await callDriveBridge<SharedCalendarInfo>('getSharedCalendar');
      if (res.success && res.calendarId) {
        // Cache in system_settings
        await admin.from('system_settings').upsert([
          { key: 'google_calendar_id', value: res.calendarId },
          { key: 'google_calendar_subscribable_link', value: res.subscribableLink || '' },
        ], { onConflict: 'key' });
      }
      return res;
    }

    // Mock fallback
    const calId = mockCalendarStore.calendarId;
    const subLink = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calId)}`;
    const ical = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;

    return {
      success: true,
      calendarId: calId,
      calendarName: mockCalendarStore.calendarName,
      timeZone: mockCalendarStore.timeZone,
      subscribableLink: subLink,
      icalUrl: ical,
      isMockMode: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to retrieve shared calendar info',
    };
  }
}

/**
 * Create an event on the shared "GDGoC HNU" Google Calendar
 */
export async function createCalendarEvent(
  data: CalendarEventData
): Promise<DriveBridgeResponse<CalendarEventResult>> {
  const config = await getDriveBridgeConfig();

  if (!config.isMock && config.webAppUrl) {
    return callDriveBridge<CalendarEventResult>('createCalendarEvent', data);
  }

  // Mock implementation
  const eventId = `cal_event_${Math.random().toString(36).substring(2, 12)}`;
  const start = new Date(data.startTime);
  const end = data.endTime ? new Date(data.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const eventObj: CalendarEventResult & { description?: string; location?: string } = {
    eventId,
    title: data.title,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    htmlLink: `https://calendar.google.com/calendar/event?eid=${Buffer.from(eventId).toString('base64')}`,
    description: data.description,
    location: data.location,
  };

  mockCalendarStore.events.set(eventId, eventObj);

  return {
    success: true,
    action: 'createCalendarEvent',
    ...eventObj,
    isMockMode: true,
  };
}

/**
 * Update an existing event on the shared calendar
 */
export async function updateCalendarEvent(
  eventId: string,
  data: Partial<CalendarEventData>
): Promise<DriveBridgeResponse<{ eventId: string; title?: string }>> {
  const config = await getDriveBridgeConfig();

  if (!config.isMock && config.webAppUrl) {
    return callDriveBridge('updateCalendarEvent', { eventId, ...data });
  }

  const existing = mockCalendarStore.events.get(eventId);
  if (existing) {
    if (data.title) existing.title = data.title;
    if (data.description !== undefined) existing.description = data.description;
    if (data.location !== undefined) existing.location = data.location;
    if (data.startTime) existing.startTime = new Date(data.startTime).toISOString();
    if (data.endTime) existing.endTime = new Date(data.endTime).toISOString();
  }

  return {
    success: true,
    action: 'updateCalendarEvent',
    eventId,
    title: existing?.title || data.title,
    isMockMode: true,
  };
}

/**
 * Delete an event from the shared calendar
 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<DriveBridgeResponse> {
  const config = await getDriveBridgeConfig();

  if (!config.isMock && config.webAppUrl) {
    return callDriveBridge('deleteCalendarEvent', { eventId });
  }

  const existed = mockCalendarStore.events.delete(eventId);
  return {
    success: true,
    action: 'deleteCalendarEvent',
    eventId,
    message: existed ? 'Event deleted from calendar successfully' : 'Event not found in mock store',
    isMockMode: true,
  };
}

/**
 * Generate standard web "Add to Google Calendar" URL for personal calendars (Spec §4.17 - Step 14.4)
 * Formats: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...
 */
export function generatePersonalCalendarUrl(options: {
  title: string;
  description?: string;
  location?: string;
  startDate: Date | string;
  endDate?: Date | string;
  isAllDay?: boolean;
}): string {
  const title = encodeURIComponent(options.title);
  const details = encodeURIComponent(options.description || '');
  const location = encodeURIComponent(options.location || 'Helwan National University');

  const start = new Date(options.startDate);
  const end = options.endDate ? new Date(options.endDate) : new Date(start.getTime() + 60 * 60 * 1000);

  const formatGCalDate = (d: Date) => {
    return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatGCalDate(start)}/${formatGCalDate(end)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}
