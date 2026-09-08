import { NextResponse } from 'next/server';
import {
  getOrCreateEntityFolder,
  uploadEntityFile,
  listEntityFiles,
  deleteEntityFile,
} from '@/app/drive/actions';
import { createAdminClient } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const admin = createAdminClient();

    // 1. Verify DriveFileUploadModal component exists
    const modalPath = path.join(process.cwd(), 'src/components/drive/DriveFileUploadModal.tsx');
    const modalExists = fs.existsSync(modalPath);
    const modalContent = modalExists ? fs.readFileSync(modalPath, 'utf8') : '';
    const hasDropzone = modalContent.includes('handleDrop') && modalContent.includes('UploadCloud');
    const hasFileReader = modalContent.includes('readAsDataURL') && modalContent.includes('base64Content');

    results['1_upload_modal_component'] = {
      pass: modalExists && hasDropzone && hasFileReader,
      modalExists,
      hasDropzone,
      hasFileReader,
    };

    // 2. Test End-to-End: Department Subfolder & File Upload
    const deptId = '22222222-3333-4444-5555-666666666666';
    const deptFolderRes = await getOrCreateEntityFolder('department', deptId, {
      customFolderTitle: 'Web Development Committee',
      skipAuthCheck: true,
    });

    const deptUploadRes = await uploadEntityFile({
      entityType: 'department',
      entityId: deptId,
      fileName: 'web-curriculum-v2.pdf',
      mimeType: 'application/pdf',
      base64Data: Buffer.from('GDGoC Web Development Curriculum 2026').toString('base64'),
      skipAuthCheck: true,
    });

    const deptFilesList = await listEntityFiles('department', deptId);
    const deptFileFound = deptFilesList.files?.some((f: any) => f.id === deptUploadRes.file?.fileId);

    results['2_department_folder_and_upload_e2e'] = {
      pass:
        deptFolderRes.success &&
        deptUploadRes.success &&
        deptUploadRes.folderId === deptFolderRes.folder?.drive_folder_id &&
        deptFileFound,
      folderId: deptFolderRes.folder?.drive_folder_id,
      uploadedFileId: deptUploadRes.file?.fileId,
      inSubfolder: deptUploadRes.folderId === deptFolderRes.folder?.drive_folder_id,
      listedInFolder: deptFileFound,
    };

    // 3. Test End-to-End: Media Library Subfolder & File Upload
    const mediaFolderRes = await getOrCreateEntityFolder('media_library', null, {
      customFolderTitle: 'Branding & Press Kit',
      skipAuthCheck: true,
    });

    const mediaUploadRes = await uploadEntityFile({
      entityType: 'media_library',
      entityId: null,
      fileName: 'gdgoc-banner-4k.png',
      mimeType: 'image/png',
      base64Data: Buffer.from('FAKE_PNG_BINARY_DATA_BANNER').toString('base64'),
      skipAuthCheck: true,
    });

    const mediaFilesList = await listEntityFiles('media_library', null);
    const mediaFileFound = mediaFilesList.files?.some((f: any) => f.id === mediaUploadRes.file?.fileId);

    results['3_media_library_folder_and_upload_e2e'] = {
      pass:
        mediaFolderRes.success &&
        mediaUploadRes.success &&
        mediaUploadRes.folderId === mediaFolderRes.folder?.drive_folder_id &&
        mediaFileFound,
      folderId: mediaFolderRes.folder?.drive_folder_id,
      uploadedFileId: mediaUploadRes.file?.fileId,
      inSubfolder: mediaUploadRes.folderId === mediaFolderRes.folder?.drive_folder_id,
      listedInFolder: mediaFileFound,
    };

    // 4. Test Audit Logging across operations
    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id')
      .eq('action', 'drive_file_uploaded')
      .in('entity_type', ['department', 'media_library'])
      .limit(5);

    results['4_audit_logs_verified'] = {
      pass: !!auditLogs && auditLogs.length >= 2,
      auditRecordsCount: auditLogs?.length || 0,
    };

    // 5. Test File Deletion cleanup
    if (mediaUploadRes.file?.fileId) {
      const deleteRes = await deleteEntityFile(mediaUploadRes.file.fileId, 'media_library', null);
      const afterDeleteList = await listEntityFiles('media_library', null);
      const stillPresent = afterDeleteList.files?.some((f: any) => f.id === mediaUploadRes.file?.fileId);

      results['5_delete_file_cleanup_e2e'] = {
        pass: deleteRes.success && !stillPresent,
        deleteSuccess: deleteRes.success,
        removedFromListing: !stillPresent,
      };
    } else {
      results['5_delete_file_cleanup_e2e'] = {
        pass: false,
        error: 'Media file upload failed earlier',
      };
    }

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '13.5',
      title: 'Confirm end-to-end: uploading a file creates it in the correct auto-created Drive subfolder',
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
