import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { MemberProfileView, MemberProfileData } from '@/components/MemberProfileView';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MemberProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Fetch member profile respecting Postgres RLS
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      phone,
      university_id,
      faculty,
      academic_year,
      role,
      position,
      skills,
      portfolio_url,
      motivation,
      how_heard,
      availability_hours,
      status,
      join_date,
      overall_score,
      attendance_rate,
      department_id,
      created_at
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <AppShell>
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(234, 67, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <ShieldAlert size={28} color="var(--google-red)" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Profile Inaccessible or Not Found
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              The requested profile either does not exist or is outside your current committee visibility scope (Spec §1.1).
            </p>
            <Link
              href="/members"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <ArrowLeft size={16} />
              <span>Return to Members Directory</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. Fetch department details if member is assigned to one
  let department = null;
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('id, name, code, branch, description')
      .eq('id', profile.department_id)
      .maybeSingle();

    if (dept) {
      department = dept;
    }
  }

  const memberData: MemberProfileData = {
    ...profile,
    department,
  };

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <MemberProfileView
          member={memberData}
          callerId={user?.id}
        />
      </div>
    </AppShell>
  );
}
