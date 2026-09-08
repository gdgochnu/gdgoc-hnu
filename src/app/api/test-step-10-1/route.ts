import { NextResponse } from 'next/server';
import { getHrDashboardKpis, getEventAttendanceDetails, canAccessHrDashboard } from '@/app/hr/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 10.1 - HR Dashboard KPI cards + event attendance view + export',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Check access check function execution
    const accessCheck = await canAccessHrDashboard();
    results.checks.accessCheckFn = {
      success: true,
      hasAccess: accessCheck.hasAccess,
      role: accessCheck.role,
      isHrMember: accessCheck.isHrMember,
      isPresidential: accessCheck.isPresidential,
    };

    // 2. Test getHrDashboardKpis
    const kpis = await getHrDashboardKpis();
    results.checks.kpis = {
      success: true,
      totalRegistrations: kpis.totalRegistrations,
      totalCheckedIn: kpis.totalCheckedIn,
      attendanceRate: kpis.attendanceRate,
      activeMembers: kpis.activeMembers,
      eventsCount: kpis.eventsCount,
    };

    // Check KPI sanity
    if (typeof kpis.attendanceRate !== 'number' || isNaN(kpis.attendanceRate)) {
      throw new Error('attendanceRate must be a valid number');
    }

    // 3. Test getEventAttendanceDetails
    const attendanceSummary = await getEventAttendanceDetails();
    results.checks.attendanceSummary = {
      success: true,
      hasEvent: !!attendanceSummary.event,
      eventsCount: attendanceSummary.eventsList.length,
      totalRegistered: attendanceSummary.totalRegistered,
      totalAttended: attendanceSummary.totalAttended,
      totalAbsent: attendanceSummary.totalAbsent,
      attendanceRate: attendanceSummary.attendanceRate,
      attendeesSampleCount: attendanceSummary.attendees.length,
      duplicateScansCount: attendanceSummary.duplicateScans.length,
    };

    // 4. Verify CSV generation format from attendance data
    const sampleAttendees = attendanceSummary.attendees;
    const csvHeaders = ['Full Name', 'Email', 'Phone', 'Registration Status', 'Attended', 'Check-in Time', 'Method', 'Checked By ID'];
    const csvRows = sampleAttendees.slice(0, 5).map(a => [
      `"${a.fullName.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${(a.phone || '').replace(/"/g, '""')}"`,
      `"${a.registrationStatus}"`,
      a.isAttended ? 'Yes' : 'No',
      a.checkInTime ? `"${new Date(a.checkInTime).toLocaleString()}"` : 'N/A',
      `"${a.method || 'N/A'}"`,
      `"${a.checkedInBy || 'N/A'}"`,
    ].join(','));
    const testCsv = [csvHeaders.join(','), ...csvRows].join('\n');

    results.checks.csvExportTest = {
      success: true,
      headersIncluded: csvHeaders.length === 8,
      sampleRowsLength: csvRows.length,
      csvPreviewSnippet: testCsv.split('\n').slice(0, 3).join(' | '),
    };

    results.overallSuccess = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.overallSuccess = false;
    results.error = error?.message || String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
