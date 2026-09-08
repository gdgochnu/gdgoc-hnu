'use server';

import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getOrCreateEntityFolder,
  uploadEntityFile,
  listEntityFiles,
  deleteEntityFile,
  renameEntityFile,
} from '@/app/drive/actions';
import { MediaFile } from '@/components/workspace/MediaLibraryClient';

/**
 * Fetch all media files across all committees for the Central Media Library.
 * Aggregates: media_library (general) + each department's media folder.
 */
export async function getAllMediaFiles(
  departmentIds: string[],
  eventIds: string[] = []
): Promise<{
  files: MediaFile[];
  folderUrl?: string;
}> {
  const fileMap = new Map<string, MediaFile>();
  let rootFolderUrl: string | undefined;
  const admin = createAdminClient();

  // 1. General "Media Library" folder
  const generalRes = await listEntityFiles('media_library', null);
  if (generalRes.success && generalRes.files.length > 0) {
    rootFolderUrl = generalRes.folderUrl;
    for (const f of generalRes.files) {
      const isImg = (f.mimeType || '').startsWith('image/');
      fileMap.set(f.id, {
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        url: f.url,
        downloadUrl: f.downloadUrl,
        thumbnailUrl: f.thumbnailUrl || (isImg ? `/api/workspace/media/thumbnail?id=${f.id}` : undefined),
        dateCreated: f.dateCreated,
        entityType: 'media_library',
        entityId: null,
        entityLabel: 'General',
      });
    }
    if (!rootFolderUrl) rootFolderUrl = generalRes.folderUrl;
  }

  // 2. Each department's media folder
  await Promise.all(
    departmentIds.map(async (deptId) => {
      const res = await listEntityFiles('department', deptId);
      if (res.success && res.files.length > 0) {
        const { data: dept } = await admin
          .from('departments')
          .select('name')
          .eq('id', deptId)
          .maybeSingle();

        for (const f of res.files) {
          if (!fileMap.has(f.id)) {
            const isImg = (f.mimeType || '').startsWith('image/');
            fileMap.set(f.id, {
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size,
              url: f.url,
              downloadUrl: f.downloadUrl,
              thumbnailUrl: f.thumbnailUrl || (isImg ? `/api/workspace/media/thumbnail?id=${f.id}` : undefined),
              dateCreated: f.dateCreated,
              entityType: 'department',
              entityId: deptId,
              entityLabel: dept?.name || deptId,
            });
          }
        }
      }
    })
  );

  // 3. Each event's media folder (Drive /Events/{EventName}/Media-Coverage/)
  await Promise.all(
    eventIds.map(async (eventId) => {
      const res = await listEntityFiles('event', eventId);
      const { data: ev } = await admin
        .from('events')
        .select('title')
        .eq('id', eventId)
        .maybeSingle();

      const eventLabel = ev?.title ? `Event: ${ev.title}` : `Event`;

      if (res.success && res.files.length > 0) {
        for (const f of res.files) {
          if (!fileMap.has(f.id)) {
            const isImg = (f.mimeType || '').startsWith('image/');
            fileMap.set(f.id, {
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              size: f.size,
              url: f.url,
              downloadUrl: f.downloadUrl,
              thumbnailUrl: f.thumbnailUrl || (isImg ? `/api/workspace/media/thumbnail?id=${f.id}` : undefined),
              dateCreated: f.dateCreated,
              entityType: 'event',
              entityId: eventId,
              entityLabel: eventLabel,
            });
          }
        }
      }
    })
  );

  // 4. Also fetch any uploaded event coverage checklist items
  try {
    const { data: coverageItems } = await admin
      .from('event_coverage_items')
      .select('id, event_id, title, drive_file_id, drive_file_url, thumbnail_url, created_at, event:events(id, title)')
      .not('drive_file_id', 'is', null);

    if (coverageItems) {
      for (const cov of coverageItems) {
        if (cov.drive_file_id && !fileMap.has(cov.drive_file_id)) {
          const evTitle = (cov.event as any)?.title || 'Event';
          fileMap.set(cov.drive_file_id, {
            id: cov.drive_file_id,
            name: `${cov.title}`,
            mimeType: 'image/jpeg',
            size: 0,
            url: cov.drive_file_url || `https://drive.google.com/file/d/${cov.drive_file_id}/view`,
            downloadUrl: `https://drive.google.com/uc?export=download&id=${cov.drive_file_id}`,
            thumbnailUrl: cov.thumbnail_url || `/api/workspace/media/thumbnail?id=${cov.drive_file_id}`,
            dateCreated: cov.created_at,
            entityType: 'event',
            entityId: cov.event_id,
            entityLabel: `Event: ${evTitle}`,
          });
        }
      }
    }
  } catch (covErr) {
    // Non-fatal
  }

  return {
    files: Array.from(fileMap.values()).sort(
      (a, b) => new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
    ),
    folderUrl: rootFolderUrl,
  };
}

/**
 * Server Action: Upload a file to the Media Library, a specific committee, or an event folder
 */
export async function uploadMediaFile(
  fileName: string,
  mimeType: string,
  base64Data: string,
  departmentId?: string | null,
  entityTypeParam?: 'media_library' | 'department' | 'event',
  eventIdParam?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(context.profile.role);
    if (!isLeadership) {
      return { success: false, error: 'Only leadership can upload to the Media Library' };
    }

    let entityType: 'media_library' | 'department' | 'event' = 'media_library';
    let entityId: string | null = null;

    if (entityTypeParam === 'event' && eventIdParam) {
      entityType = 'event';
      entityId = eventIdParam;
    } else if (departmentId) {
      entityType = 'department';
      entityId = departmentId;
    }

    const res = await uploadEntityFile({
      entityType,
      entityId,
      fileName,
      mimeType,
      base64Data,
      makePublic: true,
    });

    return { success: res.success, error: res.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Delete a media file from Drive
 */
export async function deleteMediaFile(
  fileId: string,
  entityId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(context.profile.role);
    if (!isLeadership) {
      return { success: false, error: 'Only leadership can delete media files' };
    }

    return await deleteEntityFile(fileId, 'media_library', entityId || null);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Server Action: Rename a media file in Drive
 */
export async function renameMediaFile(
  fileId: string,
  newName: string,
  entityType: 'department' | 'media_library' = 'media_library',
  entityId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return { success: false, error: 'Unauthorized' };
    }

    const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(context.profile.role);
    if (!isLeadership) {
      return { success: false, error: 'Only leadership can rename media files' };
    }

    return await renameEntityFile(fileId, newName, entityType, entityId || null);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
