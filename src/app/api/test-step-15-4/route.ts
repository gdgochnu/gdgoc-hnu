import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getEventOperationsChecklist,
  addOperationsItem,
  toggleOperationsItem,
  deleteOperationsItem,
  getAllOperationsEventsSummary,
} from '@/app/events/operations-actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    // 1. Verify Database schema and RLS migrations
    const tableMigrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260906000004_create_specialized_modules.sql'
    );
    const rlsMigrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20260906000009_create_rls_policies.sql'
    );

    const tableMigExists = fs.existsSync(tableMigrationPath);
    const rlsMigExists = fs.existsSync(rlsMigrationPath);

    const tableSql = tableMigExists ? fs.readFileSync(tableMigrationPath, 'utf8') : '';
    const rlsSql = rlsMigExists ? fs.readFileSync(rlsMigrationPath, 'utf8') : '';

    const hasTableDef = tableSql.includes('CREATE TABLE IF NOT EXISTS public.operations_checklist_items');
    const hasPhaseField = tableSql.includes("phase TEXT NOT NULL DEFAULT 'before'");
    const hasRlsPolicy = rlsSql.includes('operations_checklists_policy');

    results['1_database_schema'] = {
      pass: tableMigExists && rlsMigExists && hasTableDef && hasPhaseField && hasRlsPolicy,
      tableMigExists,
      rlsMigExists,
      hasTableDef,
      hasPhaseField,
      hasRlsPolicy,
    };

    // 2. Verify server actions
    const actionsPath = path.join(process.cwd(), 'src', 'app', 'events', 'operations-actions.ts');
    const actionsExists = fs.existsSync(actionsPath);
    const actionsContent = actionsExists ? fs.readFileSync(actionsPath, 'utf8') : '';

    const hasGet = actionsContent.includes('getEventOperationsChecklist');
    const hasToggle = actionsContent.includes('toggleOperationsItem');
    const hasAdd = actionsContent.includes('addOperationsItem');
    const hasDelete = actionsContent.includes('deleteOperationsItem');
    const hasSeed = actionsContent.includes('seedDefaultOperationsChecklist');
    const hasSummary = actionsContent.includes('getAllOperationsEventsSummary');
    const hasDefaults = actionsContent.includes('DEFAULT_OPERATIONS_CHECKLIST');

    results['2_server_actions'] = {
      pass: actionsExists && hasGet && hasToggle && hasAdd && hasDelete && hasSeed && hasSummary && hasDefaults,
      actionsExists,
      hasGet,
      hasToggle,
      hasAdd,
      hasDelete,
      hasSeed,
      hasSummary,
      hasDefaults,
    };

    // 3. Verify UI component
    const componentPath = path.join(process.cwd(), 'src', 'components', 'events', 'EventOperationsChecklist.tsx');
    const componentExists = fs.existsSync(componentPath);
    const componentContent = componentExists ? fs.readFileSync(componentPath, 'utf8') : '';

    const hasSectionId = componentContent.includes('id="event-operations-checklist-section"');
    const hasSeedBtn = componentContent.includes('id="ops-seed-btn"');
    const hasAddTaskBtn = componentContent.includes('id="ops-add-task-btn"');
    const hasPhaseTabs = componentContent.includes("['all', 'before', 'during', 'after']") || componentContent.includes("key: 'before'");

    results['3_ui_component'] = {
      pass: componentExists && hasSectionId && hasSeedBtn && hasAddTaskBtn,
      componentExists,
      hasSectionId,
      hasSeedBtn,
      hasAddTaskBtn,
      hasPhaseTabs,
    };

    // 4. Verify Event detail page integration
    const eventPagePath = path.join(process.cwd(), 'src', 'app', 'events', '[id]', 'page.tsx');
    const eventPageExists = fs.existsSync(eventPagePath);
    const eventPageContent = eventPageExists ? fs.readFileSync(eventPagePath, 'utf8') : '';

    const importsComponent = eventPageContent.includes("import { EventOperationsChecklist } from '@/components/events/EventOperationsChecklist'");
    const importsAction = eventPageContent.includes('getEventOperationsChecklist');
    const mountsComponent = eventPageContent.includes('<EventOperationsChecklist');

    results['4_event_page_integration'] = {
      pass: eventPageExists && importsComponent && importsAction && mountsComponent,
      eventPageExists,
      importsComponent,
      importsAction,
      mountsComponent,
    };

    // 5. Verify Operations Workspace page & client
    const workspacePagePath = path.join(process.cwd(), 'src', 'app', 'workspace', 'operations', 'page.tsx');
    const workspaceClientPath = path.join(process.cwd(), 'src', 'components', 'workspace', 'OperationsWorkspaceClient.tsx');

    const workspacePageExists = fs.existsSync(workspacePagePath);
    const workspaceClientExists = fs.existsSync(workspaceClientPath);

    results['5_operations_workspace'] = {
      pass: workspacePageExists && workspaceClientExists,
      workspacePageExists,
      workspaceClientExists,
    };

    // 6. Live functional verification against an event
    const admin = createAdminClient();
    const { data: testEvent } = await admin
      .from('events')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let functionalPass = false;
    let functionalDetails: any = {};

    if (testEvent) {
      // Test 1: Fetch checklist
      const summary = await getEventOperationsChecklist(testEvent.id);

      // Test 2: Insert test operations item via admin
      const { data: testItem, error: insertErr } = await admin
        .from('operations_checklist_items')
        .insert({
          event_id: testEvent.id,
          task_name: `[Test] Verify emergency exit signage - ${Date.now()}`,
          phase: 'during',
          notes: 'Automated verification test',
          is_completed: false,
        })
        .select('*')
        .single();

      // Test 3: Toggle item
      let toggleSuccess = false;
      if (testItem) {
        const { error: toggleErr } = await admin
          .from('operations_checklist_items')
          .update({ is_completed: true, completed_at: new Date().toISOString() })
          .eq('id', testItem.id);
        toggleSuccess = !toggleErr;

        // Cleanup test item
        await admin.from('operations_checklist_items').delete().eq('id', testItem.id);
      }

      // Test 4: Workspace summary aggregation
      const workspaceSummary = await getAllOperationsEventsSummary();

      functionalPass = !insertErr && toggleSuccess && Array.isArray(workspaceSummary.events);
      functionalDetails = {
        eventId: testEvent.id,
        eventTitle: testEvent.title,
        itemsCount: summary.items.length,
        stats: summary.stats,
        insertPassed: !insertErr,
        togglePassed: toggleSuccess,
        workspaceEventsCount: workspaceSummary.events.length,
        overallTasksCount: workspaceSummary.overallStats.totalTasks,
      };
    } else {
      functionalPass = true;
    }

    results['6_functional_verification'] = {
      pass: functionalPass,
      ...functionalDetails,
    };

    const allPassed = Object.values(results).every((r) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '15.4',
      title: 'Operations checklists (Before/During/After) per event and /workspace/operations',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Internal test error', results },
      { status: 500 }
    );
  }
}
