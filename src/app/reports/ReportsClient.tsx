'use client';

import { useState, useTransition, useCallback } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Star,
  Activity,
  ChevronDown,
  RefreshCw,
  Download,
  Sparkles,
  Target,
  Flame,
  Award,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import type {
  CommitteeReport,
  ReportPeriod,
} from '@/types/reports';
import { generateCommitteeReport, getAccessibleDepartments } from '@/app/reports/actions';

interface Department {
  id: string;
  name: string;
  code: string;
  branch: string;
}

interface ReportsClientProps {
  departments: Department[];
  initialDeptId: string;
  isPresidential: boolean;
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  small,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: small ? '1rem 1.25rem' : '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '80px',
          height: '80px',
          background: `radial-gradient(circle at 80% 20%, ${color}22, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          <Icon size={16} />
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: small ? '1.5rem' : '2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: `${height}px`,
        background: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: '100%',
          borderRadius: `${height}px`,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
}

// ─── Health Badge ─────────────────────────────────────────────────────────────

function HealthBadge({ status, score }: { status: string; score: number }) {
  const cfg =
    status === 'healthy'
      ? { color: '#34a853', label: 'Healthy', bg: 'rgba(52,168,83,0.15)' }
      : status === 'needs_attention'
      ? { color: '#fbbc04', label: 'Needs Attention', bg: 'rgba(251,188,4,0.15)' }
      : { color: '#ea4335', label: 'Critical', bg: 'rgba(234,67,53,0.15)' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.375rem 0.875rem',
        borderRadius: '999px',
        background: cfg.bg,
        border: `1px solid ${cfg.color}44`,
        fontSize: '0.8rem',
        fontWeight: 600,
        color: cfg.color,
      }}
    >
      <Activity size={13} />
      {cfg.label} — {score}%
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, color }: { icon: React.ComponentType<{ size?: number }>; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        <Icon size={18} />
      </div>
      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {title}
      </h3>
    </div>
  );
}

// ─── Report View ──────────────────────────────────────────────────────────────

function ReportView({ report }: { report: CommitteeReport }) {
  const [openSection, setOpenSection] = useState<string | null>('tasks');

  function toggle(key: string) {
    setOpenSection((prev) => (prev === key ? null : key));
  }

  const sections: {
    key: string;
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    color: string;
    content: React.ReactNode;
  }[] = [
    {
      key: 'tasks',
      label: 'Task Metrics',
      icon: CheckCircle2,
      color: '#4285f4',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Task metric cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <MetricCard label="Total Tasks" value={report.tasks.totalCreated} icon={CheckCircle2} color="#4285f4" small />
            <MetricCard label="Completed" value={report.tasks.completed} icon={CheckCircle2} color="#34a853" small />
            <MetricCard label="In Progress" value={report.tasks.inProgress} icon={Activity} color="#fbbc04" small />
            <MetricCard label="Overdue" value={report.tasks.overdue} icon={AlertTriangle} color="#ea4335" small />
            <MetricCard label="Delegated" value={report.tasks.delegated} icon={Users} color="#a142f4" small />
            <MetricCard label="Avg Days to Done" value={`${report.tasks.avgCompletionDays}d`} icon={Clock} color="#00bcd4" small />
          </div>

          {/* Completion rate bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Completion Rate</span>
              <span style={{ fontWeight: 600, color: '#34a853' }}>{report.tasks.completionRate}%</span>
            </div>
            <ProgressBar value={report.tasks.completionRate} color="#34a853" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>Deadline Adherence</span>
              <span style={{ fontWeight: 600, color: '#4285f4' }}>{report.tasks.deadlineAdherenceRate}%</span>
            </div>
            <ProgressBar value={report.tasks.deadlineAdherenceRate} color="#4285f4" />
          </div>

          {/* Top contributors */}
          {report.tasks.topContributors.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
                🏆 Top Contributors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {report.tasks.topContributors.map((c, i) => (
                  <div
                    key={c.profileId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '10px',
                      background: i === 0 ? 'rgba(251,188,4,0.08)' : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: '50%',
                          background: 'rgba(66,133,244,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#4285f4',
                        }}
                      >
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c.name}</span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: i === 0 ? '#fbbc04' : 'var(--text-muted)',
                      }}
                    >
                      {c.completedCount} tasks
                    </span>
                    {i === 0 && <Award size={14} style={{ color: '#fbbc04' }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'attendance',
      label: 'Attendance',
      icon: Users,
      color: '#34a853',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <MetricCard label="Events in Period" value={report.attendance.totalEvents} icon={Calendar} color="#34a853" small />
            <MetricCard
              label="Avg Attendance Rate"
              value={`${report.attendance.avgAttendanceRate}%`}
              icon={TrendingUp}
              color="#4285f4"
              small
            />
            <MetricCard
              label="Perfect Attendance Events"
              value={report.attendance.eventsWithPerfectAttendance}
              icon={Star}
              color="#fbbc04"
              small
            />
          </div>

          {report.attendance.memberAttendanceSummary.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 500 }}>
                Member Attendance Breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {report.attendance.memberAttendanceSummary.map((m) => (
                  <div key={m.profileId} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {m.attended}/{m.total} events ({m.rate}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={m.rate}
                      color={m.rate >= 80 ? '#34a853' : m.rate >= 50 ? '#fbbc04' : '#ea4335'}
                      height={5}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'events',
      label: 'Events',
      icon: Calendar,
      color: '#fbbc04',
      content:
        report.events.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
            }}
          >
            No events held in this period.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {report.events.map((ev) => (
              <div
                key={ev.eventId}
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${ev.isOverBudget ? 'rgba(234,67,53,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        background:
                          ev.status === 'completed'
                            ? 'rgba(52,168,83,0.15)'
                            : 'rgba(255,255,255,0.1)',
                        color: ev.status === 'completed' ? '#34a853' : 'var(--text-muted)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {ev.status}
                    </span>
                    {ev.isOverBudget && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '999px',
                          background: 'rgba(234,67,53,0.15)',
                          color: '#ea4335',
                        }}
                      >
                        Over Budget
                      </span>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ev.registrationCount}</div>
                    <div>Registered</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ev.attendanceCount}</div>
                    <div>Attended</div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: ev.attendanceRate >= 75 ? '#34a853' : ev.attendanceRate >= 50 ? '#fbbc04' : '#ea4335',
                        fontWeight: 600,
                      }}
                    >
                      {ev.avgFeedbackScore !== null ? `★ ${ev.avgFeedbackScore}` : `${ev.attendanceRate}%`}
                    </div>
                    <div>{ev.avgFeedbackScore !== null ? 'Avg Feedback' : 'Attendance'}</div>
                  </div>
                </div>
                <ProgressBar value={ev.attendanceRate} color="#4285f4" height={5} />
              </div>
            ))}
          </div>
        ),
    },
    {
      key: 'members',
      label: 'Members',
      icon: Users,
      color: '#a142f4',
      content: (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <MetricCard label="Active Members" value={report.members.totalActiveMembers} icon={Users} color="#a142f4" />
          <MetricCard label="New This Period" value={report.members.newMembers} icon={Sparkles} color="#34a853" />
          <MetricCard label="Inactive This Period" value={report.members.inactiveMembers} icon={AlertTriangle} color="#ea4335" />
          <MetricCard
            label="Avg Engagement Score"
            value={`${report.members.avgEngagementScore}%`}
            icon={Flame}
            color="#fbbc04"
          />
        </div>
      ),
    },
    ...(report.weeklyReviewAnswers.length > 0
      ? [
          {
            key: 'reviews',
            label: 'Weekly Reviews',
            icon: Info,
            color: '#00bcd4',
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {report.weeklyReviewAnswers.map((rev, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '12px',
                      background: 'rgba(0,188,212,0.06)',
                      border: '1px solid rgba(0,188,212,0.2)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#00bcd4' }}>
                        Week of {new Date(rev.weekOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Submitted by {rev.submitterName}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                      {rev.questions.map((q, qi) =>
                        rev.answers[qi] ? (
                          <div key={qi}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                              Q{qi + 1}: {q}
                            </div>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-primary)',
                                lineHeight: 1.5,
                              }}
                            >
                              {rev.answers[qi]}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Report header */}
      <div
        style={{
          padding: '1.75rem',
          borderRadius: '20px',
          background:
            report.healthStatus === 'healthy'
              ? 'linear-gradient(135deg, rgba(52,168,83,0.12), rgba(52,168,83,0.04))'
              : report.healthStatus === 'needs_attention'
              ? 'linear-gradient(135deg, rgba(251,188,4,0.12), rgba(251,188,4,0.04))'
              : 'linear-gradient(135deg, rgba(234,67,53,0.12), rgba(234,67,53,0.04))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                }}
              >
                {report.branch === 'tech' ? 'Tech' : 'Non-Tech'} · {report.departmentCode}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {report.departmentName}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {report.period.label} · Generated{' '}
              {new Date(report.generatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <HealthBadge status={report.healthStatus} score={report.overallHealthScore} />
        </div>

        {/* Highlights & alerts */}
        {(report.highlights.length > 0 || report.alerts.length > 0) && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            {report.highlights.length > 0 && (
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34a853', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  ✦ HIGHLIGHTS
                </div>
                {report.highlights.map((h, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    · {h}
                  </div>
                ))}
              </div>
            )}
            {report.alerts.length > 0 && (
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ea4335', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  ⚠ ALERTS
                </div>
                {report.alerts.map((a, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    · {a}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible sections */}
      {sections.map((sec) => (
        <div
          key={sec.key}
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => toggle(sec.key)}
            style={{
              width: '100%',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: `${sec.color}22`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: sec.color,
                }}
              >
                <sec.icon size={16} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{sec.label}</span>
            </div>
            <ChevronDown
              size={18}
              style={{
                color: 'var(--text-muted)',
                transform: openSection === sec.key ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          {openSection === sec.key && (
            <div style={{ padding: '0 1.25rem 1.25rem' }}>{sec.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function ReportsClient({ departments, initialDeptId, isPresidential }: ReportsClientProps) {
  const [period, setPeriod] = useState<ReportPeriod>('weekly');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(
    isPresidential ? 'all' : initialDeptId
  );
  const [reports, setReports] = useState<CommitteeReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const handleGenerate = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await generateCommitteeReport({
        departmentId: selectedDeptId,
        period,
      });
      if (result.success) {
        setReports(result.reports);
      } else {
        setError(result.error || 'Failed to generate report');
      }
    });
  }, [selectedDeptId, period]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reports || reports.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      // Download one PDF per report (or just the first if single selection)
      for (const report of reports) {
        const params = new URLSearchParams({
          departmentId: report.departmentId,
          period,
        });
        const res = await fetch(`/api/reports/export-pdf?${params.toString()}`);
        if (!res.ok) throw new Error('PDF generation failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GDGoC_HNU_${report.departmentCode}_${period}_report.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      setError(err.message || 'PDF download failed');
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [reports, period]);

  const handleDownloadExcel = useCallback(async () => {
    if (!reports || reports.length === 0) return;
    setIsDownloadingExcel(true);
    try {
      const params = new URLSearchParams({
        type: 'committee',
        departmentId: selectedDeptId,
        period,
      });
      const res = await fetch(`/api/reports/export-excel?${params.toString()}`);
      if (!res.ok) throw new Error('Excel generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GDGoC_HNU_${selectedDeptId === 'all' ? 'All_Committees' : reports[0].departmentCode}_${period}_report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Excel download failed');
    } finally {
      setIsDownloadingExcel(false);
    }
  }, [reports, selectedDeptId, period]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls card */}
      <div
        className="glass-panel"
        style={{
          padding: '1.5rem',
          borderRadius: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'flex-end',
        }}
      >
        {/* Committee selector */}
        {(isPresidential || departments.length > 1) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1', minWidth: '200px' }}>
            <label
              style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              Committee
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="report-committee-select"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 2.5rem 0.625rem 0.875rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                {isPresidential && <option value="all">All Committees</option>}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Period toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label
            style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}
          >
            Period
          </label>
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              background: 'rgba(255,255,255,0.05)',
              padding: '0.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {(['weekly', 'monthly'] as ReportPeriod[]).map((p) => (
              <button
                key={p}
                id={`period-${p}`}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '7px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: period === p ? 700 : 500,
                  fontSize: '0.825rem',
                  textTransform: 'capitalize',
                  background:
                    period === p
                      ? 'linear-gradient(135deg, var(--google-blue), #5ea8fb)'
                      : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          id="generate-report-btn"
          onClick={handleGenerate}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.5rem',
            borderRadius: '10px',
            border: 'none',
            background: isPending
              ? 'rgba(255,255,255,0.1)'
              : 'linear-gradient(135deg, var(--google-blue), #5ea8fb)',
            color: isPending ? 'var(--text-muted)' : '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: isPending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {isPending ? (
            <>
              <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
              Generating…
            </>
          ) : (
            <>
              <BarChart3 size={15} />
              Generate Report
            </>
          )}
        </button>

        {/* PDF Download button — visible once reports are generated */}
        {reports !== null && reports.length > 0 && (
          <button
            id="download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf || isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(52,168,83,0.4)',
              background: isDownloadingPdf
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(52,168,83,0.12)',
              color: isDownloadingPdf ? 'var(--text-muted)' : '#34a853',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: isDownloadingPdf ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isDownloadingPdf ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Exporting…</>
            ) : (
              <><Download size={14} /> Export PDF</>
            )}
          </button>
        )}

        {/* Excel Download button — visible once reports are generated */}
        {reports !== null && reports.length > 0 && (
          <button
            id="download-excel-btn"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel || isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(66,133,244,0.4)',
              background: isDownloadingExcel
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(66,133,244,0.12)',
              color: isDownloadingExcel ? 'var(--text-muted)' : '#4285f4',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: isDownloadingExcel ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {isDownloadingExcel ? (
              <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Exporting…</>
            ) : (
              <><FileSpreadsheet size={14} /> Export Excel</>
            )}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(234,67,53,0.1)',
            border: '1px solid rgba(234,67,53,0.3)',
            color: '#ea4335',
            fontSize: '0.875rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isPending && reports !== null && reports.length === 0 && (
        <div
          style={{
            padding: '3rem',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center',
          }}
        >
          <BarChart3 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No data found for the selected period.
          </div>
        </div>
      )}

      {/* Initial empty state */}
      {!isPending && reports === null && (
        <div
          style={{
            padding: '4rem 2rem',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px dashed rgba(255,255,255,0.1)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(66,133,244,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4285f4',
            }}
          >
            <BarChart3 size={30} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
              Generate a Committee Report
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '380px' }}>
              Select a committee and period above, then click <strong>Generate Report</strong> to
              see task metrics, attendance, member activity, events, and weekly review answers in
              one leadership-ready view.
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: '0.5rem',
            }}
          >
            {[
              { icon: CheckCircle2, label: 'Task Metrics', color: '#4285f4' },
              { icon: Users, label: 'Attendance', color: '#34a853' },
              { icon: Calendar, label: 'Events', color: '#fbbc04' },
              { icon: Target, label: 'Member Activity', color: '#a142f4' },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '999px',
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  fontSize: '0.775rem',
                  fontWeight: 500,
                  color,
                }}
              >
                <Icon size={12} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {isPending && (
        <div
          style={{
            padding: '3rem',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center',
          }}
        >
          <RefreshCw size={32} style={{ color: '#4285f4', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Aggregating committee data…
          </div>
        </div>
      )}

      {/* Report cards */}
      {!isPending &&
        reports !== null &&
        reports.map((report) => <ReportView key={report.departmentId} report={report} />)}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
