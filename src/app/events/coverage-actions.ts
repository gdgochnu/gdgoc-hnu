'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { getOrCreateEntityFolder, uploadEntityFile, deleteEntityFile } from '@/app/drive/actions';

export interface CoverageItem {
  id: string;
  event_id: string;
  title: string;
  category: 'photo' | 'video' | 'speaker_asset' | 'recap' | 'other';
  phase: 'before' | 'during' | 'after';
  assigned_to: string | null;
  assigned_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  drive_file_id: string | null;
  drive_file_url: string | null;
  thumbnail_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCoverageSummary {
  items: CoverageItem[];
  folderUrl?: string;
  stats: {
    total: number;
    completed: number;
    percentage: number;
    photos: number;
    videos: number;
    speakerAssets: number;
    recaps: number;
  };
}

const DEFAULT_SHOT_LIST: Array<{
  title: string;
  category: 'photo' | 'video' | 'speaker_asset' | 'recap';
  phase: 'before' | 'during' | 'after';
  notes?: string;
}> = [
  { title: 'Venue & Branding Setup (Backdrop, Banners, Roll-ups)', category: 'photo', phase: 'before' },
  { title: 'Registration Desk & Attendee Check-in', category: 'photo', phase: 'before' },
  { title: 'Speaker Assets (Bio Headshots & Presentation Slides Intro)', category: 'speaker_asset', phase: 'before' },
  { title: 'Keynote Speaker Presentation (Wide & Close-up)', category: 'photo', phase: 'during' },
  { title: 'Audience Reactions, Engagement & Atmosphere', category: 'photo', phase: 'during' },
  { title: 'Hands-on Workshop & Live Coding Activities', category: 'photo', phase: 'during' },
  { title: 'Event Highlights B-Roll (Short Video Clips)', category: 'video', phase: 'during' },
  { title: 'Q&A Session & Attendee Questions', category: 'video', phase: 'during' },
  { title: 'All-Hands Grand Group Photo', category: 'photo', phase: 'during' },
  { title: 'Speaker Appreciation & Certificate Presentation', category: 'photo', phase: 'after' },
  { title: 'Attendee Video Testimonials & Quick Interviews', category: 'video', phase: 'after' },
  { title: 'Post-Event Social Media Story & Recap Reels', category: 'recap', phase: 'after' },
];

/**
 * Fetch or seed coverage checklist items and resolve the event's Drive /Media-Coverage/ folder
 */
export async function getEventCoverage(eventId: string): Promise<{
  success: boolean;
  data?: EventCoverageSummary;
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Fetch Event Info to resolve folder hierarchy
    const { data: event } = await admin
      .from('events')
      .select('id, title, event_date')
      .eq('id', eventId)
      .maybeSingle();

    const eventTitle = event?.title || 'Event';

    // 2. Resolve Drive folder: /Events/{EventName}/Media-Coverage/
    let coverageFolderUrl = '';
    try {
      const folderRes = await getOrCreateEntityFolder('event', eventId, {
        customFolderTitle: `${eventTitle}/Media-Coverage`,
        parentPath: ['Events', eventTitle, 'Media-Coverage'],
        skipAuthCheck: true,
      });
      if (folderRes.success && folderRes.folder) {
        coverageFolderUrl = folderRes.folder.drive_folder_url;
      }
    } catch (driveErr) {
      console.warn('[getEventCoverage] Drive folder resolve notice:', driveErr);
    }

    // 3. Fetch Coverage Checklist Items
    let { data: items, error: itemsErr } = await admin
      .from('event_coverage_items')
      .select(`
        *,
        assigned_profile:profiles!event_coverage_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    // In case table is newly created or empty for this event, auto-seed standard shot-list
    if (!itemsErr && (!items || items.length === 0)) {
      const seedRows = DEFAULT_SHOT_LIST.map((tpl) => ({
        event_id: eventId,
        title: tpl.title,
        category: tpl.category,
        phase: tpl.phase,
        notes: tpl.notes || null,
        is_completed: false,
      }));

      const { data: inserted, error: insertErr } = await admin
        .from('event_coverage_items')
        .insert(seedRows)
        .select(`
          *,
          assigned_profile:profiles!event_coverage_items_assigned_to_fkey(id, full_name, avatar_url)
        `);

      if (!insertErr && inserted) {
        items = inserted;
      }
    }

    const coverageList: CoverageItem[] = (items || []).map((it: any) => ({
      id: it.id,
      event_id: it.event_id,
      title: it.title,
      category: it.category,
      phase: it.phase,
      assigned_to: it.assigned_to,
      assigned_profile: it.assigned_profile,
      is_completed: it.is_completed,
      completed_at: it.completed_at,
      completed_by: it.completed_by,
      drive_file_id: it.drive_file_id,
      drive_file_url: it.drive_file_url,
      thumbnail_url: it.thumbnail_url || (it.drive_file_id ? `/api/workspace/media/thumbnail?id=${it.drive_file_id}` : null),
      notes: it.notes,
      created_at: it.created_at,
      updated_at: it.updated_at,
    }));

    // Stats
    const total = coverageList.length;
    const completed = coverageList.filter((i) => i.is_completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const photos = coverageList.filter((i) => i.category === 'photo').length;
    const videos = coverageList.filter((i) => i.category === 'video').length;
    const speakerAssets = coverageList.filter((i) => i.category === 'speaker_asset').length;
    const recaps = coverageList.filter((i) => i.category === 'recap').length;

    return {
      success: true,
      data: {
        items: coverageList,
        folderUrl: coverageFolderUrl,
        stats: {
          total,
          completed,
          percentage,
          photos,
          videos,
          speakerAssets,
          recaps,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error loading event coverage' };
  }
}

/**
 * Toggle coverage checklist item completion status
 */
export async function toggleCoverageItem(
  itemId: string,
  isCompleted: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();
    const actorId = context.profile?.id || context.user?.id || null;

    const { error } = await admin
      .from('event_coverage_items')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? actorId : null,
      })
      .eq('id', itemId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Add a custom coverage checklist shot item
 */
export async function addCoverageItem(
  eventId: string,
  data: {
    title: string;
    category: 'photo' | 'video' | 'speaker_asset' | 'recap' | 'other';
    phase: 'before' | 'during' | 'after';
    assignedTo?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; item?: CoverageItem; error?: string }> {
  try {
    const admin = createAdminClient();
    const { data: inserted, error } = await admin
      .from('event_coverage_items')
      .insert({
        event_id: eventId,
        title: data.title.trim(),
        category: data.category,
        phase: data.phase,
        assigned_to: data.assignedTo || null,
        notes: data.notes?.trim() || null,
        is_completed: false,
      })
      .select(`
        *,
        assigned_profile:profiles!event_coverage_items_assigned_to_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (error || !inserted) {
      return { success: false, error: error?.message || 'Failed to add item' };
    }

    return { success: true, item: inserted };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Delete a coverage checklist item
 */
export async function deleteCoverageItem(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('event_coverage_items').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Upload a photo or video directly to the event's Drive /Media-Coverage/ folder
 * and link it to the coverage item as evidence
 */
export async function uploadCoverageFile(
  eventId: string,
  itemId: string,
  fileData: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }
): Promise<{
  success: boolean;
  driveFileUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const context = await getUserContext();

    // 0. Check if this item already has a file attached; delete old file from Drive upon replacement
    const { data: oldItem } = await admin
      .from('event_coverage_items')
      .select('drive_file_id')
      .eq('id', itemId)
      .maybeSingle();

    if (oldItem?.drive_file_id) {
      try {
        await deleteEntityFile(oldItem.drive_file_id, 'event', eventId);
      } catch (delErr) {
        console.warn('[uploadCoverageFile] Failed to clean up replaced file:', delErr);
      }
    }

    // 1. Upload file into event's Drive folder
    const uploadRes = await uploadEntityFile({
      entityType: 'event',
      entityId: eventId,
      fileName: fileData.fileName,
      mimeType: fileData.mimeType,
      base64Data: fileData.base64Data,
      makePublic: true,
      skipAuthCheck: true,
    });

    if (!uploadRes.success || !uploadRes.file) {
      return { success: false, error: uploadRes.error || 'Failed to upload coverage file to Drive' };
    }

    const driveFile = uploadRes.file;
    const isImg = fileData.mimeType.startsWith('image/');
    const thumb = isImg ? `/api/workspace/media/thumbnail?id=${driveFile.fileId}` : null;

    // 2. Update the coverage checklist item
    const { error: updateErr } = await admin
      .from('event_coverage_items')
      .update({
        drive_file_id: driveFile.fileId,
        drive_file_url: driveFile.fileUrl,
        thumbnail_url: thumb,
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: context.profile?.id || context.user?.id || null,
      })
      .eq('id', itemId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return {
      success: true,
      driveFileUrl: driveFile.fileUrl,
      thumbnailUrl: thumb || undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
