'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import {
  ensureFolderPath,
  uploadFileToDrive,
  listFilesInDrive,
  deleteFileFromDrive,
  renameFileInDrive,
  getShareableLink,
  DriveFolderResult,
  DriveFileResult,
  DriveListResult,
} from '@/lib/drive/drive-client';

export type DriveEntityType =
  | 'department'
  | 'event'
  | 'member'
  | 'media_library'
  | 'certificates_templates'
  | 'certificates_issued'
  | 'reports';

export interface EntityFolderMapRecord {
  id: string;
  entity_type: DriveEntityType;
  entity_id: string | null;
  drive_folder_id: string;
  drive_folder_url: string;
  created_at: string;
}

/**
 * Get or automatically create and persist a Drive folder for a specific chapter entity
 * (Department, Event, Member, Media Library, Certificate Templates, etc.)
 */
export async function getOrCreateEntityFolder(
  entityType: DriveEntityType,
  entityId?: string | null,
  options?: {
    customFolderTitle?: string;
    parentPath?: string[];
    skipAuthCheck?: boolean;
  }
): Promise<{
  success: boolean;
  folder?: {
    id: string;
    drive_folder_id: string;
    drive_folder_url: string;
    path: string;
  };
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Check existing mapping in database
    let query = admin
      .from('drive_folder_map')
      .select('id, entity_type, entity_id, drive_folder_id, drive_folder_url, created_at')
      .eq('entity_type', entityType);

    if (entityId) {
      query = query.eq('entity_id', entityId);
    } else {
      query = query.is('entity_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing && existing.drive_folder_id) {
      return {
        success: true,
        folder: {
          id: existing.id,
          drive_folder_id: existing.drive_folder_id,
          drive_folder_url: existing.drive_folder_url,
          path: `/${entityType}${entityId ? `/${entityId}` : ''}`,
        },
      };
    }

    // 2. Resolve hierarchical path for entity
    const pathSegments: string[] = options?.parentPath || [];

    switch (entityType) {
      case 'department': {
        pathSegments.push('Departments');
        if (options?.customFolderTitle) {
          pathSegments.push(options.customFolderTitle);
        } else if (entityId) {
          const { data: dept } = await admin
            .from('departments')
            .select('name, code')
            .eq('id', entityId)
            .single();
          pathSegments.push(dept?.name || dept?.code || entityId);
        } else {
          pathSegments.push('General');
        }
        break;
      }

      case 'event': {
        pathSegments.push('Events');
        if (options?.customFolderTitle) {
          pathSegments.push(options.customFolderTitle);
        } else if (entityId) {
          const { data: event } = await admin
            .from('events')
            .select('title, slug')
            .eq('id', entityId)
            .single();
          pathSegments.push(event?.title || event?.slug || entityId);
        } else {
          pathSegments.push('Misc Events');
        }
        break;
      }

      case 'member': {
        pathSegments.push('Members');
        if (options?.customFolderTitle) {
          pathSegments.push(options.customFolderTitle);
        } else if (entityId) {
          const { data: profile } = await admin
            .from('profiles')
            .select('full_name_en, full_name_ar')
            .eq('id', entityId)
            .single();
          pathSegments.push(profile?.full_name_en || profile?.full_name_ar || entityId);
        } else {
          pathSegments.push('General');
        }
        break;
      }

      case 'media_library': {
        pathSegments.push('Media Library');
        if (options?.customFolderTitle) pathSegments.push(options.customFolderTitle);
        break;
      }

      case 'certificates_templates': {
        pathSegments.push('Certificates', 'Templates');
        break;
      }

      case 'certificates_issued': {
        pathSegments.push('Certificates', 'Issued');
        break;
      }

      case 'reports': {
        pathSegments.push('Reports');
        if (options?.customFolderTitle) pathSegments.push(options.customFolderTitle);
        break;
      }

      default: {
        pathSegments.push(String(entityType));
      }
    }

    // 3. Call Google Drive Bridge to create/ensure folder structure
    const bridgeRes = await ensureFolderPath(pathSegments);
    if (!bridgeRes.success || !bridgeRes.folderId) {
      return {
        success: false,
        error: bridgeRes.error || 'Failed to ensure folder on Google Drive',
      };
    }

    // 4. Persist mapping in drive_folder_map table
    let newRecord: any = null;
    const { data: inserted, error: insertError } = await admin
      .from('drive_folder_map')
      .insert({
        entity_type: entityType,
        entity_id: entityId || null,
        drive_folder_id: bridgeRes.folderId,
        drive_folder_url: bridgeRes.folderUrl,
      })
      .select('id, entity_type, entity_id, drive_folder_id, drive_folder_url')
      .single();

    if (insertError) {
      // If already exists or constraint hit, fetch existing record
      let recoveryQuery = admin
        .from('drive_folder_map')
        .select('id, entity_type, entity_id, drive_folder_id, drive_folder_url')
        .eq('entity_type', entityType);

      if (entityId) {
        recoveryQuery = recoveryQuery.eq('entity_id', entityId);
      } else {
        recoveryQuery = recoveryQuery.is('entity_id', null);
      }

      const { data: fetched } = await recoveryQuery.maybeSingle();
      newRecord = fetched;
    } else {
      newRecord = inserted;
    }

    return {
      success: true,
      folder: {
        id: newRecord?.id || bridgeRes.folderId,
        drive_folder_id: bridgeRes.folderId,
        drive_folder_url: bridgeRes.folderUrl,
        path: bridgeRes.path || '/' + pathSegments.join('/'),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Server error creating entity folder',
    };
  }
}

/**
 * Upload a file directly into an entity's Drive folder and log in audit_logs
 */
export async function uploadEntityFile(options: {
  entityType: DriveEntityType;
  entityId?: string | null;
  fileName: string;
  mimeType?: string;
  base64Data: string;
  makePublic?: boolean;
  skipAuthCheck?: boolean;
}): Promise<{
  success: boolean;
  file?: DriveFileResult;
  folderId?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Resolve actor
    let actorId: string | null = null;
    if (!options.skipAuthCheck) {
      const context = await getUserContext();
      if (!context.user) {
        return { success: false, error: 'Unauthorized' };
      }
      actorId = context.profile?.id || context.user.id;
    }

    // 2. Get or create entity folder
    const folderRes = await getOrCreateEntityFolder(options.entityType, options.entityId, {
      skipAuthCheck: options.skipAuthCheck,
    });

    if (!folderRes.success || !folderRes.folder) {
      return { success: false, error: folderRes.error || 'Failed to resolve entity folder' };
    }

    // 3. Upload file via Drive Bridge
    const uploadRes = await uploadFileToDrive({
      folderId: folderRes.folder.drive_folder_id,
      fileName: options.fileName,
      mimeType: options.mimeType,
      base64Data: options.base64Data,
      makePublic: options.makePublic !== false,
    });

    if (!uploadRes.success || !uploadRes.fileId) {
      return { success: false, error: uploadRes.error || 'Drive upload failed' };
    }

    const fileResult: DriveFileResult = {
      fileId: uploadRes.fileId,
      fileName: uploadRes.fileName || options.fileName,
      mimeType: uploadRes.mimeType || options.mimeType || 'application/octet-stream',
      size: uploadRes.size || 0,
      fileUrl: uploadRes.fileUrl || '',
      downloadUrl: uploadRes.downloadUrl || '',
      folderId: folderRes.folder.drive_folder_id,
      folderName: folderRes.folder.path,
    };

    // 4. Immutable Audit Log entry
    try {
      await admin.from('audit_logs').insert({
        actor_id: actorId,
        action: 'drive_file_uploaded',
        entity_type: options.entityType,
        entity_id: options.entityId || null,
        metadata: {
          fileId: fileResult.fileId,
          fileName: fileResult.fileName,
          size: fileResult.size,
          drive_folder_id: folderRes.folder.drive_folder_id,
        },
      });
    } catch (auditErr) {
      // Audit non-fatal to upload
    }

    return {
      success: true,
      file: fileResult,
      folderId: folderRes.folder.drive_folder_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Server error uploading file' };
  }
}

/**
 * List files stored in an entity's Drive folder
 */
export async function listEntityFiles(
  entityType: DriveEntityType,
  entityId?: string | null
): Promise<{
  success: boolean;
  folderUrl?: string;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    url: string;
    downloadUrl: string;
    thumbnailUrl?: string;
    dateCreated?: string;
  }>;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    let query = admin
      .from('drive_folder_map')
      .select('drive_folder_id, drive_folder_url')
      .eq('entity_type', entityType);

    if (entityId) {
      query = query.eq('entity_id', entityId);
    } else {
      query = query.is('entity_id', null);
    }

    const { data: mapping } = await query.maybeSingle();

    if (!mapping || !mapping.drive_folder_id) {
      return { success: true, files: [] };
    }

    const listRes = await listFilesInDrive(mapping.drive_folder_id);

    return {
      success: listRes.success,
      folderUrl: mapping.drive_folder_url,
      files: (listRes.files as any[]) || [],
      error: listRes.error,
    };
  } catch (err: any) {
    return { success: false, files: [], error: err.message };
  }
}

/**
 * Delete a file from Drive and append audit log
 */
export async function deleteEntityFile(
  fileId: string,
  entityType?: DriveEntityType,
  entityId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    const deleteRes = await deleteFileFromDrive(fileId);
    if (!deleteRes.success) {
      return { success: false, error: deleteRes.error };
    }

    try {
      await admin.from('audit_logs').insert({
        actor_id: context.profile?.id || context.user?.id || null,
        action: 'drive_file_deleted',
        entity_type: entityType || 'media_library',
        entity_id: entityId || null,
        metadata: { fileId },
      });
    } catch (auditErr) {
      // Non-fatal
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Rename a file in Drive and append audit log
 */
export async function renameEntityFile(
  fileId: string,
  newName: string,
  entityType?: DriveEntityType,
  entityId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    const renameRes = await renameFileInDrive(fileId, newName);
    if (!renameRes.success) {
      return { success: false, error: renameRes.error };
    }

    try {
      await admin.from('audit_logs').insert({
        actor_id: context.profile?.id || context.user?.id || null,
        action: 'drive_file_renamed',
        entity_type: entityType || 'media_library',
        entity_id: entityId || null,
        metadata: { fileId, newName },
      });
    } catch (auditErr) {
      // Non-fatal
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
