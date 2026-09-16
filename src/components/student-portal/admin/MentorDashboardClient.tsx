'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type {
  MentorDashboardResult,
  MenteeProgress,
  MenteeCourseSummary,
  MentorNoteItem,
} from '@/app/student-portal/admin/mentorship/actions';
import { saveMentorNote } from '@/app/student-portal/admin/mentorship/actions';

// ============================================================
// Props
// ============================================================
interface Props {
  initialData: MentorDashboardResult;
}

// ============================================================
// Utility
// ============================================================
function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'No activity';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getAttendanceColor(rate: number): string {
  if (rate >= 80) return '#10b981';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreColor(score: number | null): string {
  if (score === null) return '#6b7280';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

// ============================================================
// Mini circular progress
// ============================================================
function CircularProgress({ value, size = 48, color }: { value: number; size?: number; color: string }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ============================================================
// Stat card
// ============================================================
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}22`,
          border: `1px solid ${color}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#f9fafb', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ============================================================
// Progress bar
// ============================================================
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 36 }}>
        {value}/{max}
      </span>
    </div>
  );
}

// ============================================================
// Mentee row
// ============================================================
function MenteeRow({
  mentee,
  onSelect,
  isSelected,
}: {
  mentee: MenteeProgress;
  onSelect: (m: MenteeProgress) => void;
  isSelected: boolean;
}) {
  const attColor = getAttendanceColor(mentee.attendanceRate);

  return (
    <tr
      onClick={() => onSelect(mentee)}
      style={{
        cursor: 'pointer',
        background: isSelected
          ? 'rgba(99,102,241,0.12)'
          : mentee.isAtRisk
          ? 'rgba(239,68,68,0.05)'
          : 'transparent',
        transition: 'background 0.2s',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLElement).style.background = mentee.isAtRisk ? 'rgba(239,68,68,0.05)' : 'transparent';
      }}
    >
      {/* Student */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {mentee.avatar_url ? (
              <img
                src={mentee.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (mentee.full_name_en || mentee.email).charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#f9fafb', fontSize: 13 }}>
              {mentee.full_name_en || mentee.email}
              {mentee.isAtRisk && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    fontWeight: 700,
                    background: 'rgba(239,68,68,0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    verticalAlign: 'middle',
                  }}
                >
                  AT RISK
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{mentee.email}</div>
          </div>
        </div>
      </td>

      {/* Courses */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {mentee.courses.map((c) => (
            <span
              key={c.course_id}
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(99,102,241,0.15)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.25)',
              }}
            >
              {c.course_title.length > 18 ? c.course_title.slice(0, 18) + '…' : c.course_title}
            </span>
          ))}
        </div>
      </td>

      {/* Attendance */}
      <td style={{ padding: '14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CircularProgress value={mentee.attendanceRate} size={36} color={attColor} />
          <span style={{ fontSize: 13, fontWeight: 600, color: attColor }}>
            {mentee.attendanceRate}%
          </span>
        </div>
      </td>

      {/* Tasks */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#f9fafb' }}>{mentee.tasksSubmitted}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}> submitted</span>
      </td>

      {/* Quizzes */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>{mentee.quizzesPassed}</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>/{mentee.quizzesTaken} passed</span>
      </td>

      {/* Avg Score */}
      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
        {mentee.averageTaskScore !== null ? (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: getScoreColor(mentee.averageTaskScore),
            }}
          >
            {mentee.averageTaskScore}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#4b5563' }}>—</span>
        )}
      </td>

      {/* Last activity */}
      <td style={{ padding: '14px 12px', textAlign: 'right', color: '#6b7280', fontSize: 12 }}>
        {formatRelativeDate(mentee.latestActivity)}
      </td>
    </tr>
  );
}

// ============================================================
// Student detail drawer
// ============================================================
function MenteeDrawer({
  mentee,
  courses,
  onClose,
  onNoteSaved,
}: {
  mentee: MenteeProgress;
  courses: Array<{ id: string; title: string; mentor_role: string }>;
  onClose: () => void;
  onNoteSaved: (studentId: string) => void;
}) {
  const [noteText, setNoteText] = useState('');
  const [flagAtRisk, setFlagAtRisk] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>(mentee.courses[0]?.course_id || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes'>('overview');

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    const res = await saveMentorNote({
      studentId: mentee.student_id,
      courseId: selectedCourse || null,
      note: noteText.trim(),
      flaggedAtRisk: flagAtRisk,
    });
    setSaving(false);
    if (res.success) {
      setSaveMsg({ type: 'success', text: res.message || 'Saved!' });
      setNoteText('');
      setFlagAtRisk(false);
      onNoteSaved(mentee.student_id);
      setTimeout(() => setSaveMsg(null), 3000);
    } else {
      setSaveMsg({ type: 'error', text: res.error || 'Failed to save note.' });
    }
  };

  const attColor = getAttendanceColor(mentee.attendanceRate);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ flex: 1, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      />

      {/* Drawer */}
      <div
        style={{
          width: 480,
          background: '#0f172a',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            position: 'sticky',
            top: 0,
            background: '#0f172a',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {mentee.avatar_url ? (
                  <img src={mentee.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (mentee.full_name_en || mentee.email).charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 16 }}>
                  {mentee.full_name_en || 'Student'}
                </div>
                {mentee.full_name_ar && (
                  <div style={{ fontSize: 13, color: '#9ca3af', direction: 'rtl' }}>{mentee.full_name_ar}</div>
                )}
                <div style={{ fontSize: 12, color: '#6b7280' }}>{mentee.email}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: 8,
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '8px 12px',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {mentee.university && (
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.12)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99,102,241,0.2)',
                }}
              >
                🎓 {mentee.university}
              </span>
            )}
            {mentee.department_major && (
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(16,185,129,0.1)',
                  color: '#6ee7b7',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}
              >
                📚 {mentee.department_major}
              </span>
            )}
            {mentee.isAtRisk && (
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)',
                  fontWeight: 700,
                }}
              >
                ⚠️ At Risk
              </span>
            )}
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {(['overview', 'timeline', 'notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: activeTab === tab ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? '#818cf8' : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                {tab === 'overview' ? '📊 Overview' : tab === 'timeline' ? '📅 Timeline' : '📝 Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, flex: 1 }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Global stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, position: 'relative' }}>
                    <CircularProgress value={mentee.attendanceRate} size={56} color={attColor} />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 12,
                        fontWeight: 700,
                        color: attColor,
                      }}
                    >
                      {mentee.attendanceRate}%
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Attendance</div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                    {mentee.totalSessionsAttended}/{mentee.totalSessionsExpected} sessions
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(mentee.averageTaskScore) }}>
                    {mentee.averageTaskScore !== null ? mentee.averageTaskScore : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Avg Task Score</div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                    {mentee.tasksSubmitted} submitted
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>
                    {mentee.quizzesPassed}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Quizzes Passed</div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                    out of {mentee.quizzesTaken} taken
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12,
                    padding: 16,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 32, fontWeight: 800, color: getScoreColor(mentee.averageQuizScore) }}>
                    {mentee.averageQuizScore !== null ? mentee.averageQuizScore : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>Avg Quiz Score</div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                    Last active: {formatRelativeDate(mentee.latestActivity)}
                  </div>
                </div>
              </div>

              {/* Per-course breakdown */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 12 }}>
                  📖 Course Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mentee.courses.map((cs) => (
                    <div
                      key={cs.course_id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>
                          {cs.course_title}
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: cs.mentor_role === 'mentor' ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.1)',
                            color: cs.mentor_role === 'mentor' ? '#c4b5fd' : '#6ee7b7',
                            border: `1px solid ${cs.mentor_role === 'mentor' ? 'rgba(139,92,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
                          }}
                        >
                          {cs.mentor_role}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                          Sessions
                        </div>
                        <ProgressBar value={cs.sessionsAttended} max={cs.sessionsTotal} color={getAttendanceColor(cs.sessionsTotal > 0 ? (cs.sessionsAttended / cs.sessionsTotal) * 100 : 0)} />
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, marginTop: 4 }}>
                          Tasks Submitted
                        </div>
                        <ProgressBar value={cs.tasksSubmitted} max={cs.tasksTotal} color="#6366f1" />
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, marginTop: 4 }}>
                          Quizzes Passed
                        </div>
                        <ProgressBar value={cs.quizzesPassed} max={cs.quizzesTotal} color="#10b981" />
                      </div>
                    </div>
                  ))}
                  {mentee.courses.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#4b5563', padding: '20px 0' }}>
                      No course enrollments found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db', marginBottom: 8 }}>
                🕒 Recent Activity
              </div>
              {/* Notes timeline */}
              {mentee.mentorNotes.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#4b5563',
                    padding: '32px 0',
                    fontSize: 13,
                  }}
                >
                  No activity recorded yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[...mentee.mentorNotes]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((note, i) => (
                      <div key={note.id} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: note.flagged_at_risk
                                ? 'rgba(239,68,68,0.2)'
                                : 'rgba(99,102,241,0.2)',
                              border: `2px solid ${note.flagged_at_risk ? '#ef4444' : '#6366f1'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {note.flagged_at_risk ? '⚠️' : '📝'}
                          </div>
                          {i < mentee.mentorNotes.length - 1 && (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                background: 'rgba(255,255,255,0.06)',
                                marginTop: 4,
                                minHeight: 16,
                              }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                            {new Date(note.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.07)',
                              borderRadius: 8,
                              padding: '10px 12px',
                              fontSize: 13,
                              color: '#d1d5db',
                              lineHeight: 1.5,
                            }}
                          >
                            {note.note}
                          </div>
                          {note.flagged_at_risk && (
                            <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                              ⚠️ Flagged at-risk
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d1d5db' }}>
                📝 Add a Mentor Note
              </div>

              {/* Course selector */}
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
                  Related Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    padding: '9px 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  <option value="">— General note (no specific course) —</option>
                  {mentee.courses.map((c) => (
                    <option key={c.course_id} value={c.course_id}>
                      {c.course_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Note textarea */}
              <div>
                <label style={{ fontSize: 12, color: '#9ca3af', display: 'block', marginBottom: 6 }}>
                  Note
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Write your observation about this student's progress, strengths, or areas of improvement…"
                  rows={5}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    padding: '10px 12px',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Flag at risk */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: flagAtRisk ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${flagAtRisk ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={flagAtRisk}
                  onChange={(e) => setFlagAtRisk(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#ef4444' }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: flagAtRisk ? '#f87171' : '#d1d5db' }}>
                    Flag as At-Risk
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    Notify the Committee Head and President
                  </div>
                </div>
              </label>

              {/* Save button */}
              <button
                onClick={handleSaveNote}
                disabled={saving || !noteText.trim()}
                style={{
                  padding: '12px 0',
                  borderRadius: 10,
                  border: 'none',
                  background:
                    saving || !noteText.trim()
                      ? 'rgba(255,255,255,0.05)'
                      : flagAtRisk
                      ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                      : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: saving || !noteText.trim() ? '#4b5563' : '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving || !noteText.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  width: '100%',
                }}
              >
                {saving ? '💾 Saving…' : flagAtRisk ? '⚠️ Flag & Save Note' : '💾 Save Note'}
              </button>

              {saveMsg && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    background:
                      saveMsg.type === 'success'
                        ? 'rgba(16,185,129,0.12)'
                        : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${saveMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: saveMsg.type === 'success' ? '#6ee7b7' : '#f87171',
                  }}
                >
                  {saveMsg.type === 'success' ? '✅' : '❌'} {saveMsg.text}
                </div>
              )}

              {/* Previous notes list */}
              {mentee.mentorNotes.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, marginTop: 8 }}>
                    PREVIOUS NOTES ({mentee.mentorNotes.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...mentee.mentorNotes]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((note) => (
                        <div
                          key={note.id}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${note.flagged_at_risk ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 8,
                            padding: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: '#6b7280' }}>
                              {new Date(note.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {note.flagged_at_risk && (
                              <span style={{ fontSize: 11, color: '#f87171' }}>⚠️ At-risk</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>{note.note}</div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
export function MentorDashboardClient({ initialData }: Props) {
  const [data] = useState<MentorDashboardResult>(initialData);
  const [selectedMentee, setSelectedMentee] = useState<MenteeProgress | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'at_risk' | 'on_track'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'attendance' | 'tasks' | 'quizzes' | 'activity'>('name');

  const mentees = data.mentees || [];
  const courses = data.assignedCourses || [];

  // Filter & sort
  const filteredMentees = useMemo(() => {
    let list = [...mentees];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          (m.full_name_en || '').toLowerCase().includes(q) ||
          (m.full_name_ar || '').toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }

    if (filterCourse !== 'all') {
      list = list.filter((m) => m.courses.some((c) => c.course_id === filterCourse));
    }

    if (filterRisk === 'at_risk') list = list.filter((m) => m.isAtRisk);
    if (filterRisk === 'on_track') list = list.filter((m) => !m.isAtRisk);

    list.sort((a, b) => {
      switch (sortBy) {
        case 'attendance':
          return b.attendanceRate - a.attendanceRate;
        case 'tasks':
          return b.tasksSubmitted - a.tasksSubmitted;
        case 'quizzes':
          return b.quizzesPassed - a.quizzesPassed;
        case 'activity':
          return (b.latestActivity || '').localeCompare(a.latestActivity || '');
        default:
          if (a.isAtRisk !== b.isAtRisk) return a.isAtRisk ? -1 : 1;
          return (a.full_name_en || a.email).localeCompare(b.full_name_en || b.email);
      }
    });

    return list;
  }, [mentees, searchQuery, filterCourse, filterRisk, sortBy]);

  const handleNoteSaved = useCallback((_studentId: string) => {
    // In a real scenario we'd re-fetch; for now just show success in the drawer
  }, []);

  // Summary stats
  const totalMentees = mentees.length;
  const atRiskCount = data.atRiskCount;
  const avgAttendance =
    mentees.length > 0
      ? Math.round(mentees.reduce((a, m) => a + m.attendanceRate, 0) / mentees.length)
      : 0;
  const totalSubmissions = mentees.reduce((a, m) => a + m.tasksSubmitted, 0);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: 'transparent',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          padding: '32px 24px',
          maxWidth: 1400,
          margin: '0 auto',
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#f9fafb',
                  margin: 0,
                  background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Mentor Dashboard
              </h1>
              <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
                Track your mentees' progress across{' '}
                <strong style={{ color: '#a5b4fc' }}>{courses.length} course{courses.length !== 1 ? 's' : ''}</strong>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {courses.map((c) => (
                <span
                  key={c.id}
                  style={{
                    fontSize: 11,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: 'rgba(99,102,241,0.12)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99,102,241,0.2)',
                    fontWeight: 600,
                  }}
                >
                  {c.title}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Error state */}
        {!data.success && data.error && (
          <div
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 12,
              padding: '20px 24px',
              color: '#f87171',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            ❌ {data.error}
          </div>
        )}

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}
        >
          <StatCard
            icon="👥"
            label="Total Mentees"
            value={totalMentees}
            sub={`${courses.length} course${courses.length !== 1 ? 's' : ''}`}
            color="#6366f1"
          />
          <StatCard
            icon="⚠️"
            label="At-Risk Students"
            value={atRiskCount}
            sub={atRiskCount === 0 ? 'All on track!' : 'Need attention'}
            color={atRiskCount > 0 ? '#ef4444' : '#10b981'}
          />
          <StatCard
            icon="📅"
            label="Avg Attendance"
            value={`${avgAttendance}%`}
            sub={avgAttendance >= 80 ? 'Excellent' : avgAttendance >= 50 ? 'Needs improvement' : 'Critical'}
            color={getAttendanceColor(avgAttendance)}
          />
          <StatCard
            icon="📋"
            label="Task Submissions"
            value={totalSubmissions}
            sub="across all mentees"
            color="#f59e0b"
          />
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b7280',
                fontSize: 14,
              }}
            >
              🔍
            </span>
            <input
              type="text"
              placeholder="Search mentees…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#e2e8f0',
                padding: '9px 12px 9px 36px',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Course filter */}
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#e2e8f0',
              padding: '9px 12px',
              fontSize: 13,
              outline: 'none',
            }}
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {/* Risk filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'at_risk', 'on_track'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterRisk(f)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background:
                    filterRisk === f
                      ? f === 'at_risk'
                        ? 'rgba(239,68,68,0.25)'
                        : f === 'on_track'
                        ? 'rgba(16,185,129,0.2)'
                        : 'rgba(99,102,241,0.25)'
                      : 'rgba(255,255,255,0.05)',
                  color:
                    filterRisk === f
                      ? f === 'at_risk'
                        ? '#f87171'
                        : f === 'on_track'
                        ? '#6ee7b7'
                        : '#818cf8'
                      : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'all' ? 'All' : f === 'at_risk' ? '⚠️ At Risk' : '✅ On Track'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#e2e8f0',
              padding: '9px 12px',
              fontSize: 13,
              outline: 'none',
            }}
          >
            <option value="name">Sort: Name</option>
            <option value="attendance">Sort: Attendance</option>
            <option value="tasks">Sort: Tasks</option>
            <option value="quizzes">Sort: Quizzes</option>
            <option value="activity">Sort: Last Activity</option>
          </select>
        </div>

        {/* Table */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {filteredMentees.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 24px',
                color: '#4b5563',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#6b7280' }}>
                {mentees.length === 0 ? 'No mentees yet' : 'No matches found'}
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', marginTop: 6 }}>
                {mentees.length === 0
                  ? 'Students enrolled in your courses will appear here.'
                  : 'Try adjusting your search or filters.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {[
                      'Student',
                      'Enrolled Courses',
                      'Attendance',
                      'Tasks',
                      'Quizzes',
                      'Avg Score',
                      'Last Active',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#6b7280',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          textAlign: h === 'Student' || h === 'Enrolled Courses' ? 'left' : h === 'Last Active' ? 'right' : 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMentees.map((mentee) => (
                    <MenteeRow
                      key={mentee.student_id}
                      mentee={mentee}
                      onSelect={setSelectedMentee}
                      isSelected={selectedMentee?.student_id === mentee.student_id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {filteredMentees.length > 0 && (
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                fontSize: 12,
                color: '#4b5563',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                Showing {filteredMentees.length} of {mentees.length} mentee{mentees.length !== 1 ? 's' : ''}
              </span>
              <span style={{ color: '#6b7280' }}>
                Click a row to view details and add notes
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Drawer */}
      {selectedMentee && (
        <MenteeDrawer
          mentee={selectedMentee}
          courses={courses}
          onClose={() => setSelectedMentee(null)}
          onNoteSaved={handleNoteSaved}
        />
      )}
    </>
  );
}

