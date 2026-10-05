import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth/get-user-context';

export const dynamic = 'force-dynamic';

export default async function StudentCommunityPage() {
  const context = await getUserContext().catch(() => null);
  const role = context?.profile?.role;

  if (role === 'president' || role === 'co_president') {
    redirect('/student-portal/admin/students');
  }

  redirect('/student');
}

