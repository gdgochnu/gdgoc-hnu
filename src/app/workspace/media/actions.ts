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
export async function getAllMediaFiles(departmentIds: string[]): Promise<{
  files: MediaFile[];
  folderUrl?: string;
}> {
  const fileMap = new Map<string, MediaFile>();
  let rootFolderUrl: string | undefined;

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

  // 2. Each department's media folder (named "Media" sub-folder)
  await Promise.all(
    departmentIds.map(async (deptId) => {
      const res = await listEntityFiles('department', deptId);
      if (res.success && res.files.length > 0) {
        const admin = createAdminClient();
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

  return {
    files: Array.from(fileMap.values()).sort(
      (a, b) => new Date(b.dateCreated || 0).getTime() - new Date(a.dateCreated || 0).getTime()
    ),
    folderUrl: rootFolderUrl,
  };
}

/**
 * Server Action: Upload a file to the Media Library or a specific committee folder
 */
export async function uploadMediaFile(
  fileName: string,
  mimeType: string,
  base64Data: string,
  departmentId?: string | null
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

    const entityType = departmentId ? 'department' : 'media_library';
    const res = await uploadEntityFile({
      entityType,
      entityId: departmentId || null,
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
