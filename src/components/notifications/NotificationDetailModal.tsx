'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppNotification } from '@/types/notifications';
import {
  X,
  Calendar,
  CheckSquare,
  UserCheck,
  Award,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Trash2,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead?: (id: string, isAlreadyRead: boolean) => void;
  onDelete?: (id: string, isRead: boolean) => void;
}

export function NotificationDetailModal({
  notification,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
}: NotificationDetailModalProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !notification) return null;

  const getMeta = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('task')) {
      return {
        icon: CheckSquare,
        color: '#34A853',
        bg: 'rgba(52, 168, 83, 0.15)',
        border: 'rgba(52, 168, 83, 0.35)',
        label: 'Task & Assignment',
      };
    }
    if (t.includes('event') || t.includes('meeting')) {
      return {
        icon: Calendar,
        color: '#A855F7',
        bg: 'rgba(168, 85, 247, 0.15)',
        border: 'rgba(168, 85, 247, 0.35)',
        label: 'Event & Meeting',
      };
    }
    if (t.includes('account') || t.includes('approval') || t.includes('member')) {
      return {
        icon: UserCheck,
        color: '#4285F4',
        bg: 'rgba(66, 133, 244, 0.15)',
        border: 'rgba(66, 133, 244, 0.35)',
        label: 'Member & Approval',
      };
    }
    if (t.includes('badge') || t.includes('certificate')) {
      return {
        icon: Award,
        color: '#FBBC04',
        bg: 'rgba(251, 188, 4, 0.15)',
        border: 'rgba(251, 188, 4, 0.35)',
        label: 'Recognition & Badge',
      };
    }
    if (t.includes('budget') || t.includes('alert')) {
      return {
        icon: AlertTriangle,
        color: '#EA4335',
        bg: 'rgba(234, 67, 53, 0.15)',
        border: 'rgba(234, 67, 53, 0.35)',
        label: 'Alert & Budget',
      };
    }
    return {
      icon: Info,
      color: '#38BDF8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.35)',
      label: 'System Notification',
    };
  };

  const meta = getMeta(notification.type);
  const IconComponent = meta.icon;

  const handleNavigate = () => {
    if (notification.actionUrl) {
      if (onMarkAsRead && !notification.isRead) {
        onMarkAsRead(notification.id, notification.isRead);
      }
      onClose();
      router.push(notification.actionUrl);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(notification.id, notification.isRead);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(180deg, #131B2E 0%, #0F172A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Header */}
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
              }}
            >
              <IconComponent size={18} />
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: meta.color, display: 'block' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={11} />
                <span>{new Date(notification.createdAt).toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {notification.isRead ? (
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
                New
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
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
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
          <h2 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.45, margin: 0 }}>
            {notification.title}
          </h2>

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
            }}
          >
            {notification.message}
          </div>

          {notification.actionUrl && (
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
                  Attached target page / destination:
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
                }}
              >
                <span>Navigate to Attached Destination</span>
                <ExternalLink size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '0.95rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(11, 15, 25, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
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
              }}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            {onMarkAsRead && !notification.isRead && (
              <button
                type="button"
                onClick={() => onMarkAsRead(notification.id, notification.isRead)}
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
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
