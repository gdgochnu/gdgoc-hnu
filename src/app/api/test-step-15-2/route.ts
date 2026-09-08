import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify MediaLibraryClient component exists with key features
    const clientPath = path.join(process.cwd(), 'src', 'components', 'workspace', 'MediaLibraryClient.tsx');
    const clientExists = fs.existsSync(clientPath);
    let clientContent = '';
    if (clientExists) clientContent = fs.readFileSync(clientPath, 'utf8');

    const hasGridView = clientContent.includes("viewMode === 'grid'");
    const hasListView = clientContent.includes('/* List View */') || clientContent.includes("'grid' | 'list'");
    const hasUploadZone = clientContent.includes('id="media-upload-zone"');
    const hasDragDrop = clientContent.includes('onDragOver') && clientContent.includes('onDrop');
    const hasSearchInput = clientContent.includes('id="media-search-input"');
    const hasTypeFilter = clientContent.includes('id="media-type-filter"');
    const hasDeptFilter = clientContent.includes('id="media-dept-filter"');
    const hasRefreshBtn = clientContent.includes('id="media-refresh-btn"');
    const hasDeleteHandler = clientContent.includes('handleDelete');
    const hasUploadConfirmBtn = clientContent.includes('id="media-upload-confirm-btn"');

    results['1_media_library_client'] = {
      pass: clientExists && hasGridView && hasListView && hasUploadZone && hasDragDrop && hasSearchInput && hasTypeFilter && hasDeptFilter && hasRefreshBtn && hasDeleteHandler,
      clientExists,
      hasGridView,
      hasListView,
      hasUploadZone,
      hasDragDrop,
      hasSearchInput,
      hasTypeFilter,
      hasDeptFilter,
      hasRefreshBtn,
      hasDeleteHandler,
      hasUploadConfirmBtn,
    };

    // 2. Verify server actions file exists with key functions
    const actionsPath = path.join(process.cwd(), 'src', 'app', 'workspace', 'media', 'actions.ts');
    const actionsExists = fs.existsSync(actionsPath);
    let actionsContent = '';
    if (actionsExists) actionsContent = fs.readFileSync(actionsPath, 'utf8');

    const hasGetAll = actionsContent.includes('getAllMediaFiles');
    const hasUploadAction = actionsContent.includes('uploadMediaFile');
    const hasDeleteAction = actionsContent.includes('deleteMediaFile');
    const hasRBAC = actionsContent.includes('isLeadership');

    results['2_media_server_actions'] = {
      pass: actionsExists && hasGetAll && hasUploadAction && hasDeleteAction && hasRBAC,
      actionsExists,
      hasGetAll,
      hasUploadAction,
      hasDeleteAction,
      hasRBAC,
    };

    // 3. Verify page.tsx exists with correct setup
    const pagePath = path.join(process.cwd(), 'src', 'app', 'workspace', 'media', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsClient = pageContent.includes('MediaLibraryClient');
    const pageHasAllDepts = pageContent.includes('getAllMediaFiles');
    const pageHasForceReload = pageContent.includes("force-dynamic");

    results['3_media_page'] = {
      pass: pageExists && pageImportsClient && pageHasAllDepts && pageHasForceReload,
      pageExists,
      pageImportsClient,
      pageHasAllDepts,
      pageHasForceReload,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '15.2',
      title: 'Central Media Library UI backed by Drive bridge (browse/search/filter by committee/event/type)',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
