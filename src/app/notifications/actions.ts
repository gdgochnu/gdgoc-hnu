'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { AppNotification, NotificationCenterSummary } from '@/types/notifications';
import { revalidatePath } from 'next/cache';

function computeNotificationActionUrl(
  type: string,
  relatedEntityType?: string | null,
  relatedEntityId?: string | null
): string {
  if (!relatedEntityId && !relatedEntityType) {
    if (type.startsWith('task')) return '/tasks';
    if (type.startsWith('event')) return '/events';
    if (type.startsWith('account')) return '/approvals';
    if (type.startsWith('onboarding')) return '/onboarding';
    return '/dashboard';
  }

  const entityType = (relatedEntityType || type).toLowerCase();

  if (entityType.includes('task')) {
    return `/tasks${relatedEntityId ? `?taskId=${relatedEntityId}` : ''}`;
  }
  if (entityType.includes('event')) {
    return `/events${relatedEntityId ? `/${relatedEntityId}` : ''}`;
  }
  if (entityType.includes('account') || entityType.includes('approval')) {
    return '/approvals';
  }
  if (entityType.includes('onboarding')) {
    return '/onboarding';
  }
  if (entityType.includes('badge') || entityType.includes('certificate')) {
    return '/profile';
  }
  if (entityType.includes('feedback')) {
    return `/events${relatedEntityId ? `/${relatedEntityId}#feedback` : ''}`;
  }
  if (entityType.includes('command')) {
    return '/command-center';
  }

  return '/dashboard';
}

export async function resolveNotificationActionUrl(
  type: string,
  relatedEntityType?: string | null,
  relatedEntityId?: string | null
): Promise<string> {
  return computeNotificationActionUrl(type, relatedEntityType, relatedEntityId);
}

export async function getNotifications(options?: {
  unreadOnly?: boolean;
  limit?: number;
  type?: string;
  bypassAuthForAdminTest?: boolean;
}): Promise<{
  success: boolean;
  summary: NotificationCenterSummary;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    let targetProfileId: string | null = null;

    if (options?.bypassAuthForAdminTest) {
      // For test endpoint, pick the first active profile or dummy
      const { data: firstProf } = await admin
        .from('profiles')
        .select('id')
        .limit(1)
        .maybeSingle();
      targetProfileId = firstProf?.id || '00000000-0000-0000-0000-000000000000';
    } else {
      const context = await getUserContext();
      if (!context.user || !context.profile) {
        return {
          success: false,
          summary: { unreadCount: 0, totalCount: 0, notifications: [] },
          error: 'Unauthorized',
        };
      }
      targetProfileId = context.user.id;
    }

    const limit = options?.limit || 40;

    let query = admin
      .from('notifications')
      .select('*')
      .eq('profile_id', targetProfileId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.unreadOnly) {
      query = query.eq('is_read', false);
    }
    if (options?.type && options.type !== 'all') {
      query = query.ilike('type', `%${options.type}%`);
    }

    const [notifsRes, unreadCountRes] = await Promise.all([
      query,
      admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', targetProfileId)
        .eq('is_read', false),
    ]);

    const rawNotifs = notifsRes.data || [];
    const unreadCount = unreadCountRes.count || 0;

    const notifications: AppNotification[] = rawNotifs.map((n) => ({
      id: n.id,
      profileId: n.profile_id,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedEntityType: n.related_entity_type,
      relatedEntityId: n.related_entity_id,
      isRead: n.is_read,
      createdAt: n.created_at,
      actionUrl: computeNotificationActionUrl(n.type, n.related_entity_type, n.related_entity_id),
    }));

    return {
      success: true,
      summary: {
        unreadCount,
        totalCount: notifications.length,
        notifications,
      },
    };
  } catch (err: any) {
    console.error('Error in getNotifications:', err);
    return {
      success: false,
      summary: { unreadCount: 0, totalCount: 0, notifications: [] },
      error: err.message || 'Failed to fetch notifications',
    };
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('profile_id', context.user.id);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Error in markNotificationAsRead:', err);
    return { success: false, error: err.message || 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', context.user.id)
      .eq('is_read', false);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Error in markAllNotificationsAsRead:', err);
    return { success: false, error: err.message || 'Failed to mark all as read' };
  }
}

export async function deleteNotification(notificationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const context = await getUserContext();
    if (!context.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('profile_id', context.user.id);

    if (error) throw error;

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Error in deleteNotification:', err);
    return { success: false, error: err.message || 'Failed to delete notification' };
  }
}

export async function createNotification(params: {
  profileId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}): Promise<{
  success: boolean;
  notification?: AppNotification;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('notifications')
      .insert({
        profile_id: params.profileId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_entity_type: params.relatedEntityType || null,
        related_entity_id: params.relatedEntityId || null,
        is_read: false,
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      notification: {
        id: data.id,
        profileId: data.profile_id,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.related_entity_type,
        relatedEntityId: data.related_entity_id,
        isRead: data.is_read,
        createdAt: data.created_at,
        actionUrl: computeNotificationActionUrl(data.type, data.related_entity_type, data.related_entity_id),
      },
    };
  } catch (err: any) {
    console.error('Error in createNotification:', err);
    return { success: false, error: err.message || 'Failed to create notification' };
  }
}
