import React, { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MembersDirectoryClient } from '@/components/MembersDirectoryClient';
import { MembersSkeleton } from '@/components/skeletons/MembersSkeleton';
import { GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';

let membersCache: {
  members: any[];
  departments: any[];
  expiresAt: number;
} | null = null;

const MEMBERS_CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function MembersDataLoader() {
  if (membersCache && membersCache.expiresAt > Date.now()) {
    return (
      <MembersDirectoryClient
        initialMembers={membersCache.members}
        departments={membersCache.departments}
      />
    );
  }

  const admin = createAdminClient();

  const [membersResult, departmentsResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, phone, university_id, faculty, academic_year, role, position, skills, portfolio_url, department_id, join_date')
      .eq('status', 'active')
      .order('full_name'),
    admin
      .from('departments')
      .select('id, name, code, branch')
      .order('name'),
  ]);

  if (membersResult.error) {
    console.error('Error fetching directory members:', membersResult.error);
  }

  const deptList = departmentsResult.data || [];
  const deptMap = new Map(deptList.map((d) => [d.id, d]));

  const members = (membersResult.data || []).map((m) => {
    let pos = m.position;
    if (m.role === 'president' && (!pos || pos.toLowerCase() === 'member')) {
      pos = 'Chapter President & Executive Lead';
    } else if (m.role === 'co_president' && (!pos || pos.toLowerCase() === 'member')) {
      pos = 'Chapter Co-President & Executive Lead';
    }
    return {
      ...m,
      position: pos,
      departments: m.department_id ? deptMap.get(m.department_id) || null : null,
    };
  });

  membersCache = {
    members,
    departments: deptList,
    expiresAt: Date.now() + MEMBERS_CACHE_TTL_MS,
  };

  return (
    <MembersDirectoryClient
      initialMembers={members}
      departments={deptList}
    />
  );
}

export default function MembersDirectoryPage() {
  return (
    <div style={{ padding: '2.5rem 2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Directory Header (renders immediately) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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

        <Link
          href="/members/alumni"
          className="btn-secondary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.88rem',
            borderColor: 'rgba(251, 188, 4, 0.35)',
            color: '#FDE047',
            textDecoration: 'none',
          }}
        >
          <GraduationCap size={18} color="var(--google-yellow)" />
          <span>Alumni Archive 🎓</span>
        </Link>
      </div>

      {/* Directory Client wrapped in Suspense with MembersSkeleton */}
      <Suspense fallback={<MembersSkeleton />}>
        <MembersDataLoader />
      </Suspense>
    </div>
  );
}
