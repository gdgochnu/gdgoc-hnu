import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  getUnifiedApprovalsQueue,
  actOnUnifiedApproval,
} from '@/app/command-center/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    step: '16.5 - Unified Pending-Approvals Queue (Accounts + Tasks + Events)',
    timestamp: new Date().toISOString(),
    tests: {},
    allPassed: false,
  };

  try {
    // 1. Direct execution of getUnifiedApprovalsQueue
    const queueRes = await getUnifiedApprovalsQueue({ bypassAuthForAdminTest: true });

    results.tests.getUnifiedApprovalsQueue = {
      passed: queueRes.success && typeof queueRes.summary.totalPending === 'number',
      summary: {
        totalPending: queueRes.summary.totalPending,
        accountsCount: queueRes.summary.accountsCount,
        tasksCount: queueRes.summary.tasksCount,
        eventsCount: queueRes.summary.eventsCount,
        urgentCount: queueRes.summary.urgentCount,
      },
      sampleItemsCount: queueRes.summary.items.length,
      sampleItems: queueRes.summary.items.slice(0, 5).map((i) => ({
        id: i.id,
        type: i.type,
        title: i.title,
        submitterName: i.submitterName,
        departmentCode: i.departmentCode,
        urgency: i.urgency,
        hoursPending: i.hoursPending,
      })),
      error: queueRes.error || null,
    };

    // 2. Validate Item Structure Integrity
    const validTypes = ['account', 'task', 'event'];
    const validUrgencies = ['urgent', 'normal', 'low'];

    let itemsValid = true;
    for (const item of queueRes.summary.items) {
      if (
        typeof item.id !== 'string' ||
        !validTypes.includes(item.type) ||
        typeof item.entityId !== 'string' ||
        typeof item.title !== 'string' ||
        typeof item.submitterName !== 'string' ||
        !validUrgencies.includes(item.urgency) ||
        typeof item.hoursPending !== 'number' ||
        typeof item.actionUrl !== 'string' ||
        typeof item.details !== 'object'
      ) {
        itemsValid = false;
        break;
      }
    }

    results.tests.itemsStructureIntegrity = {
      passed: itemsValid,
      totalChecked: queueRes.summary.items.length,
    };

    // 3. Test actOnUnifiedApproval authorization protection
    const unauthorizedActRes = await actOnUnifiedApproval({
      type: 'task',
      entityId: 'dummy-id',
      action: 'approve',
    });

    results.tests.actionAuthorizationCheck = {
      passed: !unauthorizedActRes.success && unauthorizedActRes.error === 'Unauthorized',
      errorNotice: unauthorizedActRes.error,
    };

    // 4. Verify UnifiedApprovalsQueue component integrity
    const componentPath = path.join(
      process.cwd(),
      'src',
      'components',
      'command-center',
      'UnifiedApprovalsQueue.tsx'
    );
    const componentExists = fs.existsSync(componentPath);
    let componentContent = '';
    if (componentExists) componentContent = fs.readFileSync(componentPath, 'utf8');

    const hasQueueId = componentContent.includes('id="unified-approvals-queue"');
    const hasHandleAction = componentContent.includes('handleAction');
    const hasFilterButtons =
      componentContent.includes("setSelectedFilter('all')") &&
      componentContent.includes("setSelectedFilter('account')") &&
      componentContent.includes("setSelectedFilter('task')") &&
      componentContent.includes("setSelectedFilter('event')");
    const hasQuickApprove = componentContent.includes("handleAction(item, 'approve')");

    results.tests.uiComponentIntegrity = {
      passed: componentExists && hasQueueId && hasHandleAction && hasFilterButtons && hasQuickApprove,
      componentExists,
      hasQueueId,
      hasHandleAction,
      hasFilterButtons,
      hasQuickApprove,
    };

    // 5. Verify Page Integration
    const pagePath = path.join(process.cwd(), 'src', 'app', 'command-center', 'page.tsx');
    const pageExists = fs.existsSync(pagePath);
    let pageContent = '';
    if (pageExists) pageContent = fs.readFileSync(pagePath, 'utf8');

    const pageImportsQueue = pageContent.includes('UnifiedApprovalsQueue');
    const pageCallsAction = pageContent.includes('getUnifiedApprovalsQueue()');
    const pageRendersQueue = pageContent.includes('<UnifiedApprovalsQueue');

    results.tests.pageIntegration = {
      passed: pageExists && pageImportsQueue && pageCallsAction && pageRendersQueue,
      pageExists,
      pageImportsQueue,
      pageCallsAction,
      pageRendersQueue,
    };

    results.allPassed = Object.values(results.tests).every((t: any) => t.passed === true);

    return NextResponse.json(results, { status: results.allPassed ? 200 : 500 });
  } catch (err: any) {
    results.error = err.message || String(err);
    results.allPassed = false;
    return NextResponse.json(results, { status: 500 });
  }
}
