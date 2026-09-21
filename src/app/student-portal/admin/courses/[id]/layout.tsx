import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { AppShell } from '@/components/layout/AppShell';
import { CourseTabLink, CourseTabId } from './CourseTabLink';

// ─── Fetch course metadata + real counts for tabs ──────────────────────────────
async function getCourseHeader(courseId: string) {
  try {
    const ctx = await getUserContext();
    if (!ctx.user) return null;
    const admin = createAdminClient();
    const [courseRes, lessonsRes, tasksRes] = await Promise.all([
      admin
        .from('courses')
        .select('id, title, status, department_id, departments(name, code)')
        .eq('id', courseId)
        .maybeSingle(),
      admin
        .from('course_lessons')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId),
      admin
        .from('course_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId),
    ]);

    if (!courseRes.data) return null;

    return {
      course: courseRes.data,
      lessonsCount: lessonsRes.count ?? 0,
      tasksCount: tasksRes.count ?? 0,
    };
  } catch {
    return null;
  }
}

// ─── Status badge styling ──────────────────────────────────────────────────────
function statusStyle(status: string) {
  if (status === 'published') return { bg: 'rgba(52,168,83,0.18)', color: '#86EFAC', border: 'rgba(52,168,83,0.4)' };
  if (status === 'draft') return { bg: 'rgba(251,188,4,0.15)', color: '#FDE047', border: 'rgba(251,188,4,0.4)' };
  return { bg: 'rgba(100,116,139,0.2)', color: '#94A3B8', border: 'rgba(100,116,139,0.4)' };
}

// ─── Main Course Admin Layout ─────────────────────────────────────────────────
export default async function CourseAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCourseHeader(id);
  if (!data || !data.course) redirect('/student-portal/admin/courses');

  const { course, lessonsCount, tasksCount } = data;
  const badge = statusStyle(course.status);
  const dept = (course as any).departments as { name: string; code: string } | null;

  const tabs: { id: CourseTabId; label: string; href: string }[] = [
    { id: 'sessions', label: 'Sessions', href: `/student-portal/admin/courses/${id}/sessions` },
    { id: 'lessons', label: `Lessons (${lessonsCount})`, href: `/student-portal/admin/courses/${id}/lessons` },
    { id: 'tasks', label: `Tasks (${tasksCount})`, href: `/student-portal/admin/courses/${id}/tasks` },
    { id: 'submissions', label: 'Submissions & Grading', href: `/student-portal/admin/courses/${id}/submissions` },
    { id: 'quizzes', label: 'Quizzes', href: `/student-portal/admin/courses/${id}/quizzes` },
    { id: 'enrollments', label: 'Enrollments', href: `/student-portal/admin/courses/${id}/enrollments` },
    { id: 'instructors', label: 'Instructors', href: `/student-portal/admin/courses/${id}/instructors` },
    { id: 'scan', label: 'Scan QR', href: `/student-portal/admin/attendance/scan?type=course&courseId=${id}` },
  ];

  return (
    <AppShell>
      {/* ── Sticky header + unified sub-navigation bar ── */}
      <div
        style={{
          background: 'rgba(11, 15, 25, 0.96)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
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

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0.85rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Breadcrumbs + course title + department + status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', color: '#94A3B8', flexWrap: 'wrap' }}>
            <Link
              href="/student-portal/admin/courses"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#60A5FA', textDecoration: 'none', fontWeight: 600 }}
            >
              <ArrowLeft size={16} />
              Courses
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.94rem' }}>{course.title}</span>
            {dept && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(66,133,244,0.15)',
                  color: '#93C5FD',
                  border: '1px solid rgba(66,133,244,0.3)',
                }}
              >
                {dept.code}
              </span>
            )}
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                background: badge.bg,
                color: badge.color,
                border: `1px solid ${badge.border}`,
                textTransform: 'uppercase',
              }}
            >
              {course.status}
            </span>
          </div>

          {/* 8 Pill Navigation Buttons */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexWrap: 'wrap',
            }}
          >
            {tabs.map((tab) => (
              <CourseTabLink key={tab.id} id={tab.id} label={tab.label} href={tab.href} />
            ))}
          </nav>
        </div>
      </div>

      {/* Sub-page content */}
      <div>{children}</div>
    </AppShell>
  );
}
