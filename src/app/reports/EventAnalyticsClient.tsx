'use client';

import { useState, useTransition, useCallback } from 'react';
import {
  Calendar,
  Users,
  Star,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  RefreshCw,
  MapPin,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Award,
  Target,
  Activity,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import type { EventAnalyticsSummary, EventPerformanceReport } from '@/types/reports';
import { generateEventAnalyticsReport } from '@/app/reports/actions';

interface Department {
  id: string;
  name: string;
  code: string;
  branch: string;
}

interface EventAnalyticsClientProps {
  departments: Department[];
  initialDeptId: string;
  isPresidential: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, prefix = '') {
  return `${prefix}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function tierColor(tier: string) {
  if (tier === 'excellent') return '#34a853';
  if (tier === 'good') return '#4285f4';
  if (tier === 'fair') return '#fbbc04';
  return '#ea4335';
}

function tierBg(tier: string) {
  return `${tierColor(tier)}18`;
}

function ratingColor(r: number) {
  if (r >= 4.5) return '#34a853';
  if (r >= 3.5) return '#4285f4';
  if (r >= 2.5) return '#fbbc04';
  return '#ea4335';
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
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
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '70px',
          height: '70px',
          background: `radial-gradient(circle at 80% 20%, ${color}25, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          <Icon size={14} />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

function StarRating({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data</span>;
  const color = ratingColor(score);
  return (
    <span style={{ fontWeight: 700, color, fontSize: '0.9rem' }}>
      ★ {score.toFixed(1)}
    </span>
  );
}

// ─── Per-Event Card ───────────────────────────────────────────────────────────

function EventCard({ event, expanded, onToggle }: {
  event: EventPerformanceReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = tierColor(event.performanceTier);

  return (
    <div
      style={{
        borderRadius: '16px',
        border: `1px solid ${expanded ? color + '44' : 'rgba(255,255,255,0.07)'}`,
        background: expanded ? `${color}08` : 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '1rem 1.25rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto auto',
          gap: '0.75rem',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        {/* Title + meta */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {event.title}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '0.75rem' }}>
            <span>
              {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ color: `${color}cc` }}>{event.departmentCode}</span>
            {event.venue && <span>📍 {event.venue}</span>}
          </div>
        </div>

        {/* Attendance */}
        <div style={{ textAlign: 'center', minWidth: '60px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: event.attendanceRate >= 75 ? '#34a853' : event.attendanceRate >= 50 ? '#fbbc04' : '#ea4335' }}>
            {event.attendanceRate}%
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Attendance</div>
        </div>

        {/* Feedback */}
        <div style={{ textAlign: 'center', minWidth: '55px' }}>
          <StarRating score={event.avgFeedbackScore} />
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Rating</div>
        </div>

        {/* Performance tier badge */}
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: `${color}20`,
            color,
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
          }}
        >
          {event.performanceTier}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.625rem' }}>
            <StatCard label="Registered" value={event.totalRegistered} icon={Users} color="#4285f4" />
            <StatCard label="Attended" value={event.totalAttended} icon={CheckCircle2} color="#34a853" />
            <StatCard label="Absent" value={event.totalAbsent} icon={AlertTriangle} color="#ea4335" />
            <StatCard label="Feedback" value={event.feedbackCount} icon={MessageSquare} color="#a142f4" />
            <StatCard label="QR Check-ins" value={event.checkInMethods.qr} icon={Target} color="#00bcd4" />
            <StatCard label="Manual Check-ins" value={event.checkInMethods.manual} icon={Activity} color="#ff7043" />
          </div>

          {/* Attendance bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              <span>Attendance Rate</span>
              <span style={{ fontWeight: 700, color }}>{event.attendanceRate}%</span>
            </div>
            <ProgressBar value={event.attendanceRate} color={color} height={8} />
          </div>

          {/* Feedback section */}
          {event.feedbackCount > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Distribution */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                  Feedback Distribution
                </div>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = event.feedbackDistribution[star];
                  const pct = event.feedbackCount > 0 ? Math.round((count / event.feedbackCount) * 100) : 0;
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '20px', textAlign: 'right' }}>
                        ★{star}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={pct} color={ratingColor(star)} height={5} />
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: '28px' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Top comments */}
              {event.topComments.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                    Highlighted Comments
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {event.topComments.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '0.5rem 0.625rem',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.04)',
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          borderLeft: `3px solid ${ratingColor(c.rating)}`,
                        }}
                      >
                        "{c.comment}"
                        {c.isAnonymous && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginLeft: '0.375rem' }}>
                            (anon)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Budget section */}
          {(event.totalEstimated > 0 || event.totalActual > 0) && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Budget Summary
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.625rem 1rem', borderRadius: '10px', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Estimated</div>
                  <div style={{ fontWeight: 700, color: '#4285f4' }}>EGP {fmt(event.totalEstimated)}</div>
                </div>
                <div style={{ padding: '0.625rem 1rem', borderRadius: '10px', background: event.isOverBudget ? 'rgba(234,67,53,0.1)' : 'rgba(52,168,83,0.1)', border: `1px solid ${event.isOverBudget ? 'rgba(234,67,53,0.2)' : 'rgba(52,168,83,0.2)'}` }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Actual</div>
                  <div style={{ fontWeight: 700, color: event.isOverBudget ? '#ea4335' : '#34a853' }}>
                    EGP {fmt(event.totalActual)}
                  </div>
                </div>
                {event.isOverBudget && (
                  <div style={{ padding: '0.625rem 1rem', borderRadius: '10px', background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.2)' }}>
                    <div style={{ fontSize: '0.68rem', color: '#ea4335' }}>Over by</div>
                    <div style={{ fontWeight: 700, color: '#ea4335' }}>EGP {fmt(event.overBudgetAmount)}</div>
                  </div>
                )}
              </div>

              {/* Category breakdown */}
              {event.categoryBreakdown.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {event.categoryBreakdown.map((cat) => {
                    const pct = cat.estimated > 0 ? Math.round((cat.actual / cat.estimated) * 100) : 0;
                    return (
                      <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: '70px', textTransform: 'capitalize' }}>
                          {cat.category}
                        </span>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={pct} color={cat.isOverBudget ? '#ea4335' : '#34a853'} height={5} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '100px', textAlign: 'right' }}>
                          {fmt(cat.actual)} / {fmt(cat.estimated)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function EventAnalyticsClient({ departments, initialDeptId, isPresidential }: EventAnalyticsClientProps) {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split('T')[0]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(isPresidential ? 'all' : initialDeptId);
  const [summary, setSummary] = useState<EventAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events'>('overview');
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const handleGenerate = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result = await generateEventAnalyticsReport({
        departmentId: selectedDeptId,
        dateFrom,
        dateTo,
      });
      if (result.success) {
        setSummary(result.summary);
        setExpandedEvent(null);
      } else {
        setError(result.error || 'Failed to generate analytics');
      }
    });
  }, [selectedDeptId, dateFrom, dateTo]);

  const handleDownloadExcel = useCallback(async () => {
    if (!summary) return;
    setIsDownloadingExcel(true);
    try {
      const params = new URLSearchParams({
        type: 'events',
        departmentId: selectedDeptId,
        dateFrom,
        dateTo,
      });
      const res = await fetch(`/api/reports/export-excel?${params.toString()}`);
      if (!res.ok) throw new Error('Excel generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GDGoC_HNU_Event_Analytics_${dateFrom}_to_${dateTo}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Excel export failed');
    } finally {
      setIsDownloadingExcel(false);
    }
  }, [summary, selectedDeptId, dateFrom, dateTo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Controls */}
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
        {/* Department */}
        {(isPresidential || departments.length > 1) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1', minWidth: '180px' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Committee
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id="event-analytics-dept"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 2rem 0.5rem 0.75rem',
                  borderRadius: '9px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  appearance: 'none',
                  cursor: 'pointer',
                }}
              >
                {isPresidential && <option value="all">All Committees</option>}
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>
          </div>
        )}

        {/* Date From */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            From
          </label>
          <input
            id="event-analytics-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Date To */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            To
          </label>
          <input
            id="event-analytics-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Generate */}
        <button
          id="generate-event-analytics-btn"
          onClick={handleGenerate}
          disabled={isPending}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.375rem',
            borderRadius: '9px',
            border: 'none',
            background: isPending ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #34a853, #45c068)',
            color: isPending ? 'var(--text-muted)' : '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: isPending ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s',
          }}
        >
          {isPending
            ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
            : <><BarChart3 size={14} /> Analyze Events</>
          }
        </button>

        {/* Export Excel — visible once summary is loaded */}
        {summary !== null && (
          <button
            id="download-event-excel-btn"
            onClick={handleDownloadExcel}
            disabled={isDownloadingExcel || isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.25rem',
              borderRadius: '9px',
              border: '1px solid rgba(52,168,83,0.4)',
              background: isDownloadingExcel
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(52,168,83,0.12)',
              color: isDownloadingExcel ? 'var(--text-muted)' : '#34a853',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: isDownloadingExcel ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
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

      {error && (
        <div style={{ padding: '0.875rem 1.125rem', borderRadius: '12px', background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.3)', color: '#ea4335', fontSize: '0.875rem', display: 'flex', gap: '0.5rem' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {isPending && (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <RefreshCw size={28} style={{ color: '#34a853', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Crunching event data…</div>
        </div>
      )}

      {/* Empty initial state */}
      {!isPending && summary === null && !error && (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(52,168,83,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34a853' }}>
            <Calendar size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>Event Performance Analytics</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '360px' }}>
              Pick a date range and committee, then click <strong>Analyze Events</strong> to see attendance rates, satisfaction scores, budget summaries, and per-event deep dives.
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!isPending && summary !== null && (
        <>
          {/* Org-level summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <StatCard label="Total Events" value={summary.totalEvents} icon={Calendar} color="#4285f4" />
            <StatCard label="Total Registrations" value={fmt(summary.totalRegistrations)} icon={Users} color="#a142f4" />
            <StatCard label="Total Attended" value={fmt(summary.totalAttendees)} icon={CheckCircle2} color="#34a853" />
            <StatCard
              label="Avg Attendance"
              value={`${summary.overallAttendanceRate}%`}
              icon={TrendingUp}
              color={summary.overallAttendanceRate >= 70 ? '#34a853' : summary.overallAttendanceRate >= 50 ? '#fbbc04' : '#ea4335'}
            />
            <StatCard
              label="Avg Satisfaction"
              value={summary.avgFeedbackScore !== null ? `★ ${summary.avgFeedbackScore}` : 'N/A'}
              icon={Star}
              color={summary.avgFeedbackScore !== null ? ratingColor(summary.avgFeedbackScore) : 'var(--text-muted)'}
            />
            <StatCard
              label="Over Budget"
              value={summary.eventsOverBudget}
              icon={DollarSign}
              color={summary.eventsOverBudget > 0 ? '#ea4335' : '#34a853'}
            />
          </div>

          {/* By Department table */}
          {summary.byDepartment.length > 1 && (
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.875rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                📊 By Committee
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {summary.byDepartment.sort((a, b) => b.avgAttendanceRate - a.avgAttendanceRate).map((d) => (
                  <div key={d.departmentId} style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ minWidth: '80px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{d.departmentCode}</span>
                    <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{d.departmentName}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.eventCount} events</span>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: d.avgAttendanceRate >= 70 ? '#34a853' : d.avgAttendanceRate >= 50 ? '#fbbc04' : '#ea4335' }}>
                        {d.avgAttendanceRate}% att.
                      </span>
                      <StarRating score={d.avgFeedbackScore} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs: Overview highlights vs full event list */}
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              background: 'rgba(255,255,255,0.04)',
              padding: '0.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.07)',
              width: 'fit-content',
            }}
          >
            {(['overview', 'events'] as const).map((tab) => (
              <button
                key={tab}
                id={`event-analytics-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.4rem 1.125rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: '0.8rem',
                  background: activeTab === tab ? 'linear-gradient(135deg, #34a853, #45c068)' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {tab === 'overview' ? '✦ Highlights' : `All Events (${summary.totalEvents})`}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Top by attendance */}
              {summary.topByAttendance.length > 0 && (
                <div style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(52,168,83,0.06)', border: '1px solid rgba(52,168,83,0.2)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34a853', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    🏆 TOP BY ATTENDANCE
                  </div>
                  {summary.topByAttendance.map((e, i) => (
                    <div key={e.eventId} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? '#fbbc04' : 'var(--text-muted)', minWidth: '16px' }}>
                        #{i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#34a853' }}>{e.attendanceRate}%</span>
                      {i === 0 && <Award size={13} style={{ color: '#fbbc04', flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              )}

              {/* Top by feedback */}
              {summary.topByFeedback.length > 0 && (
                <div style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(251,188,4,0.06)', border: '1px solid rgba(251,188,4,0.2)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbc04', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    ★ TOP BY SATISFACTION
                  </div>
                  {summary.topByFeedback.map((e, i) => (
                    <div key={e.eventId} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? '#fbbc04' : 'var(--text-muted)', minWidth: '16px' }}>
                        #{i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.title}
                      </span>
                      <StarRating score={e.avgFeedbackScore} />
                    </div>
                  ))}
                </div>
              )}

              {/* Over budget events */}
              {summary.overBudgetEvents.length > 0 && (
                <div style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(234,67,53,0.06)', border: '1px solid rgba(234,67,53,0.2)', gridColumn: 'span 2' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ea4335', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
                    ⚠ OVER BUDGET EVENTS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {summary.overBudgetEvents.map((e) => (
                      <div key={e.eventId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{e.title}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{e.departmentCode}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ea4335' }}>+EGP {fmt(e.overBudgetAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* All Events tab */}
          {activeTab === 'events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {summary.events.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No events in this date range.
                </div>
              ) : (
                summary.events.map((ev) => (
                  <EventCard
                    key={ev.eventId}
                    event={ev}
                    expanded={expandedEvent === ev.eventId}
                    onToggle={() => setExpandedEvent((prev) => (prev === ev.eventId ? null : ev.eventId))}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
