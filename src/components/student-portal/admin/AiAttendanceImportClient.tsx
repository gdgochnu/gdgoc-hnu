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
  Edit2,
  UserCheck,
  UserX,
  X,
  Sliders,
  Eye,
  CheckSquare,
  Square,
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
  GeminiStudentCandidate,
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

  // Manual Student Picker Modal state
  const [pickerModalRow, setPickerModalRow] = useState<StudentRowAttendanceMatch | null>(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Commit state
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitAttendanceResult | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const selectedCourse = useMemo(
    () => initialData.courses.find((c) => c.id === selectedCourseId) || null,
    [initialData.courses, selectedCourseId]
  );

  // All course sessions guaranteed
  const courseSessions = useMemo(
    () => selectedCourse?.sessions || [],
    [selectedCourse]
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

  // 2. Change active sheet if workbook has multiple worksheets
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
      setTimeout(() => setAnalyzingStepText('Reconciling bilingual Arabic & English candidate rosters...'), 1200);
      setTimeout(() => setAnalyzingStepText('Gemini 3.8 Flash: Normalizing multi-session tokens...'), 2600);

      const result = await runAiAttendanceAnalysis({
        courseId: selectedCourseId,
        sheetHeaders: parsedPreview.headers,
        sheetRows: parsedPreview.sampleRows,
      });

      if (!result.success) {
        setFileError(result.error || 'AI analysis encountered an error.');
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

  // 4. Update session mapping: Link an Excel column to a course session
  const handleMapSessionToExcelColumn = (sessionId: string, excelCol: string | 'none') => {
    const targetSession = courseSessions.find((s) => s.id === sessionId);

    // Update session mappings
    setEditableSessionMappings((prev) => {
      const filtered = prev.filter((m) => m.matchedSessionId !== sessionId);
      if (excelCol === 'none') {
        return filtered;
      }
      return [
        ...filtered,
        {
          columnName: excelCol,
          matchedSessionId: sessionId,
          matchedSessionNumber: targetSession?.session_number || null,
          sessionTitle: targetSession?.title || null,
          confidence: 1.0,
          isIgnored: false,
        },
      ];
    });

    // Re-populate attendance for this session from the sheet
    if (parsedPreview && excelCol !== 'none') {
      setEditableMatches((prev) =>
        prev.map((match) => {
          const row = parsedPreview.sampleRows[match.rowNumber - 1];
          let status: 'present' | 'absent' | 'excused' = 'absent';
          let rawToken = '';

          if (row && row[excelCol] !== undefined) {
            rawToken = String(row[excelCol] || '').trim();
            if (/حاضر|حضر|p|1|yes|نعم|v|true|✔|✓/i.test(rawToken)) {
              status = 'present';
            } else if (/معتذر|بعذر|عذر|excused|e|sick/i.test(rawToken)) {
              status = 'excused';
            }
          }

          return {
            ...match,
            attendanceBySessionId: {
              ...match.attendanceBySessionId,
              [sessionId]: { status, rawToken },
            },
          };
        })
      );
    }
  };

  // 5. Toggle student's session attendance (Cycles Present -> Absent -> Excused -> Present)
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

  // 6. Direct set attendance status
  const handleSetAttendanceStatus = (
    rowNumber: number,
    sessionId: string,
    status: 'present' | 'absent' | 'excused'
  ) => {
    setEditableMatches((prev) =>
      prev.map((match) => {
        if (match.rowNumber !== rowNumber) return match;
        return {
          ...match,
          attendanceBySessionId: {
            ...match.attendanceBySessionId,
            [sessionId]: {
              status,
              rawToken: match.attendanceBySessionId[sessionId]?.rawToken || '',
            },
          },
        };
      })
    );
  };

  // 7. Bulk Session Attendance Action (Mark all present / absent for a specific session)
  const handleBulkSessionAttendance = (sessionId: string, status: 'present' | 'absent') => {
    setEditableMatches((prev) =>
      prev.map((match) => ({
        ...match,
        attendanceBySessionId: {
          ...match.attendanceBySessionId,
          [sessionId]: {
            status,
            rawToken: match.attendanceBySessionId[sessionId]?.rawToken || '',
          },
        },
      }))
    );
  };

  // 8. Bulk Student Row Action (Mark all present / absent for a specific student)
  const handleBulkStudentRow = (rowNumber: number, status: 'present' | 'absent') => {
    setEditableMatches((prev) =>
      prev.map((match) => {
        if (match.rowNumber !== rowNumber) return match;
        const updated = { ...match.attendanceBySessionId };
        courseSessions.forEach((s) => {
          updated[s.id] = {
            status,
            rawToken: updated[s.id]?.rawToken || '',
          };
        });
        return {
          ...match,
          attendanceBySessionId: updated,
        };
      })
    );
  };

  // 9. Manual Student Assignment (from picker modal)
  const handleManualStudentAssignment = (
    rowNumber: number,
    candidate: GeminiStudentCandidate | null
  ) => {
    setEditableMatches((prev) =>
      prev.map((match) => {
        if (match.rowNumber !== rowNumber) return match;
        if (!candidate) {
          return {
            ...match,
            matchedStudentId: null,
            matchedStudentName: null,
            matchedStudentEmail: null,
            matchConfidence: 0,
            matchType: 'unmatched',
            matchReason: 'Unmatched (Manually unassigned by admin)',
          };
        }
        return {
          ...match,
          matchedStudentId: candidate.id,
          matchedStudentName: `${candidate.full_name_en} (${candidate.full_name_ar || ''})`,
          matchedStudentEmail: candidate.email,
          matchConfidence: 1.0,
          matchType: 'exact',
          matchReason: 'Manually selected by admin • تم التعيين يدويًا',
        };
      })
    );
    setPickerModalRow(null);
    setPickerSearchQuery('');
  };

  // 10. Commit & Apply attendance
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
        courseSessions.forEach((s) => {
          const att = m.attendanceBySessionId[s.id];
          const status = att ? att.status : 'absent';
          recordsToCommit.push({
            studentId: m.matchedStudentId!,
            sessionId: s.id,
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
        const email = (m.matchedStudentEmail || '').toLowerCase();
        return raw.includes(q) || matched.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [editableMatches, filterTab, searchQuery]);

  // Filtered students for Manual Picker Modal
  const filteredPickerStudents = useMemo(() => {
    const list = initialData.allStudents || [];
    if (!pickerSearchQuery.trim()) {
      return list.slice(0, 80);
    }
    const q = pickerSearchQuery.toLowerCase().trim();
    return list
      .filter((s) => {
        const en = (s.full_name_en || '').toLowerCase();
        const ar = (s.full_name_ar || '').toLowerCase();
        const email = (s.email || '').toLowerCase();
        const fac = (s.faculty || '').toLowerCase();
        return en.includes(q) || ar.includes(q) || email.includes(q) || fac.includes(q);
      })
      .slice(0, 80);
  }, [initialData.allStudents, pickerSearchQuery]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: '#f8fafc' }}>
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
                AI Excel Attendance Assistant • مساعد الحضور الذكي
                <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(66, 133, 244, 0.2)', color: '#93c5fd', border: '1px solid rgba(66, 133, 244, 0.35)' }}>
                  Gemini Flash &amp; Bilingual Engine
                </span>
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Intelligent multi-session sheet importer with manual override and bilingual name matching.
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

      {/* ── STEP 1: Upload & Configure ── */}
      {currentStep === 'upload' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Left Column: Target Course Selector & Stats */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0', display: 'block', marginBottom: '0.5rem' }}>
                1. Select Target Course • اختيار الكورس المستهدف
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              >
                {initialData.courses.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: '#0b1120', color: '#fff' }}>
                    {c.title} {c.department_name ? `(${c.department_name})` : ''} — {c.sessions_count} Sessions
                  </option>
                ))}
              </select>
            </div>

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
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>Course Details</div>
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
              • Manual student reassignment &amp; in-line session editing.<br />
              • Understands tokens: &quot;حاضر&quot;, &quot;P&quot;, &quot;1&quot;, &quot;نعم&quot;, &quot;معتذر&quot;.
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
                  <span>Analyze Sheet with Gemini Flash • بدء التحليل الذكي</span>
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
            }}
          >
            <Sparkles size={40} className="animate-spin" />
          </div>

          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
              Gemini Flash is Analyzing Attendance
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
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>Click &quot;Reassign&quot; to pick student</div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '16px', borderLeft: '3px solid #4285f4' }}>
              <div style={{ fontSize: '0.72rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>Course Sessions</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#4285f4', marginTop: '0.2rem' }}>
                {courseSessions.length}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                {editableSessionMappings.filter((sm) => sm.matchedSessionId && !sm.isIgnored).length} mapped from Excel
              </div>
            </div>
          </div>

          {/* Session Mapping Configuration Card */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                  Link Course Sessions to Excel Columns • ربط أعمدة الملف بمحاضرات الكورس
                </span>
                <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0 }}>
                  Here you can see all {courseSessions.length} sessions for this course and map or remap any Excel sheet column to them.
                </p>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#60a5fa', background: 'rgba(66, 133, 244, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid rgba(66, 133, 244, 0.3)' }}>
                Model: {analysisResult.modelUsed || 'gemini-flash'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '0.75rem' }}>
              {courseSessions.map((sess) => {
                const currentMapping = editableSessionMappings.find(
                  (sm) => sm.matchedSessionId === sess.id && !sm.isIgnored
                );

                return (
                  <div
                    key={sess.id}
                    style={{
                      background: currentMapping ? 'rgba(66, 133, 244, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: currentMapping ? '1px solid rgba(66, 133, 244, 0.35)' : '1px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      padding: '0.75rem 0.9rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                        Session {sess.session_number}: {sess.title}
                      </span>
                      {currentMapping ? (
                        <span style={{ fontSize: '0.68rem', color: '#4ade80', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Check size={11} /> Mapped
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                          Manual / None
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>Sheet Column:</span>
                      <select
                        value={currentMapping ? currentMapping.columnName : 'none'}
                        onChange={(e) => handleMapSessionToExcelColumn(sess.id, e.target.value)}
                        style={{
                          flex: 1,
                          background: 'rgba(15, 23, 42, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '0.35rem 0.5rem',
                          color: currentMapping ? '#38bdf8' : '#94a3b8',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          outline: 'none',
                        }}
                      >
                        <option value="none" style={{ background: '#0b1120', color: '#94a3b8' }}>
                          🚫 No Sheet Column (Manual Attendance)
                        </option>
                        {parsedPreview?.headers.map((h) => (
                          <option key={h} value={h} style={{ background: '#0b1120', color: '#fff' }}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
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
              <div style={{ position: 'relative', width: '280px' }}>
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

            {/* Reconciliation Table with ALL course sessions */}
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', width: '40px' }}>#</th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '170px' }}>
                      Excel Name (الاسم بالملف)
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '130px' }}>
                      AI Match
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '230px' }}>
                      Assigned Portal Student (طالب النظام)
                    </th>
                    <th style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '85px', textAlign: 'center' }}>
                      Actions
                    </th>
                    {courseSessions.map((s) => {
                      const mapping = editableSessionMappings.find(
                        (sm) => sm.matchedSessionId === s.id && !sm.isIgnored
                      );

                      return (
                        <th
                          key={s.id}
                          style={{
                            padding: '0.65rem 0.75rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#93c5fd',
                            textAlign: 'center',
                            minWidth: '105px',
                            background: mapping ? 'rgba(66, 133, 244, 0.04)' : 'transparent',
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>S{s.session_number}</div>
                          <div
                            style={{
                              fontSize: '0.65rem',
                              color: '#94a3b8',
                              fontWeight: 'normal',
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              maxWidth: '100px',
                              margin: '0 auto',
                            }}
                            title={s.title}
                          >
                            {s.title}
                          </div>
                          {mapping && (
                            <div style={{ fontSize: '0.58rem', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '95px' }} title={`Mapped to: ${mapping.columnName}`}>
                              Excel: {mapping.columnName}
                            </div>
                          )}

                          {/* Quick bulk toggle header buttons */}
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.3rem' }}>
                            <button
                              type="button"
                              onClick={() => handleBulkSessionAttendance(s.id, 'present')}
                              title="Mark ALL present for this session"
                              style={{
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: 'rgba(52, 168, 83, 0.2)',
                                border: '1px solid rgba(52, 168, 83, 0.4)',
                                color: '#86efac',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              All P
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBulkSessionAttendance(s.id, 'absent')}
                              title="Mark ALL absent for this session"
                              style={{
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                background: 'rgba(234, 67, 53, 0.2)',
                                border: '1px solid rgba(234, 67, 53, 0.4)',
                                color: '#fca5a5',
                                fontSize: '0.6rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              All A
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={5 + courseSessions.length} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        No records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((m) => {
                      const isUnmatched = !m.matchedStudentId;
                      const isReview = m.matchType === 'needs_review';

                      // Count attended sessions for this student
                      const presentCount = courseSessions.filter(
                        (s) => m.attendanceBySessionId[s.id]?.status === 'present'
                      ).length;

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

                          {/* Assigned System Student with Reassign Button */}
                          <td style={{ padding: '0.65rem 0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: m.matchedStudentId ? '#e2e8f0' : '#f87171' }}>
                                  {m.matchedStudentName || '⚠️ Not assigned to any student'}
                                </div>
                                {m.matchedStudentEmail && (
                                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                    {m.matchedStudentEmail}
                                  </div>
                                )}
                              </div>

                              {/* Manual Reassign Button */}
                              <button
                                type="button"
                                onClick={() => setPickerModalRow(m)}
                                title="Manually assign or reassign student"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.25rem 0.55rem',
                                  borderRadius: '6px',
                                  background: m.matchedStudentId ? 'rgba(66, 133, 244, 0.15)' : 'rgba(234, 67, 53, 0.2)',
                                  border: m.matchedStudentId ? '1px solid rgba(66, 133, 244, 0.4)' : '1px solid rgba(234, 67, 53, 0.4)',
                                  color: m.matchedStudentId ? '#93c5fd' : '#fca5a5',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Edit2 size={11} />
                                <span>{m.matchedStudentId ? 'Reassign' : 'Select Student'}</span>
                              </button>
                            </div>
                          </td>

                          {/* Row Actions: Summary & Quick Toggle */}
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: presentCount > 0 ? '#4ade80' : '#94a3b8' }}>
                              {presentCount} / {courseSessions.length} P
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem', marginTop: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => handleBulkStudentRow(m.rowNumber, 'present')}
                                title="Mark all sessions present for this student"
                                style={{
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '4px',
                                  background: 'rgba(52, 168, 83, 0.2)',
                                  border: 'none',
                                  color: '#86efac',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                All P
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBulkStudentRow(m.rowNumber, 'absent')}
                                title="Mark all sessions absent for this student"
                                style={{
                                  padding: '0.15rem 0.35rem',
                                  borderRadius: '4px',
                                  background: 'rgba(234, 67, 53, 0.2)',
                                  border: 'none',
                                  color: '#fca5a5',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                All A
                              </button>
                            </div>
                          </td>

                          {/* Sessions Attendance Columns with In-Line Toggle & Status Selection */}
                          {courseSessions.map((sess) => {
                            const att = m.attendanceBySessionId[sess.id];
                            const status = att?.status || 'absent';

                            return (
                              <td key={sess.id} style={{ padding: '0.5rem 0.4rem', textAlign: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                  {/* Main clickable toggle button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAttendance(m.rowNumber, sess.id)}
                                    title={`Click to cycle (Present -> Absent -> Excused). Current: ${status}. Sheet Token: "${att?.rawToken || ''}"`}
                                    style={{
                                      padding: '0.3rem 0.5rem',
                                      borderRadius: '6px',
                                      border: 'none',
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      width: '78px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '0.25rem',
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
                                    {status === 'present' ? (
                                      <>
                                        <Check size={11} />
                                        <span>Present</span>
                                      </>
                                    ) : status === 'excused' ? (
                                      <>
                                        <span>Excused</span>
                                      </>
                                    ) : (
                                      <>
                                        <X size={11} />
                                        <span>Absent</span>
                                      </>
                                    )}
                                  </button>

                                  {/* Raw Token from Excel */}
                                  {att?.rawToken ? (
                                    <div
                                      style={{
                                        fontSize: '0.6rem',
                                        color: '#64748b',
                                        maxWidth: '75px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={`Raw Excel Value: "${att.rawToken}"`}
                                    >
                                      Sheet: &quot;{att.rawToken}&quot;
                                    </div>
                                  ) : null}
                                </div>
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
              background: 'linear-gradient(135deg, rgba(52, 168, 83, 0.25), rgba(66, 133, 244, 0.25))',
              border: '2px solid rgba(52, 168, 83, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4ade80',
              boxShadow: '0 0 32px rgba(52, 168, 83, 0.35)',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem 0' }}>
              Attendance Recorded Successfully! • تم حفظ الحضور بنجاح
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              The student attendance records have been reconciled, upserted into the database, and verified.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1rem',
              width: '100%',
              maxWidth: '480px',
            }}
          >
            <div style={{ background: 'rgba(52, 168, 83, 0.1)', border: '1px solid rgba(52, 168, 83, 0.25)', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 700 }}>Present (حاضر)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4ade80', marginTop: '0.2rem' }}>
                {commitResult.totalPresent}
              </div>
            </div>

            <div style={{ background: 'rgba(251, 188, 4, 0.1)', border: '1px solid rgba(251, 188, 4, 0.25)', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#fde047', fontWeight: 700 }}>Excused (معتذر)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbc04', marginTop: '0.2rem' }}>
                {commitResult.totalExcused}
              </div>
            </div>

            <div style={{ background: 'rgba(234, 67, 53, 0.1)', border: '1px solid rgba(234, 67, 53, 0.25)', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 700 }}>Absent (غائب)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ea4335', marginTop: '0.2rem' }}>
                {commitResult.totalAbsent}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setParsedPreview(null);
                setAnalysisResult(null);
                setEditableMatches([]);
                setCurrentStep('upload');
              }}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Import Another Sheet • رفع شيت آخر
            </button>

            <Link
              href={selectedCourseId ? `/student-portal/admin/courses/${selectedCourseId}/sessions` : '/student-portal/admin/courses'}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: '12px',
                background: 'var(--google-blue)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>View Sessions Attendance</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* ── MODAL: Searchable Manual Student Picker ── */}
      {pickerModalRow && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => {
            setPickerModalRow(null);
            setPickerSearchQuery('');
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '85vh',
              borderRadius: '20px',
              background: '#0d1527',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Assign Student for Row #{pickerModalRow.rowNumber} • تعيين طالب
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#93c5fd' }}>
                  Excel Sheet Name: &ldquo;{pickerModalRow.rawName}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerModalRow(null);
                  setPickerSearchQuery('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by English/Arabic name, email, or faculty... • ابحث بالاسم أو الإيميل"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.4rem',
                    borderRadius: '10px',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(66, 133, 244, 0.4)',
                    color: '#fff',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Quick Action: Unmatch / Skip Button */}
              <button
                type="button"
                onClick={() => handleManualStudentAssignment(pickerModalRow.rowNumber, null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(234, 67, 53, 0.12)',
                  border: '1px dashed rgba(234, 67, 53, 0.35)',
                  color: '#fca5a5',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'background 0.15s ease',
                }}
              >
                <UserX size={15} />
                <span>Mark as Unmatched / Skip Row (إلغاء التعيين وتخطي هذا الصف)</span>
              </button>

              <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>Available Students ({initialData.allStudents.length} in system):</span>
                <span>Click any student to assign instantly</span>
              </div>

              {/* Students List */}
              <div
                style={{
                  maxHeight: '340px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  paddingRight: '0.2rem',
                }}
              >
                {filteredPickerStudents.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    No students found matching &ldquo;{pickerSearchQuery}&rdquo;
                  </div>
                ) : (
                  filteredPickerStudents.map((st) => {
                    const isCurrentlySelected = pickerModalRow.matchedStudentId === st.id;

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleManualStudentAssignment(pickerModalRow.rowNumber, st)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: '10px',
                          background: isCurrentlySelected
                            ? 'rgba(66, 133, 244, 0.2)'
                            : 'rgba(255, 255, 255, 0.03)',
                          border: isCurrentlySelected
                            ? '1px solid var(--google-blue)'
                            : '1px solid rgba(255, 255, 255, 0.07)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease, border 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrentlySelected) {
                            e.currentTarget.style.background = 'rgba(66, 133, 244, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrentlySelected) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              background: 'rgba(66, 133, 244, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#93c5fd',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                            }}
                          >
                            {(st.full_name_en || 'S').slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff' }}>
                              {st.full_name_en}{' '}
                              {st.full_name_ar && (
                                <span style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.78rem' }}>
                                  ({st.full_name_ar})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {st.email} {st.faculty ? `• ${st.faculty}` : ''}
                            </div>
                          </div>
                        </div>

                        {isCurrentlySelected ? (
                          <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Check size={14} /> Assigned
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700 }}>
                            Select &rarr;
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
