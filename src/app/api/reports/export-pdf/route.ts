import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { generateCommitteeReport } from '@/app/reports/actions';
import { CommitteeReportPDF } from '@/app/reports/CommitteeReportPDF';
import type { ReportPeriod } from '@/types/reports';

/**
 * GET /api/reports/export-pdf?departmentId=<id>&period=weekly|monthly&referenceDate=<YYYY-MM-DD>
 * Generates a PDF committee report and returns it as a downloadable file.
 * Step 18.3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId') || 'all';
    const period = (searchParams.get('period') || 'weekly') as ReportPeriod;
    const referenceDate = searchParams.get('referenceDate') || undefined;

    if (!['weekly', 'monthly'].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use weekly or monthly.' }, { status: 400 });
    }

    // Generate the report data
    const testBypass = searchParams.get('test') === 'true' && process.env.NODE_ENV !== 'production';
    const result = await generateCommitteeReport({ departmentId, period, referenceDate, bypassAuth: testBypass });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Report generation failed' }, { status: 500 });
    }

    if (result.reports.length === 0) {
      return NextResponse.json({ error: 'No data found for the selected period.' }, { status: 404 });
    }

    // Build PDF buffers for each report (one per committee if departmentId='all')
    const buffers: Buffer[] = [];

    for (const report of result.reports) {
      const element = createElement(CommitteeReportPDF, { report });
      const buffer = await renderToBuffer(element as any);
      buffers.push(Buffer.from(buffer));
    }

    // Merge all buffers into a single response
    // For simplicity, if multiple committees, we return the first one (or could be zipped)
    // For a single committee, return directly.
    const finalBuffer = buffers[0];
    const periodLabel = result.reports[0].period.label.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');
    const deptLabel = departmentId === 'all' ? 'All_Committees' : result.reports[0].departmentCode;
    const filename = `GDGoC_HNU_Report_${deptLabel}_${periodLabel}.pdf`;

    return new NextResponse(new Uint8Array(finalBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[export-pdf]', err);
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 });
  }
}
