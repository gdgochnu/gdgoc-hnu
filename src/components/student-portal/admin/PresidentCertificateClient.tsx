'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Calendar,
  ChevronRight,
  Filter,
  CheckSquare,
  FileCheck,
  FileText,
  ExternalLink,
  Users,
  Search,
  Sparkles,
  RefreshCw,
  Send,
} from 'lucide-react';
import type { StudentCertificateEligibility } from '@/types/student';
import {
  getCertificateEligibility,
  issueStudentCertificatesBatch,
} from '@/app/student-portal/admin/certificates/actions';

interface ProgramItem {
  id: string;
  title: string;
  category?: string | null;
  enrollmentsCount?: number;
  registrationsCount?: number;
  sessionsCount: number;
}

interface TemplateItem {
  id: string;
  name: string;
  is_default: boolean;
}

interface PresidentCertificateClientProps {
  initialPrograms: {
    courses: ProgramItem[];
    workshops: ProgramItem[];
    templates: TemplateItem[];
  };
}

export function PresidentCertificateClient({ initialPrograms }: PresidentCertificateClientProps) {
  const { courses, workshops, templates } = initialPrograms;

  const [programType, setProgramType] = useState<'course' | 'workshop'>(
    courses.length > 0 ? 'course' : 'workshop'
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    courses[0]?.id || workshops[0]?.id || ''
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.is_default)?.id || templates[0]?.id || ''
  );

  // Thresholds
  const [minAttendance, setMinAttendance] = useState<number>(75);
  const [minTaskAvg, setMinTaskAvg] = useState<number>(70);
  const [minQuizAvg, setMinQuizAvg] = useState<number>(70);

  // Eligibility data
  const [loading, setLoading] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentCertificateEligibility[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [alreadyIssuedCount, setAlreadyIssuedCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Issuance state
  const [issuing, setIssuing] = useState<boolean>(false);
  const [issuanceResult, setIssuanceResult] = useState<{
    success: boolean;
    issuedCount: number;
    errors: string[];
  } | null>(null);

  // Fetch eligibility whenever program or thresholds change
  const fetchEligibility = async () => {
    if (!selectedProgramId) return;
    setLoading(true);
    setIssuanceResult(null);
    try {
      const res = await getCertificateEligibility({
        programType,
        programId: selectedProgramId,
        minAttendance,
        minTaskAvg,
        minQuizAvg,
      });

      if (res.success) {
        setStudents(res.students);
        setEligibleCount(res.eligibleCount);
        setAlreadyIssuedCount(res.alreadyIssuedCount);

        // Pre-select all eligible students who haven't received certificates yet
        const unissuedEligibleIds = res.students
          .filter((s) => s.isEligible && !s.alreadyIssued)
          .map((s) => s.student_id);
        setSelectedStudentIds(new Set(unissuedEligibleIds));
      }
    } catch (e) {
      console.error('fetchEligibility error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibility();
  }, [programType, selectedProgramId]);

  const handleProgramTypeChange = (type: 'course' | 'workshop') => {
    setProgramType(type);
    const firstItem = type === 'course' ? courses[0] : workshops[0];
    if (firstItem) {
      setSelectedProgramId(firstItem.id);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAllEligible = () => {
    const unissuedEligible = students.filter((s) => s.isEligible && !s.alreadyIssued);
    if (selectedStudentIds.size === unissuedEligible.length && unissuedEligible.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(unissuedEligible.map((s) => s.student_id)));
    }
  };

  const handleIssueCertificates = async () => {
    if (selectedStudentIds.size === 0) return;
    setIssuing(true);
    setIssuanceResult(null);

    try {
      const res = await issueStudentCertificatesBatch({
        programType,
        programId: selectedProgramId,
        templateId: selectedTemplateId || undefined,
        studentIds: Array.from(selectedStudentIds),
        thresholds: { minAttendance, minTaskAvg, minQuizAvg },
      });

      setIssuanceResult(res);
      if (res.success) {
        // Refresh eligibility data
        await fetchEligibility();
      }
    } catch (err: any) {
      console.error('handleIssueCertificates exception:', err);
      setIssuanceResult({
        success: false,
        issuedCount: 0,
        errors: [err.message || 'Unknown error occurred while issuing certificates.'],
      });
    } finally {
      setIssuing(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.full_name_en && s.full_name_en.toLowerCase().includes(q)) ||
      (s.full_name_ar && s.full_name_ar.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q) ||
      (s.faculty && s.faculty.toLowerCase().includes(q))
    );
  });

  const activeProgramsList = programType === 'course' ? courses : workshops;
  const currentProgram = activeProgramsList.find((p) => p.id === selectedProgramId);

  return (
    <div
      style={{
        padding: '2.25rem 2rem 5rem 2rem',
        maxWidth: '1380px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          background:
            'radial-gradient(ellipse at top left, rgba(251, 188, 4, 0.12) 0%, rgba(66, 133, 244, 0.08) 50%, var(--surface-primary, #13151b) 100%)',
          border: '1px solid rgba(251, 188, 4, 0.35)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  background: 'rgba(251, 188, 4, 0.2)',
                  color: '#FDE047',
                  border: '1px solid rgba(251, 188, 4, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <ShieldCheck size={13} />
                Presidential Clearance Required
              </span>
              <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>• Spec §4.S.8 & §4.S.10</span>
            </div>

            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              Student Certificate Issuance Panel
            </h1>
            <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '0.92rem', margin: '0.25rem 0 0 0', maxWidth: '680px', lineHeight: 1.5 }}>
              Verify student eligibility metrics across track curricula (attendance rates, assignment scores, quiz checkpoints) and batch-issue authenticated credentials with QR verification.
            </p>
          </div>

          <Link
            href="/certificates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Award size={16} color="#FBBC04" />
            <span>Team OS Certificates</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* 2. Program Selector & Threshold Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Program Type Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => handleProgramTypeChange('course')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                border: programType === 'course' ? '1px solid rgba(66, 133, 244, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: programType === 'course' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                color: programType === 'course' ? '#93C5FD' : 'var(--text-muted, #94A3B8)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <BookOpen size={16} />
              <span>Technical Courses ({courses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleProgramTypeChange('workshop')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                border: programType === 'workshop' ? '1px solid rgba(52, 168, 83, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: programType === 'workshop' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                color: programType === 'workshop' ? '#86EFAC' : 'var(--text-muted, #94A3B8)',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              <Calendar size={16} />
              <span>Workshops & Bootcamps ({workshops.length})</span>
            </button>
          </div>

          {/* Template Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary, #94A3B8)' }}>
              Template:
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            >
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id} style={{ background: '#181A20', color: '#FFFFFF' }}>
                  {tmpl.name} {tmpl.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Program Dropdown & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Select Active Curriculum / Cohort
            </label>
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '0.65rem 0.9rem',
                fontSize: '0.92rem',
                fontWeight: 700,
                outline: 'none',
              }}
            >
              {activeProgramsList.map((prog) => (
                <option key={prog.id} value={prog.id} style={{ background: '#181A20', color: '#FFFFFF' }}>
                  {prog.title} {prog.category ? `• [${prog.category}]` : ''} ({prog.sessionsCount} sessions)
                </option>
              ))}
            </select>
          </div>

          {/* Threshold Sliders */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)', padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Min Attendance</span>
                <span style={{ color: '#FDE047' }}>{minAttendance}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={minAttendance}
                onChange={(e) => setMinAttendance(Number(e.target.value))}
                style={{ width: '110px', accentColor: '#FBBC04', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Min Task Avg</span>
                <span style={{ color: '#FCA5A5' }}>{minTaskAvg}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={minTaskAvg}
                onChange={(e) => setMinTaskAvg(Number(e.target.value))}
                style={{ width: '110px', accentColor: '#EA4335', cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#94A3B8', fontWeight: 700, marginBottom: '0.2rem' }}>
                <span>Min Quiz Avg</span>
                <span style={{ color: '#93C5FD' }}>{minQuizAvg}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={minQuizAvg}
                onChange={(e) => setMinQuizAvg(Number(e.target.value))}
                style={{ width: '110px', accentColor: '#4285F4', cursor: 'pointer' }}
              />
            </div>

            <button
              type="button"
              onClick={fetchEligibility}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                alignSelf: 'center',
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Apply</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. KPI Statistics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Enrolled Students</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF' }}>{students.length}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Confirmed registrations</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', border: '1px solid rgba(52, 168, 83, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#86EFAC', fontWeight: 700 }}>Qualified for Issuance</span>
            <CheckCircle2 size={17} color="#34A853" />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#4ADE80' }}>{eligibleCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Met all 3 academic criteria</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#93C5FD', fontWeight: 600 }}>Already Conferred</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#60A5FA' }}>{alreadyIssuedCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Official certificates in Drive</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#FCA5A5', fontWeight: 600 }}>Progress Pending</span>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#F87171' }}>
            {Math.max(0, students.length - eligibleCount - alreadyIssuedCount)}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Below minimum thresholds</span>
        </div>
      </div>

      {/* Issuance Notification / Status */}
      {issuanceResult && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            background: issuanceResult.success ? 'rgba(52, 168, 83, 0.12)' : 'rgba(234, 67, 53, 0.12)',
            border: issuanceResult.success ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(234, 67, 53, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {issuanceResult.success ? (
              <CheckCircle2 size={20} color="#34A853" />
            ) : (
              <AlertCircle size={20} color="#EA4335" />
            )}
            <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              {issuanceResult.success
                ? `Successfully Conferred ${issuanceResult.issuedCount} Student Certificate(s)! 🎓`
                : 'Certificate Issuance Alert'}
            </h3>
          </div>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #CBD5E1)', margin: 0 }}>
            {issuanceResult.success
              ? 'Certificates have been rendered to PDF, uploaded to chapter Google Drive, registered with authentic verification codes, and dispatched to student profiles.'
              : 'Some errors occurred during batch issuance:'}
          </p>
          {issuanceResult.errors.length > 0 && (
            <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0, fontSize: '0.82rem', color: '#FCA5A5' }}>
              {issuanceResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 4. Student Roster Table */}
      <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Table Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={toggleSelectAllEligible}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <CheckSquare size={15} />
              <span>Select All Eligible ({eligibleCount})</span>
            </button>

            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
              {selectedStudentIds.size} student(s) selected
            </span>
          </div>

          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              width: '280px',
            }}
          >
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search by name, email, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.84rem',
                width: '100%',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <RefreshCw size={24} className="animate-spin" color="#FBBC04" />
            <span>Calculating student completion metrics and eligibility...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8' }}>
            <Users size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF' }}>No Students Found</div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.25rem' }}>
              No confirmed enrollments found for this {programType}.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94A3B8' }}>
                  <th style={{ padding: '0.75rem 0.5rem', width: '40px' }}>Select</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Profile</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Attendance</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tasks Avg</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Quizzes Avg</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Eligibility Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.has(s.student_id);
                  const isReadyToIssue = s.isEligible && !s.alreadyIssued;

                  return (
                    <tr
                      key={s.student_id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSelected ? 'rgba(66, 133, 244, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={s.alreadyIssued}
                          onChange={() => toggleStudentSelection(s.student_id)}
                          style={{ accentColor: '#3B82F6', cursor: s.alreadyIssued ? 'not-allowed' : 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>

                      {/* Profile */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(52, 168, 83, 0.3))',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.88rem',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              (s.full_name_en || s.email).charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFFFFF' }}>
                              {s.full_name_en || s.email}
                              {s.full_name_ar && <span style={{ color: '#94A3B8', fontSize: '0.78rem', marginLeft: '0.4rem' }}>({s.full_name_ar})</span>}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: '0.1rem' }}>
                              {s.faculty || 'Helwan National University'} • {s.academic_year ? `Year ${s.academic_year}` : 'Student'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Attendance */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: s.attendanceRate >= minAttendance ? '#4ADE80' : '#F87171',
                            }}
                          >
                            {s.attendanceRate}%
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                            ({s.sessionsAttended}/{s.sessionsTotal})
                          </span>
                        </div>
                      </td>

                      {/* Tasks Avg */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {s.tasksTotal === 0 ? (
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>None assigned</span>
                        ) : s.tasksAverageScore !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                color: s.tasksAverageScore >= minTaskAvg ? '#4ADE80' : '#F87171',
                              }}
                            >
                              {s.tasksAverageScore}%
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                              ({s.tasksSubmitted}/{s.tasksTotal})
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#F87171' }}>0 submissions</span>
                        )}
                      </td>

                      {/* Quizzes Avg */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {s.quizzesTotal === 0 ? (
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>None scheduled</span>
                        ) : s.quizzesAverageScore !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                fontWeight: 800,
                                color: s.quizzesAverageScore >= minQuizAvg ? '#4ADE80' : '#F87171',
                              }}
                            >
                              {s.quizzesAverageScore}%
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                              ({s.quizzesPassed}/{s.quizzesTotal} passed)
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#F87171' }}>Not taken</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {s.alreadyIssued ? (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: 'rgba(66, 133, 244, 0.15)',
                              color: '#93C5FD',
                              border: '1px solid rgba(66, 133, 244, 0.35)',
                            }}
                          >
                            Conferred 🎓
                          </span>
                        ) : s.isEligible ? (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: 'rgba(52, 168, 83, 0.15)',
                              color: '#86EFAC',
                              border: '1px solid rgba(52, 168, 83, 0.35)',
                            }}
                          >
                            Eligible & Ready
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              background: 'rgba(234, 67, 53, 0.12)',
                              color: '#FCA5A5',
                            }}
                          >
                            Requirements Pending
                          </span>
                        )}
                      </td>

                      {/* Certificate link / Serial */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {s.certificate ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                            <Link
                              href={`/verify/${s.certificate.certificate_number}`}
                              target="_blank"
                              style={{
                                color: '#93C5FD',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                textDecoration: 'none',
                              }}
                            >
                              <span>{s.certificate.certificate_number}</span>
                              <ExternalLink size={12} />
                            </Link>
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              Issued: {s.certificate.issue_date}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.76rem', color: '#64748B' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Sticky Bottom Action Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={18} color="#FBBC04" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
              Selected: <strong style={{ color: '#FDE047' }}>{selectedStudentIds.size}</strong> Students
            </span>
          </div>

          <button
            type="button"
            onClick={handleIssueCertificates}
            disabled={issuing || selectedStudentIds.size === 0}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.65rem',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: issuing || selectedStudentIds.size === 0 ? 'not-allowed' : 'pointer',
              opacity: issuing || selectedStudentIds.size === 0 ? 0.5 : 1,
            }}
          >
            {issuing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Generating PDFs & Uploading to Drive...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Issue Certificates to Selected ({selectedStudentIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
