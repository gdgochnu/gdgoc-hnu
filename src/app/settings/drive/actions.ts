'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import crypto from 'crypto';

export interface DriveSettingsData {
  webAppUrl: string;
  secret: string;
  rootFolderId: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface DriveFolderMappingItem {
  id: string;
  entityType: string;
  entityId: string | null;
  entityName: string;
  driveFolderId: string;
  driveFolderUrl: string;
  createdAt: string;
}

/**
 * Fetch Drive Bridge settings (President-only)
 */
export async function getDriveSettings(options?: { skipAuthCheck?: boolean }): Promise<{
  success: boolean;
  settings?: DriveSettingsData;
  isPresident?: boolean;
  error?: string;
}> {
  try {
    let isPresident = false;
    let actorId: string | null = null;

    if (!options?.skipAuthCheck) {
      const context = await getUserContext();
      if (!context.user || !context.profile || context.profile.status !== 'active') {
        return { success: false, error: 'Unauthorized' };
      }
      isPresident = context.profile.role === 'president' || context.profile.role === 'co_president';
      if (!isPresident) {
        return {
          success: false,
          isPresident: false,
          error: 'Access denied: Drive Bridge settings can only be managed by Chapter Presidents.',
        };
      }
      actorId = context.profile.id;
    } else {
      isPresident = true;
    }

    const admin = createAdminClient();
    const { data: rows, error: fetchErr } = await admin
      .from('system_settings')
      .select('key, value, updated_at, updated_by')
      .in('key', ['drive_bridge_url', 'drive_bridge_secret', 'drive_root_folder_id']);

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }

    let webAppUrl = '';
    let secret = '';
    let rootFolderId = '';
    let updatedAt: string | undefined;
    let updatedBy: string | undefined;

    if (rows) {
      for (const row of rows) {
        if (row.key === 'drive_bridge_url') webAppUrl = row.value || '';
        if (row.key === 'drive_bridge_secret') secret = row.value || '';
        if (row.key === 'drive_root_folder_id') rootFolderId = row.value || '';
        if (row.updated_at && (!updatedAt || row.updated_at > updatedAt)) {
          updatedAt = row.updated_at;
          updatedBy = row.updated_by;
        }
      }
    }

    return {
      success: true,
      isPresident: true,
      settings: {
        webAppUrl,
        secret,
        rootFolderId,
        updatedAt,
        updatedBy,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error fetching drive settings' };
  }
}

/**
 * Save / Update Drive Bridge settings (President-only)
 */
export async function saveDriveSettings(
  data: {
    webAppUrl: string;
    secret: string;
    rootFolderId?: string;
  },
  options?: { skipAuthCheck?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    let actorId: string | null = null;

    if (!options?.skipAuthCheck) {
      const context = await getUserContext();
      if (!context.user || !context.profile || context.profile.status !== 'active') {
        return { success: false, error: 'Unauthorized' };
      }
      const isPresident = context.profile.role === 'president' || context.profile.role === 'co_president';
      if (!isPresident) {
        return { success: false, error: 'Unauthorized: President role required' };
      }
      actorId = context.profile.id;
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const updates = [
      {
        key: 'drive_bridge_url',
        value: data.webAppUrl.trim(),
        description: 'Google Apps Script Web App URL for Google Drive Bridge',
        updated_at: now,
        updated_by: actorId,
      },
      {
        key: 'drive_bridge_secret',
        value: data.secret.trim(),
        description: 'Shared secret token authenticating requests to Drive Bridge Web App',
        updated_at: now,
        updated_by: actorId,
      },
      {
        key: 'drive_root_folder_id',
        value: (data.rootFolderId || '').trim(),
        description: 'Google Drive root folder ID for GDGoC HNU OS Workspace',
        updated_at: now,
        updated_by: actorId,
      },
    ];

    for (const item of updates) {
      const { error: upsertErr } = await admin.from('system_settings').upsert(item, {
        onConflict: 'key',
      });
      if (upsertErr) {
        return { success: false, error: upsertErr.message };
      }
    }

    // Append to immutable audit_logs
    try {
      await admin.from('audit_logs').insert({
        actor_id: actorId,
        action: 'drive_settings_updated',
        entity_type: 'system_settings',
        metadata: {
          hasUrl: !!data.webAppUrl,
          hasSecret: !!data.secret,
          rootFolderId: data.rootFolderId,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error saving drive settings' };
  }
}

/**
 * Generate a cryptographically secure random secret token
 */
export async function generateRandomSecret(): Promise<string> {
  return 'gdgoc_hnu_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Test Drive Bridge connection
 */
export async function testDriveConnection(
  webAppUrl: string,
  secret: string
): Promise<{
  success: boolean;
  pingResult?: any;
  latencyMs?: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const cleanUrl = webAppUrl.trim();
    const cleanSecret = secret.trim();

    if (!cleanUrl) {
      return {
        success: false,
        error: 'Please enter a valid Google Apps Script Web App URL before testing.',
      };
    }

    if (!cleanSecret) {
      return {
        success: false,
        error: 'Please enter a shared secret token before testing.',
      };
    }

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ping',
        secret: cleanSecret,
      }),
      redirect: 'follow',
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        latencyMs,
        error: `Drive Bridge returned HTTP status ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    if (!data.success) {
      return {
        success: false,
        latencyMs,
        error: data.error || 'Drive Bridge reported an error on ping.',
      };
    }

    return {
      success: true,
      latencyMs,
      pingResult: data,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      error: `Connection test failed: ${err.message}. Ensure the Web App is deployed with "Who has access: Anyone" and script property DRIVE_BRIDGE_SECRET is configured.`,
    };
  }
}

/**
 * Retrieve all mapped entities from drive_folder_map
 */
export async function getDriveFolderMappings(): Promise<{
  success: boolean;
  mappings: DriveFolderMappingItem[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    const { data: rows, error } = await admin
      .from('drive_folder_map')
      .select('id, entity_type, entity_id, drive_folder_id, drive_folder_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, mappings: [], error: error.message };
    }

    if (!rows || rows.length === 0) {
      return { success: true, mappings: [] };
    }

    // Resolve human-readable entity names
    const deptIds = rows.filter((r) => r.entity_type === 'department' && r.entity_id).map((r) => r.entity_id);
    const eventIds = rows.filter((r) => r.entity_type === 'event' && r.entity_id).map((r) => r.entity_id);
    const profileIds = rows.filter((r) => r.entity_type === 'member' && r.entity_id).map((r) => r.entity_id);

    const namesMap: Record<string, string> = {};

    if (deptIds.length > 0) {
      const { data: depts } = await admin.from('departments').select('id, name').in('id', deptIds);
      depts?.forEach((d) => (namesMap[d.id] = d.name));
    }

    if (eventIds.length > 0) {
      const { data: events } = await admin.from('events').select('id, title').in('id', eventIds);
      events?.forEach((e) => (namesMap[e.id] = e.title));
    }

    if (profileIds.length > 0) {
      const { data: profiles } = await admin.from('profiles').select('id, full_name_en, full_name_ar').in('id', profileIds);
      profiles?.forEach((p) => (namesMap[p.id] = p.full_name_en || p.full_name_ar || 'Member'));
    }

    const mappings: DriveFolderMappingItem[] = rows.map((r) => {
      let entityName = '';
      if (r.entity_id && namesMap[r.entity_id]) {
        entityName = namesMap[r.entity_id];
      } else {
        entityName = r.entity_type
          .split('_')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      return {
        id: r.id,
        entityType: r.entity_type,
        entityId: r.entity_id,
        entityName,
        driveFolderId: r.drive_folder_id,
        driveFolderUrl: r.drive_folder_url,
        createdAt: r.created_at,
      };
    });

    return {
      success: true,
      mappings,
    };
  } catch (err: any) {
    return { success: false, mappings: [], error: err.message };
  }
}
