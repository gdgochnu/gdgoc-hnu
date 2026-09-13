'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserContextProfile } from '@/lib/auth/get-user-context';
import { 
  LayoutGrid, 
  ShieldCheck, 
  CheckSquare, 
  Calendar, 
  Users, 
  Award, 
  GraduationCap, 
  Briefcase, 
  Image as ImageIcon, 
  ClipboardList, 
  UserCheck, 
  Building2, 
  FolderCog, 
  LogOut, 
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Sparkles,
  ExternalLink,
  Activity,
  BarChart3,
  Search,
} from 'lucide-react';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  badge?: number | string;
  badgeColor?: string;
}

interface NavGroup {
  groupTitle?: string;
  items: NavItem[];
}

interface AppNavigationProps {
  profile: UserContextProfile;
  pendingApprovalsCount: number;
  unreadNotificationsCount: number;
  children: React.ReactNode;
}

export function AppNavigation({
  profile,
  pendingApprovalsCount,
  unreadNotificationsCount,
  children,
}: AppNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sidebarNavRef = useRef<HTMLDivElement | null>(null);

  // Close mobile overlays on navigation
  useEffect(() => {
    setIsMobileSearchOpen(false);
    setIsMobileOpen(false);
  }, [pathname]);

  // Preserve sidebar scroll position across route transitions
  useEffect(() => {
    if (typeof window !== 'undefined' && sidebarNavRef.current) {
      const savedScroll = sessionStorage.getItem('sidebar_scroll_top');
      if (savedScroll) {
        sidebarNavRef.current.scrollTop = Number(savedScroll);
      }
    }
  }, [pathname]);

  // Complete navigation progress bar when new page content actually commits to the DOM
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('page-navigation-complete'));
  }, [children]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sidebar_scroll_top', String(e.currentTarget.scrollTop));
    }
  };

  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Build role-aware navigation groups
  const navigationGroups = useMemo((): NavGroup[] => {
    const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(profile.role);
    const isPresident = profile.role === 'president';
    const isCoPresident = profile.role === 'co_president';
    const deptCode = profile.department?.code?.toUpperCase() || '';

    // 1. Core Items
    const coreItems: NavItem[] = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
      },
    ];

    // Command Center for leadership roles (Spec §4.10 & §5.1)
    if (isLeadership) {
      coreItems.push({
        label: isPresident || isCoPresident ? 'Command Center' : 'Committee Health',
        href: '/command-center',
        icon: Activity,
      });
    }

    // Approvals queue for leadership roles
    if (isLeadership) {
      coreItems.push({
        label: 'Approvals Queue',
        href: '/approvals',
        icon: ShieldCheck,
        badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
        badgeColor: 'var(--google-yellow)',
      });
    }

    // Reports & Analytics for leadership roles (Spec §4.12)
    if (isLeadership) {
      coreItems.push({
        label: 'Reports & Analytics',
        href: '/reports',
        icon: BarChart3,
      });
    }

    coreItems.push(
      {
        label: 'Tasks',
        href: '/tasks',
        icon: CheckSquare,
      },
      {
        label: 'Events',
        href: '/events',
        icon: Calendar,
      },
      {
        label: 'Members Directory',
        href: '/members',
        icon: Users,
      },
      {
        label: 'Leaderboard',
        href: '/gamification',
        icon: Award,
      },
      {
        label: 'Certificates',
        href: '/certificates',
        icon: GraduationCap,
      }
    );

    const groups: NavGroup[] = [
      {
        items: coreItems,
      },
    ];

    // 2. Specialized Workspaces
    const workspaceItems: NavItem[] = [];

    if (isPresident || isCoPresident || deptCode === 'PR') {
      workspaceItems.push({
        label: 'PR CRM',
        href: '/pr',
        icon: Briefcase,
      });
    }

    if (isPresident || isCoPresident || deptCode === 'MEDIA') {
      workspaceItems.push({
        label: 'Media Library',
        href: '/workspace/media',
        icon: ImageIcon,
      });
    }

    if (isPresident || isCoPresident || deptCode === 'OPS') {
      workspaceItems.push({
        label: 'Operations Checklists',
        href: '/workspace/operations',
        icon: ClipboardList,
      });
    }

    if (isPresident || isCoPresident || deptCode === 'HR') {
      workspaceItems.push({
        label: 'HR & Attendance',
        href: '/hr/attendance',
        icon: UserCheck,
      });
    }

    // Content Calendar — visible to all leadership + MEDIA
    if (isLeadership || deptCode === 'MEDIA') {
      workspaceItems.push({
        label: 'Content Calendar',
        href: '/workspace/content-calendar',
        icon: Calendar,
      });
    }

    if (workspaceItems.length > 0) {
      groups.push({
        groupTitle: 'Specialized Workspaces',
        items: workspaceItems,
      });
    }

    // 3. Administration & Settings (President only)
    if (isPresident) {
      groups.push({
        groupTitle: 'Administration',
        items: [
          {
            label: 'Committee Structure',
            href: '/settings/committees',
            icon: Building2,
          },
          {
            label: 'Faculty Options',
            href: '/settings/faculties',
            icon: GraduationCap,
          },
          {
            label: 'Google Drive Bridge',
            href: '/settings/drive',
            icon: FolderCog,
          },
        ],
      });
    }

    return groups;
  }, [profile, pendingApprovalsCount]);

  const roleLabel = useMemo(() => {
    switch (profile.role) {
      case 'president':
        return '👑 Chapter President';
      case 'co_president':
        return '👑 Co-President';
      case 'branch_head':
        return 'Branch Head';
      case 'committee_head':
        return 'Committee Head';
      case 'committee_co_head':
        return 'Committee Co-Head';
      default:
        return 'Member';
    }
  }, [profile.role]);

  const roleBadgeStyle = useMemo(() => {
    switch (profile.role) {
      case 'president':
        return { bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.25), rgba(66, 133, 244, 0.2))', color: '#FDE047', border: 'rgba(251, 188, 4, 0.6)' };
      case 'co_president':
        return { bg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(52, 168, 83, 0.2))', color: '#FDE047', border: 'rgba(251, 188, 4, 0.5)' };
      case 'branch_head':
      case 'committee_head':
        return { bg: 'rgba(52, 168, 83, 0.2)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.4)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: 'rgba(255, 255, 255, 0.15)' };
    }
  }, [profile.role]);

  const currentPageTitle = useMemo(() => {
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/tasks')) return 'Tasks & Escalations';
    if (pathname.startsWith('/events')) return 'Events Hub';
    if (pathname.startsWith('/members')) return 'Members Directory';
    if (pathname.startsWith('/gamification') || pathname.startsWith('/leaderboard')) return 'Gamification & Leaderboard';
    if (pathname.startsWith('/certificates')) return 'Certificates Center';
    if (pathname.startsWith('/pr')) return 'Public Relations';
    if (pathname.startsWith('/hr')) return 'HR & Attendance';
    if (pathname.startsWith('/approvals')) return 'Approvals & Membership';
    if (pathname.startsWith('/reports')) return 'Reports & Analytics';
    if (pathname.startsWith('/command-center')) return 'Command Center';
    if (pathname.startsWith('/settings')) return 'Settings & Governance';
    if (pathname.startsWith('/workspace/media')) return 'Media Library';
    if (pathname.startsWith('/workspace/operations')) return 'Operations Checklists';
    if (pathname.startsWith('/workspace/content-calendar')) return 'Content Calendar';
    return 'Workspace';
  }, [pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: isCollapsed ? '78px' : '260px',
          background: 'rgba(15, 20, 32, 0.96)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          height: '100vh',
          zIndex: 50,
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
        }}
        className="desktop-sidebar"
      >
        {/* Google 4-Color Accent Strip */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          width: '100%',
        }} />

        {/* Brand Header */}
        <div style={{
          padding: isCollapsed ? '1.1rem 0.5rem' : '1.15rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)',
        }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              textDecoration: 'none',
              minWidth: 0,
            }}
            title="GDGoC HNU OS"
          >
            <div style={{
              width: isCollapsed ? '42px' : '44px',
              height: '38px',
              borderRadius: '11px',
              background: 'radial-gradient(circle at 30% 30%, rgba(66, 133, 244, 0.16), rgba(15, 20, 32, 0.85))',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              padding: '4px 6px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35), 0 0 16px rgba(66, 133, 244, 0.12)',
              transition: 'all 0.2s ease',
            }}>
              <img
                src="/icons/icon.svg"
                alt="GDGoC Logo"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '22px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.4))',
                }}
              />
            </div>
            {!isCollapsed ? (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.94rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.025em',
                  whiteSpace: 'nowrap',
                }}>
                  <span>GDGoC</span>
                  <span style={{
                    background: 'linear-gradient(90deg, #4285F4, #34A853)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    HNU
                  </span>
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '0.08rem 0.32rem',
                    borderRadius: '4px',
                    background: 'rgba(66, 133, 244, 0.18)',
                    color: '#93C5FD',
                    border: '1px solid rgba(66, 133, 244, 0.35)',
                    letterSpacing: '0.04em',
                    lineHeight: 1,
                  }}>
                    OS
                  </span>
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '2px',
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#34A853',
                    boxShadow: '0 0 6px #34A853',
                  }} />
                  <span>Chapter Platform</span>
                </div>
              </div>
            ) : null}
          </Link>

          {!isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: 'var(--text-muted)',
                padding: '0.4rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          ) : null}
        </div>

        {isCollapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
            <button
              onClick={() => setIsCollapsed(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                padding: '0.35rem',
                cursor: 'pointer',
              }}
              title="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        ) : null}

        {/* Navigation Items List */}
        <div
          ref={sidebarNavRef}
          onScroll={handleSidebarScroll}
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
              {!isCollapsed && group.groupTitle ? (
                <div style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  padding: '0 0.65rem 0.35rem',
                }}>
                  {group.groupTitle}
                </div>
              ) : null}

              {group.items.map((item) => {
                const isExact = pathname === item.href || (item.href === '/gamification' && pathname === '/leaderboard') || (item.href === '/hr/attendance' && (pathname === '/hr' || pathname === '/hr/attendance'));
                const isSub = item.href !== '/' && item.href !== '/dashboard' && (pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?') || (item.href === '/gamification' && pathname.startsWith('/leaderboard')) || (item.href === '/hr/attendance' && pathname.startsWith('/hr/')));
                const isActive = isExact || isSub;
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
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                      background: isActive
                        ? 'linear-gradient(90deg, rgba(66, 133, 244, 0.18) 0%, rgba(66, 133, 244, 0.04) 100%)'
                        : 'transparent',
                      border: isActive ? '1px solid rgba(66, 133, 244, 0.35)' : '1px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem',
                      transition: 'all 0.15s ease',
                      position: 'relative',
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
                    <IconComponent
                      size={18}
                      color={isActive ? 'var(--google-blue)' : 'currentColor'}
                    />
                    {!isCollapsed ? (
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                    ) : null}

                    {item.badge ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          background: item.badgeColor || 'var(--google-blue)',
                          color: '#000000',
                          position: isCollapsed ? 'absolute' : 'relative',
                          top: isCollapsed ? '4px' : undefined,
                          right: isCollapsed ? '6px' : undefined,
                        }}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Footer Chip */}
        <div style={{
          padding: isCollapsed ? '1rem 0.5rem' : '1rem 0.85rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}>
          <Link
            href="/profile"
            title="View & Edit My Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              overflow: 'hidden',
              textDecoration: 'none',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#FFFFFF',
              flexShrink: 0,
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                profile.full_name?.charAt(0) || 'U'
              )}
            </div>

            {!isCollapsed ? (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.full_name}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '4px',
                    background: roleBadgeStyle.bg,
                    color: roleBadgeStyle.color,
                    border: `1px solid ${roleBadgeStyle.border}`,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {roleLabel}
                </span>
              </div>
            ) : null}
          </Link>

          {!isCollapsed ? (
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          ) : null}
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
        className="main-content-wrapper"
      >
        {/* Fixed Top Header Bar */}
        <header
          className="app-topbar"
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
        >
          {isMobileSearchOpen ? (
            /* Mobile Full-Width Search Input Mode */
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E2E8F0',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Back to Navigation"
              >
                <ChevronLeft size={20} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <GlobalSearchBar
                  autoFocus
                  isMobileOverlay
                  onClose={() => setIsMobileSearchOpen(false)}
                  placeholder="Search tasks, members, events..."
                />
              </div>
            </div>
          ) : (
            /* Standard Header Bar */
            <>
              {/* Left: Mobile Menu Toggle, Brand on Mobile, Breadcrumbs & Department Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className="mobile-only-btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  title="Open Navigation Menu"
                >
                  <Menu size={19} />
                </button>

                {/* Mobile Logo Mark */}
                <Link
                  href="/dashboard"
                  className="mobile-logo-brand"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    flexShrink: 0,
                    textDecoration: 'none',
                  }}
                  title="GDGoC HNU OS"
                >
                  <div style={{
                    width: '32px',
                    height: '28px',
                    borderRadius: '7px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 4px',
                  }}>
                    <img
                      src="/icons/icon.svg"
                      alt="GDGoC Logo"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '16px',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                </Link>

                {/* Breadcrumb Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.86rem', minWidth: 0, overflow: 'hidden' }}>
                  <span className="breadcrumb-prefix" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    GDGoC OS
                  </span>
                  <span className="breadcrumb-separator" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
                  <span
                    className="breadcrumb-title"
                    style={{
                      color: '#FFFFFF',
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {currentPageTitle}
                  </span>
                </div>

                {/* Department Badge if assigned (hidden on mobile to prevent overflow) */}
                {profile.department ? (
                  <div
                    className="topbar-dept-badge"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.28rem 0.65rem',
                      borderRadius: '8px',
                      background: profile.department.branch === 'tech'
                        ? 'rgba(66, 133, 244, 0.12)'
                        : 'rgba(52, 168, 83, 0.12)',
                      border: profile.department.branch === 'tech'
                        ? '1px solid rgba(66, 133, 244, 0.25)'
                        : '1px solid rgba(52, 168, 83, 0.25)',
                      fontSize: '0.76rem',
                      color: profile.department.branch === 'tech' ? '#93C5FD' : '#86EFAC',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: profile.department.branch === 'tech' ? 'var(--google-blue)' : 'var(--google-green)',
                      boxShadow: profile.department.branch === 'tech' ? '0 0 6px rgba(66, 133, 244, 0.8)' : '0 0 6px rgba(52, 168, 83, 0.8)',
                    }} />
                    <span>{profile.department.name}</span>
                  </div>
                ) : null}
              </div>

              {/* Center: Global Search Bar with Hotkey (Desktop & Tablet) */}
              <div
                className="desktop-search-container"
                style={{ flex: '1', maxWidth: '380px', margin: '0 1rem' }}
              >
                <GlobalSearchBar />
              </div>

              {/* Right Controls: Search Toggle, Notifications & Public Site */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
                {/* Mobile Search Trigger Button (Only visible on small screens) */}
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="mobile-search-btn"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    width: '36px',
                    height: '36px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                  }}
                  title="Search (Tasks, Members, Events)"
                >
                  <Search size={18} />
                </button>

                {/* In-App Notification Center */}
                <NotificationCenter
                  initialUnreadCount={unreadNotificationsCount}
                  profileId={profile.id}
                />

                {/* Quick Visit Public Site (Adaptive Label on Mobile) */}
                <Link
                  href="/"
                  className="topbar-public-site-btn"
                  title="View Chapter Public Site"
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.42rem 0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.42rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span className="public-site-label">Public Site</span>
                  <ExternalLink size={13} style={{ color: 'var(--google-blue)' }} />
                </Link>
              </div>
            </>
          )}
        </header>

        {/* Page Content with top clearance for fixed header */}
        <main style={{ flex: 1, paddingTop: '64px', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER */}
      {/* ========================================================================= */}
      {isMobileOpen ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
        }}>
          <div style={{
            width: '290px',
            maxWidth: '86vw',
            background: '#0F1420',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            boxShadow: '8px 0 32px rgba(0, 0, 0, 0.5)',
          }}>
            {/* Google Accent Strip */}
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }} />

            {/* Mobile Drawer Header with Actual Icon */}
            <div style={{
              padding: '1.1rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '38px',
                  height: '34px',
                  borderRadius: '9px',
                  background: 'radial-gradient(circle at 30% 30%, rgba(66, 133, 244, 0.2), rgba(15, 20, 32, 0.85))',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px 5px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.35)',
                  flexShrink: 0,
                }}>
                  <img
                    src="/icons/icon.svg"
                    alt="GDGoC Logo"
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '20px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontWeight: 800,
                    fontSize: '0.94rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                  }}>
                    <span>GDGoC</span>
                    <span style={{
                      background: 'linear-gradient(90deg, #4285F4, #34A853)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>
                      HNU
                    </span>
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '0.08rem 0.3rem',
                      borderRadius: '4px',
                      background: 'rgba(66, 133, 244, 0.18)',
                      color: '#93C5FD',
                      border: '1px solid rgba(66, 133, 244, 0.35)',
                    }}>
                      OS
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.66rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginTop: '2px',
                  }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#34A853' }} />
                    <span>Chapter Platform</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '7px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {navigationGroups.map((group, gIdx) => (
                <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {group.groupTitle ? (
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0.25rem 0.5rem' }}>
                      {group.groupTitle}
                    </div>
                  ) : null}
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/hr/attendance' && (pathname === '/hr' || pathname.startsWith('/hr/')));
                    const IconComponent = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.7rem 0.85rem',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                          background: isActive ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 700 : 500,
                        }}
                      >
                        <IconComponent size={18} color={isActive ? 'var(--google-blue)' : 'currentColor'} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            background: item.badgeColor || 'var(--google-blue)',
                            color: '#000000',
                          }}>
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ))}

              {/* Public Site Link in Mobile Drawer */}
              <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Link
                  href="/"
                  onClick={() => setIsMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#93C5FD',
                    background: 'rgba(66, 133, 244, 0.08)',
                    border: '1px solid rgba(66, 133, 244, 0.2)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={16} color="var(--google-blue)" />
                  <span style={{ flex: 1 }}>Visit Public Site</span>
                </Link>
              </div>
            </div>

            {/* Mobile Footer */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Link
                href="/profile"
                onClick={() => setIsMobileOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.75rem',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}>
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    profile.full_name?.charAt(0) || 'U'
                  )}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{profile.full_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{roleLabel} • View &amp; Edit Profile</div>
                </div>
              </Link>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        /* Responsive Topbar & Sidebar Styles */
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }
          .main-content-wrapper {
            margin-left: 0 !important;
          }
          header.app-topbar {
            left: 0 !important;
            padding: 0 0.85rem !important;
          }
          .mobile-only-btn {
            display: flex !important;
          }
          .mobile-logo-brand {
            display: flex !important;
          }
          .breadcrumb-prefix {
            display: none !important;
          }
          .breadcrumb-separator {
            display: none !important;
          }
          .topbar-dept-badge {
            display: none !important;
          }
          .breadcrumb-title {
            max-width: 140px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }
        }
        @media (min-width: 769px) {
          .mobile-only-btn {
            display: none !important;
          }
          .mobile-logo-brand {
            display: none !important;
          }
          .mobile-search-btn {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .desktop-search-container {
            display: none !important;
          }
          .mobile-search-btn {
            display: flex !important;
          }
          .public-site-label {
            display: none !important;
          }
          .topbar-public-site-btn {
            padding: 0.5rem !important;
            width: 36px !important;
            height: 36px !important;
            justify-content: center !important;
          }
        }
        @media (min-width: 641px) {
          .mobile-search-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
