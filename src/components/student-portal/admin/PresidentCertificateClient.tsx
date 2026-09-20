'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  PlusCircle,
  Palette,
  Search,
  Download,
  ExternalLink,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileText,
  Send,
  Loader2,
  Shield,
  Plus,
  Trash2,
  Layers,
  Award,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Eye,
  RefreshCw,
  X,
  BookOpen,
  Filter,
  CheckSquare,
  Users,
} from 'lucide-react';
import type { StudentCertificateEligibility } from '@/types/student';
import type { CertificateTemplate, CertificateFieldLayout } from '@/types/certificates';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';
import {
  getCertificateEligibility,
  issueStudentCertificatesBatch,
  deleteStudentCertificateAction,
} from '@/app/student-portal/admin/certificates/actions';
import { deleteCertificateTemplateAction } from '@/lib/certificates/template-actions';
import { TemplateBuilder } from '@/components/certificates/TemplateBuilder';
import { CertificatePreviewCanvas } from '@/components/certificates/CertificatePreviewCanvas';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';

export interface StudentCertificateRecord {
  id: string;
  title: string;
  certificate_number: string;
  verification_code: string;
  issue_date: string;
  pdf_drive_file_id?: string | null;
  pdf_drive_url?: string | null;
  completion_stats?: {
    attendance_percentage?: number;
    task_average_score?: number;
    quiz_average_score?: number;
    total_sessions_attended?: number;
    total_sessions?: number;
  } | null;
  created_at: string;
  student_id: string;
  course_id?: string | null;
  workshop_id?: string | null;
  template_id?: string | null;
  student?: {
    id: string;
    full_name_ar?: string | null;
    full_name_en?: string | null;
    email?: string | null;
    phone?: string | null;
    faculty?: string | null;
    academic_year?: number | null;
    department_major?: string | null;
  } | null;
  course?: { id: string; title: string; category?: string | null } | null;
  workshop?: { id: string; title: string; category?: string | null } | null;
  template?: { id: string; name: string } | null;
  issuer?: { full_name?: string | null; role?: string | null } | null;
}

interface ProgramItem {
  id: string;
  title: string;
  category?: string | null;
  enrollmentsCount?: number;
  registrationsCount?: number;
  sessionsCount: number;
}

interface PresidentCertificateClientProps {
  initialCertificates?: StudentCertificateRecord[];
  initialPrograms: {
    courses: ProgramItem[];
    workshops: ProgramItem[];
    templates: CertificateTemplate[];
  };
  userRole?: string;
  currentUserId?: string;
}

