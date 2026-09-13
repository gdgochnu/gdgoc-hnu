import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MemberProfileView, MemberProfileData } from '@/components/MemberProfileView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Profile — GDGoC HNU OS',
  description: 'Manage your chapter membership profile, skills, academic info, and view performance reviews and credentials.',
};

export default async function ProfilePage() {
  const context = await getUserContext();

  if (!context.user || !context.profile) {
    redirect('/auth/login?redirect=/profile');
  }

  const userId = context.user.id;
  const admin = createAdminClient();

  // Fetch complete profile, department, performance reviews, certificates, attendance, and faculty options in parallel
  const [
    { data: profile },
    { data: performanceReviewsData },
    { data: certificatesData },
    { data: attendanceRowsData },
    { count: totalEventsCount },
    { data: facultyOptionsData },
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
    admin
      .from('performance_reviews')
      .select('*')
      .eq('profile_id', userId)
      .order('period_month', { ascending: true }),
    admin
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
      .or(`recipient_profile_id.eq.${userId},recipient_email.eq.${context.profile.email}`)
      .order('created_at', { ascending: false }),
    admin
      .from('attendance')
      .select('id, event_id')
      .eq('profile_id', userId),
    admin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .in('status', ['published', 'completed', 'closed']),
    admin
      .from('faculty_options')
      .select('id, name_ar, name_en')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ]);

  if (!profile) {
    redirect('/onboarding/complete-profile');
  }

  // Auto-heal executive positions in database if still marked as generic 'Member'
  if (profile.role === 'president' && (!profile.position || profile.position.toLowerCase() === 'member')) {
    const executivePosition = 'Chapter President & Executive Lead';
    await admin.from('profiles').update({ position: executivePosition }).eq('id', profile.id);
    profile.position = executivePosition;
  } else if (profile.role === 'co_president' && (!profile.position || profile.position.toLowerCase() === 'member')) {
    const executivePosition = 'Chapter Co-President & Executive Lead';
    await admin.from('profiles').update({ position: executivePosition }).eq('id', profile.id);
    profile.position = executivePosition;
  }

  let department = null;
  if (profile.department_id) {
    const { data: dept } = await admin
      .from('departments')
      .select('id, name, code, branch, description')
      .eq('id', profile.department_id)
      .maybeSingle();
    department = dept;
  }

  const memberData: MemberProfileData = {
    ...profile,
    national_id: profile.national_id, // Unmasked for self
    department,
  };

  return (
    <AppShell>
      <div
        style={{
          padding: '2rem 1.5rem 5rem',
          maxWidth: '1100px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <MemberProfileView
          member={memberData}
          callerRole={context.profile.role}
          callerId={userId}
          callerDepartmentId={context.profile.department_id}
          callerBranch={context.profile.department?.branch}
          canViewNationalId={true}
          performanceReviews={performanceReviewsData || []}
          certificates={certificatesData || []}
          eventsAttendedCount={attendanceRowsData?.length || 0}
          totalCompletedEventsCount={totalEventsCount || 0}
          facultyOptions={facultyOptionsData || []}
          isDedicatedProfilePage={true}
        />
      </div>
    </AppShell>
  );
}
