'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  QrCode,
  BookOpen,
  Calendar,
  Globe,
  ShieldCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Award,
  Bell,
  Users,
} from 'lucide-react';
import { StudentProfile } from '@/types/student';
import { createClient } from '@/lib/supabase/client';
import { signOutAction } from '@/app/auth/actions';
import { StudentNotificationCenter } from './notifications/StudentNotificationCenter';
import { ToastProvider } from './StudentToast';
import { BackToTopButton } from './BackToTopButton';
import { SocialFollowGateModal } from './SocialFollowGateModal';
import { checkStudentSocialFollowStatus, SocialFollowStatus } from '@/app/student/social-gate/actions';
import { MANDATORY_SOCIAL_CHANNELS } from '@/config/social-gate';

function renderSidebarSocialIcon(type: string, size = 16) {
  switch (type) {
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#E4405F">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.16 1.18 2.09 2.35 2.28.64.11 1.3.04 1.9-.19 1.07-.42 1.8-1.44 1.88-2.58.05-3.67.02-7.34.02-11.01z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );
    default:
      return null;
  }
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

interface StudentAppShellProps {
  student: StudentProfile;
  teamRole?: string | null;
  children: React.ReactNode;
}

export function StudentAppShell({ student, teamRole, children }: StudentAppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [socialFollowStatus, setSocialFollowStatus] = useState<SocialFollowStatus | null>(null);
  const sidebarNavRef = useRef<HTMLDivElement | null>(null);

  // Check mandatory social follow gate status in Supabase
  useEffect(() => {
    let isMounted = true;
    checkStudentSocialFollowStatus().then((status) => {
      if (isMounted) setSocialFollowStatus(status);
    }).catch(() => null);
    return () => { isMounted = false; };
  }, [student.id]);

  // Hydrate collapsed state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem('student_sidebar_collapsed', String(collapsed));
    } catch {}
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      await signOutAction().catch(() => null);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      window.location.href = '/';
    }
  };

  // Build navigation groups
  const navigationGroups: NavGroup[] = [
    {
      groupTitle: 'Student Workspace',
      items: [
        {
          label: 'Dashboard',
          href: '/student/dashboard',
          icon: LayoutGrid,
        },
        {
          label: 'My Profile',
          href: '/student/profile',
          icon: User,
        },
        {
          label: 'My Attendance Pass',
          href: '/student/my-qr',
          icon: QrCode,
          badge: 'ID Pass',
          badgeColor: 'var(--google-blue)',
        },
        {
          label: 'Notifications',
          href: '/student/notifications',
          icon: Bell,
        },
      ],
    },
    {
      groupTitle: 'Curriculum & Programs',
      items: [
        {
          label: 'Tracks & Courses',
          href: '/student/courses',
          icon: BookOpen,
        },
        {
          label: 'Workshops & Bootcamps',
          href: '/student/workshops',
          icon: Calendar,
        },
        {
          label: 'My Certificates',
          href: '/student/certificates',
          icon: Award,
        },
      ],
    },
  ];

  const currentPageTitle =
    pathname === '/student/profile'
      ? 'My Profile & Accreditation'
      : pathname === '/student/my-qr'
      ? 'My Attendance Pass'
      : pathname === '/student/certificates'
      ? 'My Certificates'
      : pathname === '/student/notifications'
      ? 'Notification Center'
      : pathname.startsWith('/student/courses')
      ? 'Tracks & Courses'
      : pathname.startsWith('/student/workshops')
      ? 'Workshops & Bootcamps'
      : 'Dashboard';

  return (
    <ToastProvider>
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #070B14)' }}>
      {/* ========================================================================= */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: isCollapsed ? '78px' : '270px',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(11, 15, 25, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
        className="student-sidebar"
      >
        {/* Top Google 4-Color Accent Strip */}
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Sidebar Brand Header */}
        <div
          style={{
            padding: isCollapsed ? '1rem 0' : '1.15rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: isCollapsed ? 0 : '0.5rem',
          }}
        >
          <Link
            href="/student/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              textDecoration: 'none',
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: '36px',
                height: '34px',
                borderRadius: '9px',
                background: 'radial-gradient(circle at 30% 30%, rgba(66, 133, 244, 0.25), rgba(15, 20, 32, 0.9))',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 5px',
                flexShrink: 0,
              }}
            >
              <img
                src="/icons/icon.svg"
                alt="GDGoC Logo"
                style={{ width: '100%', height: 'auto', maxHeight: '19px', objectFit: 'contain' }}
              />
            </div>

            {!isCollapsed && (
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '0.92rem', color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                  <span>GDGoC</span>
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #4285F4, #34A853)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    HNU
                  </span>
                  <span
                    style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      background: 'rgba(66, 133, 244, 0.18)',
                      color: '#93C5FD',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  >
                    STUDENT
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #94A3B8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853', boxShadow: '0 0 6px #34A853', flexShrink: 0 }} />
                  <span>Learning Portal</span>
                </div>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => toggleCollapse(true)}
              style={{
                width: '28px',
                height: '28px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              type="button"
              onClick={() => toggleCollapse(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--text-muted, #94A3B8)',
                padding: '0.35rem',
                cursor: 'pointer',
              }}
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Sidebar Navigation Items List */}
        <div
          ref={sidebarNavRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed ? '1rem 0.5rem' : '1rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {navigationGroups.map((group, gIdx) => (
            <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {!isCollapsed && group.groupTitle && (
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted, #64748B)',
                    padding: '0 0.65rem 0.35rem',
                  }}
                >
                  {group.groupTitle}
                </div>
              )}

              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.85rem',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary, #94A3B8)',
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(66, 133, 244, 0.18) 0%, rgba(66, 133, 244, 0.04) 100%)'
                        : 'transparent',
                      border: isActive ? '1px solid rgba(66, 133, 244, 0.35)' : '1px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          left: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3.5px',
                          height: '22px',
                          borderRadius: '0 4px 4px 0',
                          background: 'linear-gradient(180deg, #4285F4, #34A853)',
                          boxShadow: '0 0 10px rgba(66, 133, 244, 0.7)',
                        }}
                      />
                    )}
                    <IconComponent size={18} color={isActive ? 'var(--google-blue, #60A5FA)' : 'currentColor'} />

                    {!isCollapsed && (
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    )}

                    {item.badge && !isCollapsed && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          background: item.badgeColor || '#4285F4',
                          color: '#FFFFFF',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Social Media Links Row (6 Platforms Side by Side) */}
        <div
          style={{
            padding: isCollapsed ? '0.45rem 0.35rem' : '0.55rem 0.85rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.15)',
          }}
        >
          {!isCollapsed && (
            <div
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--text-muted, #64748B)',
                marginBottom: '0.35rem',
                paddingLeft: '0.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Social Channels</span>
              <span style={{ fontSize: '0.58rem', color: '#60A5FA' }}>Official</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isCollapsed ? 'repeat(2, 1fr)' : 'repeat(6, 1fr)',
              gap: isCollapsed ? '0.25rem' : '0.35rem',
              alignItems: 'center',
              justifyItems: 'center',
            }}
          >
            {MANDATORY_SOCIAL_CHANNELS.map((ch) => (
              <a
                key={ch.id}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${ch.name} (Official)`}
                style={{
                  width: isCollapsed ? '28px' : '32px',
                  height: isCollapsed ? '28px' : '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${ch.brandColor}18`;
                  e.currentTarget.style.borderColor = `${ch.brandColor}60`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${ch.brandColor}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {renderSidebarSocialIcon(ch.iconType, isCollapsed ? 13 : 16)}
              </a>
            ))}
          </div>
        </div>

        {/* Sidebar Footer: Student Profile Card */}
        <div
          style={{
            padding: isCollapsed ? '0.75rem 0.4rem' : '0.85rem 0.85rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            gap: '0.5rem',
          }}
        >
          <Link
            href="/student/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              overflow: 'hidden',
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
              flex: 1,
            }}
            title="View Profile"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                border: '1.5px solid rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.88rem',
                fontWeight: 800,
                color: '#FFFFFF',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {student.avatar_url ? (
                <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (student.full_name_en || 'S').charAt(0).toUpperCase()
              )}
            </div>

            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {student.full_name_en || 'Student Member'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #94A3B8)', whiteSpace: 'nowrap' }}>
                  {teamRole ? 'Dual Role Member' : 'Active Student'}
                </div>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: isCollapsed ? '78px' : '270px',
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
        }}
        className="main-content-layout"
      >
        {/* Fixed Top Header Bar */}
        <header
          style={{
            height: '64px',
            background: 'rgba(11, 15, 25, 0.92)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'fixed',
            top: 0,
            left: isCollapsed ? '78px' : '270px',
            right: 0,
            zIndex: 40,
            transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          }}
          className="student-topbar"
        >
          {/* Left: Mobile Menu + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                width: '38px',
                height: '38px',
                color: '#CBD5E1',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              className="student-mobile-menu-btn"
              aria-label="Open mobile menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb / Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span
                style={{ color: 'var(--text-muted, #64748B)', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                className="student-topbar-breadcrumb-prefix"
              >
                Student Portal <span style={{ color: 'rgba(255, 255, 255, 0.2)', margin: '0 0.2rem' }}>/</span>
              </span>
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                {currentPageTitle}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {/* In-App Student Notification Center */}
            <StudentNotificationCenter studentId={student.id} />

            {/* Dual-Role Chapter Switcher */}
            {teamRole && (
              <Link
                href="/dashboard"
                style={{
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.38rem 0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34D399',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
                className="student-chapter-switcher"
              >
                <ShieldCheck size={14} />
                <span>Chapter OS</span>
              </Link>
            )}

            {/* Profile Avatar Pill */}
            <Link
              href="/student/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.2rem 0.5rem 0.2rem 0.2rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
              }}
              title="View My Profile"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {student.avatar_url ? (
                  <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (student.full_name_en || 'S').charAt(0).toUpperCase()
                )}
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#E2E8F0',
                  maxWidth: '100px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingRight: '0.35rem',
                }}
                className="student-topbar-name"
              >
                {student.full_name_en?.split(' ')[0] || 'Student'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page Content with top clearance for fixed header and mobile safe-area bottom padding */}
        <main
          className="student-main-content student-bottom-safe-area"
          style={{ flex: 1, paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}
        >
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER */}
      {/* ========================================================================= */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
        }}
        className={`student-mobile-overlay${isMobileOpen ? ' is-open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) setIsMobileOpen(false); }}
      >
          <div
            style={{
              width: '290px',
              maxWidth: '86vw',
              background: '#0F1420',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              boxShadow: '8px 0 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Google Accent Strip */}
            <div
              style={{
                height: '3px',
                background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
              }}
            />

            {/* Mobile Header */}
            <div
              style={{
                padding: '1.1rem 1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <img src="/icons/icon.svg" alt="GDGoC" style={{ width: '28px', height: '28px' }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#FFFFFF' }}>
                    GDGoC HNU
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#60A5FA', fontWeight: 700 }}>
                    STUDENT PORTAL
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {navigationGroups.map((group, gIdx) => (
                <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {group.groupTitle && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      {group.groupTitle}
                    </div>
                  )}
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          color: isActive ? '#FFFFFF' : '#CBD5E1',
                          background: isActive ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                          border: isActive ? '1px solid rgba(66, 133, 244, 0.35)' : 'none',
                          textDecoration: 'none',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.9rem',
                        }}
                      >
                        <Icon size={18} color={isActive ? '#60A5FA' : 'currentColor'} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              background: item.badgeColor || '#4285F4',
                              color: '#FFFFFF',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Mobile Drawer Social Links Row */}
            <div
              style={{
                padding: '0.75rem 1rem 0.25rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#64748B',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>Official Channels</span>
                <span style={{ fontSize: '0.62rem', color: '#60A5FA' }}>GDGoC HNU</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '0.45rem',
                  alignItems: 'center',
                  justifyItems: 'center',
                }}
              >
                {MANDATORY_SOCIAL_CHANNELS.map((ch) => (
                  <a
                    key={ch.id}
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={ch.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {renderSidebarSocialIcon(ch.iconType, 18)}
                  </a>
                ))}
              </div>
            </div>

            {/* Mobile Drawer Footer */}
            <div
              style={{
                padding: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <Link
                href="/student/profile"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4285F4, #34A853)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {student.avatar_url ? (
                    <img src={student.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (student.full_name_en || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {student.full_name_en || 'Student'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#60A5FA' }}>
                    View & Edit Profile →
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#F87171',
                  borderRadius: '8px',
                  padding: '0.45rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
      </div>


      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ========================================================================= */}
      <nav
        className="student-mobile-bottom-nav student-mobile-nav"
        aria-label="Student Mobile Navigation"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(11, 15, 25, 0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 99,
          alignItems: 'center',
          justifyContent: 'space-around',
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.6)',
        }}
      >
        <Link
          href="/student/dashboard"
          className={`student-mobile-nav-item ${pathname === '/student/dashboard' ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: pathname === '/student/dashboard' ? '#60A5FA' : '#94A3B8',
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: pathname === '/student/dashboard' ? 700 : 500,
            gap: '3px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <LayoutGrid size={20} color={pathname === '/student/dashboard' ? '#60A5FA' : '#94A3B8'} />
          <span style={{ fontSize: '0.68rem', textDecoration: 'none' }}>Dashboard</span>
        </Link>

        <Link
          href="/student/courses"
          className={`student-mobile-nav-item ${pathname?.startsWith('/student/courses') ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: pathname?.startsWith('/student/courses') ? '#60A5FA' : '#94A3B8',
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: pathname?.startsWith('/student/courses') ? 700 : 500,
            gap: '3px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <BookOpen size={20} color={pathname?.startsWith('/student/courses') ? '#60A5FA' : '#94A3B8'} />
          <span style={{ fontSize: '0.68rem', textDecoration: 'none' }}>Courses</span>
        </Link>

        {/* Primary Raised Action: QR Pass */}
        <Link
          href="/student/my-qr"
          className={`student-mobile-nav-item primary-action ${pathname === '/student/my-qr' ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            marginTop: '-18px',
            color: '#93C5FD',
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: 700,
            gap: '2px',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="My Attendance QR Pass"
        >
          <div
            className="action-circle"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(66, 133, 244, 0.5), 0 0 0 3px rgba(11, 15, 25, 0.95)',
            }}
          >
            <QrCode size={22} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textDecoration: 'none' }}>Pass</span>
        </Link>

        <Link
          href="/student/workshops"
          className={`student-mobile-nav-item ${pathname?.startsWith('/student/workshops') ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: pathname?.startsWith('/student/workshops') ? '#60A5FA' : '#94A3B8',
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: pathname?.startsWith('/student/workshops') ? 700 : 500,
            gap: '3px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Calendar size={20} color={pathname?.startsWith('/student/workshops') ? '#60A5FA' : '#94A3B8'} />
          <span style={{ fontSize: '0.68rem', textDecoration: 'none' }}>Workshops</span>
        </Link>

        <Link
          href="/student/certificates"
          className={`student-mobile-nav-item ${pathname?.startsWith('/student/certificates') ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            height: '100%',
            color: pathname?.startsWith('/student/certificates') ? '#60A5FA' : '#94A3B8',
            textDecoration: 'none',
            fontSize: '0.68rem',
            fontWeight: pathname?.startsWith('/student/certificates') ? 700 : 500,
            gap: '3px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Award size={20} color={pathname?.startsWith('/student/certificates') ? '#60A5FA' : '#94A3B8'} />
          <span style={{ fontSize: '0.68rem', textDecoration: 'none' }}>Certificates</span>
        </Link>
      </nav>
      <BackToTopButton />

      {/* Mandatory Social Media Follow Gate */}
      {socialFollowStatus && !socialFollowStatus.completedAll && (
        <SocialFollowGateModal
          initialFollowedPlatforms={socialFollowStatus.followedPlatforms}
          studentName={student.full_name_en || student.full_name_ar}
          onAllCompleted={() =>
            setSocialFollowStatus((prev) =>
              prev ? { ...prev, completedAll: true } : null
            )
          }
        />
      )}
    </div>
    </ToastProvider>
  );
}


