import { NextResponse } from 'next/server';
import {
  getOrCreateEntityFolder,
  uploadEntityFile,
  listEntityFiles,
  deleteEntityFile,
} from '@/app/drive/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const admin = createAdminClient();
    const testEntityId = '11111111-2222-3333-4444-555555555555';

    // 1. Test getOrCreateEntityFolder for an event
    const folderRes = await getOrCreateEntityFolder('event', testEntityId, {
      customFolderTitle: 'Integration Test Hackathon',
      skipAuthCheck: true,
    });

    results['1_get_or_create_entity_folder'] = {
      pass: folderRes.success && !!folderRes.folder?.drive_folder_id,
      folder: folderRes.folder,
    };

    // 2. Test DB persistence in drive_folder_map table
    const { data: dbMapRecord } = await admin
      .from('drive_folder_map')
      .select('id, entity_type, entity_id, drive_folder_id, drive_folder_url')
      .eq('entity_type', 'event')
      .eq('entity_id', testEntityId)
      .maybeSingle();

    results['2_persisted_in_drive_folder_map'] = {
      pass: !!dbMapRecord && !!dbMapRecord.drive_folder_id,
      record: dbMapRecord,
    };

    // 3. Test uploadEntityFile
    const dummyBase64 = Buffer.from('Hackathon Rules and Guidelines v1.0').toString('base64');
    const uploadRes = await uploadEntityFile({
      entityType: 'event',
      entityId: testEntityId,
      fileName: 'hackathon-rules.txt',
      mimeType: 'text/plain',
      base64Data: dummyBase64,
      skipAuthCheck: true,
    });

    results['3_upload_entity_file'] = {
      pass: uploadRes.success && !!uploadRes.file?.fileId,
      file: uploadRes.file,
    };

    // 4. Test listEntityFiles
    const listRes = await listEntityFiles('event', testEntityId);
    const foundUploaded = listRes.files?.some(
      (f: any) => f.id === uploadRes.file?.fileId || f.name === 'hackathon-rules.txt'
    );

    results['4_list_entity_files'] = {
      pass: listRes.success && !!foundUploaded,
      filesCount: listRes.files?.length || 0,
      foundUploaded,
    };

    // 5. Test Audit Log insertion
    const { data: auditLogs } = await admin
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at')
      .eq('action', 'drive_file_uploaded')
      .eq('entity_type', 'event')
      .eq('entity_id', testEntityId)
      .order('created_at', { ascending: false })
      .limit(1);

    results['5_audit_log_persisted'] = {
      pass: !!auditLogs && auditLogs.length > 0,
      auditLog: auditLogs?.[0] || null,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '13.3',
      title: 'Build server-side API Route/Server Action client calling Web App and storing in drive_folder_map',
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
