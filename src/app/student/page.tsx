import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getCurrentStudentProfile } from '@/app/student/actions';
import { isStudentProfileComplete } from '@/lib/student/profile-validation';

export const dynamic = 'force-dynamic';

export default async function StudentRedirectPage() {
  const context = await getUserContext().catch(() => null);
  if (!context?.user) {
    redirect('/');
  }

  const res = await getCurrentStudentProfile().catch(() => null);
  if (res?.success && isStudentProfileComplete(res.student)) {
    redirect('/student/dashboard');
  } else {
    redirect('/student/onboarding');
  }
}
