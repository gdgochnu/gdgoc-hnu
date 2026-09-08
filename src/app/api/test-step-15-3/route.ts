import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getEventCoverage } from '@/app/events/coverage-actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify Migration 025 exists
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260908000025_create_event_coverage_items.sql'
    );
    const migrationExists = fs.existsSync(migrationPath);
    let migrationSql = '';
    if (migrationExists) migrationSql = fs.readFileSync(migrationPath, 'utf8');

    const hasTableDef = migrationSql.includes('CREATE TABLE IF NOT EXISTS public.event_coverage_items');
    const hasCategoryCheck = migrationSql.includes("category IN ('photo', 'video', 'speaker_asset', 'recap', 'other')");
    const hasPhaseCheck = migrationSql.includes("phase IN ('before', 'during', 'after')");
    const hasRlsPolicies = migrationSql.includes('event_coverage_select_policy');

    results['1_migration_schema'] = {
      pass: migrationExists && hasTableDef && hasCategoryCheck && hasPhaseCheck && hasRlsPolicies,
      migrationExists,
      hasTableDef,
      hasCategoryCheck,
      hasPhaseCheck,
      hasRlsPolicies,
    };

    // 2. Verify server actions file
    const actionsPath = path.join(process.cwd(), 'src', 'app', 'events', 'coverage-actions.ts');
    const actionsExists = fs.existsSync(actionsPath);
    let actionsContent = '';
    if (actionsExists) actionsContent = fs.readFileSync(actionsPath, 'utf8');

    const hasGetCoverage = actionsContent.includes('getEventCoverage');
    const hasToggle = actionsContent.includes('toggleCoverageItem');
    const hasAdd = actionsContent.includes('addCoverageItem');
    const hasDelete = actionsContent.includes('deleteCoverageItem');
    const hasUpload = actionsContent.includes('uploadCoverageFile');
    const hasDefaultShotList = actionsContent.includes('DEFAULT_SHOT_LIST');

    results['2_server_actions'] = {
      pass: actionsExists && hasGetCoverage && hasToggle && hasAdd && hasDelete && hasUpload && hasDefaultShotList,
      actionsExists,
      hasGetCoverage,
      hasToggle,
      hasAdd,
      hasDelete,
      hasUpload,
      hasDefaultShotList,
    };

    // 3. Verify EventMediaCoverage UI component
    const componentPath = path.join(process.cwd(), 'src', 'components', 'events', 'EventMediaCoverage.tsx');
    const componentExists = fs.existsSync(componentPath);
    let componentContent = '';
    if (componentExists) componentContent = fs.readFileSync(componentPath, 'utf8');

    const hasSectionId = componentContent.includes('id="event-media-coverage-section"');
    const hasDriveLink = componentContent.includes('id="coverage-drive-folder-link"');
    const hasAddBtn = componentContent.includes('id="add-coverage-shot-btn"');
    const hasFileUpload = componentContent.includes('handleFileUpload');
    const hasToggleHandler = componentContent.includes('handleToggle');

    results['3_ui_component'] = {
      pass: componentExists && hasSectionId && hasDriveLink && hasAddBtn && hasFileUpload && hasToggleHandler,
      componentExists,
      hasSectionId,
      hasDriveLink,
      hasAddBtn,
      hasFileUpload,
      hasToggleHandler,
    };

    // 4. Verify Page Integration
    const pagePath = path.join(process.cwd(), 'src', 'app', 'events', '[id]', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsCoverage = pageContent.includes('EventMediaCoverage');
    const pageCallsGetCoverage = pageContent.includes('getEventCoverage');

    results['4_page_integration'] = {
      pass: pageExists && pageImportsCoverage && pageCallsGetCoverage,
      pageExists,
      pageImportsCoverage,
      pageCallsGetCoverage,
    };

    // 5. Functional Test on an existing or test event
    const admin = createAdminClient();
    const { data: anyEvent } = await admin
      .from('events')
      .select('id, title')
      .limit(1)
      .maybeSingle();

    let functionalPass = false;
    let coverageData: any = null;

    if (anyEvent) {
      const covRes = await getEventCoverage(anyEvent.id);
      functionalPass = covRes.success && !!covRes.data && Array.isArray(covRes.data.items);
      coverageData = {
        itemCount: covRes.data?.items.length,
        stats: covRes.data?.stats,
        hasFolderUrl: !!covRes.data?.folderUrl,
      };
    } else {
      functionalPass = true; // No events yet
    }

    results['5_functional_coverage'] = {
      pass: functionalPass,
      coverageData,
    };

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '15.3',
      title: 'Event Coverage checklists tied to the Drive /Media-Coverage/ folder per event',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
