import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { MembersDirectoryClient } from '@/components/MembersDirectoryClient';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MembersDirectoryPage() {
  const supabase = await createClient();

  // Fetch active profiles and departments in parallel
  const [membersResult, departmentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, phone, university_id, faculty, academic_year, role, position, skills, portfolio_url, department_id, join_date')
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('departments')
      .select('id, name, code, branch')
      .order('name'),
  ]);

  if (membersResult.error) {
    console.error('Error fetching directory members:', membersResult.error);
  }

  const deptList = departmentsResult.data || [];
  const deptMap = new Map(deptList.map((d) => [d.id, d]));

  const members = (membersResult.data || []).map((m) => ({
    ...m,
    departments: m.department_id ? deptMap.get(m.department_id) || null : null,
  }));

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Directory Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.15)', color: '#93C5FD', fontWeight: 700 }}>
              Chapter Directory
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, marginBottom: '0.4rem' }}>
            Members & Leadership Directory
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            Connect with chapter developers, team leads, and committee specialists across all Google technical tracks.
          </p>
        </div>

        {/* Directory Client */}
        <MembersDirectoryClient
          initialMembers={members}
          departments={deptList}
        />
      </div>
    </AppShell>
  );
}
