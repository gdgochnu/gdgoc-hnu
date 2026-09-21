'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  StudentNotification,
  StudentNotificationType,
} from '@/types/student';
import {
  getStudentNotifications,
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
  Clock,
  Loader2,
  FileText,
  HelpCircle,
  X,
} from 'lucide-react';

interface StudentNotificationCenterProps {
  initialUnreadCount?: number;
  studentId: string;
}

export function StudentNotificationCenter({
  initialUnreadCount = 0,
  studentId,
}: StudentNotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'course' | 'workshop' | 'certificate'>('all');
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch notifications on initial load to get accurate count, and whenever opened
  // NOTE: We intentionally do NOT sync initialUnreadCount via useEffect, as that
  // would re-trigger state updates on every parent re-render, contributing to render loops.
  const loadNotifications = () => {
    setIsLoading(true);
    getStudentNotifications({ limit: 30 })
      .then((res) => {
        if (res.success) {
          setNotifications(res.summary.notifications);
          setUnreadCount(res.summary.unreadCount);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close when clicking outside (mouse or touch)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single as read
  const handleMarkAsRead = (notification: StudentNotification, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (notification.is_read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      await markStudentNotificationAsRead(notification.id);
    });
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(async () => {
      await markAllStudentNotificationsAsRead();
    });
  };

  // Delete notification
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const target = notifications.find((n) => n.id === id);
    if (target && !target.is_read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    startTransition(async () => {
      await deleteStudentNotification(id);
    });
  };

  // Click on notification to navigate
  const handleNotificationClick = (notification: StudentNotification) => {
    handleMarkAsRead(notification);
    setIsOpen(false);
    if (notification.link_url) {
      router.push(notification.link_url);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'course') return n.type === 'course';
    if (activeFilter === 'workshop') return n.type === 'workshop';
    if (activeFilter === 'certificate') return n.type === 'certificate';
    return true;
  });

  // Helper for notification type icon & colors
  const getTypeMeta = (type: StudentNotificationType) => {
    switch (type) {
      case 'course':
        return {
          icon: BookOpen,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.3)',
          label: 'Course',
        };
      case 'workshop':
        return {
          icon: Calendar,
          color: '#A855F7',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.3)',
          label: 'Workshop',
        };
      case 'certificate':
        return {
          icon: Award,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'Certificate',
        };
      case 'task':
        return {
          icon: FileText,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'Task',
        };
      case 'quiz':
        return {
          icon: Sparkles,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.15)',
          border: 'rgba(236, 72, 153, 0.3)',
          label: 'Quiz',
        };
      default:
        return {
          icon: Bell,
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.3)',
          label: 'Update',
        };
    }
  };

  // Helper for relative time
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Topbar Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: isOpen ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.05)',
          border: isOpen ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
          color: isOpen ? '#60A5FA' : '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Student Notifications"
        aria-label="Open student notifications"
      >
        <Bell size={18} />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0B0F19',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.6)',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div
          className="student-notifications-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '380px',
            maxWidth: 'calc(100vw - 2rem)',
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header Strip */}
          <div
            style={{
              height: '3px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }}
          />

          <div
            style={{
              padding: '1rem 1.15rem 0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} color="#60A5FA" />
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    background: 'rgba(66, 133, 244, 0.2)',
                    color: '#93C5FD',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '6px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#60A5FA')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                >
                  <CheckCheck size={14} />
                  <span>Mark all</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                aria-label="Close notifications"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 1.15rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              overflowX: 'auto',
              scrollbarWidth: 'none',
            }}
          >
            {(
              [
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
                { key: 'course', label: 'Courses' },
                { key: 'workshop', label: 'Workshops' },
                { key: 'certificate', label: 'Certs' },
              ] as const
            ).map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: 'none',
                    background: active ? '#4285F4' : 'rgba(255, 255, 255, 0.05)',
                    color: active ? '#FFFFFF' : '#94A3B8',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Notifications List Body */}
          <div
            style={{
              maxHeight: 'min(360px, calc(75vh - 160px))',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {isLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '2.5rem 1rem',
                  color: '#94A3B8',
                  fontSize: '0.84rem',
                }}
              >
                <Loader2 size={18} className="animate-spin" color="#60A5FA" />
                <span>Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  gap: '0.6rem',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                  }}
                >
                  <Inbox size={20} />
                </div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#E2E8F0' }}>
                  {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                </span>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B', maxWidth: '240px' }}>
                  {activeFilter === 'unread'
                    ? 'You have read all your notifications.'
                    : 'Course announcements, workshop passes, and certificates will appear here.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const meta = getTypeMeta(notif.type);
                const IconComponent = meta.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '0.85rem 1.15rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: notif.is_read ? 'transparent' : 'rgba(66, 133, 244, 0.06)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      cursor: notif.link_url ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = notif.is_read
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(66, 133, 244, 0.1)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = notif.is_read
                        ? 'transparent'
                        : 'rgba(66, 133, 244, 0.06)')
                    }
                  >
                    {/* Unread indicator dot */}
                    {!notif.is_read && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '6px',
                          top: '18px',
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#4285F4',
                        }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
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
                      <IconComponent size={16} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: notif.is_read ? 600 : 700,
                            color: notif.is_read ? '#E2E8F0' : '#FFFFFF',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {notif.title}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {formatTimeAgo(notif.created_at)}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.75rem',
                          color: '#94A3B8',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notif.message}
                      </p>
                    </div>

                    {/* Quick action buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        opacity: 0.8,
                        flexShrink: 0,
                      }}
                    >
                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748B',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                          }}
                          title="Mark as read"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(notif.id, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All */}
          <div
            style={{
              padding: '0.65rem 1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(11, 15, 25, 0.6)',
              textAlign: 'center',
            }}
          >
            <Link
              href="/student/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#60A5FA',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View all notifications</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
