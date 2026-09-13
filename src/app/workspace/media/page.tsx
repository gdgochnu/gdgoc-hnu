import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { MediaLibraryClient } from '@/components/workspace/MediaLibraryClient';
import { MediaLibrarySkeleton } from '@/components/skeletons/MediaLibrarySkeleton';
import { getAllMediaFiles, uploadMediaFile, deleteMediaFile, renameMediaFile } from '@/app/workspace/media/actions';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function MediaFilesLoader({
  deptIds,
  eventIds,
  isLeadership,
  departments,
  events,
}: {
  deptIds: string[];
  eventIds: string[];
  isLeadership: boolean;
  departments: { id: string; name: string; code: string }[];
  events: { id: string; title: string }[];
}) {
  const { files, folderUrl } = await getAllMediaFiles(deptIds, eventIds);

  return (
    <MediaLibraryClient
      initialFiles={files}
      folderUrl={folderUrl}
      canUpload={isLeadership}
      canDelete={isLeadership}
      departments={departments}
      events={events}
      onUpload={async (
        file: File,
        targetId: string | null,
        customName?: string,
        targetType?: 'media_library' | 'department' | 'event'
      ) => {
        'use server';
        const finalName = customName?.trim() || file.name;
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString('base64');
        return uploadMediaFile(
          finalName,
          file.type || 'application/octet-stream',
          base64,
          targetType === 'department' ? targetId : null,
          targetType || (targetId ? 'department' : 'media_library'),
          targetType === 'event' ? targetId : null
        );
      }}
      onDelete={async (fileId: string) => {
        'use server';
        return deleteMediaFile(fileId);
      }}
      onRename={async (fileId: string, newName: string, entityType?: string, entityId?: string | null) => {
        'use server';
        return renameMediaFile(fileId, newName, (entityType as any) || 'media_library', entityId);
      }}
      onRefresh={async () => {
        'use server';
        const { files: updated } = await getAllMediaFiles(deptIds, eventIds, true);
        return updated;
      }}
    />
  );
}

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

  // Fast parallel metadata queries
  const [{ data: deptsData }, { data: eventsData }] = await Promise.all([
    admin.from('departments').select('id, name, code, branch').order('name', { ascending: true }),
    admin.from('events').select('id, title, event_date').order('event_date', { ascending: false }),
  ]);

  const departments = (deptsData || []).map((d) => ({ id: d.id, name: d.name, code: d.code }));
  const events = (eventsData || []).map((e) => ({ id: e.id, title: e.title }));
  const deptIds = departments.map((d) => d.id);
  const eventIds = events.map((e) => e.id);

  return (
    <AppShell>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Suspense fallback={<MediaLibrarySkeleton />}>
          <MediaFilesLoader
            deptIds={deptIds}
            eventIds={eventIds}
            isLeadership={isLeadership}
            departments={departments}
            events={events}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
