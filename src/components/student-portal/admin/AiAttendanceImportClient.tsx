'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronDown,
  Layers,
  Calendar,
  Users,
  Award,
  Bell,
  SlidersHorizontal,
  FileCheck,
  Building,
} from 'lucide-react';
import {
  AiImportInitialData,
  CourseOptionItem,
  ParsedSheetPreview,
  parseUploadedExcel,
  runAiAttendanceAnalysis,
  commitAiAttendanceRecords,
  CommitAttendanceResult,
} from '@/app/student-portal/admin/attendance/ai-import/actions';
import {
  GeminiAttendanceAnalysisResult,
  SessionColumnMapping,
  StudentRowAttendanceMatch,
} from '@/lib/ai/gemini-attendance';

interface AiAttendanceImportClientProps {
  initialData: AiImportInitialData;
}

type StepType = 'upload' | 'analyzing' | 'review' | 'success';

export function AiAttendanceImportClient({ initialData }: AiAttendanceImportClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<StepType>('upload');

  // Course selection
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialData.preselectedCourseId || initialData.courses[0]?.id || ''
  );

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedSheetPreview | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');

  // AI Analysis state
  const [analysisResult, setAnalysisResult] = useState<GeminiAttendanceAnalysisResult | null>(null);
  const [analyzingStepText, setAnalyzingStepText] = useState('Initializing Gemini 3.8 Flash...');

  // Editable Reconciliation State
  const [editableSessionMappings, setEditableSessionMappings] = useState<SessionColumnMapping[]>([]);
  const [editableMatches, setEditableMatches] = useState<StudentRowAttendanceMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'needs_review' | 'unmatched'>('all');
  const [notifyStudents, setNotifyStudents] = useState(true);

  // Commit state
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitAttendanceResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => initialData.courses.find((c) => c.id === selectedCourseId) || null,
    [initialData.courses, selectedCourseId]
  );

  // 1. Handle File Selection & Initial Parse
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setFileError(null);
    setParsedPreview(null);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file);

    setIsParsingFile(true);
    try {
      const res = await parseUploadedExcel(formData);
      if (!res.success || !res.data) {
        setFileError(res.error || 'Failed to read Excel file structure.');
        return;
      }
      setParsedPreview(res.data);
      setSelectedSheetName(res.data.activeSheet);
    } catch (err: any) {
      setFileError(err.message || 'Error parsing file.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // 2. Change active sheet if workbook has multiple sheets
  const handleSheetChange = async (sheetName: string) => {
    if (!selectedFile) return;
    setSelectedSheetName(sheetName);
    setIsParsingFile(true);
    setFileError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sheetName', sheetName);

    try {
      const res = await parseUploadedExcel(formData);
      if (res.success && res.data) {
        setParsedPreview(res.data);
      }
    } catch (err: any) {
      setFileError(err.message || 'Error switching sheet.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // 3. Trigger Gemini AI Analysis
  const handleStartAiAnalysis = async () => {
    if (!selectedCourseId) {
      setFileError('Please select a target course first.');
      return;
    }
    if (!parsedPreview) {
      setFileError('Please upload an Excel or CSV file first.');
      return;
    }

    setCurrentStep('analyzing');
    setAnalyzingStepText('Reading Excel columns and structure...');

    try {
      setTimeout(() => setAnalyzingStepText('Querying course sessions & enrolled students...'), 1200);
      setTimeout(() => setAnalyzingStepText('Gemini 3.8 Flash: Matching bilingual names & session tokens...'), 2800);

      const result = await runAiAttendanceAnalysis({
        courseId: selectedCourseId,
        sheetHeaders: parsedPreview.headers,
        sheetRows: parsedPreview.sampleRows,
      });

      if (!result.success) {
        setFileError(result.error || 'AI analysis failed.');
        setCurrentStep('upload');
        return;
      }

      setAnalysisResult(result);
      setEditableSessionMappings(result.sessionMappings);
      setEditableMatches(result.studentMatches);
      setCurrentStep('review');
    } catch (err: any) {
      setFileError(err.message || 'Error during AI attendance analysis.');
      setCurrentStep('upload');
    }
  };

  // 4. Update session mapping override
  const handleUpdateSessionMapping = (columnName: string, newSessionId: string | null) => {
    setEditableSessionMappings((prev) =>
      prev.map((m) => {
        if (m.columnName !== columnName) return m;
        if (!newSessionId) {
          return {
            ...m,
            matchedSessionId: null,
            matchedSessionNumber: null,
            sessionTitle: null,
            isIgnored: true,
          };
        }
        const target = selectedCourse?.sessions.find((s) => s.id === newSessionId);
        return {
          ...m,
          matchedSessionId: newSessionId,
          matchedSessionNumber: target?.session_number || null,
          sessionTitle: target?.title || null,
          isIgnored: false,
        };
      })
    );
  };

  // 5. Toggle a student's session attendance in the review table
  const handleToggleAttendance = (rowNumber: number, sessionId: string) => {
    setEditableMatches((prev) =>
      prev.map((match) => {
        if (match.rowNumber !== rowNumber) return match;
        const currentStatus = match.attendanceBySessionId[sessionId]?.status || 'absent';
        const nextStatus: 'present' | 'absent' | 'excused' =
          currentStatus === 'present' ? 'absent' : currentStatus === 'absent' ? 'excused' : 'present';

        return {
          ...match,
          attendanceBySessionId: {
            ...match.attendanceBySessionId,
            [sessionId]: {
              status: nextStatus,
              rawToken: match.attendanceBySessionId[sessionId]?.rawToken || '',
            },
          },
        };
      })
    );
  };

  // 6. Change assigned student for a row
  const handleManualStudentAssignment = (rowNumber: number, newStudentId: string | null) => {
    setEditableMatches((prev) =>
      prev.map((match) => {
        if (match.rowNumber !== rowNumber) return match;
        return {
          ...match,
          matchedStudentId: newStudentId,
          matchType: newStudentId ? 'high_confidence' : 'unmatched',
          matchReason: newStudentId ? 'Manually assigned by officer' : 'Unmatched',
        };
      })
    );
  };

  // 7. Commit & Apply attendance
  const handleCommitAttendance = async () => {
    if (!selectedCourseId || editableMatches.length === 0) return;
    setIsCommitting(true);
    setCommitError(null);

    try {
      const recordsToCommit: Array<{
        studentId: string;
        sessionId: string;
        status: 'present' | 'absent' | 'excused';
        rawToken?: string;
      }> = [];

      editableMatches.forEach((m) => {
        if (!m.matchedStudentId) return; // Skip unmatched
        editableSessionMappings.forEach((sm) => {
          if (!sm.matchedSessionId || sm.isIgnored) return;
          const att = m.attendanceBySessionId[sm.matchedSessionId];
          const status = att ? att.status : 'absent';
          recordsToCommit.push({
            studentId: m.matchedStudentId!,
            sessionId: sm.matchedSessionId,
            status,
            rawToken: att?.rawToken,
          });
        });
      });

      const res = await commitAiAttendanceRecords({
        courseId: selectedCourseId,
        records: recordsToCommit,
        notifyStudents,
      });

      if (!res.success) {
        setCommitError(res.error || 'Failed to commit attendance.');
        return;
      }

      setCommitResult(res);
      setCurrentStep('success');
    } catch (err: any) {
      setCommitError(err.message || 'Error recording attendance.');
    } finally {
      setIsCommitting(false);
    }
  };

  // Filtered rows for review table
  const filteredMatches = useMemo(() => {
    return editableMatches.filter((m) => {
      // Filter tab
      if (filterTab === 'matched' && !m.matchedStudentId) return false;
      if (filterTab === 'needs_review' && m.matchType !== 'needs_review') return false;
      if (filterTab === 'unmatched' && m.matchedStudentId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const raw = (m.rawName || '').toLowerCase();
        const matched = (m.matchedStudentName || '').toLowerCase();
        return raw.includes(q) || matched.includes(q);
      }
      return true;
    });
  }, [editableMatches, filterTab, searchQuery]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto', color: '#f8fafc' }}>
      {/* ── Top Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
                border: '1px solid rgba(66, 133, 244, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-blue)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                AI Excel Attendance Assistant
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.2)', color: '#93c5fd', border: '1px solid rgba(66, 133, 244, 0.35)' }}>
                  Gemini 3.8 Flash
                </span>
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Intelligent multi-session sheet importer with bilingual Arabic &amp; English name matching.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/student-portal/admin/attendance/scan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Live QR Scanner</span>
          </Link>
          <Link
            href={selectedCourseId ? `/student-portal/admin/courses/${selectedCourseId}/sessions` : '/student-portal/admin/courses'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Course Sessions</span>
          </Link>
        </div>
      </div>

      {/* ── Progress Stepper Strip ── */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          borderRadius: '14px',
          marginBottom: '1.5rem',
          background: 'rgba(15, 23, 42, 0.65)',
        }}
      >
        {[
          { key: 'upload', label: '1. Upload & Select Course', icon: UploadCloud },
          { key: 'analyzing', label: '2. Gemini AI Analysis', icon: Sparkles },
          { key: 'review', label: '3. Reconcile & Review', icon: SlidersHorizontal },
          { key: 'success', label: '4. Attendance Recorded', icon: CheckCircle2 },
        ].map((st, i) => {
          const Icon = st.icon;
          const isActive = currentStep === st.key;
          const isDone =
            (st.key === 'upload' && currentStep !== 'upload') ||
            (st.key === 'analyzing' && ['review', 'success'].includes(currentStep)) ||
            (st.key === 'review' && currentStep === 'success');

          return (
            <div key={st.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDone
                    ? 'rgba(52, 168, 83, 0.25)'
                    : isActive
                    ? 'rgba(66, 133, 244, 0.25)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: isDone ? '#4ade80' : isActive ? '#60a5fa' : '#64748b',
                  border: isDone
                    ? '1px solid rgba(52, 168, 83, 0.4)'
                    : isActive
                    ? '1px solid rgba(66, 133, 244, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {isDone ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isDone ? '#cbd5e1' : isActive ? '#fff' : '#64748b',
                }}
              >
                {st.label}
              </span>
              {i < 3 && <div style={{ width: '20px', height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '0 0.5rem' }} />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Upload & Configuration ── */}
      {currentStep === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Target Course Picker */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', display: 'block', marginBottom: '0.4rem' }}>
                1. Select Target Course • اختر الكورس المستهدف
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.85rem',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              >
                {initialData.courses.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#0b1120' }}>
                    {c.title} ({c.sessions_count} sessions, {c.students_count} enrolled)
                  </option>
                ))}
              </select>
            </div>

            {/* Course Summary Card */}
            {selectedCourse && (
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 700 }}>
                  <Building size={16} />
                  <span>{selectedCourse.department_name || 'General Curriculum'}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Created Sessions</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>{selectedCourse.sessions_count}</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Enrolled Students</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>{selectedCourse.students_count}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  <strong>Sessions List:</strong>
                  <ul style={{ margin: '0.3rem 0 0 0', paddingLeft: '1.2rem', lineHeight: 1.6, maxHeight: '140px', overflowY: 'auto' }}>
                    {selectedCourse.sessions.map((s) => (
                      <li key={s.id}>
                        S{s.session_number}: {s.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* AI Assistant Capabilities Note */}
            <div
              style={{
                background: 'rgba(66, 133, 244, 0.08)',
                border: '1px solid rgba(66, 133, 244, 0.25)',
                borderRadius: '12px',
                padding: '0.85rem',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                color: '#cbd5e1',
              }}
            >
              <div style={{ fontWeight: 800, color: '#93c5fd', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={14} />
                <span>AI Intelligent Match Features:</span>
              </div>
              • Automatically reconciles Arabic names with English portal profiles.<br />
              • Matches arbitrary headers (e.g. &quot;المحاضرة 1&quot;, &quot;Week 2&quot;).<br />
              • Understands present tokens: &quot;حاضر&quot;, &quot;P&quot;, &quot;1&quot;, &quot;نعم&quot;, &quot;✔&quot;.<br />
              • Flags excused absences (&quot;معتذر&quot;, &quot;بعذر&quot;).
            </div>
          </div>

          {/* Right Column: File Dropzone & Sheet Preview */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', display: 'block' }}>
              2. Upload Excel / CSV Attendance Sheet • رفع ملف الحضور
            </label>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              style={{
                border: '2px dashed rgba(66, 133, 244, 0.4)',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.5)',
                cursor: 'pointer',
                transition: 'border 0.2s ease, background 0.2s ease',
              }}
              onClick={() => {
                const el = document.getElementById('excel-file-input');
                if (el) el.click();
              }}
            >
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--google-blue)',
                  margin: '0 auto 1rem auto',
                }}
              >
                <FileSpreadsheet size={28} />
              </div>

              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Drag &amp; drop Excel file here</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                    Supports <span style={{ color: '#93c5fd' }}>.xlsx</span>, <span style={{ color: '#93c5fd' }}>.xls</span>, and <span style={{ color: '#93c5fd' }}>.csv</span> files
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {fileError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.35)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Sheet Selector if multiple worksheets */}
            {parsedPreview && parsedPreview.sheetNames.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Select Sheet:</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {parsedPreview.sheetNames.map((sn) => (
                    <button
                      key={sn}
                      type="button"
                      onClick={() => handleSheetChange(sn)}
                      style={{
                        padding: '0.3rem 0.7rem',
                        borderRadius: '6px',
                        background: selectedSheetName === sn ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.08)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {sn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sheet Preview Table (first 5 rows) */}
            {parsedPreview && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1' }}>
                    Sheet Data Preview ({parsedPreview.totalRows} rows detected)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {parsedPreview.headers.length} columns detected
                  </span>
                </div>

                <div style={{ maxHeight: '190px', overflowX: 'auto', overflowY: 'auto', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                        <th style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>#</th>
                        {parsedPreview.headers.map((h) => (
                          <th key={h} style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#93c5fd', whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreview.sampleRows.slice(0, 5).map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#64748b' }}>{rIdx + 1}</td>
                          {parsedPreview.headers.map((h) => (
                            <td key={h} style={{ padding: '0.4rem 0.6rem', color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                              {String(row[h] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleStartAiAnalysis}
                  style={{
                    marginTop: '1.25rem',
                    width: '100%',
                    padding: '0.85rem',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4285F4 0%, #1e40af 100%)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 8px 24px rgba(66, 133, 244, 0.35)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <Sparkles size={18} />
                  <span>Analyze Sheet with Gemini 3.8 Flash • بدء التحليل الذكي</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: AI Analyzing Spinner State ── */}
      {currentStep === 'analyzing' && (
        <div
          className="glass-panel"
          style={{
            padding: '4rem 2rem',
            borderRadius: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
              border: '2px solid rgba(66, 133, 244, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-blue)',
              boxShadow: '0 0 32px rgba(66, 133, 244, 0.35)',
              animation: 'pulse 2s infinite',
            }}
          >
            <Sparkles size={40} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
              Gemini 3.8 Flash is Analyzing Attendance
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
              {analyzingStepText}
            </p>
          </div>

          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              height: '4px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
                animation: 'indeterminate 1.5s infinite linear',
              }}
            />
          </div>
        </div>
      )}

      {/* ── STEP 3: Interactive Reconciliation & Review Console ── */}
      {currentStep === 'review' && analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* KPI Analytics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Sheet Total Rows</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginTop: '0.2rem' }}>{analysisResult.sheetSummary.totalRows}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Parsed student records</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '3px solid #34a853' }}>
              <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700, textTransform: 'uppercase' }}>Auto-Matched Students</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#34a853', marginTop: '0.2rem' }}>
                {editableMatches.filter((m) => m.matchedStudentId && m.matchType !== 'needs_review').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>High/Exact AI confidence</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '3px solid #fbbc04' }}>
              <div style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 700, textTransform: 'uppercase' }}>Review Required</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbc04', marginTop: '0.2rem' }}>
                {editableMatches.filter((m) => m.matchType === 'needs_review').length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Partial match or ambiguous</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '3px solid #ea4335' }}>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase' }}>Unmatched Rows</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ea4335', marginTop: '0.2rem' }}>
                {editableMatches.filter((m) => !m.matchedStudentId).length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Not in enrollment roster</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '3px solid #4285f4' }}>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>Sessions Mapped</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4285f4', marginTop: '0.2rem' }}>
                {editableSessionMappings.filter((sm) => sm.matchedSessionId && !sm.isIgnored).length} / {selectedCourse?.sessions_count || 0}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Mapped to course calendar</div>
            </div>
          </div>

          {/* Session Mapping Configuration Card */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                  Excel Columns ➔ Course Sessions Mapping • ربط أعمدة المحاضرات
                </span>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0 }}>
                  Gemini mapped the following spreadsheet columns to course sessions. You can reassign or ignore any column below.
                </p>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(66, 133, 244, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(66, 133, 244, 0.3)' }}>
                Model: {analysisResult.modelUsed || 'gemini-3.8-flash'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {editableSessionMappings.map((sm) => (
                <div
                  key={sm.columnName}
                  style={{
                    background: sm.isIgnored ? 'rgba(255, 255, 255, 0.02)' : 'rgba(66, 133, 244, 0.08)',
                    border: sm.isIgnored ? '1px dashed rgba(255, 255, 255, 0.1)' : '1px solid rgba(66, 133, 244, 0.3)',
                    borderRadius: '12px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                      Column: &ldquo;{sm.columnName}&rdquo;
                    </span>
                    <span style={{ fontSize: '0.68rem', color: sm.confidence > 0.9 ? '#4ade80' : '#fbbc04', fontWeight: 700 }}>
                      {Math.round(sm.confidence * 100)}% Match
                    </span>
                  </div>

                  <select
                    value={sm.isIgnored ? 'ignore' : sm.matchedSessionId || 'ignore'}
                    onChange={(e) => {
                      const val = e.target.value === 'ignore' ? null : e.target.value;
                      handleUpdateSessionMapping(sm.columnName, val);
                    }}
                    style={{
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.6rem',
                      color: sm.isIgnored ? '#94a3b8' : '#38bdf8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    <option value="ignore" style={{ background: '#0b1120', color: '#94a3b8' }}>
                      🚫 Ignore / Do Not Import
                    </option>
                    {selectedCourse?.sessions.map((s) => (
                      <option key={s.id} value={s.id} style={{ background: '#0b1120', color: '#fff' }}>
                        Session {s.session_number}: {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Roster Reconciliation Grid Card */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All Rows (${editableMatches.length})` },
                  { key: 'matched', label: `Matched (${editableMatches.filter((m) => m.matchedStudentId).length})` },
                  { key: 'needs_review', label: `Needs Review (${editableMatches.filter((m) => m.matchType === 'needs_review').length})` },
                  { key: 'unmatched', label: `Unmatched (${editableMatches.filter((m) => !m.matchedStudentId).length})` },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterTab(t.key as any)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      background: filterTab === t.key ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.05)',
                      color: filterTab === t.key ? '#fff' : '#94a3b8',
                      border: '1px solid ' + (filterTab === t.key ? 'transparent' : 'rgba(255, 255, 255, 0.1)'),
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search student or row..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.6rem 0.4rem 2rem',
                    color: '#fff',
                    fontSize: '0.78rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Reconciliation Table */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', width: '40px' }}>#</th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '180px' }}>
                      Excel Name (الاسم في الملف)
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '130px' }}>
                      AI Match Confidence
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '240px' }}>
                      Assigned Portal Student (طالب النظام)
                    </th>
                    {editableSessionMappings
                      .filter((sm) => sm.matchedSessionId && !sm.isIgnored)
                      .map((sm) => (
                        <th
                          key={sm.columnName}
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#93c5fd',
                            textAlign: 'center',
                            minWidth: '90px',
                          }}
                        >
                          S{sm.matchedSessionNumber}
                          <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 'normal', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '85px' }}>
                            {sm.sessionTitle}
                          </div>
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={4 + editableSessionMappings.length} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((m) => {
                      const isUnmatched = !m.matchedStudentId;
                      const isReview = m.matchType === 'needs_review';

                      return (
                        <tr
                          key={m.rowNumber}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isUnmatched
                              ? 'rgba(234, 67, 53, 0.05)'
                              : isReview
                              ? 'rgba(251, 188, 4, 0.04)'
                              : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.65rem 0.75rem', color: '#64748b' }}>{m.rowNumber}</td>

                          {/* Excel Name */}
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#fff' }}>
                            {m.rawName}
                            {m.rawEmail && <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{m.rawEmail}</div>}
                          </td>

                          {/* Match Badge */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            {isUnmatched ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(234, 67, 53, 0.2)', color: '#fca5a5', fontSize: '0.7rem', fontWeight: 800 }}>
                                <XCircle size={12} />
                                <span>Unmatched</span>
                              </span>
                            ) : isReview ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(251, 188, 4, 0.2)', color: '#fef08a', fontSize: '0.7rem', fontWeight: 800 }}>
                                <AlertTriangle size={12} />
                                <span>Review ({Math.round(m.matchConfidence * 100)}%)</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(52, 168, 83, 0.2)', color: '#86efac', fontSize: '0.7rem', fontWeight: 800 }}>
                                <CheckCircle2 size={12} />
                                <span>Matched ({Math.round(m.matchConfidence * 100)}%)</span>
                              </span>
                            )}
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              {m.matchReason}
                            </div>
                          </td>

                          {/* Assigned System Student */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: m.matchedStudentId ? '#e2e8f0' : '#f87171' }}>
                              {m.matchedStudentName || '⚠️ Not assigned to any student'}
                            </div>
                            {m.matchedStudentEmail && (
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                {m.matchedStudentEmail}
                              </div>
                            )}
                          </td>

                          {/* Sessions Attendance Pills */}
                          {editableSessionMappings
                            .filter((sm) => sm.matchedSessionId && !sm.isIgnored)
                            .map((sm) => {
                              const att = m.attendanceBySessionId[sm.matchedSessionId!];
                              const status = att?.status || 'absent';

                              return (
                                <td key={sm.columnName} style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(m.rowNumber, sm.matchedSessionId!)}
                                    title={`Click to cycle status (Current: ${status}, Raw Token: "${att?.rawToken || ''}")`}
                                    style={{
                                      padding: '0.25rem 0.55rem',
                                      borderRadius: '6px',
                                      border: 'none',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      width: '74px',
                                      background:
                                        status === 'present'
                                          ? 'rgba(52, 168, 83, 0.25)'
                                          : status === 'excused'
                                          ? 'rgba(251, 188, 4, 0.25)'
                                          : 'rgba(255, 255, 255, 0.08)',
                                      color:
                                        status === 'present'
                                          ? '#86efac'
                                          : status === 'excused'
                                          ? '#fef08a'
                                          : '#94a3b8',
                                      boxShadow: status === 'present' ? '0 0 8px rgba(52, 168, 83, 0.3)' : 'none',
                                      transition: 'all 0.15s ease',
                                    }}
                                  >
                                    {status === 'present' ? 'Present' : status === 'excused' ? 'Excused' : 'Absent'}
                                  </button>
                                </td>
                              );
                            })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Error Message if commit fails */}
            {commitError && (
              <div
                style={{
                  background: 'rgba(234, 67, 53, 0.15)',
                  border: '1px solid rgba(234, 67, 53, 0.35)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={16} />
                <span>{commitError}</span>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                paddingTop: '0.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  id="notify-students-check"
                  type="checkbox"
                  checked={notifyStudents}
                  onChange={(e) => setNotifyStudents(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--google-blue)' }}
                />
                <label htmlFor="notify-students-check" style={{ fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer' }}>
                  Send automated notifications to confirmed present students • إرسال إشعارات للطلاب الحاضرين
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep('upload')}
                  disabled={isCommitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Start Over
                </button>

                <button
                  type="button"
                  onClick={handleCommitAttendance}
                  disabled={isCommitting}
                  style={{
                    padding: '0.65rem 1.75rem',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #34A853 0%, #15803d 100%)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    cursor: isCommitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 24px rgba(52, 168, 83, 0.35)',
                    opacity: isCommitting ? 0.7 : 1,
                  }}
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Recording to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Commit &amp; Apply Attendance • اعتماد وحفظ الحضور</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: Success Receipt ── */}
      {currentStep === 'success' && commitResult && (
        <div
          className="glass-panel"
          style={{
            padding: '3.5rem 2rem',
            borderRadius: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'rgba(52, 168, 83, 0.2)',
              border: '2px solid rgba(52, 168, 83, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34a853',
              boxShadow: '0 0 32px rgba(52, 168, 83, 0.35)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: '0 0 0.5rem 0' }}>
              Attendance Successfully Recorded!
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
              All matched records have been saved to the official chapter registry for <strong>{selectedCourse?.title}</strong>.
            </p>
          </div>

          {/* Receipt KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '1.25rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700 }}>Marked Present</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34a853' }}>{commitResult.totalPresent}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#fef08a', fontWeight: 700 }}>Excused</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbc04' }}>{commitResult.totalExcused}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>Marked Absent</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#cbd5e1' }}>{commitResult.totalAbsent}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
            <Link
              href={`/student-portal/admin/courses/${selectedCourseId}/sessions`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4285F4 0%, #1e40af 100%)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <span>View Course Sessions</span>
              <ArrowRight size={16} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setParsedPreview(null);
                setAnalysisResult(null);
                setCommitResult(null);
                setCurrentStep('upload');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Import Another Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
