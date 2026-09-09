import * as XLSX from 'xlsx';
import type { CommitteeReport, GenerateEventAnalyticsResult, EventPerformanceReport } from '@/types/reports';

/**
 * Builds an Excel Workbook (.xlsx) for Committee Performance Reports
 */
export function buildCommitteeReportExcel(reports: CommitteeReport[]): Uint8Array {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Overall Summary ───────────────────────────────────────────────
  const summaryRows = reports.map((r) => ({
    'Committee Code': r.departmentCode,
    'Committee Name': r.departmentName,
    'Branch': r.branch === 'tech' ? 'Technical' : 'Non-Technical',
    'Period': r.period.label,
    'Overall Health (%)': r.overallHealthScore,
    'Status': r.healthStatus.toUpperCase().replace('_', ' '),
    'Total Tasks': r.tasks.totalCreated,
    'Completed Tasks': r.tasks.completed,
    'Completion Rate (%)': `${r.tasks.completionRate}%`,
    'Deadline Adherence (%)': `${r.tasks.deadlineAdherenceRate}%`,
    'Avg Attendance (%)': `${r.attendance.avgAttendanceRate}%`,
    'Active Members': r.members.totalActiveMembers,
    'Inactive Members': r.members.inactiveMembers,
    'Events Held': r.events.length,
    'Generated At': new Date(r.generatedAt).toLocaleString(),
  }));
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // ── Sheet 2: Tasks & Contributors ──────────────────────────────────────────
  const taskRows: any[] = [];
  reports.forEach((r) => {
    if (r.tasks.topContributors.length > 0) {
      r.tasks.topContributors.forEach((c, idx) => {
        taskRows.push({
          'Committee': r.departmentName,
          'Total Committee Tasks': r.tasks.totalCreated,
          'Completed Tasks': r.tasks.completed,
          'Overdue Tasks': r.tasks.overdue,
          'Contributor Rank': idx + 1,
          'Member Name': c.name,
          'Tasks Completed': c.completedCount,
        });
      });
    } else {
      taskRows.push({
        'Committee': r.departmentName,
        'Total Committee Tasks': r.tasks.totalCreated,
        'Completed Tasks': r.tasks.completed,
        'Overdue Tasks': r.tasks.overdue,
        'Contributor Rank': '-',
        'Member Name': 'No task completions',
        'Tasks Completed': 0,
      });
    }
  });
  const wsTasks = XLSX.utils.json_to_sheet(taskRows);
  XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks & Contributors');

  // ── Sheet 3: Events in Period ──────────────────────────────────────────────
  const eventRows: any[] = [];
  reports.forEach((r) => {
    r.events.forEach((ev) => {
      eventRows.push({
        'Committee': r.departmentName,
        'Event Title': ev.title,
        'Date': ev.date ? new Date(ev.date).toLocaleDateString() : 'N/A',
        'Status': ev.status,
        'Registrations': ev.registrationCount,
        'Attendees': ev.attendanceCount,
        'Attendance Rate': `${ev.attendanceRate}%`,
        'Avg Feedback (1-5)': ev.avgFeedbackScore !== null ? ev.avgFeedbackScore : 'N/A',
        'Over Budget': ev.isOverBudget ? 'YES' : 'NO',
      });
    });
  });
  if (eventRows.length === 0) {
    eventRows.push({ 'Note': 'No events held during this period' });
  }
  const wsEvents = XLSX.utils.json_to_sheet(eventRows);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Events');

  // ── Sheet 4: Member Attendance ─────────────────────────────────────────────
  const memberAttendanceRows: any[] = [];
  reports.forEach((r) => {
    r.attendance.memberAttendanceSummary.forEach((m) => {
      memberAttendanceRows.push({
        'Committee': r.departmentName,
        'Member Name': m.name,
        'Attended Events': m.attended,
        'Total Available Events': m.total,
        'Attendance Rate': `${m.rate}%`,
      });
    });
  });
  if (memberAttendanceRows.length === 0) {
    memberAttendanceRows.push({ 'Note': 'No attendance records available for this period' });
  }
  const wsAttendance = XLSX.utils.json_to_sheet(memberAttendanceRows);
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Member Attendance');

  // Write workbook to buffer
  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Uint8Array(out);
}

/**
 * Builds an Excel Workbook (.xlsx) for Event Performance Analytics Reports
 */
export function buildEventAnalyticsExcel(data: GenerateEventAnalyticsResult): Uint8Array {
  const wb = XLSX.utils.book_new();
  const summary = data.summary;
  const events = summary?.events || [];

  // ── Sheet 1: Events Overview ───────────────────────────────────────────────
  const eventRows = events.map((ev: EventPerformanceReport) => ({
    'Event ID': ev.eventId,
    'Title': ev.title,
    'Department': ev.departmentCode || 'All',
    'Date': ev.date ? new Date(ev.date).toLocaleDateString() : 'N/A',
    'Status': ev.status,
    'Registrations': ev.totalRegistered,
    'Attendees': ev.totalAttended,
    'Attendance Rate (%)': `${ev.attendanceRate}%`,
    'Avg Feedback (1-5)': ev.avgFeedbackScore !== null ? ev.avgFeedbackScore : 'N/A',
    'Feedback Count': ev.feedbackCount,
    'Budget Estimated (EGP)': ev.totalEstimated,
    'Budget Actual (EGP)': ev.totalActual,
    'Over Budget': ev.isOverBudget ? 'YES' : 'NO',
    'Over Budget Amount (EGP)': ev.overBudgetAmount,
    'Performance Score (%)': ev.performanceScore,
    'Performance Tier': ev.performanceTier.toUpperCase(),
  }));
  const wsEvents = XLSX.utils.json_to_sheet(eventRows.length > 0 ? eventRows : [{ 'Note': 'No events found in date range' }]);
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Events Analytics');

  // ── Sheet 2: Department Summary ────────────────────────────────────────────
  if (summary?.byDepartment) {
    const deptRows = summary.byDepartment.map((d) => ({
      'Department Code': d.departmentCode,
      'Total Events': d.eventCount,
      'Avg Attendance (%)': `${d.avgAttendanceRate}%`,
      'Avg Feedback Score': d.avgFeedbackScore !== null ? d.avgFeedbackScore : 'N/A',
    }));
    const wsDept = XLSX.utils.json_to_sheet(deptRows);
    XLSX.utils.book_append_sheet(wb, wsDept, 'By Department');
  }

  // ── Sheet 3: Overall Summary KPI ───────────────────────────────────────────
  if (summary) {
    const summaryKPI = [
      { 'Metric': 'Total Events', 'Value': summary.totalEvents },
      { 'Metric': 'Total Registrations', 'Value': summary.totalRegistrations },
      { 'Metric': 'Total Attendees', 'Value': summary.totalAttendees },
      { 'Metric': 'Overall Attendance Rate', 'Value': `${summary.overallAttendanceRate}%` },
      { 'Metric': 'Average Feedback Rating (1-5)', 'Value': summary.avgFeedbackScore !== null ? summary.avgFeedbackScore : 'N/A' },
      { 'Metric': 'Events Over Budget', 'Value': summary.eventsOverBudget },
      { 'Metric': 'Date Window', 'Value': `${summary.filters.dateFrom} to ${summary.filters.dateTo}` },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryKPI);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary KPIs');
  }

  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new Uint8Array(out);
}
