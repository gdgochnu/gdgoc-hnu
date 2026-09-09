/**
 * PDF Report Generation — Committee Report Template
 * Uses @react-pdf/renderer for server-side PDF output
 * §4.12 — Step 18.3
 */
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { CommitteeReport } from '@/types/reports';

// ─── Styles ──────────────────────────────────────────────────────────────────

const colors = {
  primary: '#4285F4',
  green: '#34A853',
  yellow: '#FBBC04',
  red: '#EA4335',
  purple: '#A142F4',
  bg: '#0F1117',
  surface: '#1A1D2E',
  border: '#2A2D3E',
  textPrimary: '#F1F5F9',
  textMuted: '#94A3B8',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
    padding: 40,
    color: '#1A1A2E',
  },

  // ── Cover header ──────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: '#1A1D2E',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  branchBadge: {
    backgroundColor: '#4285F422',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 7,
    color: '#4285F4',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  deptCode: {
    fontSize: 7,
    color: '#94A3B8',
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  deptName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  periodText: {
    fontSize: 8,
    color: '#94A3B8',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  healthScore: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  healthLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },

  // ── Section ───────────────────────────────────────────────────────────────
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    color: '#1A1D2E',
  },

  // ── KPI grid ─────────────────────────────────────────────────────────────
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 80,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#64748B',
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  progressLabel: {
    width: 110,
    fontSize: 8,
    color: '#475569',
  },
  progressBg: {
    flex: 1,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressValue: {
    width: 32,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 8,
    color: '#334155',
    flex: 1,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    flex: 1,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    letterSpacing: 0.3,
    flex: 1,
  },

  // ── Highlight / Alert boxes ───────────────────────────────────────────────
  bulletList: {
    gap: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 8,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 8,
    color: '#334155',
    flex: 1,
    lineHeight: 1.4,
  },

  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  col: {
    flex: 1,
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
  },
  colTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.4,
    marginBottom: 6,
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#94A3B8',
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(status: string) {
  if (status === 'healthy') return colors.green;
  if (status === 'needs_attention') return colors.yellow;
  return colors.red;
}

function rateColor(rate: number) {
  if (rate >= 75) return colors.green;
  if (rate >= 50) return colors.yellow;
  return colors.red;
}

// ─── Progress Row Component ───────────────────────────────────────────────────

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.progressValue, { color }]}>{value}%</Text>
    </View>
  );
}

// ─── Main PDF Document ────────────────────────────────────────────────────────

interface CommitteeReportPDFProps {
  report: CommitteeReport;
}

