import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PendingCertificatesRedirect() {
  redirect('/student-portal/admin/certificates');
}
