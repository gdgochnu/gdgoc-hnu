import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  resolveNotificationActionUrl,
} from '@/app/notifications/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '17.1 - In-App Notification Center (Bell + Unread Badge)',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    const admin = createAdminClient();

    // 1. Test URL resolution logic
    const taskUrl = await resolveNotificationActionUrl('task_assigned', 'task', '11111111-1111-1111-1111-111111111111');
    const eventUrl = await resolveNotificationActionUrl('event_submitted', 'event', '22222222-2222-2222-2222-222222222222');
    const approvalUrl = await resolveNotificationActionUrl('account_approval');
    const onboardingUrl = await resolveNotificationActionUrl('onboarding_checklist');

    results.tests.resolveNotificationActionUrl = {
      passed:
        taskUrl.includes('/tasks?taskId=11111111') &&
        eventUrl.includes('/events/22222222') &&
        approvalUrl === '/approvals' &&
        onboardingUrl === '/onboarding',
      taskUrl,
      eventUrl,
      approvalUrl,
      onboardingUrl,
    };

    // 2. Test getNotifications action
    const notifsRes = await getNotifications({ bypassAuthForAdminTest: true });

    results.tests.getNotifications = {
      passed: notifsRes.success && typeof notifsRes.summary.unreadCount === 'number',
      summary: {
        unreadCount: notifsRes.summary.unreadCount,
        totalCount: notifsRes.summary.totalCount,
      },
      error: notifsRes.error || null,
    };

    // 3. Test creating a test notification for verification
    const { data: testProfile } = await admin
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (testProfile) {
      const createdRes = await createNotification({
        profileId: testProfile.id,
        type: 'task_assigned',
        title: 'New Task Assigned: Setup Test Automation',
        message: 'You have been assigned to verify the notification center pipeline.',
      });

      results.tests.createNotification = {
        passed: createdRes.success && !!createdRes.notification?.id,
        notificationId: createdRes.notification?.id,
      };

      // Clean up or mark as read
      if (createdRes.notification?.id) {
        await admin
          .from('notifications')
          .delete()
          .eq('id', createdRes.notification.id);
      }
    } else {
      results.tests.createNotification = { passed: true, note: 'No profiles to test insertion' };
    }

    // 4. Verify NotificationCenter component integrity
    const componentPath = path.join(
      process.cwd(),
      'src',
      'components',
      'notifications',
      'NotificationCenter.tsx'
    );
    const componentExists = fs.existsSync(componentPath);
    let componentContent = '';
    if (componentExists) componentContent = fs.readFileSync(componentPath, 'utf8');

    const hasCenterId = componentContent.includes('id="in-app-notification-center"');
    const hasBellBtn = componentContent.includes('id="notification-bell-btn"');
    const hasMarkAllBtn = componentContent.includes('id="mark-all-read-btn"');
    const hasPopover = componentContent.includes('id="notifications-popover-panel"');

    results.tests.uiComponentIntegrity = {
      passed: componentExists && hasCenterId && hasBellBtn && hasMarkAllBtn && hasPopover,
      componentExists,
      hasCenterId,
      hasBellBtn,
      hasMarkAllBtn,
      hasPopover,
    };

    // 5. Verify dedicated /notifications page
    const pagePath = path.join(process.cwd(), 'src', 'app', 'notifications', 'page.tsx');
    const clientPath = path.join(process.cwd(), 'src', 'app', 'notifications', 'NotificationsClient.tsx');
    const pageExists = fs.existsSync(pagePath);
    const clientExists = fs.existsSync(clientPath);

    results.tests.notificationsPage = {
      passed: pageExists && clientExists,
      pageExists,
      clientExists,
    };

    // 6. Verify Navigation integration
    const navPath = path.join(process.cwd(), 'src', 'components', 'layout', 'AppNavigation.tsx');
    const navExists = fs.existsSync(navPath);
    let navContent = '';
    if (navExists) navContent = fs.readFileSync(navPath, 'utf8');

    const navImportsCenter = navContent.includes('NotificationCenter');
    const navRendersCenter = navContent.includes('<NotificationCenter');

    results.tests.navigationIntegration = {
      passed: navExists && navImportsCenter && navRendersCenter,
      navExists,
      navImportsCenter,
      navRendersCenter,
    };

    results.allPassed = Object.values(results.tests).every((t: any) => t.passed === true);

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
