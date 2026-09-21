import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { AppShell } from '@/components/layout/AppShell';
import { CourseTabLink } from './CourseTabLink';

// ─── Fetch minimal course info for the tab bar ───────────────────────────────
async function getCourseHeader(courseId: string) {
  try {
    const ctx = await getUserContext();
    if (!ctx.user) return null;
    const admin = createAdminClient();
    const { data } = await admin
      .from('courses')
      .select('id, title, status, department_id, departments(name, code)')
      .eq('id', courseId)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

// ─── Tab definitions ──────────────────────────────────────────────────────────
export function buildCourseTabs(courseId: string) {
  return [
    { label: 'Lessons',      href: `/student-portal/admin/courses/${courseId}/lessons`,     segment: 'lessons'      },
    { label: 'Sessions',     href: `/student-portal/admin/courses/${courseId}/sessions`,    segment: 'sessions'     },
    { label: 'Tasks',        href: `/student-portal/admin/courses/${courseId}/tasks`,       segment: 'tasks'        },
    { label: 'Submissions',  href: `/student-portal/admin/courses/${courseId}/submissions`, segment: 'submissions'  },
    { label: 'Quizzes',      href: `/student-portal/admin/courses/${courseId}/quizzes`,     segment: 'quizzes'      },
    { label: 'Enrollments',  href: `/student-portal/admin/courses/${courseId}/enrollments`, segment: 'enrollments'  },
    { label: 'Instructors',  href: `/student-portal/admin/courses/${courseId}/instructors`, segment: 'instructors'  },
    {
      label: '⬡ Scan QR',
      href: `/student-portal/admin/attendance/scan?type=course&courseId=${courseId}`,
      segment: 'scan',
    },
  ] as const;
}

// ─── Status badge colours ─────────────────────────────────────────────────────
function statusStyle(status: string) {
  if (status === 'published') return { bg: 'rgba(52,168,83,0.18)',  color: '#86EFAC', border: 'rgba(52,168,83,0.4)'  };
  if (status === 'draft')     return { bg: 'rgba(251,188,4,0.15)',  color: '#FDE047', border: 'rgba(251,188,4,0.4)'  };
  return                             { bg: 'rgba(100,116,139,0.2)', color: '#94A3B8', border: 'rgba(100,116,139,0.4)' };
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default async function CourseAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course  = await getCourseHeader(id);
  if (!course) redirect('/student-portal/admin/courses');

  const tabs  = buildCourseTabs(id);
  const badge = statusStyle(course.status);
  const dept  = (course as any).departments as { name: string; code: string } | null;

  return (
    <AppShell>
      {/* ── Sticky header + tabs ── */}
      <div
        style={{
          background: 'rgba(11, 15, 25, 0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Google 4-color accent strip */}
        <div
          style={{
            height: '3px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Breadcrumb + course meta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.5rem 0',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/student-portal/admin/courses"
            style={{ fontSize: '0.78rem', color: '#64748B', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            ← All Courses
          </Link>

          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>

          <span
            style={{
              fontSize: '0.92rem',
              fontWeight: 800,
              color: '#FFFFFF',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '320px',
            }}
          >
            {course.title}
          </span>

          {dept && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: 'rgba(66,133,244,0.15)',
                color: '#93C5FD',
                border: '1px solid rgba(66,133,244,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {dept.code}
            </span>
          )}

          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '999px',
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {course.status}
          </span>
        </div>

        {/* Tab bar */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0.5rem 1.5rem 0',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            gap: '0.1rem',
          }}
        >
          {tabs.map((tab) => (
            <CourseTabLink key={tab.segment} label={tab.label} href={tab.href} segment={tab.segment} />
          ))}
        </nav>
      </div>

      {/* Page content */}
      <div>{children}</div>
    </AppShell>
  );
}
