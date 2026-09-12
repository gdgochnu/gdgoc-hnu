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
import { listFilesInDrive } from '@/lib/drive/drive-client';
import { MediaFile } from '@/components/workspace/MediaLibraryClient';

// In-memory cache for media files to avoid repeated Apps Script round-trips
interface CachedMedia {
  timestamp: number;
  files: MediaFile[];
  folderUrl?: string;
}
let mediaCache: CachedMedia | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function invalidateMediaCache() {
  mediaCache = null;
}

/**
 * Fetch all media files across all committees for the Central Media Library.
 * Aggregates: media_library (general) + each department's media folder + event media folders.
 */
export async function getAllMediaFiles(
  departmentIds?: string[],
  eventIds?: string[],
  forceRefresh: boolean = false
): Promise<{
  files: MediaFile[];
  folderUrl?: string;
}> {
  if (!forceRefresh && mediaCache && (Date.now() - mediaCache.timestamp < CACHE_TTL_MS)) {
    return { files: mediaCache.files, folderUrl: mediaCache.folderUrl };
  }

  const fileMap = new Map<string, MediaFile>();
  let rootFolderUrl: string | undefined;
  const admin = createAdminClient();

  // 1. Fetch departments and events metadata for clear labeling
  const [{ data: deptsData }, { data: eventsData }, { data: mappings }] = await Promise.all([
    admin.from('departments').select('id, name'),
    admin.from('events').select('id, title'),
    admin.from('drive_folder_map').select('id, entity_type, entity_id, drive_folder_id, drive_folder_url'),
  ]);

  const deptMap = new Map((deptsData || []).map((d) => [d.id, d.name]));
  const eventMap = new Map((eventsData || []).map((e) => [e.id, e.title]));

  // 2. Filter mappings to valid real Drive folders
  const validMappings = (mappings || []).filter(
    (m) =>
      m.drive_folder_id &&
      !m.drive_folder_id.startsWith('folder_') &&
      !m.drive_folder_id.startsWith('mock-')
  );

  // 3. Query all valid mapped Drive folders sequentially to respect Google Apps Script concurrency
  for (const mapping of validMappings) {
    try {
      let res = await listFilesInDrive(mapping.drive_folder_id);

      if (res.success && Array.isArray(res.files)) {
        if (mapping.entity_type === 'media_library' && !rootFolderUrl) {
          rootFolderUrl = mapping.drive_folder_url || res.folderUrl;
        }

        let label = 'General';
        if (mapping.entity_type === 'department') {
          label = deptMap.get(mapping.entity_id || '') || 'Department';
        } else if (mapping.entity_type === 'event') {
          label = `Event: ${eventMap.get(mapping.entity_id || '') || 'Event'}`;
        }

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
              entityType: mapping.entity_type,
              entityId: mapping.entity_id,
              entityLabel: label,
            });
          }
        }
      }
    } catch (folderErr: any) {
      console.warn(`[getAllMediaFiles] Error fetching folder ${mapping.drive_folder_id}:`, folderErr.message);
    }
  }

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

  const finalFiles = Array.from(fileMap.values()).sort(
    (a, b) => new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
  );

  mediaCache = {
    timestamp: Date.now(),
    files: finalFiles,
    folderUrl: rootFolderUrl,
  };

  return {
    files: finalFiles,
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

    if (res.success) {
      invalidateMediaCache();
    }

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

    const res = await deleteEntityFile(fileId, 'media_library', entityId || null);
    if (res.success) {
      invalidateMediaCache();
    }
    return res;
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

    const res = await renameEntityFile(fileId, newName, entityType, entityId || null);
    if (res.success) {
      invalidateMediaCache();
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
