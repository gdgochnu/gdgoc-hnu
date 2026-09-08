'use client';

import React from 'react';
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Award,
  Sparkles,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { PerformanceReview } from '@/types';
import { MemberProfileData } from '@/components/MemberProfileView';

interface MemberPerformanceTabProps {
  member: MemberProfileData;
  reviews?: PerformanceReview[];
  eventsAttendedCount?: number;
  totalCompletedEventsCount?: number;
}

export function MemberPerformanceTab({
  member,
  reviews = [],
  eventsAttendedCount = 0,
  totalCompletedEventsCount = 0,
}: MemberPerformanceTabProps) {
  // Compute real-time or cached attendance rate
  const dynamicAttendanceRate =
    totalCompletedEventsCount > 0
      ? Number(((eventsAttendedCount / totalCompletedEventsCount) * 100).toFixed(1))
      : member.attendance_rate ?? 100;

  const effectiveAttendanceRate =
    member.attendance_rate != null && member.attendance_rate > dynamicAttendanceRate
      ? member.attendance_rate
      : dynamicAttendanceRate;

  // Latest review or synthetic review based on current member metrics
  const latestReview =
    reviews.length > 0
      ? reviews[reviews.length - 1]
      : {
          period_month: new Date().toISOString().substring(0, 7),
          task_completion_pct: 100,
          deadline_adherence_pct: 100,
          attendance_pct: effectiveAttendanceRate,
          team_contribution_pct: Math.min(100, Math.round(effectiveAttendanceRate * 0.8 + 20)),
          overall_score: member.overall_score ?? Math.round(effectiveAttendanceRate * 0.4 + 60),
          notes: null,
        };

  // Historical data for trend chart (pad if only 1 exists)
  const chartData = reviews.length > 0 ? reviews : [latestReview as PerformanceReview];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--google-green)';
    if (score >= 60) return 'var(--google-blue)';
    if (score >= 40) return 'var(--google-yellow)';
    return 'var(--google-red)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Top Performance & Attendance Metric Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Attendance Rate Card (Spec §4.6 - always visible on every profile, every role) */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.08), transparent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Attendance Rate
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--google-green)', marginTop: '0.25rem' }}>
                {effectiveAttendanceRate}%
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(52, 168, 83, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarCheck2 size={20} color="var(--google-green)" />
            </div>
          </div>

          <div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '0.4rem',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, effectiveAttendanceRate)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--google-green), #48BB78)',
                  borderRadius: '999px',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Attended <strong style={{ color: 'var(--text-primary)' }}>{eventsAttendedCount}</strong> of{' '}
              {totalCompletedEventsCount} chapter events
            </div>
          </div>
        </div>

        {/* Overall Score Card */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(66, 133, 244, 0.3)',
            background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.08), transparent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Overall Score
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--google-blue)', marginTop: '0.25rem' }}>
                {latestReview.overall_score} / 100
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Award size={20} color="var(--google-blue)" />
            </div>
          </div>

          <div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '0.4rem',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, latestReview.overall_score)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--google-blue), #60A5FA)',
                  borderRadius: '999px',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Composite review for period {latestReview.period_month}
            </div>
          </div>
        </div>

        {/* Task Completion Rate */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(251, 188, 5, 0.3)',
            background: 'linear-gradient(135deg, rgba(251, 188, 5, 0.08), transparent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Task Completion
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--google-yellow)', marginTop: '0.25rem' }}>
                {latestReview.task_completion_pct}%
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(251, 188, 5, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={20} color="var(--google-yellow)" />
            </div>
          </div>

          <div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '0.4rem',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, latestReview.task_completion_pct)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--google-yellow), #ECC94B)',
                  borderRadius: '999px',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Completed assigned single and broadcast tasks
            </div>
          </div>
        </div>

        {/* Deadline Adherence */}
        <div
          className="glass-panel"
          style={{
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            background: 'linear-gradient(135deg, rgba(234, 67, 53, 0.08), transparent)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Deadline Adherence
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--google-red)', marginTop: '0.25rem' }}>
                {latestReview.deadline_adherence_pct}%
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} color="var(--google-red)" />
            </div>
          </div>

          <div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '0.4rem',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, latestReview.deadline_adherence_pct)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--google-red), #F87171)',
                  borderRadius: '999px',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tasks submitted before or on deadline SLA
            </div>
          </div>
        </div>
      </div>

      {/* 2. Monthly Performance Trend Chart */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(66, 133, 244, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} color="var(--google-blue)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Performance Trend Chart
              </h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Progression of monthly performance review scores and engagement over time (Spec §4.6)
              </p>
            </div>
          </div>

          {/* Chart Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--google-blue)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Overall Score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--google-green)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Attendance %</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--google-yellow)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Tasks %</span>
            </div>
          </div>
        </div>

        {/* Visual Multi-Bar Chart */}
        <div
          style={{
            padding: '1.5rem 1rem 0.5rem',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              height: '180px',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              gap: '1.5rem',
            }}
          >
            {chartData.map((item, idx) => {
              const overallHeight = Math.max(12, (item.overall_score / 100) * 160);
              const attendanceHeight = Math.max(12, (item.attendance_pct / 100) * 160);
              const taskHeight = Math.max(12, (item.task_completion_pct / 100) * 160);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flex: '1 1 80px',
                    maxWidth: '120px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '160px' }}>
                    {/* Overall Score Bar */}
                    <div
                      title={`Overall Score: ${item.overall_score}%`}
                      style={{
                        width: '18px',
                        height: `${overallHeight}px`,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(180deg, var(--google-blue), #2563EB)',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    {/* Attendance Bar */}
                    <div
                      title={`Attendance: ${item.attendance_pct}%`}
                      style={{
                        width: '18px',
                        height: `${attendanceHeight}px`,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(180deg, var(--google-green), #16A34A)',
                        transition: 'height 0.3s ease',
                      }}
                    />
                    {/* Task Bar */}
                    <div
                      title={`Tasks: ${item.task_completion_pct}%`}
                      style={{
                        width: '18px',
                        height: `${taskHeight}px`,
                        borderRadius: '4px 4px 0 0',
                        background: 'linear-gradient(180deg, var(--google-yellow), #D97706)',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  </div>

                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {item.period_month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Review History & HR Findings Log */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
          Monthly Review Breakdown
        </h3>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <div style={{ fontWeight: 600 }}>Initial review period active</div>
            <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 0' }}>
              Full monthly historical snapshots will populate as review jobs run at each month-end.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((r, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'rgba(66, 133, 244, 0.15)',
                        color: 'var(--google-blue)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                      }}
                    >
                      {r.period_month}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Evaluated on {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: getScoreColor(r.overall_score) }}>
                    {r.overall_score} / 100
                  </div>
                </div>

                {/* Score breakdown metrics pill list */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.78rem' }}>
                  <div style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                    Tasks: <strong style={{ color: 'var(--text-primary)' }}>{r.task_completion_pct}%</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                    On-time: <strong style={{ color: 'var(--text-primary)' }}>{r.deadline_adherence_pct}%</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                    Attendance: <strong style={{ color: 'var(--text-primary)' }}>{r.attendance_pct}%</strong>
                  </div>
                  <div style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}>
                    Contribution: <strong style={{ color: 'var(--text-primary)' }}>{r.team_contribution_pct}%</strong>
                  </div>
                </div>

                {/* Review Notes / HR Findings */}
                {r.notes && (
                  <div
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    <strong style={{ color: 'var(--google-blue)' }}>HR Notes: </strong>
                    {r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
