import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/auth/get-user-context';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadEntityFile } from '@/app/drive/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please sign in' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const itemId = (formData.get('itemId') as string | null)?.trim();
    const eventId = (formData.get('eventId') as string | null)?.trim();

    if (!file || !itemId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: file, itemId, or eventId' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';

    // 1. Upload to Event's folder in Google Drive
    const uploadRes = await uploadEntityFile({
      entityType: 'event',
      entityId: eventId,
      fileName: file.name,
      mimeType,
      base64Data,
      makePublic: true,
      skipAuthCheck: true,
    });

    if (!uploadRes.success || !uploadRes.file) {
      return NextResponse.json(
        { success: false, error: uploadRes.error || 'Failed to upload coverage file to Drive' },
        { status: 500 }
      );
    }

    const driveFile = uploadRes.file;
    const isImg = mimeType.startsWith('image/');
    const thumb = isImg ? `/api/workspace/media/thumbnail?id=${driveFile.fileId}` : null;

    // 2. Update the coverage item in Supabase
    const admin = createAdminClient();
    const { error: updateErr } = await admin
      .from('event_coverage_items')
      .update({
        drive_file_id: driveFile.fileId,
        drive_file_url: driveFile.fileUrl,
        thumbnail_url: thumb,
        is_completed: true,
        completed_at: new Date().toISOString(),
        completed_by: context.profile.id,
      })
      .eq('id', itemId);

    if (updateErr) {
      return NextResponse.json(
        { success: false, error: updateErr.message || 'Failed to update item record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      driveFileUrl: driveFile.fileUrl,
      thumbnailUrl: thumb,
      file: {
        id: driveFile.fileId,
        name: driveFile.fileName,
        size: driveFile.size,
        mimeType: driveFile.mimeType,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Server error during coverage upload' },
      { status: 500 }
    );
  }
}
