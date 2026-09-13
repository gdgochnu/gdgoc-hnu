import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OnboardingHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not logged in, take to application status portal where they can sign in with Google
  if (!user) {
    redirect('/onboarding/status');
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, status, full_name')
    .eq('id', user.id)
    .maybeSingle();

  // If user hasn't completed their profile yet
  if (!profile || profile.status === 'incomplete' || !profile.full_name) {
    redirect('/onboarding/complete-profile');
  }

  // If member is active and approved, send them directly to the workspace dashboard
  if (profile.status === 'active') {
    redirect('/dashboard');
  }

  // For all other states (pending_review, under_review, changes_requested, rejected)
  redirect('/onboarding/status');
}
