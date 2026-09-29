'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  StudentNotification,
  StudentNotificationType,
} from '@/types/student';
import {
  X,
  BookOpen,
  Calendar,
  Award,
  Sparkles,
  FileText,
  Bell,
  Clock,
  ExternalLink,
  Trash2,
  Check,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface StudentNotificationDetailModalProps {
  notification: StudentNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (notification: StudentNotification) => void;
  onDelete?: (id: string) => void;
}

export function StudentNotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}: StudentNotificationDetailModalProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !notification || !mounted) return null;

  const getTypeMeta = (type: StudentNotificationType) => {
    switch (type) {
      case 'course':
        return {
          icon: BookOpen,
          color: '#3B82F6',
          bg: 'rgba(59, 130, 246, 0.15)',
          border: 'rgba(59, 130, 246, 0.35)',
          label: 'Course Track',
          accentGradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        };
      case 'workshop':
        return {
          icon: Calendar,
          color: '#A855F7',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.35)',
          label: 'Workshop',
          accentGradient: 'linear-gradient(135deg, #A855F7 0%, #7E22CE 100%)',
        };
      case 'certificate':
        return {
          icon: Award,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.35)',
          label: 'Certificate',
          accentGradient: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
        };
      case 'task':
        return {
          icon: FileText,
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.35)',
          label: 'Task / Assignment',
          accentGradient: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
        };
      case 'quiz':
        return {
          icon: Sparkles,
          color: '#EC4899',
          bg: 'rgba(236, 72, 153, 0.15)',
          border: 'rgba(236, 72, 153, 0.35)',
          label: 'Quiz',
          accentGradient: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
        };
      case 'session':
        return {
          icon: ShieldCheck,
          color: '#06B6D4',
          bg: 'rgba(6, 182, 212, 0.15)',
          border: 'rgba(6, 182, 212, 0.35)',
          label: 'Session / Lecture',
          accentGradient: 'linear-gradient(135deg, #06B6D4 0%, #0E7490 100%)',
        };
      case 'announcement':
        return {
          icon: Bell,
          color: '#F97316',
          bg: 'rgba(249, 115, 22, 0.15)',
          border: 'rgba(249, 115, 22, 0.35)',
          label: 'Announcement',
          accentGradient: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
        };
      default:
        return {
          icon: Bell,
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.35)',
          label: 'Academic Notice',
          accentGradient: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
        };
    }
  };

  const meta = getTypeMeta(notification.type);
  const IconComponent = meta.icon;

  const formatFullDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const handleNavigate = () => {
    if (notification.link_url) {
      if (onMarkAsRead && !notification.is_read) {
        onMarkAsRead(notification);
      }
      onClose();
      router.push(notification.link_url);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(notification.id);
      onClose();
    }
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '580px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          animation: 'scaleIn 0.2s ease-out',
        }}
      >
        {/* Top Google Colors Decorative Line */}
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Badge & Type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: meta.bg,
                border: `1px solid ${meta.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: meta.color,
                flexShrink: 0,
              }}
            >
              <IconComponent size={18} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: meta.color,
                  display: 'block',
                }}
              >
                {meta.label}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '1px',
                }}
              >
                <Clock size={11} />
                <span>{formatRelativeTime(notification.created_at)}</span>
              </span>
            </div>
          </div>

          {/* Right Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notification.is_read ? (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34D399',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Check size={12} />
                <span>Read</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  color: '#93C5FD',
                }}
              >
                Unread
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94A3B8',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxHeight: 'calc(80vh - 140px)',
            overflowY: 'auto',
          }}
        >
          {/* Title */}
          <div>
            <h2
              style={{
                fontSize: '1.22rem',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.45,
                margin: '0 0 0.4rem',
                wordBreak: 'break-word',
              }}
            >
              {notification.title}
            </h2>
            <div
              style={{
                fontSize: '0.76rem',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={13} color="#94A3B8" />
              <span>{formatFullDateTime(notification.created_at)}</span>
            </div>
          </div>

          {/* Full Message Box */}
          <div
            style={{
              padding: '1.15rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#E2E8F0',
              fontSize: '0.92rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          >
            {notification.message}
          </div>

          {/* Action Destination Link Card (if link_url is present) */}
          {notification.link_url && (
            <div
              style={{
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(30, 41, 59, 0.5) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#93C5FD' }}>
                <Info size={16} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  This notification includes an attached link:
                </span>
              </div>

              <button
                type="button"
                onClick={handleNavigate}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(66, 133, 244, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(66, 133, 244, 0.35)';
                }}
              >
                <span>View Details & Open Link</span>
                <ExternalLink size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '0.95rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(11, 15, 25, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Delete Option */}
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#F87171',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)')}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {onMarkAsRead && !notification.is_read && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#CBD5E1',
                  padding: '0.5rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <Check size={14} color="#60A5FA" />
                <span>Mark as read</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                padding: '0.5rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
