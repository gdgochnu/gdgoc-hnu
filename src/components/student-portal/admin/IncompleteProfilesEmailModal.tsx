'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Monitor,
  Smartphone,
  Loader2,
  Search,
  Check,
  RefreshCw,
  Sparkles,
  Users,
  ShieldCheck,
  Info,
  ExternalLink,
} from 'lucide-react';
import {
  AdminStudentItem,
  getIncompleteProfileEmailPreview,
  sendBulkProfileCompletionReminderEmails,
  sendTestProfileCompletionEmail,
} from '@/app/student-portal/admin/students/actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incompleteStudents: AdminStudentItem[];
  onCompleted?: () => void;
}

export function IncompleteProfilesEmailModal({
  isOpen,
  onClose,
  incompleteStudents,
  onCompleted,
}: Props) {
  const [activeTab, setActiveTab] = useState<'preview' | 'recipients'>('preview');
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Preview state
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [previewSender, setPreviewSender] = useState<string>('');
  const [sampleRecipient, setSampleRecipient] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);

  // Test email state
  const [testEmail, setTestEmail] = useState<string>('');
  const [sendingTest, setSendingTest] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Recipients selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk sending state
  const [isSendingBulk, setIsSendingBulk] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    total: number;
    sentCount: number;
    failedCount: number;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Initialize selected IDs when modal opens or list changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(incompleteStudents.map((s) => s.id)));
      setSendResult(null);
      setSendError(null);
      setTestFeedback(null);

      // Fetch live preview
      setLoadingPreview(true);
      const firstStudentId = incompleteStudents[0]?.id;
      getIncompleteProfileEmailPreview(firstStudentId)
        .then((res) => {
          if (res.success && res.html) {
            setPreviewHtml(res.html);
            setPreviewSubject(res.subject || '⚠️ مطلوب: استكمال بيانات حسابك الأكاديمي في GDGoC HNU');
            setPreviewSender(res.sender || 'GDGoC Helwan National University <gdgochnu@uniskills.pro>');
            setSampleRecipient(res.sampleRecipient || 'student@example.com');
          }
        })
        .finally(() => setLoadingPreview(false));
    }
  }, [isOpen, incompleteStudents]);

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return incompleteStudents;
    const q = searchQuery.toLowerCase().trim();
    return incompleteStudents.filter((s) => {
      const matchName = (s.full_name_en || s.googleName || '').toLowerCase().includes(q);
      const matchAr = (s.full_name_ar || '').toLowerCase().includes(q);
      const matchEmail = (s.email || '').toLowerCase().includes(q);
      return matchName || matchAr || matchEmail;
    });
  }, [incompleteStudents, searchQuery]);

  // Handle select / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === incompleteStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(incompleteStudents.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Send Test Email
  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setTestFeedback({ success: false, message: 'يرجى إدخال بريد إلكتروني صحيح أولاً' });
      return;
    }
    setSendingTest(true);
    setTestFeedback(null);
    try {
      const res = await sendTestProfileCompletionEmail(testEmail.trim());
      if (res.success) {
        setTestFeedback({ success: true, message: `تم إرسال بريد المعاينة بنجاح إلى ${testEmail}` });
      } else {
        setTestFeedback({ success: false, message: res.error || 'تعذر إرسال البريد التجريبي' });
      }
    } catch (err: any) {
      setTestFeedback({ success: false, message: err?.message || 'حدث خطأ غير متوقع' });
    } finally {
      setSendingTest(false);
    }
  };

  // Send Bulk Emails
  const handleSendBulk = async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = `هل أنت متأكد من إرسال بريد تذكير استكمال البيانات إلى ${selectedIds.size} طالب؟`;
    if (!window.confirm(confirmMsg)) return;

    setIsSendingBulk(true);
    setSendError(null);
    setSendResult(null);

    try {
      const res = await sendBulkProfileCompletionReminderEmails({
        studentIds: Array.from(selectedIds),
      });

      if (res.success) {
        setSendResult({
          total: res.total,
          sentCount: res.sentCount,
          failedCount: res.failedCount,
        });
        if (onCompleted) onCompleted();
      } else {
        setSendError(res.error || 'فشلت عملية إرسال رسائل التذكير.');
      }
    } catch (err: any) {
      setSendError(err?.message || 'حدث خطأ غير متوقع أثناء إرسال البريد.');
    } finally {
      setIsSendingBulk(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
      }}
      onClick={isSendingBulk ? undefined : onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          borderRadius: 24,
          background: '#0B1120',
          border: '1px solid rgba(66, 133, 244, 0.35)',
          boxShadow: '0 25px 70px rgba(0,0,0,0.9), 0 0 50px rgba(66, 133, 244, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Google 4-Color Strip */}
        <div
          style={{
            height: '4px',
            width: '100%',
            background: 'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(234,67,53,0.2) 0%, rgba(66,133,244,0.2) 100%)',
                border: '1px solid rgba(234,67,53,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F87171',
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  حملة بريد تذكير استكمال البيانات
                </h2>
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '999px',
                  }}
                >
                  {incompleteStudents.length} طالب غير مكتمل
                </span>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
                إرسال بريد إلكتروني رسمي معتمد لحث الطلاب على استكمال بيانات ملفاتهم وتفعيل حساباتهم.
              </p>
            </div>
          </div>

          {/* Tab Selector & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.25rem',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'preview' ? '#4285F4' : 'transparent',
                  color: activeTab === 'preview' ? '#FFFFFF' : '#94A3B8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Eye size={15} />
                <span>إستعراض الرسالة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recipients')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'recipients' ? '#4285F4' : 'transparent',
                  color: activeTab === 'recipients' ? '#FFFFFF' : '#94A3B8',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Users size={15} />
                <span>المستلمون ({selectedIds.size})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSendingBulk}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isSendingBulk ? 'not-allowed' : 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.75rem' }}>
          {/* TAB 1: EMAIL PREVIEW */}
          {activeTab === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Meta Info Bar */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: 14,
                  padding: '0.85rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#94A3B8', width: 75, fontWeight: 700 }}>من (From):</span>
                  <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{previewSender}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#94A3B8', width: 75, fontWeight: 700 }}>إلى (To):</span>
                  <span style={{ color: '#60A5FA', fontWeight: 600 }}>
                    {selectedIds.size} طالب مسجل ببيانات غير مكتملة (نموذج العرض: {sampleRecipient})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#94A3B8', width: 75, fontWeight: 700 }}>الموضوع:</span>
                  <span style={{ color: '#FBBF24', fontWeight: 700 }}>{previewSubject}</span>
                </div>
              </div>

              {/* View Mode Controls & Test Email Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                }}
              >
                {/* Device Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>شاشة العرض:</span>
                  <button
                    type="button"
                    onClick={() => setDevice('desktop')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 8,
                      border: device === 'desktop' ? '1px solid #4285F4' : '1px solid rgba(255,255,255,0.1)',
                      background: device === 'desktop' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                      color: device === 'desktop' ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Monitor size={14} />
                    <span>Desktop (كمبيوتر)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevice('mobile')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 8,
                      border: device === 'mobile' ? '1px solid #4285F4' : '1px solid rgba(255,255,255,0.1)',
                      background: device === 'mobile' ? 'rgba(66, 133, 244, 0.15)' : 'transparent',
                      color: device === 'mobile' ? '#FFFFFF' : '#94A3B8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Smartphone size={14} />
                    <span>Mobile (هاتف)</span>
                  </button>
                </div>

                {/* Send Test Email Quick Box */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="أدخل بريدك لتجربة الإرسال..."
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      width: 210,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: sendingTest || !testEmail ? 'not-allowed' : 'pointer',
                      opacity: sendingTest || !testEmail ? 0.6 : 1,
                    }}
                  >
                    {sendingTest ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>{sendingTest ? 'جاري الإرسال...' : 'إرسال تجريبي لي'}</span>
                  </button>
                </div>
              </div>

              {testFeedback && (
                <div
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 10,
                    background: testFeedback.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                    border: testFeedback.success ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(234, 67, 53, 0.35)',
                    color: testFeedback.success ? '#86EFAC' : '#FCA5A5',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {testFeedback.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <span>{testFeedback.message}</span>
                </div>
              )}

              {/* Sandboxed HTML IFrame Preview */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: 16,
                  padding: device === 'mobile' ? '1.5rem 0' : '0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: 460,
                }}
              >
                {loadingPreview ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#94A3B8', gap: '0.85rem' }}>
                    <Loader2 size={32} className="animate-spin" color="#4285F4" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>جاري بناء نموذج المعاينة التفاعلي...</span>
                  </div>
                ) : (
                  <div
                    style={{
                      width: device === 'mobile' ? 390 : '100%',
                      maxWidth: '100%',
                      borderRadius: device === 'mobile' ? 24 : 12,
                      overflow: 'hidden',
                      boxShadow: device === 'mobile' ? '0 15px 40px rgba(0,0,0,0.6)' : 'none',
                      border: device === 'mobile' ? '4px solid #334155' : 'none',
                      background: '#FFFFFF',
                    }}
                  >
                    <iframe
                      srcDoc={previewHtml}
                      title="Email Preview"
                      style={{
                        width: '100%',
                        height: 520,
                        border: 'none',
                        display: 'block',
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RECIPIENTS LIST */}
          {activeTab === 'recipients' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Filter & Actions Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                  <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    placeholder="بحث في الطلاب غير المكتملين بالاسم أو البريد..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 2.2rem 0.55rem 1rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    style={{
                      padding: '0.5rem 0.9rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#CBD5E1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {selectedIds.size === incompleteStudents.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الطلاب (77)'}
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
                    محدد: <strong style={{ color: '#86EFAC' }}>{selectedIds.size}</strong> من {incompleteStudents.length}
                  </span>
                </div>
              </div>

              {/* Recipients Cards List */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: '0.35rem',
                }}
              >
                {filteredRecipients.map((student) => {
                  const isChecked = selectedIds.has(student.id);
                  const displayName = student.full_name_en || student.googleName || student.full_name_ar || 'حساب مسجل بدون اسم';

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleSelectOne(student.id)}
                      style={{
                        padding: '0.85rem 1.15rem',
                        borderRadius: 12,
                        background: isChecked ? 'rgba(66, 133, 244, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(66, 133, 244, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#4285F4' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
                              {displayName}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '0.1rem 0.45rem',
                                borderRadius: 4,
                                background: 'rgba(234, 67, 53, 0.15)',
                                color: '#FCA5A5',
                                border: '1px solid rgba(234, 67, 53, 0.3)',
                              }}
                            >
                              بيانات ناقصة
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#60A5FA', marginTop: '0.15rem' }}>
                            {student.email}
                          </div>
                        </div>
                      </div>

                      {/* Missing Fields Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'flex-end', maxWidth: 380 }}>
                        {student.missingFields.slice(0, 3).map((f) => (
                          <span
                            key={f}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              borderRadius: 4,
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#FDE68A',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                            }}
                          >
                            {f.split('/')[0]}
                          </span>
                        ))}
                        {student.missingFields.length > 3 && (
                          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                            +{student.missingFields.length - 3} أخرى
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result / Error Banner */}
          {sendResult && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <CheckCircle2 size={24} color="#10B981" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#86EFAC' }}>
                  تمت حملة الإرسال بنجاح! 🎉
                </div>
                <div style={{ fontSize: '0.82rem', color: '#A7F3D0', marginTop: '0.2rem' }}>
                  تم إرسال {sendResult.sentCount} رسالة بنجاح عبر خوادم Hostinger Mail الرسمية.
                  {sendResult.failedCount > 0 && ` (تعذر إرسال ${sendResult.failedCount} رسالة)`}
                </div>
              </div>
            </div>
          )}

          {sendError && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: 14,
                background: 'rgba(234, 67, 53, 0.15)',
                border: '1px solid rgba(234, 67, 53, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
              }}
            >
              <XCircle size={24} color="#EA4335" />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#FCA5A5' }}>
                  حدث خطأ أثناء الإرسال
                </div>
                <div style={{ fontSize: '0.82rem', color: '#FECACA', marginTop: '0.2rem' }}>
                  {sendError}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            {isSendingBulk ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#FBBF24', fontWeight: 600 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري إرسال الرسائل عبر Hostinger Mail API في دفعات متتالية... يرجى الانتظار</span>
              </span>
            ) : sendResult ? (
              <span style={{ color: '#86EFAC', fontWeight: 700 }}>
                ✓ اكتملت العملية ({sendResult.sentCount} مرسلة)
              </span>
            ) : (
              <span>
                سيتم إرسال البريد إلى <strong style={{ color: '#FFFFFF' }}>{selectedIds.size}</strong> طالب دفعة واحدة.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSendingBulk}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#CBD5E1',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSendingBulk ? 'not-allowed' : 'pointer',
              }}
            >
              {sendResult ? 'إغلاق النافذة' : 'إلغاء'}
            </button>

            {!sendResult && (
              <button
                type="button"
                onClick={handleSendBulk}
                disabled={isSendingBulk || selectedIds.size === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.65rem 1.6rem',
                  borderRadius: 10,
                  border: 'none',
                  background: isSendingBulk || selectedIds.size === 0
                    ? 'rgba(66, 133, 244, 0.3)'
                    : 'linear-gradient(135deg, #4285F4 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  cursor: isSendingBulk || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: isSendingBulk || selectedIds.size === 0 ? 'none' : '0 4px 18px rgba(66, 133, 244, 0.4)',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSendingBulk ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>
                  {isSendingBulk
                    ? 'جاري الإرسال...'
                    : `بدء إرسال البريد لـ (${selectedIds.size}) طالب`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
