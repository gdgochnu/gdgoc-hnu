import { NextResponse } from 'next/server';
import {
  pingDriveBridge,
  ensureFolderPath,
  uploadFileToDrive,
  listFilesInDrive,
  deleteFileFromDrive,
  getShareableLink,
  callDriveBridge,
} from '@/lib/drive/drive-client';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Test Ping / Health Check
    const pingRes = await pingDriveBridge();
    results['1_ping_health_check'] = {
      pass: pingRes.success && (pingRes.status === 'online' || !!pingRes.rootFolderId),
      success: pingRes.success,
      rootFolderId: pingRes.rootFolderId,
      rootFolderName: pingRes.rootFolderName,
    };

    // 2. Test ensureFolderPath (Hierarchical folder creation)
    const testPath = ['Departments', 'Tech', 'AutomatedTesting'];
    const folderRes = await ensureFolderPath(testPath);
    results['2_ensure_folder_path'] = {
      pass: folderRes.success && !!folderRes.folderId && !!folderRes.folderUrl,
      folderId: folderRes.folderId,
      folderName: folderRes.folderName,
      folderUrl: folderRes.folderUrl,
      path: folderRes.path,
    };

    // 3. Test uploadFileToDrive
    const testContent = Buffer.from('GDGoC HNU OS Test File Content - Phase 13 Step 13.2').toString('base64');
    const uploadRes = await uploadFileToDrive({
      folderId: folderRes.folderId,
      fileName: 'test-agenda.txt',
      mimeType: 'text/plain',
      base64Data: testContent,
      makePublic: true,
    });

    results['3_upload_file'] = {
      pass: uploadRes.success && !!uploadRes.fileId && !!uploadRes.fileUrl,
      fileId: uploadRes.fileId,
      fileName: uploadRes.fileName,
      fileUrl: uploadRes.fileUrl,
      downloadUrl: uploadRes.downloadUrl,
    };

    // 4. Test listFilesInDrive
    const listRes = await listFilesInDrive(folderRes.folderId);
    const hasUploadedFile = (listRes.files as any[])?.some((f: any) => f.id === uploadRes.fileId || f.name === 'test-agenda.txt');

    results['4_list_files'] = {
      pass: listRes.success && !!hasUploadedFile,
      filesCount: listRes.filesCount,
      fileFound: hasUploadedFile,
    };

    // 5. Test getShareableLink
    const linkRes = await getShareableLink(uploadRes.fileId!);
    results['5_get_shareable_link'] = {
      pass: linkRes.success && !!linkRes.shareableUrl,
      shareableUrl: linkRes.shareableUrl,
    };

    // 6. Test deleteFileFromDrive
    const deleteRes = await deleteFileFromDrive(uploadRes.fileId!);
    results['6_delete_file'] = {
      pass: deleteRes.success,
      message: deleteRes.message,
    };

    // 7. Test invalid secret token protection
    const invalidSecretRes = await callDriveBridge('ping', {
      secret: 'INVALID_TAMPERED_SECRET_999',
    });

    results['7_shared_secret_protection'] = {
      pass: invalidSecretRes.success === false || invalidSecretRes.error !== undefined,
      rejected: invalidSecretRes.success === false,
      error: invalidSecretRes.error,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '13.2',
      title: 'Deploy Apps Script as Web App exposing ensureFolderPath, uploadFile, listFiles, deleteFile, getShareableLink',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
