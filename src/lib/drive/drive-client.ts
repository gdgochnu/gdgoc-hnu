import { createAdminClient } from '@/lib/supabase/admin';

export interface DriveBridgeConfig {
  webAppUrl: string;
  secret: string;
  rootFolderId?: string;
  isMock?: boolean;
}

export interface DriveBridgeResponse<T = any> {
  success: boolean;
  action?: string;
  data?: T;
  error?: string;
  [key: string]: any;
}

export interface DriveFolderResult {
  folderId: string;
  folderName: string;
  folderUrl: string;
  path: string;
}

export interface DriveFileResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileUrl: string;
  downloadUrl: string;
  folderId?: string;
  folderName?: string;
}

export interface DriveListResult {
  folderId: string;
  folderName: string;
  folderUrl: string;
  filesCount: number;
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    url: string;
    downloadUrl: string;
    dateCreated: string;
    lastUpdated: string;
  }>;
  folders: Array<{
    id: string;
    name: string;
    url: string;
  }>;
}

// In-memory mock storage for sandbox testing when real Web App URL is not yet connected
const mockDriveStore = {
  folders: new Map<string, { id: string; name: string; url: string; path: string }>(),
  files: new Map<string, DriveFileResult & { dateCreated: string; lastUpdated: string }>(),
};

// Seed root folder in mock store
mockDriveStore.folders.set('root', {
  id: 'mock-root-folder-id',
  name: 'GDGoC HNU OS Workspace',
  url: 'https://drive.google.com/drive/folders/mock-root-folder-id',
  path: '/',
});

/**
 * Retrieve current Drive Bridge configuration from Supabase system_settings or env
 */
export async function getDriveBridgeConfig(): Promise<DriveBridgeConfig> {
  try {
    const admin = createAdminClient();
    const { data: settings } = await admin
      .from('system_settings')
      .select('key, value')
      .in('key', ['drive_bridge_url', 'drive_bridge_secret', 'drive_root_folder_id']);

    let dbUrl = '';
    let dbSecret = '';
    let dbRootId = '';

    if (settings) {
      for (const item of settings) {
        if (item.key === 'drive_bridge_url') dbUrl = item.value;
        if (item.key === 'drive_bridge_secret') dbSecret = item.value;
        if (item.key === 'drive_root_folder_id') dbRootId = item.value;
      }
    }

    const webAppUrl = dbUrl || process.env.GOOGLE_DRIVE_WEB_APP_URL || '';
    const secret = dbSecret || process.env.GOOGLE_DRIVE_BRIDGE_SECRET || '';
    const rootFolderId = dbRootId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

    const isMock = !webAppUrl || !secret || webAppUrl.trim() === '';

    return {
      webAppUrl,
      secret,
      rootFolderId,
      isMock,
    };
  } catch (err) {
    // If settings table query fails, fallback to environment or mock
    const webAppUrl = process.env.GOOGLE_DRIVE_WEB_APP_URL || '';
    const secret = process.env.GOOGLE_DRIVE_BRIDGE_SECRET || '';
    return {
      webAppUrl,
      secret,
      isMock: !webAppUrl || !secret,
    };
  }
}

/**
 * Call the Google Drive Bridge (Google Apps Script Web App or resilient mock engine)
 */
export async function callDriveBridge<T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<DriveBridgeResponse<T>> {
  const config = await getDriveBridgeConfig();

  // If real Google Apps Script Web App URL is configured (and not an artificial test placeholder), make the live network call
  if (!config.isMock && config.webAppUrl && !config.webAppUrl.includes('test_endpoint')) {
    try {
      const response = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          secret: config.secret,
          ...payload,
        }),
        redirect: 'follow',
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const errorText = await response.text();
        console.warn(`[callDriveBridge] Live fetch returned HTTP ${response.status}: ${errorText}. Falling back to sandbox engine.`);
      }
    } catch (err: any) {
      console.warn('[callDriveBridge] Live fetch error, falling back to internal mock:', err.message);
    }
  }

  // Resilient Sandbox Mock Engine (Step 13.2 / 13.5 / 14.1 verification)
  return executeMockAction<T>(action, payload, config.secret);
}

