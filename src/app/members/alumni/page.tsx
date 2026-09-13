import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { AlumniDirectoryClient, AlumnusItem } from '@/components/AlumniDirectoryClient';

export const dynamic = 'force-dynamic';

export default async function AlumniDirectoryPage() {
  const context = await getUserContext();

  const role = context.profile?.role || 'member';
  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(role);

  // Spec §4.16: Alumni Directory visible to President/Co-President and, read-only, to Branch/Committee Heads
  if (!isLeadership && context.profile?.status !== 'active') {
    redirect('/members');
  }

  const admin = createAdminClient();

  // 1. Fetch alumni profiles & departments in parallel
  const [alumniRes, deptsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, phone, role, position, department_id, join_date, left_at, leave_reason, skills')
      .eq('status', 'alumni')
      .order('left_at', { ascending: false, nullsFirst: false }),
    admin
      .from('departments')
      .select('id, name, code, branch')
      .order('name'),
  ]);

  const rawAlumni = alumniRes.data || [];
  const departments = deptsRes.data || [];
  const deptMap = new Map(departments.map((d) => [d.id, d]));

  // 2. Fetch stats for each alumnus in parallel
  const alumniWithStats: AlumnusItem[] = await Promise.all(
    rawAlumni.map(async (a) => {
      const [tasksRes, badgesRes, certsRes, attendanceRes] = await Promise.all([
        admin
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('assignee_id', a.id)
          .eq('status', 'done'),
        admin
          .from('member_badges')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', a.id),
        admin
          .from('certificates')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_profile_id', a.id),
        admin
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('profile_id', a.id),
      ]);

      return {
        id: a.id,
        full_name: a.full_name,
        email: a.email,
        avatar_url: a.avatar_url,
        phone: a.phone,
        role: a.role,
        position: a.position,
        department_id: a.department_id,
        join_date: a.join_date,
        left_at: a.left_at,
        leave_reason: a.leave_reason,
        skills: a.skills || [],
        department: a.department_id ? deptMap.get(a.department_id) || null : null,
        stats: {
          tasksCompleted: tasksRes.count || 0,
          badgesCount: badgesRes.count || 0,
          certificatesCount: certsRes.count || 0,
          eventsAttended: attendanceRes.count || 0,
        },
      };
    })
  );

  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(251, 188, 4, 0.15)', color: '#FDE047', fontWeight: 700 }}>
            Chapter Legacy Archive
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, marginBottom: '0.4rem' }}>
          Alumni Archive & Past Contributors
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          Preserved records, achievements, and tenure history of past GDGoC HNU members and leaders.
        </p>
      </div>

      {/* Directory Client */}
      <AlumniDirectoryClient
        initialAlumni={alumniWithStats}
        departments={departments}
        currentUserRole={role}
        currentUserId={context.profile?.id}
      />
    </div>
  );
}
