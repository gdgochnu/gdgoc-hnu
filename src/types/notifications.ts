export type NotificationType =
  | 'account_approval'
  | 'task_assigned'
  | 'task_review'
  | 'task_completed'
  | 'task_delegated'
  | 'task_broadcast'
  | 'event_submitted'
  | 'event_approved'
  | 'event_checkin'
  | 'onboarding_checklist'
  | 'feedback_survey'
  | 'budget_alert'
  | 'badge_awarded'
  | 'alumni_archived'
  | 'system'
  | 'general';

export interface AppNotification {
  id: string;
  profileId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  createdAt: string;
  actionUrl: string;
}

export interface NotificationCenterSummary {
  unreadCount: number;
  totalCount: number;
  notifications: AppNotification[];
}
