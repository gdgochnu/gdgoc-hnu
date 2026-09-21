'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface CourseTabLinkProps {
  label: string;
  href: string;
  segment: string;
}

export function CourseTabLink({ label, href, segment }: CourseTabLinkProps) {
  const pathname = usePathname();

  // Active if the current path ends with this segment (or contains it for query-based links)
  const isActive =
    segment === 'scan'
      ? pathname.includes('attendance/scan')
      : pathname.endsWith(`/${segment}`);

  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.55rem 1rem',
        fontSize: '0.82rem',
        fontWeight: isActive ? 700 : 500,
        color: isActive ? '#FFFFFF' : '#94A3B8',
        textDecoration: 'none',
        borderBottom: isActive ? '2px solid #4285F4' : '2px solid transparent',
        background: isActive ? 'rgba(66,133,244,0.08)' : 'transparent',
        borderRadius: '8px 8px 0 0',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
        marginBottom: '-1px', // flush with nav border
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#E2E8F0';
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#94A3B8';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      {label}
    </Link>
  );
}
