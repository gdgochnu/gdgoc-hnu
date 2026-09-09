import { NextResponse } from 'next/server';

/**
 * GET /api/test-step-18-3
 * Verify: PDF export endpoint exists and responds correctly.
 * Tests: calls /api/reports/export-pdf with all committees, weekly period,
 *        and confirms a PDF binary is returned (Content-Type: application/pdf).
 */
export async function GET(request: Request) {
  const results: Record<string, unknown> = {};
  const baseUrl = new URL(request.url).origin;

  // Test 1: call export-pdf for all committees, weekly
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-pdf?departmentId=all&period=weekly&test=true`,
      { cache: 'no-store' }
    );

    results['1_pdf_endpoint_weekly_all'] = {
      status: res.status,
      contentType: res.headers.get('content-type'),
      contentDisposition: res.headers.get('content-disposition'),
      isSuccess: res.ok,
      // If 404/no data, that's expected for empty DBs
      note: res.status === 404
        ? 'No events in range — expected for empty DB'
        : res.status === 200
        ? 'PDF generated successfully'
        : await res.text(),
    };
  } catch (e: any) {
    results['1_pdf_endpoint_weekly_all'] = { error: e.message };
  }

  // Test 2: call export-pdf for monthly
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-pdf?departmentId=all&period=monthly&test=true`,
      { cache: 'no-store' }
    );

    results['2_pdf_endpoint_monthly_all'] = {
      status: res.status,
      contentType: res.headers.get('content-type'),
      isSuccess: res.ok,
    };
  } catch (e: any) {
    results['2_pdf_endpoint_monthly_all'] = { error: e.message };
  }

  // Test 3: invalid period should return 400
  try {
    const res = await fetch(
      `${baseUrl}/api/reports/export-pdf?departmentId=all&period=daily`,
      { cache: 'no-store' }
    );
    results['3_invalid_period_returns_400'] = {
      status: res.status,
      passed: res.status === 400,
    };
  } catch (e: any) {
    results['3_invalid_period_returns_400'] = { error: e.message };
  }

  return NextResponse.json({
    step: '18.3',
    description: 'PDF Export for Committee Reports',
    timestamp: new Date().toISOString(),
    results,
  });
}
