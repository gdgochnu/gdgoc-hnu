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
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Award,
  Bell,
} from 'lucide-react';
import { StudentProfile } from '@/types/student';
import { createClient } from '@/lib/supabase/client';
import { StudentNotificationCenter } from './notifications/StudentNotificationCenter';

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
  const sidebarNavRef = useRef<HTMLDivElement | null>(null);

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
      await supabase.auth.signOut();
      router.push('/student');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
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
    {
      groupTitle: 'Chapter & Account',
      items: [
        {
          label: 'Portal Landing',
          href: '/student',
          icon: Globe,
        },
        ...(teamRole
          ? [
              {
                label: 'Switch to Chapter OS',
                href: '/dashboard',
                icon: ShieldCheck,
                badge: 'TEAM',
                badgeColor: '#10B981',
              },
              {
                label: 'Student QR Scanner',
                href: '/student-portal/admin/attendance/scan',
                icon: QrCode,
                badge: 'STAFF',
                badgeColor: '#10B981',
              },
              {
                label: 'Course Management',
                href: '/student-portal/admin/courses',
                icon: BookOpen,
              },
              ...(['president', 'co_president'].includes(teamRole)
                ? [
                    {
                      label: 'Issue Certificates',
                      href: '/student-portal/admin/certificates',
                      icon: Award,
                      badge: 'LEADER',
                      badgeColor: '#F59E0B',
                    },
                  ]
                : []),
            ]
          : []),
        {
          label: 'Edit Profile Info',
          href: '/student/onboarding',
          icon: UserCog,
        },
      ],
    },
  ];

  const currentPageTitle =
    pathname === '/student/my-qr'
      ? 'My Attendance Pass'
      : pathname === '/student/certificates'
      ? 'My Certificates'
      : pathname.startsWith('/student/courses')
      ? 'Tracks & Courses'
      : pathname.startsWith('/student/workshops')
      ? 'Workshops & Bootcamps'
      : 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main, #070B14)' }}>
      {/* ========================================================================= */}
      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: isCollapsed ? '78px' : '260px',
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
            padding: isCollapsed ? '1rem 0' : '1.15rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Link
            href="/student/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '38px',
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
                style={{ width: '100%', height: 'auto', maxHeight: '20px', objectFit: 'contain' }}
              />
            </div>

            {!isCollapsed && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800, fontSize: '0.94rem', color: '#FFFFFF' }}>
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
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      padding: '0.08rem 0.35rem',
                      borderRadius: '4px',
                      background: 'rgba(66, 133, 244, 0.18)',
                      color: '#93C5FD',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    STUDENT
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #94A3B8)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34A853', boxShadow: '0 0 6px #34A853' }} />
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
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: 'var(--text-muted, #94A3B8)',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              overflow: 'hidden',
              minWidth: 0,
            }}
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
          </div>

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
          marginLeft: isCollapsed ? '78px' : '260px',
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
            left: isCollapsed ? '78px' : '260px',
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

            {/* Faculty Badge */}
            {student.faculty && (
              <div
                style={{
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '8px',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  fontSize: '0.76rem',
                  color: '#93C5FD',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
                className="student-faculty-badge"
              >
                <GraduationCap size={14} />
                <span>{student.faculty}</span>
              </div>
            )}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.2rem 0.45rem 0.2rem 0.2rem',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
              }}
              onClick={() => setIsMobileOpen(true)}
              title="Open Navigation Menu"
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
            </div>
          </div>
        </header>

        {/* Page Content with top clearance for fixed header */}
        <main style={{ flex: 1, paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
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

            {/* Mobile Drawer Footer */}
            <div
              style={{
                padding: '1rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {student.full_name_en || 'Student'}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  QR-••••{student.qr_code ? student.qr_code.slice(-6) : '------'}
                </div>
              </div>
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
                }}
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
        className="student-mobile-bottom-nav"
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
    </div>
  );
}