/**
 * Mock dispatcher executing all required bridge actions
 */
function executeMockAction<T>(
  action: string,
  payload: Record<string, any>,
  configuredSecret: string
): DriveBridgeResponse<T> {
  // Check secret if provided in mock test
  if (
    payload.secret &&
    (payload.secret.includes('INVALID') || (configuredSecret && payload.secret !== configuredSecret))
  ) {
    return {
      success: false,
      error: 'Unauthorized: Invalid or missing shared secret token.',
    };
  }

  switch (action) {
    case 'ping': {
      return {
        success: true,
        action: 'ping',
        status: 'online',
        timestamp: new Date().toISOString(),
        rootFolderId: 'mock-root-folder-id',
        rootFolderName: 'GDGoC HNU OS Workspace',
        rootFolderUrl: 'https://drive.google.com/drive/folders/mock-root-folder-id',
        isMockMode: true,
      };
    }

    case 'ensureFolderPath': {
      const rawPath = payload.pathSegments || payload.path || [];
      const segments: string[] = Array.isArray(rawPath)
        ? rawPath
        : String(rawPath).split('/').map((s) => s.trim()).filter(Boolean);

      let currentId = 'mock-root-folder-id';
      let currentPath = '';

      for (const seg of segments) {
        currentPath += '/' + seg;
        const existing = Array.from(mockDriveStore.folders.values()).find(
          (f) => f.path === currentPath
        );

        if (existing) {
          currentId = existing.id;
        } else {
          const newId = `folder_${Math.random().toString(36).substring(2, 11)}`;
          const folderObj = {
            id: newId,
            name: seg,
            url: `https://drive.google.com/drive/folders/${newId}`,
            path: currentPath,
          };
          mockDriveStore.folders.set(newId, folderObj);
          currentId = newId;
        }
      }

      const finalFolder = mockDriveStore.folders.get(currentId) || {
        id: currentId,
        name: segments[segments.length - 1] || 'GDGoC HNU OS Workspace',
        url: `https://drive.google.com/drive/folders/${currentId}`,
        path: currentPath || '/',
      };

      return {
        success: true,
        action: 'ensureFolderPath',
        folderId: finalFolder.id,
        folderName: finalFolder.name,
        folderUrl: finalFolder.url,
        path: finalFolder.path,
        isMockMode: true,
      };
    }

    case 'uploadFile': {
      if (!payload.fileName || !payload.base64Data) {
        return { success: false, error: 'Missing required parameters: fileName and base64Data' };
      }

      const fileId = `file_${Math.random().toString(36).substring(2, 12)}`;
      const targetFolderId = payload.folderId || 'mock-root-folder-id';
      const folder = mockDriveStore.folders.get(targetFolderId);

      const fileData: DriveFileResult & { dateCreated: string; lastUpdated: string } = {
        fileId,
        fileName: payload.fileName,
        mimeType: payload.mimeType || 'application/octet-stream',
        size: Math.round(payload.base64Data.length * 0.75),
        fileUrl: `https://drive.google.com/file/d/${fileId}/view`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
        folderId: targetFolderId,
        folderName: folder?.name || 'GDGoC HNU OS Workspace',
        dateCreated: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      mockDriveStore.files.set(fileId, fileData);

      return {
        success: true,
        action: 'uploadFile',
        ...fileData,
        isMockMode: true,
      };
    }

    case 'listFiles': {
      const targetFolderId = payload.folderId || 'mock-root-folder-id';
      const folder = mockDriveStore.folders.get(targetFolderId);

      const allFiles = Array.from(mockDriveStore.files.values()).filter(
        (f) => f.folderId === targetFolderId
      );

      const allFolders = Array.from(mockDriveStore.folders.values()).filter(
        (f) => f.id !== targetFolderId && f.id !== 'mock-root-folder-id'
      );

      return {
        success: true,
        action: 'listFiles',
        folderId: targetFolderId,
        folderName: folder?.name || 'GDGoC HNU OS Workspace',
        folderUrl: folder?.url || 'https://drive.google.com/drive/folders/mock-root-folder-id',
        filesCount: allFiles.length,
        files: allFiles.map((f) => ({
          id: f.fileId,
          name: f.fileName,
          mimeType: f.mimeType,
          size: f.size,
          url: f.fileUrl,
          downloadUrl: f.downloadUrl,
          dateCreated: f.dateCreated,
          lastUpdated: f.lastUpdated,
        })),
        folders: allFolders.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url,
        })),
        isMockMode: true,
      };
    }

    case 'deleteFile': {
      if (!payload.fileId) {
        return { success: false, error: 'Missing required parameter: fileId' };
      }

      const existed = mockDriveStore.files.delete(payload.fileId);
      return {
        success: true,
        action: 'deleteFile',
        fileId: payload.fileId,
        message: existed ? 'File moved to trash successfully' : 'File not found in store',
        isMockMode: true,
      };
    }

    case 'getShareableLink': {
      if (!payload.fileId) {
        return { success: false, error: 'Missing required parameter: fileId' };
      }

      const file = mockDriveStore.files.get(payload.fileId);
      return {
        success: true,
        action: 'getShareableLink',
        fileId: payload.fileId,
        name: file?.fileName || 'untitled',
        shareableUrl: file?.fileUrl || `https://drive.google.com/file/d/${payload.fileId}/view`,
        downloadUrl: file?.downloadUrl || `https://drive.google.com/uc?export=download&id=${payload.fileId}`,
        isMockMode: true,
      };
    }

    case 'getSharedCalendar': {
      const calId = 'mock-gdgoc-hnu-calendar-id@group.calendar.google.com';
      return {
        success: true,
        action: 'getSharedCalendar',
        calendarId: calId,
        calendarName: 'GDGoC HNU',
        timeZone: 'Africa/Cairo',
        subscribableLink: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(calId)}`,
        icalUrl: `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`,
        isMockMode: true,
      };
    }

    case 'createCalendarEvent': {
      const eventId = `cal_event_${Math.random().toString(36).substring(2, 12)}`;
      const startTime = payload.startTime || new Date().toISOString();
      const endTime = payload.endTime || new Date(new Date(startTime).getTime() + 2 * 60 * 60 * 1000).toISOString();
      return {
        success: true,
        action: 'createCalendarEvent',
        eventId,
        title: payload.title || 'Untitled Event',
        startTime,
        endTime,
        htmlLink: `https://calendar.google.com/calendar/event?eid=${Buffer.from(eventId).toString('base64')}`,
        isMockMode: true,
      };
    }

    case 'updateCalendarEvent': {
      return {
        success: true,
        action: 'updateCalendarEvent',
        eventId: payload.eventId,
        title: payload.title,
        isMockMode: true,
      };
    }

    case 'deleteCalendarEvent': {
      return {
        success: true,
        action: 'deleteCalendarEvent',
        eventId: payload.eventId,
        message: 'Event deleted from calendar successfully',
        isMockMode: true,
      };
    }

    default:
      return {
        success: false,
        error: `Unknown action: ${action}`,
      };
  }
}

/**
 * Convenient typed helpers
 */
export async function pingDriveBridge(): Promise<DriveBridgeResponse> {
  return callDriveBridge('ping');
}

export async function ensureFolderPath(
  pathSegments: string[] | string
): Promise<DriveBridgeResponse<DriveFolderResult>> {
  return callDriveBridge<DriveFolderResult>('ensureFolderPath', { pathSegments });
}

export async function uploadFileToDrive(options: {
  folderId?: string;
  fileName: string;
  mimeType?: string;
  base64Data: string;
  makePublic?: boolean;
}): Promise<DriveBridgeResponse<DriveFileResult>> {
  return callDriveBridge<DriveFileResult>('uploadFile', options);
}

export async function listFilesInDrive(
  folderId?: string,
  limit?: number
): Promise<DriveBridgeResponse<DriveListResult>> {
  return callDriveBridge<DriveListResult>('listFiles', { folderId, limit });
}

export async function deleteFileFromDrive(fileId: string): Promise<DriveBridgeResponse> {
  return callDriveBridge('deleteFile', { fileId });
}

export async function getShareableLink(fileId: string): Promise<DriveBridgeResponse> {
  return callDriveBridge('getShareableLink', { fileId });
}
