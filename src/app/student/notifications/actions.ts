'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  StudentNotification,
  StudentNotificationCenterSummary,
  StudentNotificationType,
} from '@/types/student';
import { revalidatePath } from 'next/cache';

export interface GetStudentNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

/**
 * 1. Fetch in-app notifications for the logged in student
 */
export async function getStudentNotifications(
  options?: GetStudentNotificationsOptions
): Promise<{
  success: boolean;
  summary: StudentNotificationCenterSummary;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return {
        success: false,
        summary: { unreadCount: 0, totalCount: 0, notifications: [] },
        error: 'Unauthorized',
      };
    }

    const admin = createAdminClient();
    const studentId = context.user.id;
    const limit = options?.limit || 30;

    let query = admin
      .from('student_notifications')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }
    if (options?.type && options.type !== 'all') {
      query = query.eq('type', options.type);
    }

    const [notifsRes, unreadCountRes] = await Promise.all([
      query,
      admin
        .from('student_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('is_read', false),
    ]);

    if (notifsRes.error) {
      // Table may not exist yet or connection error
      console.warn('[getStudentNotifications] query warning:', notifsRes.error.message);
      return {
        success: true,
        summary: { unreadCount: 0, totalCount: 0, notifications: [] },
      };
    }

    const notifications: StudentNotification[] = (notifsRes.data || []).map((n: any) => ({
      id: n.id,
      student_id: n.student_id,
      type: n.type as StudentNotificationType,
      title: n.title,
      message: n.message,
      link_url: n.link_url || null,
      related_entity_type: n.related_entity_type || null,
      related_entity_id: n.related_entity_id || null,
      is_read: Boolean(n.is_read),
      created_at: n.created_at,
    }));

    const unreadCount = unreadCountRes.count || 0;

    return {
      success: true,
      summary: {
        unreadCount,
        totalCount: notifications.length,
        notifications,
      },
    };
  } catch (err: any) {
    console.error('[getStudentNotifications] exception:', err);
    return {
      success: true,
      summary: { unreadCount: 0, totalCount: 0, notifications: [] },
      error: err.message,
    };
  }
}

/**
 * 2. Mark a single student notification as read
 */
export async function markStudentNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user) return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('student_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('student_id', context.user.id);

    if (error) {
      console.error('[markStudentNotificationAsRead] error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/student');
    return { success: true };
  } catch (err: any) {
    console.error('[markStudentNotificationAsRead] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Mark all notifications as read for current student
 */
export async function markAllStudentNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('student_notifications')
      .update({ is_read: true })
      .eq('student_id', context.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('[markAllStudentNotificationsAsRead] error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/student');
    return { success: true };
  } catch (err: any) {
    console.error('[markAllStudentNotificationsAsRead] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Delete a student notification
 */
export async function deleteStudentNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user) return { success: false, error: 'Unauthorized' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('student_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('student_id', context.user.id);

    if (error) {
      console.error('[deleteStudentNotification] error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/student');
    return { success: true };
  } catch (err: any) {
    console.error('[deleteStudentNotification] exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Dispatch a student notification safely
 */
export async function dispatchStudentNotification(payload: {
  studentId: string;
  type: StudentNotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}): Promise<boolean> {
  try {
    if (!payload.studentId || !payload.title || !payload.message) return false;

    const admin = createAdminClient();
    const { error } = await admin.from('student_notifications').insert({
      student_id: payload.studentId,
      type: payload.type || 'general',
      title: payload.title.slice(0, 200),
      message: payload.message.slice(0, 2000),
      link_url: payload.linkUrl || null,
      related_entity_type: payload.relatedEntityType || null,
      related_entity_id: payload.relatedEntityId || null,
      is_read: false,
    });

    if (error) {
      console.warn('[dispatchStudentNotification] insert warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[dispatchStudentNotification] unexpected error:', err);
    return false;
  }
}
