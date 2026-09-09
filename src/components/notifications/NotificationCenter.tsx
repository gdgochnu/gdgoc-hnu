'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNotification, NotificationType } from '@/types/notifications';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/notifications/actions';
import {
  Bell,
  Check,
  CheckCheck,
  CheckSquare,
  Calendar,
  UserCheck,
  Award,
  AlertTriangle,
  Info,
  Sparkles,
  ExternalLink,
  Trash2,
  X,
  Inbox,
  Clock,
  Layers,
} from 'lucide-react';

interface NotificationCenterProps {
  initialUnreadCount: number;
  profileId: string;
}

export function NotificationCenter({ initialUnreadCount, profileId }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'task' | 'event' | 'system'>('all');
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keep unread count in sync if initial prop changes
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getNotifications({ limit: 30 })
        .then((res) => {
          if (res.success) {
            setNotifications(res.summary.notifications);
            setUnreadCount(res.summary.unreadCount);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single as read
  const handleMarkAsRead = (notification: AppNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (notification.isRead) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      await markNotificationAsRead(notification.id);
    });
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  // Delete notification
  const handleDelete = (id: string, isRead: boolean, e: React.MouseEvent) => {
    e.stopPropagation();

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!isRead) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    startTransition(async () => {
      await deleteNotification(id);
    });
  };

  // Navigate on click
  const handleItemClick = (notification: AppNotification) => {
    handleMarkAsRead(notification);
    setIsOpen(false);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'task') return n.type.toLowerCase().includes('task');
    if (activeFilter === 'event') return n.type.toLowerCase().includes('event');
    if (activeFilter === 'system') {
      return (
        n.type.toLowerCase().includes('account') ||
        n.type.toLowerCase().includes('budget') ||
        n.type.toLowerCase().includes('system') ||
        n.type.toLowerCase().includes('onboarding')
      );
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('task')) {
      return <CheckSquare size={16} color="#34A853" />;
    }
    if (t.includes('event')) {
      return <Calendar size={16} color="#A855F7" />;
    }
    if (t.includes('account') || t.includes('approval')) {
      return <UserCheck size={16} color="#4285F4" />;
    }
    if (t.includes('badge') || t.includes('certificate')) {
      return <Award size={16} color="#FBBC04" />;
    }
    if (t.includes('budget') || t.includes('alert') || t.includes('warn')) {
      return <AlertTriangle size={16} color="#EA4335" />;
    }
    return <Info size={16} color="#93C5FD" />;
  };

  const formatRelativeTime = (timestamp: string) => {
    const diffMs = new Date().getTime() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      ref={dropdownRef}
      id="in-app-notification-center"
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* 1. The Bell Trigger Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: isOpen ? 'rgba(66, 133, 244, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '0.5rem',
          color: isOpen ? '#FFFFFF' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          position: 'relative',
        }}
        title="Notifications"
      >
        <Bell size={18} color={isOpen ? 'var(--google-blue)' : 'currentColor'} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span
            id="notification-unread-badge"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              background: '#EA4335',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0B0F19',
              boxShadow: '0 0 10px rgba(234, 67, 53, 0.5)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Floating Dropdown Popover */}
      {isOpen && (
        <div
          id="notifications-popover-panel"
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            right: 0,
            width: '400px',
            maxWidth: '92vw',
            maxHeight: '560px',
            borderRadius: '18px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(25px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.1rem 1.25rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(234, 67, 53, 0.15)',
                    color: '#EA4335',
                    border: '1px solid rgba(234, 67, 53, 0.35)',
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>

            {/* Mark all as read button */}
            {unreadCount > 0 && (
              <button
                type="button"
                id="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
                disabled={isPending}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--google-blue)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '6px',
                  transition: 'opacity 0.2s',
                }}
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills Bar */}
          <div
            style={{
              padding: '0.6rem 1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              overflowX: 'auto',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'unread', label: `Unread (${unreadCount})` },
                { key: 'task', label: 'Tasks' },
                { key: 'event', label: 'Events' },
                { key: 'system', label: 'System' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: activeFilter === tab.key ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.05)',
                  color: activeFilter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications Body List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Loading updates…
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1.5rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Inbox size={32} style={{ opacity: 0.4 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
                  {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {activeFilter === 'unread'
                    ? 'You have no unread notifications.'
                    : 'Activity and alerts will appear here.'}
                </span>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    padding: '0.9rem 1.15rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: item.isRead ? 'transparent' : 'rgba(66, 133, 244, 0.06)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.isRead
                      ? 'rgba(255, 255, 255, 0.04)'
                      : 'rgba(66, 133, 244, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = item.isRead
                      ? 'transparent'
                      : 'rgba(66, 133, 244, 0.06)';
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '0.15rem',
                    }}
                  >
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: item.isRead ? 600 : 800,
                          color: item.isRead ? '#E2E8F0' : '#FFFFFF',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-secondary)',
                        margin: 0,
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {item.message}
                    </p>
                  </div>

                  {/* Action buttons (Delete & Mark Read) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item, e)}
                        title="Mark as read"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--google-blue)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: '4px',
                        }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, item.isRead, e)}
                      title="Delete notification"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Unread Dot */}
                  {!item.isRead && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: 'var(--google-blue)',
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.76rem',
                color: 'var(--google-blue)',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <span>Open Notification History</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