export function CommitteeReportPDF({ report }: CommitteeReportPDFProps) {
  const hColor = healthColor(report.healthStatus);
  const genDate = new Date(report.generatedAt).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Document
      title={`${report.departmentName} — ${report.period.label}`}
      author="GDGoC HNU OS"
      subject="Committee Performance Report"
    >
      <Page size="A4" style={styles.page}>

        {/* ── HEADER BAND ─────────────────────────────────────────────────── */}
        <View style={styles.headerBand}>
          <View style={styles.headerLeft}>
            <View style={styles.badgeRow}>
              <Text style={styles.branchBadge}>
                {report.branch === 'tech' ? 'TECH' : 'NON-TECH'}
              </Text>
              <Text style={styles.deptCode}>{report.departmentCode}</Text>
            </View>
            <Text style={styles.deptName}>{report.departmentName}</Text>
            <Text style={styles.periodText}>{report.period.label}</Text>
            <Text style={[styles.periodText, { marginTop: 2 }]}>
              Generated: {genDate}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.healthScore, { color: hColor }]}>
              {report.overallHealthScore}%
            </Text>
            <Text style={[styles.healthLabel, { color: hColor }]}>
              {report.healthStatus.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* ── TASK METRICS ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋  TASK METRICS</Text>
          <View style={styles.kpiGrid}>
            {[
              { label: 'Total Tasks', value: report.tasks.totalCreated, color: colors.primary },
              { label: 'Completed', value: report.tasks.completed, color: colors.green },
              { label: 'In Progress', value: report.tasks.inProgress, color: colors.yellow },
              { label: 'Overdue', value: report.tasks.overdue, color: colors.red },
              { label: 'Delegated', value: report.tasks.delegated, color: colors.purple },
              { label: 'Avg Days to Done', value: `${report.tasks.avgCompletionDays}d`, color: '#00BCD4' },
            ].map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 10 }}>
            <ProgressRow label="Completion Rate" value={report.tasks.completionRate} color={colors.green} />
            <ProgressRow label="Deadline Adherence" value={report.tasks.deadlineAdherenceRate} color={colors.primary} />
          </View>
        </View>

        {/* ── TOP CONTRIBUTORS ─────────────────────────────────────────────── */}
        {report.tasks.topContributors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆  TOP CONTRIBUTORS</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 0.4 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>MEMBER</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>TASKS DONE</Text>
              </View>
              {report.tasks.topContributors.map((c, i) => (
                <View key={c.profileId} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { flex: 0.4, color: i === 0 ? colors.yellow : '#94A3B8' }]}>
                    #{i + 1}
                  </Text>
                  <Text style={[styles.tableCellBold, { flex: 3 }]}>{c.name}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: colors.green, fontFamily: 'Helvetica-Bold' }]}>
                    {c.completedCount}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── ATTENDANCE ───────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥  ATTENDANCE</Text>
          <View style={styles.kpiGrid}>
            {[
              { label: 'Events in Period', value: report.attendance.totalEvents, color: colors.green },
              { label: 'Avg Attendance Rate', value: `${report.attendance.avgAttendanceRate}%`, color: rateColor(report.attendance.avgAttendanceRate) },
              { label: 'Perfect Attendance Events', value: report.attendance.eventsWithPerfectAttendance, color: colors.yellow },
            ].map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              </View>
            ))}
          </View>

          {report.attendance.memberAttendanceSummary.length > 0 && (
            <View style={{ marginTop: 10 }}>
              {report.attendance.memberAttendanceSummary.slice(0, 8).map((m) => (
                <ProgressRow
                  key={m.profileId}
                  label={m.name}
                  value={m.rate}
                  color={rateColor(m.rate)}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── EVENTS ───────────────────────────────────────────────────────── */}
        {report.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅  EVENTS IN PERIOD</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>EVENT</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>DATE</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>ATT.</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>FEEDBACK</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>BUDGET</Text>
              </View>
              {report.events.map((ev, i) => (
                <View key={ev.eventId} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCellBold, { flex: 3 }]}>{ev.title}</Text>
                  <Text style={[styles.tableCell, { flex: 1, fontSize: 7 }]}>
                    {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'center', color: rateColor(ev.attendanceRate), fontFamily: 'Helvetica-Bold' }]}
                  >
                    {ev.attendanceRate}%
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', color: ev.avgFeedbackScore ? rateColor(ev.avgFeedbackScore * 20) : '#94A3B8' }]}>
                    {ev.avgFeedbackScore !== null ? `★ ${ev.avgFeedbackScore}` : '—'}
                  </Text>
                  <Text
                    style={[styles.tableCell, { flex: 1, textAlign: 'center', color: ev.isOverBudget ? colors.red : colors.green, fontFamily: 'Helvetica-Bold' }]}
                  >
                    {ev.isOverBudget ? 'OVER' : 'OK'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── MEMBER ACTIVITY ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡  MEMBER ACTIVITY</Text>
          <View style={styles.kpiGrid}>
            {[
              { label: 'Active Members', value: report.members.totalActiveMembers, color: colors.purple },
              { label: 'New This Period', value: report.members.newMembers, color: colors.green },
              { label: 'Inactive This Period', value: report.members.inactiveMembers, color: report.members.inactiveMembers > 0 ? colors.red : colors.green },
              { label: 'Avg Engagement', value: `${report.members.avgEngagementScore}%`, color: rateColor(report.members.avgEngagementScore) },
            ].map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── HIGHLIGHTS & ALERTS ──────────────────────────────────────────── */}
        {(report.highlights.length > 0 || report.alerts.length > 0) && (
          <View style={styles.twoCol}>
            {report.highlights.length > 0 && (
              <View style={[styles.col, { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.colTitle, { color: colors.green }]}>✦ HIGHLIGHTS</Text>
                <View style={styles.bulletList}>
                  {report.highlights.map((h, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={[styles.bullet, { color: colors.green }]}>·</Text>
                      <Text style={styles.bulletText}>{h}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {report.alerts.length > 0 && (
              <View style={[styles.col, { borderColor: '#FECACA', backgroundColor: '#FFF5F5' }]}>
                <Text style={[styles.colTitle, { color: colors.red }]}>⚠ ALERTS</Text>
                <View style={styles.bulletList}>
                  {report.alerts.map((a, i) => (
                    <View key={i} style={styles.bulletItem}>
                      <Text style={[styles.bullet, { color: colors.red }]}>·</Text>
                      <Text style={styles.bulletText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── WEEKLY REVIEWS ────────────────────────────────────────────────── */}
        {report.weeklyReviewAnswers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝  WEEKLY HEAD REVIEWS</Text>
            {report.weeklyReviewAnswers.map((rev, ri) => (
              <View key={ri} style={{ marginBottom: 10, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }}>
                <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0284C7', marginBottom: 6 }}>
                  Week of {new Date(rev.weekOf).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} — {rev.submitterName}
                </Text>
                {rev.questions.map((q, qi) =>
                  rev.answers[qi] ? (
                    <View key={qi} style={{ marginBottom: 5 }}>
                      <Text style={{ fontSize: 7, color: '#64748B', marginBottom: 2 }}>Q{qi + 1}: {q}</Text>
                      <Text style={{ fontSize: 8, color: '#1E293B', lineHeight: 1.4 }}>{rev.answers[qi]}</Text>
                    </View>
                  ) : null
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>GDGoC HNU OS · {report.departmentName} · {report.period.label}</Text>
          <Text style={styles.footerText}>Generated {genDate}</Text>
        </View>

      </Page>
    </Document>
  );
}
