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
  Mail,
  Smartphone,
  Monitor,
} from 'lucide-react';
import type { StudentCertificateEligibility } from '@/types/student';
import type { CertificateTemplate, CertificateFieldLayout } from '@/types/certificates';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';
import {
  getCertificateEligibility,
  issueStudentCertificatesBatch,
  deleteStudentCertificateAction,
  getCertificateEmailPreviewAction,
  sendTestCertificateEmailAction,
  getAllIssuedStudentCertificates,
  resendStudentCertificateAction,
} from '@/app/student-portal/admin/certificates/actions';
import { deleteCertificateTemplateAction } from '@/lib/certificates/template-actions';
import { TemplateBuilder } from '@/components/certificates/TemplateBuilder';
import { CertificatePreviewCanvas } from '@/components/certificates/CertificatePreviewCanvas';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';

/**
 * Normalizes Arabic text for tolerant search matching:
 * - Strips Tashkeel (diacritics) and Tatweel
 * - Unifies Alef variants (أ, إ, آ, ٱ -> ا)
 * - Unifies Taa Marbuta and Haa (ة -> ه)
 * - Unifies Yaa and Alef Maksura (ى, ي -> ي)
 * - Unifies common compound names (عبد الـ -> عبدالـ, ابو الـ -> ابوالـ, etc.)
 */
