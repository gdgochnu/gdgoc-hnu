'use client';

import { useState, useMemo } from 'react';
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
  const [isSigningOut, setIsSigningOut] = useState(false);

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
        href: '/leaderboard',
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
        href: '/workspace/pr',
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
        href: '/workspace/hr',
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
        return 'Chapter President';
      case 'co_president':
        return 'Co-President';
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
        return { bg: 'rgba(66, 133, 244, 0.2)', color: '#93C5FD', border: 'rgba(66, 133, 244, 0.4)' };
      case 'co_president':
        return { bg: 'rgba(251, 188, 4, 0.2)', color: '#FDE047', border: 'rgba(251, 188, 4, 0.4)' };
      case 'branch_head':
      case 'committee_head':
        return { bg: 'rgba(52, 168, 83, 0.2)', color: '#86EFAC', border: 'rgba(52, 168, 83, 0.4)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: 'rgba(255, 255, 255, 0.15)' };
    }
  }, [profile.role]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR */}
      {/* ========================================================================= */}
      <aside
        style={{
          width: isCollapsed ? '78px' : '260px',
          flexShrink: 0,
          background: 'rgba(15, 20, 32, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
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
          padding: isCollapsed ? '1.25rem 0.5rem' : '1.25rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              backgroundClip: 'text',
              flexShrink: 0,
            }}>
              <span style={{ background: 'linear-gradient(135deg, #4285F4, #34A853)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                &lt;&gt;
              </span>
            </div>
            {!isCollapsed ? (
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  GDGoC HNU OS
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  Chapter Platform
                </div>
              </div>
            ) : null}
          </Link>

          {!isCollapsed ? (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--text-muted)',
                padding: '0.35rem',
                cursor: 'pointer',
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
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: isCollapsed ? '1rem 0.5rem' : '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}>
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
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const IconComponent = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: isCollapsed ? '0.65rem 0' : '0.65rem 0.75rem',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                      border: isActive ? '1px solid rgba(66, 133, 244, 0.3)' : '1px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.88rem',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    title={isCollapsed ? item.label : undefined}
                  >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
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
          </div>

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            background: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Left: Mobile Menu Toggle & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setIsMobileOpen(true)}
              className="mobile-only-btn"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.5rem',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <Menu size={20} />
            </button>

            {/* Department Badge if assigned */}
            {profile.department ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                background: profile.department.branch === 'tech'
                  ? 'rgba(66, 133, 244, 0.12)'
                  : 'rgba(52, 168, 83, 0.12)',
                border: profile.department.branch === 'tech'
                  ? '1px solid rgba(66, 133, 244, 0.25)'
                  : '1px solid rgba(52, 168, 83, 0.25)',
                fontSize: '0.8rem',
                color: profile.department.branch === 'tech' ? '#93C5FD' : '#86EFAC',
                fontWeight: 600,
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: profile.department.branch === 'tech' ? 'var(--google-blue)' : 'var(--google-green)',
                }} />
                <span>{profile.department.name}</span>
                <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>• {profile.department.branch === 'tech' ? 'Tech' : 'Non-Tech'}</span>
              </div>
            ) : null}
          </div>

          {/* Center: Global Search Bar with Hotkey */}
          <div style={{ flex: '1', maxWidth: '420px', margin: '0 1.25rem' }}>
            <GlobalSearchBar />
          </div>

          {/* Right Controls: Notifications & Quick Access */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* In-App Notification Center */}
            <NotificationCenter
              initialUnreadCount={unreadNotificationsCount}
              profileId={profile.id}
            />

            {/* Quick Visit Public Site */}
            <Link
              href="/"
              className="btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.4rem 0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>Public Site</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1 }}>
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
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
        }}>
          <div style={{
            width: '280px',
            maxWidth: '85vw',
            background: '#0F1420',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}>
            {/* Top Bar */}
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
            }} />
            <div style={{
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>GDGoC HNU OS</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
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
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
            </div>

            {/* Mobile Footer */}
            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{profile.full_name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{roleLabel}</div>
                </div>
              </div>
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
    </div>
  );
}
