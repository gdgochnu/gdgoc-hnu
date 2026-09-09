'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppNotification, NotificationCenterSummary } from '@/types/notifications';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from './actions';
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
  Search,
  ExternalLink,
  Trash2,
  Inbox,
  Filter,
} from 'lucide-react';

interface NotificationsClientProps {
  initialSummary: NotificationCenterSummary;
}

export function NotificationsClient({ initialSummary }: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialSummary.notifications);
  const [unreadCount, setUnreadCount] = useState(initialSummary.unreadCount);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'task' | 'event' | 'system'>('all');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleMarkAsRead = (id: string, isAlreadyRead: boolean) => {
    if (isAlreadyRead) return;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      await markNotificationAsRead(id);
    });
  };

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsAsRead();
    });
  };

  const handleDelete = (id: string, isRead: boolean) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (!isRead) setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      await deleteNotification(id);
    });
  };

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread' && n.isRead) return false;
    if (activeFilter === 'task' && !n.type.toLowerCase().includes('task')) return false;
    if (activeFilter === 'event' && !n.type.toLowerCase().includes('event')) return false;
    if (activeFilter === 'system') {
      const isSystem =
        n.type.toLowerCase().includes('account') ||
        n.type.toLowerCase().includes('budget') ||
        n.type.toLowerCase().includes('system') ||
        n.type.toLowerCase().includes('onboarding');
      if (!isSystem) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }
    return true;
  });

  const getNotificationIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('task')) return <CheckSquare size={16} color="#34A853" />;
    if (t.includes('event')) return <Calendar size={16} color="#A855F7" />;
    if (t.includes('account') || t.includes('approval')) return <UserCheck size={16} color="#4285F4" />;
    if (t.includes('badge') || t.includes('certificate')) return <Award size={16} color="#FBBC04" />;
    if (t.includes('budget') || t.includes('alert')) return <AlertTriangle size={16} color="#EA4335" />;
    return <Info size={16} color="#93C5FD" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Controls Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search notifications…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Pills & Mark All Read */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: activeFilter === tab.key ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeFilter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: 'rgba(52, 168, 83, 0.15)',
                border: '1px solid rgba(52, 168, 83, 0.35)',
                color: '#86EFAC',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckCheck size={14} />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {filtered.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              padding: '3.5rem 1.5rem',
              borderRadius: '16px',
              textAlign: 'center',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Inbox size={40} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF' }}>
              No notifications found
            </span>
            <span style={{ fontSize: '0.8rem' }}>
              {searchQuery ? 'Try adjusting your search query or filter.' : 'All caught up! Activity will appear here.'}
            </span>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                background: item.isRead ? 'rgba(15, 23, 42, 0.6)' : 'rgba(66, 133, 244, 0.08)',
                border: item.isRead ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1 }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getNotificationIcon(item.type)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: item.isRead ? 700 : 900, color: '#FFFFFF' }}>
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          background: 'rgba(66, 133, 244, 0.2)',
                          color: '#93C5FD',
                          border: '1px solid rgba(66, 133, 244, 0.4)',
                        }}
                      >
                        New
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    onClick={() => handleMarkAsRead(item.id, item.isRead)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span>View</span>
                    <ExternalLink size={12} />
                  </Link>
                )}

                {!item.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(item.id, item.isRead)}
                    title="Mark as read"
                    style={{
                      padding: '0.35rem 0.5rem',
                      borderRadius: '8px',
                      background: 'rgba(52, 168, 83, 0.12)',
                      border: '1px solid rgba(52, 168, 83, 0.25)',
                      color: '#86EFAC',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(item.id, item.isRead)}
                  title="Delete notification"
                  style={{
                    padding: '0.35rem 0.5rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
