import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MediaLibraryClient } from '@/components/workspace/MediaLibraryClient';
import { getAllMediaFiles, uploadMediaFile, deleteMediaFile } from '@/app/workspace/media/actions';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MediaLibraryPage() {
  const context = await getUserContext();
  const admin = createAdminClient();

  if (!context.user || !context.profile) {
    return (
      <AppShell>
        <div style={{ maxWidth: '540px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
            <ShieldAlert size={32} color="var(--google-red)" style={{ marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Sign In Required</h1>
            <Link href="/" className="btn-primary">Return to Home</Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const profile = context.profile;
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(profile.role);

  // Fetch all departments
  const { data: deptsData } = await admin
    .from('departments')
    .select('id, name, code, branch')
    .order('name', { ascending: true });
  const departments = deptsData || [];
  const deptIds = departments.map((d) => d.id);

  // Load all media files across committees
  const { files, folderUrl } = await getAllMediaFiles(deptIds);

  return (
    <AppShell>
      <MediaLibraryClient
        initialFiles={files}
        folderUrl={folderUrl}
        canUpload={isLeadership}
        canDelete={isLeadership}
        departments={departments.map((d) => ({ id: d.id, name: d.name, code: d.code }))}
        onUpload={async (file: File, departmentId: string | null) => {
          'use server';
          // Read file as base64
          const buffer = Buffer.from(await file.arrayBuffer());
          const base64 = buffer.toString('base64');
          return uploadMediaFile(file.name, file.type || 'application/octet-stream', base64, departmentId);
        }}
        onDelete={async (fileId: string) => {
          'use server';
          return deleteMediaFile(fileId);
        }}
        onRefresh={async () => {
          'use server';
          const { files: updated } = await getAllMediaFiles(deptIds);
          return updated;
        }}
      />
    </AppShell>
  );
}
