'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  BookOpen,
  FileCheck2,
  Award,
  HelpCircle,
  GraduationCap,
  Users,
  QrCode,
  type LucideIcon,
} from 'lucide-react';

export type CourseTabId =
  | 'sessions'
  | 'lessons'
  | 'tasks'
  | 'submissions'
  | 'quizzes'
  | 'enrollments'
  | 'instructors'
  | 'scan';

interface TabConfig {
  icon: LucideIcon;
  inactiveBg: string;
  inactiveBorder: string;
  inactiveColor: string;
  activeBg: string;
  activeBorder: string;
  activeColor: string;
}

const TAB_CONFIGS: Record<CourseTabId, TabConfig> = {
  sessions: {
    icon: Calendar,
    inactiveBg: 'rgba(66, 133, 244, 0.12)',
    inactiveBorder: 'rgba(66, 133, 244, 0.28)',
    inactiveColor: '#93C5FD',
    activeBg: 'linear-gradient(135deg, rgba(66, 133, 244, 0.35), rgba(59, 130, 246, 0.35))',
    activeBorder: 'rgba(66, 133, 244, 0.65)',
    activeColor: '#FFFFFF',
  },
  lessons: {
    icon: BookOpen,
    inactiveBg: 'rgba(66, 133, 244, 0.12)',
    inactiveBorder: 'rgba(66, 133, 244, 0.28)',
    inactiveColor: '#93C5FD',
    activeBg: 'linear-gradient(135deg, rgba(66, 133, 244, 0.32), rgba(168, 85, 247, 0.32))',
    activeBorder: 'rgba(66, 133, 244, 0.65)',
    activeColor: '#FFFFFF',
  },
  tasks: {
    icon: FileCheck2,
    inactiveBg: 'rgba(251, 188, 4, 0.12)',
    inactiveBorder: 'rgba(251, 188, 4, 0.28)',
    inactiveColor: '#FDE047',
    activeBg: 'linear-gradient(135deg, rgba(251, 188, 4, 0.3), rgba(217, 119, 6, 0.3))',
    activeBorder: 'rgba(251, 188, 4, 0.65)',
    activeColor: '#FFFFFF',
  },
  submissions: {
    icon: Award,
    inactiveBg: 'rgba(52, 168, 83, 0.12)',
    inactiveBorder: 'rgba(52, 168, 83, 0.3)',
    inactiveColor: '#34D399',
    activeBg: 'linear-gradient(135deg, rgba(52, 168, 83, 0.3), rgba(16, 185, 129, 0.3))',
    activeBorder: 'rgba(52, 168, 83, 0.65)',
    activeColor: '#FFFFFF',
  },
  quizzes: {
    icon: HelpCircle,
    inactiveBg: 'rgba(168, 85, 247, 0.12)',
    inactiveBorder: 'rgba(168, 85, 247, 0.3)',
    inactiveColor: '#C084FC',
    activeBg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(147, 51, 234, 0.3))',
    activeBorder: 'rgba(168, 85, 247, 0.65)',
    activeColor: '#FFFFFF',
  },
  enrollments: {
    icon: GraduationCap,
    inactiveBg: 'rgba(52, 168, 83, 0.12)',
    inactiveBorder: 'rgba(52, 168, 83, 0.28)',
    inactiveColor: '#86EFAC',
    activeBg: 'linear-gradient(135deg, rgba(52, 168, 83, 0.3), rgba(34, 197, 94, 0.3))',
    activeBorder: 'rgba(52, 168, 83, 0.65)',
    activeColor: '#FFFFFF',
  },
  instructors: {
    icon: Users,
    inactiveBg: 'rgba(255, 255, 255, 0.05)',
    inactiveBorder: 'rgba(255, 255, 255, 0.12)',
    inactiveColor: '#CBD5E1',
    activeBg: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(99, 102, 241, 0.25))',
    activeBorder: 'rgba(66, 133, 244, 0.6)',
    activeColor: '#FFFFFF',
  },
  scan: {
    icon: QrCode,
    inactiveBg: 'rgba(234, 67, 53, 0.12)',
    inactiveBorder: 'rgba(234, 67, 53, 0.28)',
    inactiveColor: '#FCA5A5',
    activeBg: 'linear-gradient(135deg, rgba(234, 67, 53, 0.3), rgba(225, 29, 72, 0.3))',
    activeBorder: 'rgba(234, 67, 53, 0.65)',
    activeColor: '#FFFFFF',
  },
};

interface CourseTabLinkProps {
  id: CourseTabId;
  label: string;
  href: string;
}

export function CourseTabLink({ id, label, href }: CourseTabLinkProps) {
  const pathname = usePathname();
  const config = TAB_CONFIGS[id];
  const Icon = config.icon;

  const isActive =
    id === 'scan'
      ? pathname.includes('attendance/scan')
      : pathname.endsWith(`/${id}`) || pathname.includes(`/${id}/`);

  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.42rem',
        padding: '0.45rem 0.85rem',
        borderRadius: '8px',
        background: isActive ? config.activeBg : config.inactiveBg,
        border: `1px solid ${isActive ? config.activeBorder : config.inactiveBorder}`,
        color: isActive ? config.activeColor : config.inactiveColor,
        fontSize: '0.8rem',
        fontWeight: isActive ? 700 : 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.18s ease',
        boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      <Icon size={14} style={{ color: isActive ? '#FFFFFF' : config.inactiveColor }} />
      <span>{label}</span>
    </Link>
  );
}
