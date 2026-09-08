import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MemberProfileView, MemberProfileData } from '@/components/MemberProfileView';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MemberProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const context = await getUserContext();

  // 1. Fetch member profile respecting Postgres RLS
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      full_name_ar,
      full_name_en,
      email,
      avatar_url,
      phone,
      whatsapp_number,
      national_id,
      faculty,
      department_major,
      academic_year,
      facebook_url,
      instagram_url,
      linkedin_url,
      university_id,
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
        <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }} suppressHydrationWarning>
          <div className="glass-panel" style={{ padding: '3.5rem 2rem' }} suppressHydrationWarning>
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

  // 3. Security Gate for National ID (Spec §1.3, Checklist Step P.5)
  // Strictly allow viewing National ID only if viewer is President, Co-President, HR member, or viewing own profile
  const isPresidential = context.profile?.role ? ['president', 'co_president'].includes(context.profile.role) : false;
  const isHRMember = context.profile?.department?.code === 'HR';
  const isSelf = context.user?.id === profile.id;
  const canViewNationalId = Boolean(isPresidential || isHRMember || isSelf);

  const memberData: MemberProfileData = {
    ...profile,
    // If viewer is not authorized to see National ID, mask it on the server
    national_id: canViewNationalId ? profile.national_id : null,
    department,
  };

  // 4. Fetch performance reviews, certificates, and live attendance metrics in parallel (Spec §4.6 & Step 10.5)
  const [
    { data: performanceReviewsData },
    { data: certificatesData },
    { data: attendanceRowsData },
    { count: totalEventsCount },
  ] = await Promise.all([
    supabase
      .from('performance_reviews')
      .select('*')
      .eq('profile_id', id)
      .order('period_month', { ascending: true }),
    supabase
      .from('certificates')
      .select(`
        id,
        template_id,
        recipient_profile_id,
        recipient_name,
        recipient_email,
        event_id,
        title,
        issue_date,
        certificate_number,
        verification_code,
        pdf_drive_file_id,
        pdf_drive_url,
        issued_by,
        created_at
      `)
      .or(`recipient_profile_id.eq.${id},recipient_email.eq.${profile.email}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('attendance')
      .select('id, event_id')
      .eq('profile_id', id),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .in('status', ['published', 'completed', 'closed']),
  ]);

  return (
    <AppShell>
      <div style={{ padding: '2.5rem 2rem 5rem', maxWidth: '1100px', margin: '0 auto' }} suppressHydrationWarning>
        <MemberProfileView
          member={memberData}
          callerRole={context.profile?.role}
          callerId={context.user?.id}
          canViewNationalId={canViewNationalId}
          performanceReviews={performanceReviewsData || []}
          certificates={certificatesData || []}
          eventsAttendedCount={attendanceRowsData?.length || 0}
          totalCompletedEventsCount={totalEventsCount || 0}
        />
      </div>
    </AppShell>
  );
}
