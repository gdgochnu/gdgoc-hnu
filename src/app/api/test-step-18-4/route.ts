import { NextResponse } from 'next/server';

/**
 * GET /api/test-step-18-4
 * Verify: Excel export for committee performance & event analytics reports.
 * Tests:
 *   1. Committee Excel export (weekly, all committees)
 *   2. Event analytics Excel export
 *   3. Invalid period validation (returns 400)
 */
export async function GET(request: Request) {
  const results: Record<string, unknown> = {};
  const baseUrl = new URL(request.url).origin;

  // Test 1: Committee report Excel export
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-excel?type=committee&departmentId=all&period=weekly&test=true`,
      { cache: 'no-store' }
    );

    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');
    const isXlsx = contentType?.includes('spreadsheetml') || contentType?.includes('sheet');

    results['1_committee_excel_export'] = {
      status: res.status,
      contentType,
      contentDisposition,
      isSuccess: res.ok && isXlsx,
    };
  } catch (e: any) {
    results['1_committee_excel_export'] = { error: e.message };
  }

  // Test 2: Event analytics Excel export
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-excel?type=events&departmentId=all&test=true`,
      { cache: 'no-store' }
    );

    const contentType = res.headers.get('content-type');
    const contentDisposition = res.headers.get('content-disposition');
    const isXlsx = contentType?.includes('spreadsheetml') || contentType?.includes('sheet');

    results['2_event_analytics_excel_export'] = {
      status: res.status,
      contentType,
      contentDisposition,
      isSuccess: res.ok && isXlsx,
    };
  } catch (e: any) {
    results['2_event_analytics_excel_export'] = { error: e.message };
  }

  // Test 3: Invalid period check
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-excel?type=committee&period=quarterly&test=true`,
      { cache: 'no-store' }
    );

    results['3_invalid_period_validation'] = {
      status: res.status,
      passed: res.status === 400,
    };
  } catch (e: any) {
    results['3_invalid_period_validation'] = { error: e.message };
  }

  return NextResponse.json({
    step: '18.4',
    description: 'Excel Export for Committee Reports & Event Analytics',
    timestamp: new Date().toISOString(),
    results,
  });
}
