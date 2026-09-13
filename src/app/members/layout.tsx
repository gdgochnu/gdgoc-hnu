import { AppShell } from '@/components/layout/AppShell';

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
