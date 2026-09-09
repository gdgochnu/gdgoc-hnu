import { NextRequest, NextResponse } from 'next/server';
import { generateCommitteeReport, generateEventAnalyticsReport } from '@/app/reports/actions';
import { buildCommitteeReportExcel, buildEventAnalyticsExcel } from '@/app/reports/excelExport';
import type { ReportPeriod } from '@/types/reports';

/**
 * GET /api/reports/export-excel
 * Query params:
 *   - type: 'committee' | 'events' (default: 'committee')
 *   - departmentId: string (default 'all')
 *   - period: 'weekly' | 'monthly' (for committee)
 *   - referenceDate: ISO date string (for committee)
 *   - dateFrom, dateTo: ISO date strings (for events)
 *   - test: 'true' (bypasses auth in dev mode for testing)
 *
 * Step 18.4 — Build Excel export
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'committee';
    const departmentId = searchParams.get('departmentId') || 'all';
    const testBypass = searchParams.get('test') === 'true' && process.env.NODE_ENV !== 'production';

    if (type === 'events') {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const dateFrom = searchParams.get('dateFrom') || thirtyDaysAgo.toISOString().split('T')[0];
      const dateTo = searchParams.get('dateTo') || today.toISOString().split('T')[0];

      const result = await generateEventAnalyticsReport({
        departmentId,
        dateFrom,
        dateTo,
        bypassAuth: testBypass,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Event analytics failed' }, { status: 500 });
      }

      const excelBuffer = buildEventAnalyticsExcel(result);
      const filename = `GDGoC_HNU_Event_Analytics_${dateFrom}_to_${dateTo}.xlsx`;

      return new NextResponse(new Blob([excelBuffer as any]), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Default: Committee report
    const period = (searchParams.get('period') || 'weekly') as ReportPeriod;
    const referenceDate = searchParams.get('referenceDate') || undefined;

    if (!['weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use weekly or monthly.' }, { status: 400 });
    }

    const result = await generateCommitteeReport({
      departmentId,
      period,
      referenceDate,
      bypassAuth: testBypass,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Report generation failed' }, { status: 500 });
    }

    if (result.reports.length === 0) {
      return NextResponse.json({ error: 'No data found for the selected period.' }, { status: 404 });
    }

    const excelBuffer = buildCommitteeReportExcel(result.reports);
    const periodLabel = result.reports[0].period.label.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const deptLabel = departmentId === 'all' ? 'All_Committees' : result.reports[0].departmentCode;
    const filename = `GDGoC_HNU_Report_${deptLabel}_${periodLabel}.xlsx`;

    return new NextResponse(new Blob([excelBuffer as any]), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[export-excel]', err);
    return NextResponse.json({ error: err.message || 'Excel export failed' }, { status: 500 });
  }
}
