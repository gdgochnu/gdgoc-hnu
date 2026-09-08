import { NextRequest, NextResponse } from 'next/server';
import { getUserContext } from '@/lib/auth/get-user-context';
import { uploadEntityFile } from '@/app/drive/actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const context = await getUserContext();
    if (!context.user || !context.profile) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Please sign in' }, { status: 401 });
    }

    const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(context.profile.role);
    if (!isLeadership) {
      return NextResponse.json({ success: false, error: 'Only leadership can upload to the Media Library' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const customName = (formData.get('fileName') as string | null)?.trim();
    const targetType = (formData.get('targetType') as string | null)?.trim() || (formData.get('departmentId') ? 'department' : 'media_library');
    const targetId = (formData.get('targetId') as string | null)?.trim() || (formData.get('departmentId') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const finalFileName = customName || file.name;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';

    const entityType = targetType === 'event' ? 'event' : targetType === 'department' ? 'department' : 'media_library';
    const entityId = targetType === 'media_library' ? null : targetId;

    const uploadRes = await uploadEntityFile({
      entityType,
      entityId,
      fileName: finalFileName,
      mimeType,
      base64Data,
      makePublic: true,
    });

    if (!uploadRes.success || !uploadRes.file) {
      return NextResponse.json({ success: false, error: uploadRes.error || 'Failed to upload file to Drive' }, { status: 500 });
    }

    const isImg = mimeType.startsWith('image/');
    return NextResponse.json({
      success: true,
      file: {
        id: uploadRes.file.fileId,
        name: uploadRes.file.fileName,
        mimeType: uploadRes.file.mimeType,
        size: uploadRes.file.size,
        url: uploadRes.file.fileUrl,
        downloadUrl: uploadRes.file.downloadUrl,
        thumbnailUrl: isImg ? `/api/workspace/media/thumbnail?id=${uploadRes.file.fileId}` : undefined,
        dateCreated: new Date().toISOString(),
        entityType,
        entityId: entityId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Server error during upload' }, { status: 500 });
  }
}
