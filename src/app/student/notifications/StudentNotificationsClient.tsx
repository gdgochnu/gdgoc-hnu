'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  StudentNotification,
  StudentNotificationCenterSummary,
  StudentNotificationType,
} from '@/types/student';
import {
  markStudentNotificationAsRead,
  markAllStudentNotificationsAsRead,
  deleteStudentNotification,
} from '@/app/student/notifications/actions';
import {
  Bell,
  Check,
  CheckCheck,
  BookOpen,
  Calendar,
  Award,
  Sparkles,
  ExternalLink,
  Trash2,
  Inbox,
  Search,
  Filter,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface StudentNotificationsClientProps {
  initialSummary: StudentNotificationCenterSummary;
}

export function StudentNotificationsClient({
  initialSummary,
}: StudentNotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StudentNotification[]>(
    initialSummary.notifications
  );
  const [unreadCount, setUnreadCount] = useState<number>(initialSummary.unreadCount);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'course' | 'workshop' | 'certificate'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  // Helper for notification type icon & colors
  const getTypeMeta = (type: StudentNotificationType) => {
    switch (type) {
      case 'course':
        return {
          icon: BookOpen,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.12)',
          border: 'rgba(59, 130, 246, 0.3)',
          label: 'Course Track',
        };
      case 'workshop':
        return {
          icon: Calendar,
          color: '#A855F7',
          bg: 'rgba(168, 85, 247, 0.12)',
          border: 'rgba(168, 85, 247, 0.3)',
          label: 'Workshop & Bootcamp',
        };
      case 'certificate':
        return {
          icon: Award,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'Certificate Issued',
        };
      case 'task':
        return {
          icon: FileText,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'Assignment Feedback',
        };
      case 'quiz':
        return {
          icon: Sparkles,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.12)',
          border: 'rgba(236, 72, 153, 0.3)',
          label: 'Quiz Assessment',
        };
      default:
        return {
          icon: Bell,
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.12)',
          border: 'rgba(56, 189, 248, 0.3)',
          label: 'Chapter Notice',
        };
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      await markStudentNotificationAsRead(id);
    });
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllStudentNotificationsAsRead();
    });
  };

  const handleDelete = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      await deleteStudentNotification(id);
    });
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread' && n.is_read) return false;
    if (activeTab === 'course' && n.type !== 'course') return false;
    if (activeTab === 'workshop' && n.type !== 'workshop') return false;
    if (activeTab === 'certificate' && n.type !== 'certificate') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchMsg = n.message.toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }

    return true;
  });

  const formatFullDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%', maxWidth: '1050px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        className="glass-panel"
        style={{
          borderRadius: '20px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(66, 133, 244, 0.25)',
          padding: '2rem 2.25rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.6)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60A5FA',
                }}
              >
                <Bell size={20} />
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
                Notifications Center
              </h1>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                  }}
                >
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94A3B8' }}>
              Stay updated on course schedules, workshop registrations, task feedback, and certificate issuances.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#E2E8F0',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(66, 133, 244, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(66, 133, 244, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
            >
              <CheckCheck size={16} color="#60A5FA" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
          {([
            { key: 'all', label: 'All Notifications', count: notifications.length },
            { key: 'unread', label: 'Unread', count: unreadCount },
            { key: 'course', label: 'Courses', count: notifications.filter((n) => n.type === 'course').length },
            { key: 'workshop', label: 'Workshops', count: notifications.filter((n) => n.type === 'workshop').length },
            { key: 'certificate', label: 'Certificates', count: notifications.filter((n) => n.type === 'certificate').length },
          ] as Array<{ key: 'all' | 'unread' | 'course' | 'workshop' | 'certificate'; label: string; count: number }>).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '0.55rem 1.05rem',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  border: active ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: active
                    ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.25) 0%, rgba(30, 41, 59, 0.8) 100%)'
                    : 'rgba(255, 255, 255, 0.03)',
                  color: active ? '#60A5FA' : '#94A3B8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    style={{
                      padding: '0.1rem 0.45rem',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: active ? '#4285F4' : 'rgba(255, 255, 255, 0.08)',
                      color: '#FFFFFF',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search
            size={16}
            color="#94A3B8"
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filteredNotifications.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.85rem',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
              }}
            >
              <Inbox size={26} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
              {activeTab === 'unread' ? 'All caught up!' : 'No notifications found'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', maxWidth: '360px' }}>
              {searchQuery
                ? 'No notifications match your search query.'
                : activeTab === 'unread'
                ? 'You have read all your notifications.'
                : 'All your academic alerts and program announcements will be safely stored here.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const meta = getTypeMeta(notif.type);
            const IconComponent = meta.icon;

            return (
              <div
                key={notif.id}
                className="glass-panel"
                style={{
                  borderRadius: '14px',
                  padding: '1.15rem 1.35rem',
                  background: notif.is_read ? 'rgba(15, 23, 42, 0.5)' : 'rgba(30, 41, 59, 0.8)',
                  border: notif.is_read
                    ? '1px solid rgba(255, 255, 255, 0.06)'
                    : '1px solid rgba(66, 133, 244, 0.4)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  boxShadow: notif.is_read ? 'none' : '0 8px 24px -6px rgba(66, 133, 244, 0.15)',
                }}
              >
                {/* Left Side Content */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color,
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <IconComponent size={20} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          background: meta.bg,
                          color: meta.color,
                        }}
                      >
                        {meta.label}
                      </span>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.96rem',
                          fontWeight: notif.is_read ? 700 : 800,
                          color: '#FFFFFF',
                        }}
                      >
                        {notif.title}
                      </h4>
                      {!notif.is_read && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#4285F4',
                            boxShadow: '0 0 8px #4285F4',
                          }}
                        />
                      )}
                    </div>

                    <p
                      style={{
                        margin: '0 0 0.65rem',
                        fontSize: '0.86rem',
                        color: '#CBD5E1',
                        lineHeight: 1.5,
                      }}
                    >
                      {notif.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748B' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        {formatFullDate(notif.created_at)}
                      </span>

                      {notif.link_url && (
                        <Link
                          href={notif.link_url}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                          }}
                          style={{
                            color: '#60A5FA',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span>Open details</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                  {!notif.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkAsRead(notif.id)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '0.45rem',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(notif.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '0.45rem',
                      color: '#F87171',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