export function PresidentCertificateClient({
  initialCertificates = [],
  initialPrograms,
  userRole = 'president',
  currentUserId,
}: PresidentCertificateClientProps) {
  const { courses, workshops, templates } = initialPrograms;

  // Tabs: 'issued' | 'issue' | 'templates'
  const [activeTab, setActiveTab] = useState<'issued' | 'issue' | 'templates'>(
    initialCertificates.length > 0 ? 'issued' : 'issue'
  );

  // ---------------------------------------------------------------------------
  // Issued Registry State
  // ---------------------------------------------------------------------------
  const [certificates, setCertificates] = useState<StudentCertificateRecord[]>(initialCertificates);
  const [registrySearch, setRegistrySearch] = useState<string>('');
  const [registryProgramFilter, setRegistryProgramFilter] = useState<string>('all');
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyLink = (code: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/verify/${code}`;
      navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2200);
    }
  };

  const handleDeleteCertificate = async (certId: string, recipientName: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke/delete the certificate for "${recipientName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingCertId(certId);
    try {
      const res = await deleteStudentCertificateAction(certId);
      if (res.success) {
        setCertificates((prev) => prev.filter((c) => c.id !== certId));
      } else {
        alert(res.error || 'Failed to revoke certificate');
      }
    } catch (err: any) {
      alert(err?.message || 'Error revoking certificate');
    } finally {
      setDeletingCertId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Issue Batch Wizard State
  // ---------------------------------------------------------------------------
  const [programType, setProgramType] = useState<'course' | 'workshop'>(
    courses.length > 0 ? 'course' : 'workshop'
  );
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    courses[0]?.id || workshops[0]?.id || ''
  );

  const [templateList, setTemplateList] = useState<CertificateTemplate[]>(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.is_default)?.id || templates[0]?.id || ''
  );

  // Academic Eligibility Thresholds
  const [minAttendance, setMinAttendance] = useState<number>(75);
  const [minTaskAvg, setMinTaskAvg] = useState<number>(70);
  const [minQuizAvg, setMinQuizAvg] = useState<number>(70);

  // Eligibility data
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentCertificateEligibility[]>([]);
  const [eligibleCount, setEligibleCount] = useState<number>(0);
  const [alreadyIssuedCount, setAlreadyIssuedCount] = useState<number>(0);

  // Student selection in checklist
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentFilterTab, setStudentFilterTab] = useState<'all' | 'eligible' | 'not-issued'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Issuance transition
  const [isIssuing, startIssueTransition] = useTransition();
  const [issuanceResult, setIssuanceResult] = useState<{
    success: boolean;
    issuedCount: number;
    certificates?: Array<{ studentId: string; certificateNumber: string; verifyUrl: string }>;
    errors?: string[];
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Template Builder State
  // ---------------------------------------------------------------------------
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    templates[0]?.id || null
  );

  // Live Canvas Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  useEffect(() => {
    generateStyledQRDataURL('https://gdgoc-hnu.vercel.app/verify/sample', 180)
      .then(setPreviewQrUrl)
      .catch(() => {});
  }, []);

  // Fetch Eligibility Engine
  const fetchEligibility = async () => {
    if (!selectedProgramId) return;
    setLoadingEligibility(true);
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

        // Pre-select unissued eligible students
        const unissuedEligibleIds = res.students
          .filter((s) => s.isEligible && !s.alreadyIssued)
          .map((s) => s.student_id);
        setSelectedStudentIds(new Set(unissuedEligibleIds));
      }
    } catch (e) {
      console.error('fetchEligibility error:', e);
    } finally {
      setLoadingEligibility(false);
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

  const handleIssueSubmit = () => {
    if (!selectedProgramId) {
      alert('Please select a course or workshop program.');
      return;
    }
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student to issue certificates.');
      return;
    }

    setIssuanceResult(null);

    startIssueTransition(async () => {
      try {
        const res = await issueStudentCertificatesBatch({
          programType,
          programId: selectedProgramId,
          templateId: selectedTemplateId || undefined,
          studentIds: Array.from(selectedStudentIds),
          thresholds: { minAttendance, minTaskAvg, minQuizAvg },
        });

        setIssuanceResult(res);

        if (res.success && res.issuedCount > 0) {
          // Re-fetch eligibility to reflect newly issued status
          fetchEligibility();

          // Also create optimistic records in certificates registry
          const currentProgram =
            programType === 'course'
              ? courses.find((c) => c.id === selectedProgramId)
              : workshops.find((w) => w.id === selectedProgramId);

          const newlyIssuedRecords: StudentCertificateRecord[] = (res.certificates || []).map((ic) => {
            const stu = students.find((s) => s.student_id === ic.studentId);
            return {
              id: crypto.randomUUID(),
              title: currentProgram?.title || 'Technical Program',
              certificate_number: ic.certificateNumber,
              verification_code: ic.verifyUrl.split('/verify/')[1] || crypto.randomUUID(),
              issue_date: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              student_id: ic.studentId,
              course_id: programType === 'course' ? selectedProgramId : null,
              workshop_id: programType === 'workshop' ? selectedProgramId : null,
              template_id: selectedTemplateId || null,
              student: {
                id: ic.studentId,
                full_name_en: stu?.full_name_en || null,
                full_name_ar: stu?.full_name_ar || null,
                email: stu?.email || null,
                phone: null,
                faculty: stu?.faculty || null,
                academic_year: stu?.academic_year || null,
              },
              course: programType === 'course' ? { id: selectedProgramId, title: currentProgram?.title || '' } : null,
              workshop: programType === 'workshop' ? { id: selectedProgramId, title: currentProgram?.title || '' } : null,
              completion_stats: {
                attendance_percentage: stu?.attendanceRate || 100,
                task_average_score: stu?.tasksAverageScore ?? 100,
                quiz_average_score: stu?.quizzesAverageScore ?? 100,
                total_sessions_attended: stu?.sessionsAttended || 0,
                total_sessions: stu?.sessionsTotal || 0,
              },
            };
          });

          setCertificates((prev) => [...newlyIssuedRecords, ...prev]);
        }
      } catch (err: any) {
        setIssuanceResult({
          success: false,
          issuedCount: 0,
          errors: [err.message || 'An unexpected error occurred.'],
        });
      }
    });
  };

  const handleTemplateSaved = (savedTmpl: CertificateTemplate) => {
    setTemplateList((prev) => {
      const exists = prev.some((t) => t.id === savedTmpl.id);
      if (exists) {
        return prev.map((t) => (t.id === savedTmpl.id ? savedTmpl : t));
      } else {
        return [savedTmpl, ...prev];
      }
    });
    setEditingTemplateId(savedTmpl.id);
    if (!selectedTemplateId) {
      setSelectedTemplateId(savedTmpl.id);
    }
  };

  const currentEditingTemplate =
    templateList.find((t) => t.id === editingTemplateId) || templateList[0];
  const activeIssuingTemplate =
    templateList.find((t) => t.id === selectedTemplateId) || templateList[0];

  const currentProgramTitle =
    programType === 'course'
      ? courses.find((c) => c.id === selectedProgramId)?.title
      : workshops.find((w) => w.id === selectedProgramId)?.title;

  // Filtered Registry certificates
  const filteredRegistry = certificates.filter((cert) => {
    if (registryProgramFilter !== 'all') {
      const pId = cert.course_id || cert.workshop_id;
      if (pId !== registryProgramFilter) return false;
    }
    if (!registrySearch.trim()) return true;
    const q = registrySearch.toLowerCase();
    const nameEn = cert.student?.full_name_en?.toLowerCase() || '';
    const nameAr = cert.student?.full_name_ar?.toLowerCase() || '';
    const certNum = cert.certificate_number?.toLowerCase() || '';
    const progTitle = cert.title?.toLowerCase() || '';
    const email = cert.student?.email?.toLowerCase() || '';
    const faculty = cert.student?.faculty?.toLowerCase() || '';
    return (
      nameEn.includes(q) ||
      nameAr.includes(q) ||
      certNum.includes(q) ||
      progTitle.includes(q) ||
      email.includes(q) ||
      faculty.includes(q)
    );
  });

  // Filtered Students in Checklist
  const filteredStudents = students.filter((s) => {
    if (studentFilterTab === 'eligible' && (!s.isEligible || s.alreadyIssued)) return false;
    if (studentFilterTab === 'not-issued' && s.alreadyIssued) return false;

    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const nameEn = s.full_name_en?.toLowerCase() || '';
    const nameAr = s.full_name_ar?.toLowerCase() || '';
    const email = s.email?.toLowerCase() || '';
    const faculty = s.faculty?.toLowerCase() || '';
    return nameEn.includes(q) || nameAr.includes(q) || email.includes(q) || faculty.includes(q);
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        width: '100%',
        maxWidth: '1380px',
        margin: '0 auto',
        padding: '2.25rem 2rem 5rem 2rem',
        boxSizing: 'border-box',
      }}
    >
      {/* --------------------------------------------------------------------- */}
      {/* Header Banner */}
      {/* --------------------------------------------------------------------- */}
      <div
        className="glass-panel"
        style={{
          padding: '2rem',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        {/* Google 4-Color Gradient Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background:
              'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-blue)',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={30} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--google-blue)',
                  marginBottom: '0.2rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>Student Credential Engine (§4.S.10)</span>
                <span
                  style={{
                    background: 'rgba(66, 133, 244, 0.15)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    color: 'var(--google-blue)',
                  }}
                >
                  President Access
                </span>
              </div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 900,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Student Certificates Hub
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Calculate academic eligibility, bulk issue verified credentials with QR validation, and manage templates.
              </div>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <div
              className="glass-panel"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(66, 133, 244, 0.25)',
                background: 'rgba(66, 133, 244, 0.08)',
              }}
            >
              <FileText size={18} color="var(--google-blue)" />
              <div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Student Registry
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  {certificates.length}
                </div>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(52, 168, 83, 0.25)',
                background: 'rgba(52, 168, 83, 0.08)',
              }}
            >
              <BookOpen size={18} color="var(--google-green)" />
              <div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Programs
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--google-green)' }}>
                  {courses.length + workshops.length}
                </div>
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                background: 'rgba(168, 85, 247, 0.08)',
              }}
            >
              <Palette size={18} color="#a855f7" />
              <div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                  }}
                >
                  Templates
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>
                  {templateList.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* Navigation Tabs Bar */}
      {/* --------------------------------------------------------------------- */}
      <div
        className="glass-panel"
        style={{
          padding: '0.5rem',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
        }}
      >
        {/* Tab 1: Issued Student Registry */}
        <button
          onClick={() => setActiveTab('issued')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            border: activeTab === 'issued' ? '1px solid var(--google-blue)' : '1px solid transparent',
            background: activeTab === 'issued' ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
            color: activeTab === 'issued' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <GraduationCap
            size={16}
            color={activeTab === 'issued' ? 'var(--google-blue)' : 'currentColor'}
          />
          <span>Issued Student Registry ({certificates.length})</span>
        </button>

        {/* Tab 2: Issue New Batch */}
        <button
          onClick={() => setActiveTab('issue')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            border: activeTab === 'issue' ? '1px solid var(--google-green)' : '1px solid transparent',
            background: activeTab === 'issue' ? 'rgba(52, 168, 83, 0.12)' : 'transparent',
            color: activeTab === 'issue' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <PlusCircle
            size={16}
            color={activeTab === 'issue' ? 'var(--google-green)' : 'currentColor'}
          />
          <span>Issue New Batch</span>
        </button>

        {/* Tab 3: Template Builder */}
        <button
          onClick={() => setActiveTab('templates')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            border: activeTab === 'templates' ? '1px solid #a855f7' : '1px solid transparent',
            background: activeTab === 'templates' ? 'rgba(168, 85, 247, 0.12)' : 'transparent',
            color: activeTab === 'templates' ? '#fff' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Palette
            size={16}
            color={activeTab === 'templates' ? '#a855f7' : 'currentColor'}
          />
          <span>Template Builder ({templateList.length})</span>
        </button>

        {/* Shortcut to Team Chapter Certificates */}
        <Link
          href="/certificates"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(251, 188, 4, 0.4)',
            background: 'rgba(251, 188, 4, 0.12)',
            color: '#FDE047',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
            cursor: 'pointer',
            marginLeft: 'auto',
            transition: 'all 0.2s',
          }}
        >
          <Award size={16} color="#FBBC04" />
          <span>Chapter Team Certificates</span>
          <ExternalLink size={13} color="#FBBC04" />
        </Link>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: ISSUED STUDENT REGISTRY */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'issued' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search & Program Filter Toolbar */}
          <div
            className="glass-panel"
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 320px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by student name (AR/EN), serial, program, or email..."
                value={registrySearch}
                onChange={(e) => setRegistrySearch(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              {registrySearch && (
                <button
                  onClick={() => setRegistrySearch('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Program Filter Select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Filter size={16} color="var(--text-muted)" />
              <select
                value={registryProgramFilter}
                onChange={(e) => setRegistryProgramFilter(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.85rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all" style={{ background: '#121212' }}>
                  All Programs ({certificates.length})
                </option>
                <optgroup label="Courses" style={{ background: '#121212' }}>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: '#121212' }}>
                      Course: {c.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Workshops" style={{ background: '#121212' }}>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id} style={{ background: '#121212' }}>
                      Workshop: {w.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Credentials Ledger Table */}
          <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '170px 1.5fr 1.2fr 160px 110px 160px',
                padding: '0.875rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.04)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              <span>Serial No.</span>
              <span>Student Recipient</span>
              <span>Program Track</span>
              <span>Performance</span>
              <span>Issue Date</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {filteredRegistry.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <GraduationCap size={44} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  No student certificates found
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: '1.25rem' }}>
                  {registrySearch || registryProgramFilter !== 'all'
                    ? 'No records match your keyword or program filters.'
                    : 'Issue your first batch of verified student credentials using the Issue New Batch tab.'}
                </div>
                <button
                  onClick={() => setActiveTab('issue')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    background: 'var(--google-blue)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Go to Issue New Batch</span>
                </button>
              </div>
            ) : (
              filteredRegistry.map((cert) => {
                const displayName =
                  cert.student?.full_name_en || cert.student?.full_name_ar || 'Student Recipient';
                const isCourse = Boolean(cert.course_id || cert.course);
                const isCopied = copiedCode === cert.verification_code;
                const isDeleting = deletingCertId === cert.id;

                const stats = cert.completion_stats;
                const attPercent = stats?.attendance_percentage ?? 100;
                const taskPercent = stats?.task_average_score ?? 100;
                const quizPercent = stats?.quiz_average_score ?? 100;

                return (
                  <div
                    key={cert.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '170px 1.5fr 1.2fr 160px 110px 160px',
                      alignItems: 'center',
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '0.88rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Serial Tag */}
                    <div>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: 'var(--google-blue)',
                          background: 'rgba(66, 133, 244, 0.1)',
                          border: '1px solid rgba(66, 133, 244, 0.25)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          display: 'inline-block',
                        }}
                      >
                        {cert.certificate_number}
                      </span>
                    </div>

                    {/* Student Recipient */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'var(--google-blue)',
                          flexShrink: 0,
                        }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {displayName}
                        </div>
                        <div
                          style={{
                            fontSize: '0.74rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {cert.student?.faculty || 'HNU Student'}
                          {cert.student?.academic_year ? ` • Year ${cert.student.academic_year}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Program Track */}
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: isCourse ? 'rgba(66, 133, 244, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: isCourse ? 'var(--google-blue)' : '#c084fc',
                            border: `1px solid ${isCourse ? 'rgba(66, 133, 244, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                          }}
                        >
                          {isCourse ? 'Course' : 'Workshop'}
                        </span>
                      </div>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {cert.title}
                      </div>
                    </div>

                    {/* Performance Snapshot */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Att:</span>
                        <span style={{ fontWeight: 700, color: attPercent >= 75 ? 'var(--google-green)' : '#FBBC04' }}>
                          {attPercent}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tasks:</span>
                        <span style={{ fontWeight: 700, color: taskPercent >= 70 ? 'var(--google-green)' : '#FBBC04' }}>
                          {taskPercent}%
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '0.2rem' }}>Quiz:</span>
                        <span style={{ fontWeight: 700, color: quizPercent >= 70 ? 'var(--google-green)' : '#FBBC04' }}>
                          {quizPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Issue Date */}
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {cert.issue_date}
                    </div>

                    {/* Row Actions */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '0.45rem',
                      }}
                    >
                      {/* Download PDF */}
                      <a
                        href={`/api/certificates/${cert.id}/download`}
                        download
                        title="Download PDF"
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(66, 133, 244, 0.15)',
                          border: '1px solid rgba(66, 133, 244, 0.3)',
                          color: 'var(--google-blue)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                      >
                        <Download size={14} />
                      </a>

                      {/* Verify Public Link */}
                      <a
                        href={`/verify/${cert.verification_code}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Public Verification Page"
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(52, 168, 83, 0.15)',
                          border: '1px solid rgba(52, 168, 83, 0.3)',
                          color: 'var(--google-green)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                      >
                        <Shield size={14} />
                      </a>

                      {/* Copy Link */}
                      <button
                        onClick={() => handleCopyLink(cert.verification_code)}
                        title="Copy Verification URL"
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: isCopied ? 'rgba(52, 168, 83, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: isCopied ? '1px solid var(--google-green)' : '1px solid rgba(255, 255, 255, 0.1)',
                          color: isCopied ? 'var(--google-green)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>

                      {/* Revoke / Delete */}
                      <button
                        onClick={() => handleDeleteCertificate(cert.id, displayName)}
                        disabled={isDeleting}
                        title="Revoke / Delete Certificate"
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.12)',
                          border: '1px solid rgba(234, 67, 53, 0.25)',
                          color: '#EA4335',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: isDeleting ? 0.5 : 1,
                        }}
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: ISSUE NEW BATCH */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'issue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Step 1 & 2: Program & Template Selector + Thresholds in Top Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Card 1: Select Track & Template */}
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(66, 133, 244, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--google-blue)',
                    }}
                  >
                    <BookOpen size={17} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Program &amp; Template
                  </h3>
                </div>

                {/* Program Type Toggle */}
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.2rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <button
                    onClick={() => handleProgramTypeChange('course')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      background: programType === 'course' ? 'var(--google-blue)' : 'transparent',
                      color: programType === 'course' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Courses ({courses.length})
                  </button>
                  <button
                    onClick={() => handleProgramTypeChange('workshop')}
                    style={{
                      padding: '0.35rem 0.8rem',
                      borderRadius: '8px',
                      background: programType === 'workshop' ? 'var(--google-blue)' : 'transparent',
                      color: programType === 'workshop' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Workshops ({workshops.length})
                  </button>
                </div>
              </div>

              {/* Program Selector */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: '0.4rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Target {programType === 'course' ? 'Course' : 'Workshop'}
                </label>
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {programType === 'course'
                    ? courses.map((c) => (
                        <option key={c.id} value={c.id} style={{ background: '#18181b' }}>
                          {c.title} ({c.enrollmentsCount} enrolled • {c.sessionsCount} sessions)
                        </option>
                      ))
                    : workshops.map((w) => (
                        <option key={w.id} value={w.id} style={{ background: '#18181b' }}>
                          {w.title} ({w.registrationsCount} registered • {w.sessionsCount} sessions)
                        </option>
                      ))}
                </select>
              </div>

              {/* Template Selector & Live Preview Button */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Certificate Template
                  </label>
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--google-blue)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Eye size={13} />
                    <span>Live Preview</span>
                  </button>
                </div>

                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {templateList.map((t) => (
                    <option key={t.id} value={t.id} style={{ background: '#18181b' }}>
                      {t.name} {t.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card 2: Academic Eligibility Engine */}
            <div
              className="glass-panel"
              style={{
                padding: '1.5rem',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(52, 168, 83, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--google-green)',
                    }}
                  >
                    <Sliders size={17} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Eligibility Thresholds
                  </h3>
                </div>

                <button
                  onClick={fetchEligibility}
                  disabled={loadingEligibility}
                  title="Recalculate Eligibility"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: loadingEligibility ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={13} className={loadingEligibility ? 'animate-spin' : ''} />
                  <span>Recalculate</span>
                </button>
              </div>

              {/* Threshold Sliders / Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Min Attendance
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minAttendance}
                      onChange={(e) => setMinAttendance(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.45rem 0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Min Task Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minTaskAvg}
                      onChange={(e) => setMinTaskAvg(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.45rem 0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                    Min Quiz Score
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={minQuizAvg}
                      onChange={(e) => setMinQuizAvg(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '0.45rem 0.5rem',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  marginTop: 'auto',
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{students.length}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eligible</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--google-green)' }}>{eligibleCount}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issued</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--google-blue)' }}>{alreadyIssuedCount}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Selected</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FBBC04' }}>{selectedStudentIds.size}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Recipient Checklist & Selector */}
          <div
            className="glass-panel"
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Checklist Toolbar */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 280px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter enrolled students by name, email, or faculty..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>

              {/* Filter Tabs & Quick Action */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    display: 'flex',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '0.2rem',
                    borderRadius: '8px',
                  }}
                >
                  <button
                    onClick={() => setStudentFilterTab('all')}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      background: studentFilterTab === 'all' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: studentFilterTab === 'all' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    All ({students.length})
                  </button>
                  <button
                    onClick={() => setStudentFilterTab('eligible')}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      background: studentFilterTab === 'eligible' ? 'rgba(52, 168, 83, 0.2)' : 'transparent',
                      color: studentFilterTab === 'eligible' ? 'var(--google-green)' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Eligible ({eligibleCount})
                  </button>
                  <button
                    onClick={() => setStudentFilterTab('not-issued')}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      background: studentFilterTab === 'not-issued' ? 'rgba(66, 133, 244, 0.2)' : 'transparent',
                      color: studentFilterTab === 'not-issued' ? 'var(--google-blue)' : 'var(--text-muted)',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Unissued ({students.length - alreadyIssuedCount})
                  </button>
                </div>

                <button
                  onClick={toggleSelectAllEligible}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(52, 168, 83, 0.15)',
                    border: '1px solid rgba(52, 168, 83, 0.3)',
                    color: 'var(--google-green)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <CheckSquare size={14} />
                  <span>Select All Eligible</span>
                </button>
              </div>
            </div>

            {/* Checklist Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1.5fr 140px 140px 140px 140px',
                padding: '0.75rem 1.25rem',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
              }}
            >
              <span></span>
              <span>Student Recipient</span>
              <span>Attendance Rate</span>
              <span>Tasks Average</span>
              <span>Quiz Average</span>
              <span style={{ textAlign: 'right' }}>Eligibility Status</span>
            </div>

            {/* Checklist Items */}
            {loadingEligibility ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
                <div>Calculating student academic metrics and eligibility...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>No students found</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Try adjusting search keywords or eligibility filter tabs.
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                {filteredStudents.map((stu) => {
                  const isSelected = selectedStudentIds.has(stu.student_id);
                  const isEligible = stu.isEligible;
                  const alreadyIssued = stu.alreadyIssued;
                  const displayName = stu.full_name_en || stu.full_name_ar || 'Student';

                  return (
                    <div
                      key={stu.student_id}
                      onClick={() => !alreadyIssued && toggleStudentSelection(stu.student_id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '48px 1.5fr 140px 140px 140px 140px',
                        alignItems: 'center',
                        padding: '0.85rem 1.25rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        fontSize: '0.86rem',
                        cursor: alreadyIssued ? 'default' : 'pointer',
                        background: isSelected ? 'rgba(66, 133, 244, 0.06)' : 'transparent',
                        opacity: alreadyIssued ? 0.65 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      {/* Checkbox */}
                      <div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={alreadyIssued}
                          onChange={() => toggleStudentSelection(stu.student_id)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ cursor: alreadyIssued ? 'default' : 'pointer' }}
                        />
                      </div>

                      {/* Student Details */}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{displayName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {stu.faculty || 'HNU Student'} • {stu.email}
                        </div>
                      </div>

                      {/* Attendance */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              borderRadius: '3px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${stu.attendanceRate}%`,
                                height: '100%',
                                background: stu.attendanceRate >= minAttendance ? 'var(--google-green)' : '#EA4335',
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: stu.attendanceRate >= minAttendance ? 'var(--google-green)' : '#EA4335',
                            }}
                          >
                            {stu.attendanceRate}%
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {stu.sessionsAttended} / {stu.sessionsTotal} sessions
                        </div>
                      </div>

                      {/* Tasks Average */}
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (stu.tasksAverageScore ?? 0) >= minTaskAvg ? 'var(--google-green)' : '#FBBC04',
                          }}
                        >
                          {stu.tasksAverageScore ?? 0}%
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {stu.tasksSubmitted} / {stu.tasksTotal} submissions
                        </div>
                      </div>

                      {/* Quizzes Average */}
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: (stu.quizzesAverageScore ?? 0) >= minQuizAvg ? 'var(--google-green)' : '#FBBC04',
                          }}
                        >
                          {stu.quizzesAverageScore ?? 0}%
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {stu.quizzesPassed} / {stu.quizzesTotal} passed
                        </div>
                      </div>

                      {/* Status Tag */}
                      <div style={{ textAlign: 'right' }}>
                        {alreadyIssued ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              background: 'rgba(66, 133, 244, 0.15)',
                              color: 'var(--google-blue)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <Shield size={12} />
                            <span>Issued</span>
                          </span>
                        ) : isEligible ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              background: 'rgba(52, 168, 83, 0.15)',
                              color: 'var(--google-green)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Eligible</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '12px',
                              background: 'rgba(234, 67, 53, 0.15)',
                              color: '#EA4335',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <AlertCircle size={12} />
                            <span>Below Req</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Issuance Action Footer */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Selected: </span>
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                  {selectedStudentIds.size} student(s)
                </strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  (for &ldquo;{currentProgramTitle || 'Program'}&rdquo;)
                </span>
              </div>

              <button
                onClick={handleIssueSubmit}
                disabled={isIssuing || selectedStudentIds.size === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.75rem 1.75rem',
                  borderRadius: '12px',
                  background:
                    selectedStudentIds.size === 0 || isIssuing
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'linear-gradient(135deg, #34A853, #1e8e3e)',
                  color: selectedStudentIds.size === 0 || isIssuing ? 'var(--text-muted)' : '#fff',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: selectedStudentIds.size === 0 || isIssuing ? 'not-allowed' : 'pointer',
                  boxShadow:
                    selectedStudentIds.size > 0 && !isIssuing
                      ? '0 6px 20px rgba(52, 168, 83, 0.3)'
                      : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isIssuing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Issuing Certificates &amp; Generating PDFs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Issue {selectedStudentIds.size} Certificates (Batch)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Issuance Result Toast / Summary */}
          {issuanceResult && (
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                border: issuanceResult.success
                  ? '1px solid rgba(52, 168, 83, 0.3)'
                  : '1px solid rgba(234, 67, 53, 0.3)',
                background: issuanceResult.success
                  ? 'rgba(52, 168, 83, 0.08)'
                  : 'rgba(234, 67, 53, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {issuanceResult.success ? (
                  <CheckCircle2 size={20} color="var(--google-green)" />
                ) : (
                  <AlertCircle size={20} color="#EA4335" />
                )}
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {issuanceResult.success
                    ? `Successfully issued ${issuanceResult.issuedCount} verified student certificate(s)!`
                    : 'Certificate Issuance Alert'}
                </div>
              </div>

              {issuanceResult.errors && issuanceResult.errors.length > 0 && (
                <div style={{ fontSize: '0.82rem', color: '#EA4335' }}>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {issuanceResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {issuanceResult.certificates && issuanceResult.certificates.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generated:</span>
                  {issuanceResult.certificates.slice(0, 5).map((ic) => (
                    <a
                      key={ic.certificateNumber}
                      href={ic.verifyUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.25)',
                        color: 'var(--google-blue)',
                        textDecoration: 'none',
                      }}
                    >
                      {ic.certificateNumber}
                    </a>
                  ))}
                  {issuanceResult.certificates.length > 5 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      +{issuanceResult.certificates.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: TEMPLATE BUILDER */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Template Selection / Creation Header */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem 1.5rem',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a855f7',
                }}
              >
                <Palette size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Visual Certificate Designer
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Customize background templates, draggable coordinates, font scales, and QR code placement.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <select
                value={editingTemplateId || ''}
                onChange={(e) => setEditingTemplateId(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.55rem 0.85rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {templateList.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id} style={{ background: '#18181b' }}>
                    {tmpl.name} {tmpl.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setEditingTemplateId(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                <Plus size={15} />
                <span>New Template</span>
              </button>
            </div>
          </div>

          {/* Embedded Template Builder Component */}
          <div key={editingTemplateId || 'new-template'}>
            <TemplateBuilder
              initialTemplate={currentEditingTemplate}
              onSaved={handleTemplateSaved}
              canEdit={userRole === 'president' || userRole === 'co_president'}
            />
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* Live Canvas Preview Modal */}
      {/* --------------------------------------------------------------------- */}
      {previewModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
          }}
          onClick={() => setPreviewModalOpen(false)}
        >
          <div
            style={{
              background: '#121316',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              padding: '1.75rem',
              maxWidth: '960px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#fff' }}>
                  Certificate Visual Preview
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Template: &ldquo;{activeIssuingTemplate?.name || 'Standard'}&rdquo; • Program: &ldquo;
                  {currentProgramTitle || 'Technical Track'}&rdquo;
                </div>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Preview Canvas */}
            <div
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#0a0a0c',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <CertificatePreviewCanvas
                recipientName="Ahmed Mohamed Ali"
                title={currentProgramTitle || 'Technical Track Mastery'}
                formattedDate={new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                certificateNumber="GDGOC-STU-2026-DEMO99"
                issuerName="Chapter President"
                eventTitle={currentProgramTitle || null}
                fieldLayout={activeIssuingTemplate?.field_layout || DEFAULT_FIELD_LAYOUT}
                templateBg={
                  activeIssuingTemplate?.background_image_drive_file_id ||
                  activeIssuingTemplate?.background_image_url ||
                  null
                }
                qrCodeDataUrl={previewQrUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