export function normalizeArabicSearch(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel
    .replace(/\u0640/g, '') // Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/نور\s+الدين/g, 'نورالدين')
    .replace(/سيف\s+الدين/g, 'سيفالدين')
    .replace(/علاء\s+الدين/g, 'علاءالدين')
    .replace(/\s+/g, ' ');
}

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
  const [isRefreshingRegistry, setIsRefreshingRegistry] = useState<boolean>(false);
  const [resendingCertId, setResendingCertId] = useState<string | null>(null);
  const [resendStatusMsg, setResendStatusMsg] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [registrySearch, setRegistrySearch] = useState<string>('');
  const [registryProgramFilter, setRegistryProgramFilter] = useState<string>('all');
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Sync state if initialCertificates changes from SSR
  useEffect(() => {
    if (initialCertificates && initialCertificates.length > 0) {
      setCertificates((prev) => {
        // Keep the latest if server returned more
        if (initialCertificates.length >= prev.length) {
          return initialCertificates;
        }
        return prev;
      });
    }
  }, [initialCertificates]);

  // Fetch / Sync Fresh Registry from Database
  const fetchCertificatesRegistry = async () => {
    setIsRefreshingRegistry(true);
    try {
      const res = await getAllIssuedStudentCertificates();
      if (res.success && res.certificates) {
        setCertificates(res.certificates);
      }
    } catch (err) {
      console.error('Failed to sync certificates registry:', err);
    } finally {
      setIsRefreshingRegistry(false);
    }
  };

  const handleCopyLink = (code: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/verify/${code}`;
      navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2200);
    }
  };

  const handleResendCertificate = async (cert: StudentCertificateRecord) => {
    const displayName = cert.student?.full_name_en || cert.student?.full_name_ar || 'Student';
    const email = cert.student?.email;
    if (!email) {
      alert(`Student "${displayName}" does not have a registered email address.`);
      return;
    }

    if (!confirm(`Are you sure you want to re-send the official certificate PDF email to ${displayName} (${email})?`)) {
      return;
    }

    setResendingCertId(cert.id);
    setResendStatusMsg(null);
    try {
      const res = await resendStudentCertificateAction(cert.id);
      if (res.success) {
        setResendStatusMsg({ id: cert.id, success: true, message: res.message || `Certificate email sent to ${email}!` });
        setTimeout(() => setResendStatusMsg(null), 5000);
      } else {
        alert(res.error || 'Failed to re-send certificate email.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while re-sending certificate email.');
    } finally {
      setResendingCertId(null);
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
    templates[0]?.id || ''
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

  // Issuance transition & batch progress state (prevents 504 timeouts for large student cohorts)
  const [isIssuing, startIssueTransition] = useTransition();
  const [isBatchIssuing, setIsBatchIssuing] = useState<boolean>(false);
  const [issuanceProgress, setIssuanceProgress] = useState<{
    totalStudents: number;
    completedStudents: number;
    currentBatch: number;
    totalBatches: number;
    percent: number;
    activeBatchSize: number;
    failedCount: number;
  } | null>(null);
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

  // ---------------------------------------------------------------------------
  // Certificate Delivery Email Preview & Test State
  // ---------------------------------------------------------------------------
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState<boolean>(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>('');
  const [emailPreviewSubject, setEmailPreviewSubject] = useState<string>('');
  const [emailPreviewTwoPartName, setEmailPreviewTwoPartName] = useState<string>('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [testEmailAddress, setTestEmailAddress] = useState<string>('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleOpenEmailPreview = async () => {
    setShowEmailPreviewModal(true);
    setIsLoadingPreview(true);
    setTestEmailResult(null);

    // Pick first selected student or generic sample
    const firstSelectedStudent = students.find((s) => selectedStudentIds.has(s.student_id));
    const sampleName = firstSelectedStudent?.full_name_en || firstSelectedStudent?.full_name_ar || 'Ahmed Mohamed Mahmoud Ali';

    try {
      const res = await getCertificateEmailPreviewAction({
        programTitle: currentProgramTitle || 'Modern Web Development Bootcamp',
        recipientName: sampleName,
      });

      if (res.success && res.html) {
        setEmailPreviewHtml(res.html);
        setEmailPreviewSubject(res.subject || '');
        setEmailPreviewTwoPartName(res.twoPartName || '');
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestEmailResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailResult(null);

    const firstSelectedStudent = students.find((s) => selectedStudentIds.has(s.student_id));
    const sampleName = firstSelectedStudent?.full_name_en || firstSelectedStudent?.full_name_ar || 'Test Student Name (Full)';

    try {
      const res = await sendTestCertificateEmailAction({
        testEmail: testEmailAddress,
        programTitle: currentProgramTitle || 'Modern Web Development Bootcamp',
        recipientName: sampleName,
        templateId: selectedTemplateId || undefined,
      });

      if (res.success) {
        setTestEmailResult({
          success: true,
          message: res.message || 'Test email sent successfully with official PDF certificate attachment!',
        });
      } else {
        setTestEmailResult({
          success: false,
          message: res.error || 'Failed to dispatch test email.',
        });
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err?.message || 'Error occurred while sending test email.',
      });
    } finally {
      setIsSendingTestEmail(false);
    }
  };

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

  const handleIssueSubmit = async () => {
    if (!selectedProgramId) {
      alert('Please select a course or workshop program.');
      return;
    }
    if (selectedStudentIds.size === 0) {
      alert('Please select at least one student to issue certificates.');
      return;
    }

    const allIdsToIssue = Array.from(selectedStudentIds);
    const BATCH_SIZE = 5;
    const totalStudents = allIdsToIssue.length;
    const totalBatches = Math.ceil(totalStudents / BATCH_SIZE);

    setIsBatchIssuing(true);
    setIssuanceResult(null);
    setIssuanceProgress({
      totalStudents,
      completedStudents: 0,
      currentBatch: 1,
      totalBatches,
      percent: 0,
      activeBatchSize: Math.min(BATCH_SIZE, totalStudents),
      failedCount: 0,
    });

    let totalIssued = 0;
    const allIssuedCertificates: Array<{ studentId: string; certificateNumber: string; verifyUrl: string }> = [];
    const allErrors: string[] = [];

    const currentProgram =
      programType === 'course'
        ? courses.find((c) => c.id === selectedProgramId)
        : workshops.find((w) => w.id === selectedProgramId);

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batchIds = allIdsToIssue.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

        setIssuanceProgress({
          totalStudents,
          completedStudents: totalIssued,
          currentBatch: i + 1,
          totalBatches,
          percent: Math.round((totalIssued / totalStudents) * 100),
          activeBatchSize: batchIds.length,
          failedCount: allErrors.length,
        });

        try {
          const res = await issueStudentCertificatesBatch({
            programType,
            programId: selectedProgramId,
            templateId: selectedTemplateId || undefined,
            studentIds: batchIds,
            thresholds: { minAttendance, minTaskAvg, minQuizAvg },
          });

          if (res.certificates && res.certificates.length > 0) {
            allIssuedCertificates.push(...res.certificates);
            totalIssued += res.certificates.length;

            // Remove successfully issued IDs from selection so UI shows real-time progress
            const newlyIssuedSet = new Set(res.certificates.map((c) => c.studentId));
            setSelectedStudentIds((prev) => {
              const next = new Set(prev);
              newlyIssuedSet.forEach((id) => next.delete(id));
              return next;
            });

            // Optimistically add to registry
            const optimisticBatch: StudentCertificateRecord[] = res.certificates.map((ic) => {
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
            setCertificates((prev) => [...optimisticBatch, ...prev]);
          }

          if (res.errors && res.errors.length > 0) {
            allErrors.push(...res.errors);
          }
        } catch (batchErr: any) {
          console.error(`Batch ${i + 1} failed:`, batchErr);
          allErrors.push(`Batch ${i + 1} (${batchIds.length} students): ${batchErr?.message || 'Network error'}`);
        }

        // Small 250ms pause between batches to be gentle on external APIs
        if (i < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      setIssuanceProgress({
        totalStudents,
        completedStudents: totalIssued,
        currentBatch: totalBatches,
        totalBatches,
        percent: 100,
        activeBatchSize: 0,
        failedCount: allErrors.length,
      });

      setIssuanceResult({
        success: totalIssued > 0,
        issuedCount: totalIssued,
        certificates: allIssuedCertificates,
        errors: allErrors.length > 0 ? allErrors : undefined,
      });

      // Refresh eligibility and full registry after all batches complete
      await Promise.all([fetchEligibility(), fetchCertificatesRegistry()]);
    } catch (err: any) {
      setIssuanceResult({
        success: totalIssued > 0,
        issuedCount: totalIssued,
        certificates: allIssuedCertificates,
        errors: [err.message || 'An unexpected error occurred during batch execution.'],
      });
    } finally {
      setIsBatchIssuing(false);
      setTimeout(() => {
        setIssuanceProgress(null);
      }, 4000);
    }
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
    const qRaw = registrySearch.toLowerCase().trim();
    const qNorm = normalizeArabicSearch(qRaw);

    const nameEn = (cert.student?.full_name_en || '').toLowerCase();
    const nameAr = (cert.student?.full_name_ar || '').toLowerCase();
    const nameArNorm = normalizeArabicSearch(cert.student?.full_name_ar);
    const certNum = (cert.certificate_number || '').toLowerCase();
    const progTitle = (cert.title || '').toLowerCase();
    const email = (cert.student?.email || '').toLowerCase();
    const faculty = (cert.student?.faculty || '').toLowerCase();

    return (
      nameEn.includes(qRaw) ||
      nameAr.includes(qRaw) ||
      (qNorm ? nameArNorm.includes(qNorm) : false) ||
      certNum.includes(qRaw) ||
      progTitle.includes(qRaw) ||
      email.includes(qRaw) ||
      faculty.includes(qRaw)
    );
  });

  // Filtered Students in Checklist
  const filteredStudents = students.filter((s) => {
    if (studentFilterTab === 'eligible' && (!s.isEligible || s.alreadyIssued)) return false;
    if (studentFilterTab === 'not-issued' && s.alreadyIssued) return false;

    if (!studentSearch.trim()) return true;
    const qRaw = studentSearch.toLowerCase().trim();
    const qNorm = normalizeArabicSearch(qRaw);

    const nameEn = (s.full_name_en || '').toLowerCase();
    const nameAr = (s.full_name_ar || '').toLowerCase();
    const nameArNorm = normalizeArabicSearch(s.full_name_ar);
    const email = (s.email || '').toLowerCase();
    const faculty = (s.faculty || '').toLowerCase();

    return (
      nameEn.includes(qRaw) ||
      nameAr.includes(qRaw) ||
      (qNorm ? nameArNorm.includes(qNorm) : false) ||
      email.includes(qRaw) ||
      faculty.includes(qRaw)
    );
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
          onClick={() => {
            setActiveTab('issued');
            fetchCertificatesRegistry();
          }}
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

        <button
          onClick={() => {
            setActiveTab('issue');
            fetchEligibility();
          }}
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

            {/* Program Filter & Sync Toolbar Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

              {/* Sync / Refresh Button */}
              <button
                onClick={fetchCertificatesRegistry}
                disabled={isRefreshingRegistry}
                title="Sync and refresh issued certificates from database"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.25)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.9rem',
                  color: 'var(--google-blue)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isRefreshingRegistry ? 'wait' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <RefreshCw
                  size={14}
                  className={isRefreshingRegistry ? 'animate-spin' : ''}
                />
                <span>{isRefreshingRegistry ? 'Syncing...' : 'Sync Registry'}</span>
              </button>
            </div>
          </div>

          {/* Resend Status Notification Banner */}
          {resendStatusMsg && (
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '14px',
                background: resendStatusMsg.success ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                border: `1px solid ${resendStatusMsg.success ? 'var(--google-green)' : '#EA4335'}`,
                color: resendStatusMsg.success ? 'var(--google-green)' : '#EA4335',
                fontSize: '0.86rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {resendStatusMsg.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{resendStatusMsg.message}</span>
              </div>
              <button
                onClick={() => setResendStatusMsg(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Credentials Ledger Table */}
          <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1.4fr 1.1fr 150px 105px 190px',
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
                  onClick={() => {
                    setActiveTab('issue');
                    fetchEligibility();
                  }}
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
                      gridTemplateColumns: '160px 1.4fr 1.1fr 150px 105px 190px',
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

                      {/* Re-send Email with PDF */}
                      <button
                        onClick={() => handleResendCertificate(cert)}
                        disabled={resendingCertId === cert.id}
                        title={
                          cert.student?.email
                            ? `Re-send certificate PDF email to ${cert.student.email}`
                            : 'No email address registered for student'
                        }
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(251, 188, 4, 0.15)',
                          border: '1px solid rgba(251, 188, 4, 0.35)',
                          color: '#FBBC04',
                          cursor: resendingCertId === cert.id ? 'wait' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {resendingCertId === cert.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
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
                  {templateList.length === 0 ? (
                    <option value="" style={{ background: '#18181b' }}>
                      No templates available — create one in Template Builder
                    </option>
                  ) : (
                    templateList.map((t) => (
                      <option key={t.id} value={t.id} style={{ background: '#18181b' }}>
                        {t.name}
                      </option>
                    ))
                  )}
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab('issued');
                              setRegistrySearch(stu.full_name_ar || stu.full_name_en || '');
                              fetchCertificatesRegistry();
                            }}
                            title="Click to view & manage this certificate in Issued Student Registry"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.22rem 0.6rem',
                              borderRadius: '12px',
                              background: 'rgba(66, 133, 244, 0.15)',
                              border: '1px solid rgba(66, 133, 244, 0.35)',
                              color: 'var(--google-blue)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Issued (View)</span>
                            <ExternalLink size={10} />
                          </button>
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

            {/* Active Batch Issuance Live Progress Bar */}
            {issuanceProgress && (
              <div
                style={{
                  margin: '1rem 1.5rem 0',
                  padding: '1rem 1.25rem',
                  borderRadius: '14px',
                  background: 'rgba(66, 133, 244, 0.08)',
                  border: '1.5px solid rgba(66, 133, 244, 0.3)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.6rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Loader2 size={18} className="animate-spin" color="#4285F4" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>
                      🚀 جاري إصدار الشهادات بنظام الدُفعات الآمن (Safe Batching)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#60A5FA' }}>
                    {issuanceProgress.completedStudents} / {issuanceProgress.totalStudents} طالب ({issuanceProgress.percent}%)
                  </div>
                </div>

                {/* Progress Track */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      width: `${issuanceProgress.percent}%`,
                      height: '100%',
                      borderRadius: '999px',
                      background: 'linear-gradient(90deg, #4285F4 0%, #34A853 100%)',
                      transition: 'width 0.4s ease-in-out',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span>
                    الدفعة {issuanceProgress.currentBatch} من أصل {issuanceProgress.totalBatches} ({issuanceProgress.activeBatchSize} طلاب في هذه الدفعة)...
                  </span>
                  <span style={{ color: '#FDE047', fontWeight: 600 }}>
                    ⚠️ يرجى ترك الصفحة مفتوحة حتى اكتمال كافة الدفعات بنجاح
                  </span>
                </div>
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenEmailPreview}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.75rem 1.35rem',
                    borderRadius: '12px',
                    background: 'rgba(66, 133, 244, 0.12)',
                    border: '1px solid rgba(66, 133, 244, 0.35)',
                    color: '#60A5FA',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title="Preview certificate delivery email & dispatch live test email"
                >
                  <Mail size={17} />
                  <span>معاينة وتجربة الإيميل • Preview Email</span>
                </button>

                <button
                  onClick={handleIssueSubmit}
                  disabled={isBatchIssuing || isIssuing || selectedStudentIds.size === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.75rem 1.75rem',
                    borderRadius: '12px',
                    background:
                      selectedStudentIds.size === 0 || isBatchIssuing || isIssuing
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'linear-gradient(135deg, #34A853, #1e8e3e)',
                    color: selectedStudentIds.size === 0 || isBatchIssuing || isIssuing ? 'var(--text-muted)' : '#fff',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: selectedStudentIds.size === 0 || isBatchIssuing || isIssuing ? 'not-allowed' : 'pointer',
                    boxShadow:
                      selectedStudentIds.size > 0 && !isBatchIssuing && !isIssuing
                        ? '0 6px 20px rgba(52, 168, 83, 0.3)'
                        : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {isBatchIssuing || isIssuing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>
                        جاري الإصدار ({issuanceProgress?.completedStudents || 0}/{issuanceProgress?.totalStudents || selectedStudentIds.size})...
                      </span>
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
                {templateList.length === 0 ? (
                  <option value="" style={{ background: '#18181b' }}>
                    No templates created yet
                  </option>
                ) : (
                  templateList.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id} style={{ background: '#18181b' }}>
                      {tmpl.name}
                    </option>
                  ))
                )}
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

          {/* Shared Templates Notice */}
          <div
            style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '14px',
              background: 'rgba(66, 133, 244, 0.08)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={16} color="var(--google-blue)" />
              <span>
                <strong>Unified Templates Registry:</strong> All templates created here or in Chapter Certificates are identical and shared across both Chapter Team Members and Student Portal.
              </span>
            </div>
            <Link
              href="/certificates"
              style={{
                color: 'var(--google-blue)',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
              }}
            >
              <span>Chapter Certificates Studio</span>
              <ExternalLink size={12} />
            </Link>
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

      {/* --------------------------------------------------------------------- */}
      {/* EMAIL PREVIEW & TEST DISPATCH MODAL                                   */}
      {/* --------------------------------------------------------------------- */}
      {showEmailPreviewModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEmailPreviewModal(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 15, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.25rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '92vh',
              borderRadius: '22px',
              background: '#0B1120',
              border: '1px solid rgba(66, 133, 244, 0.35)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 45px -10px rgba(66, 133, 244, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Google Accent Strip */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background:
                  'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
                zIndex: 10,
              }}
            />

            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(66, 133, 244, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#60A5FA',
                  }}
                >
                  <Mail size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#fff' }}>
                    معاينة إيميل الشهادة والإرسال التجريبي
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                    Certificate Delivery Email Live Preview &amp; Test Dispatch
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowEmailPreviewModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Top Toolbar: Feature Badges & Device Switcher */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              {/* Feature Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(66, 133, 244, 0.12)',
                    border: '1px solid rgba(66, 133, 244, 0.25)',
                    color: '#93C5FD',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <Sparkles size={12} color="#60A5FA" />
                  <span>Official Header &amp; Trailer (شعار رسمي)</span>
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(52, 168, 83, 0.12)',
                    border: '1px solid rgba(52, 168, 83, 0.25)',
                    color: '#86EFAC',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={12} color="#34A853" />
                  <span>الإسم ثنائي: {emailPreviewTwoPartName || 'Two-Part Name'}</span>
                </span>

                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '999px',
                    background: 'rgba(251, 188, 4, 0.12)',
                    border: '1px solid rgba(251, 188, 4, 0.25)',
                    color: '#FDE047',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  <span>📎 Attached: Official PDF Certificate</span>
                </span>
              </div>

              {/* Viewport Switcher */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '0.2rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '8px',
                    background: previewDevice === 'desktop' ? 'var(--google-blue)' : 'transparent',
                    color: previewDevice === 'desktop' ? '#fff' : '#94A3B8',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Monitor size={14} />
                  <span>Desktop (كمبيوتر)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.8rem',
                    borderRadius: '8px',
                    background: previewDevice === 'mobile' ? 'var(--google-blue)' : 'transparent',
                    color: previewDevice === 'mobile' ? '#fff' : '#94A3B8',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Smartphone size={14} />
                  <span>Mobile (موبايل)</span>
                </button>
              </div>
            </div>

            {/* Test Email Dispatch Bar */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(66, 133, 244, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '280px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                  🚀 إرسال تجريبي:
                </span>
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني لتجربة الإرسال الحي (مع المرفقات)..."
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail || !testEmailAddress}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.55rem 1.15rem',
                    borderRadius: '10px',
                    background:
                      isSendingTestEmail || !testEmailAddress
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'linear-gradient(135deg, #4285F4 0%, #1D4ED8 100%)',
                    color: isSendingTestEmail || !testEmailAddress ? '#64748B' : '#fff',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isSendingTestEmail || !testEmailAddress ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: !isSendingTestEmail && testEmailAddress ? '0 4px 14px rgba(66, 133, 244, 0.35)' : 'none',
                  }}
                >
                  {isSendingTestEmail ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري الإرسال...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>إرسال إيميل تجريبي</span>
                    </>
                  )}
                </button>
              </div>

              {/* Test Email Result Banner */}
              {testEmailResult && (
                <div
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    background: testEmailResult.success ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                    border: testEmailResult.success ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(234, 67, 53, 0.3)',
                    color: testEmailResult.success ? '#86EFAC' : '#FCA5A5',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {testEmailResult.success ? <CheckCircle2 size={14} color="#34A853" /> : <AlertCircle size={14} color="#EA4335" />}
                  <span>{testEmailResult.message}</span>
                </div>
              )}
            </div>

            {/* Preview Viewport Canvas */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem',
                background: '#070B14',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                minHeight: '450px',
              }}
            >
              {isLoadingPreview ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 1rem',
                    gap: '1rem',
                    color: '#60A5FA',
                  }}
                >
                  <Loader2 size={36} className="animate-spin" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94A3B8' }}>
                    جاري تجهيز معاينة الإيميل بالهيدر والتريلر المعتمدين...
                  </span>
                </div>
              ) : previewDevice === 'desktop' ? (
                /* Desktop View (640px Card Frame) */
                <div
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <iframe
                    srcDoc={emailPreviewHtml}
                    title="Desktop Email Preview"
                    style={{
                      width: '100%',
                      height: '620px',
                      border: 'none',
                      background: '#f1f3f4',
                      display: 'block',
                    }}
                  />
                </div>
              ) : (
                /* Mobile Mockup View (385px Phone Mockup) */
                <div
                  style={{
                    width: '385px',
                    borderRadius: '42px',
                    background: '#1E293B',
                    border: '4px solid #334155',
                    padding: '12px 10px 18px',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  {/* Phone Notch */}
                  <div
                    style={{
                      width: '120px',
                      height: '18px',
                      borderRadius: '999px',
                      background: '#0F172A',
                      marginBottom: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1E293B' }} />
                  </div>

                  {/* Phone Screen Iframe */}
                  <div
                    style={{
                      width: '100%',
                      height: '560px',
                      borderRadius: '28px',
                      overflow: 'hidden',
                      background: '#f1f3f4',
                    }}
                  >
                    <iframe
                      srcDoc={emailPreviewHtml}
                      title="Mobile Email Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: '#f1f3f4',
                        display: 'block',
                      }}
                    />
                  </div>

                  {/* Phone Home Bar */}
                  <div
                    style={{
                      width: '100px',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#475569',
                      marginTop: '12px',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
