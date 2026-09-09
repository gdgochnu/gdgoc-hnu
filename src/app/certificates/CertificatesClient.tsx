'use client';

import React, { useState, useTransition } from 'react';
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
} from 'lucide-react';
import { RecipientSelector } from '@/components/certificates/RecipientSelector';
import { TemplateBuilder } from '@/components/certificates/TemplateBuilder';
import { issueBatchAction } from './actions';
import type { CertificateRecipientInput, CertificateTemplate } from '@/types/certificates';

interface CertificateRecord {
  id: string;
  title: string;
  certificate_number: string;
  verification_code: string;
  issue_date: string;
  recipient_name: string;
  recipient_email?: string;
  pdf_drive_url?: string;
  event_id?: string;
  issued_by?: string;
  created_at: string;
}

interface CertificatesClientProps {
  initialCertificates: CertificateRecord[];
  templates: CertificateTemplate[];
  events: Array<{ id: string; title: string }>;
  userRole: string;
  currentUserId: string;
}

export function CertificatesClient({
  initialCertificates,
  templates,
  events,
  userRole,
  currentUserId,
}: CertificatesClientProps) {
  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(userRole);

  const [activeTab, setActiveTab] = useState<'issued' | 'issue' | 'templates'>('issued');
  const [searchQuery, setSearchQuery] = useState('');
  const [certificates, setCertificates] = useState<CertificateRecord[]>(initialCertificates);

  // Issue Batch Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ''
  );
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [certTitle, setCertTitle] = useState('Certificate of Achievement');
  const [selectedRecipients, setSelectedRecipients] = useState<CertificateRecipientInput[]>([]);
  const [isIssuing, startIssueTransition] = useTransition();
  const [issueResult, setIssueResult] = useState<{
    success: boolean;
    count: number;
    message?: string;
  } | null>(null);

  const filteredCerts = certificates.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.recipient_name?.toLowerCase().includes(q) ||
      c.certificate_number?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q)
    );
  });

  const handleIssueSubmit = () => {
    if (!selectedTemplateId) {
      alert('Please select a certificate template.');
      return;
    }
    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient.');
      return;
    }

    setIssueResult(null);

    startIssueTransition(async () => {
      try {
        const res = await issueBatchAction({
          templateId: selectedTemplateId,
          eventId: selectedEventId || undefined,
          title: certTitle,
          recipients: selectedRecipients,
        });

        if (res.success) {
          setIssueResult({
            success: true,
            count: res.totalIssued,
            message: `Successfully issued ${res.totalIssued} certificate(s)!`,
          });
          // Prepend newly issued records
          const newRecords: CertificateRecord[] = res.issuedCertificates.map((ic) => ({
            id: ic.id,
            title: certTitle,
            certificate_number: ic.certificateNumber,
            verification_code: ic.verificationCode,
            issue_date: new Date().toISOString().split('T')[0],
            recipient_name: ic.recipientName,
            recipient_email: '',
            pdf_drive_url: ic.pdfUrl || undefined,
            event_id: selectedEventId || undefined,
            created_at: new Date().toISOString(),
          }));
          setCertificates((prev) => [...newRecords, ...prev]);
          setSelectedRecipients([]);
        } else {
          setIssueResult({
            success: false,
            count: 0,
            message: res.errors?.join(', ') || 'Failed to issue certificates.',
          });
        }
      } catch (err: any) {
        setIssueResult({
          success: false,
          count: 0,
          message: err.message || 'An unexpected error occurred.',
        });
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      {/* Header Banner */}
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.25), rgba(52, 168, 83, 0.25))',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--google-blue)',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={28} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--google-blue)',
                  marginBottom: '0.2rem',
                }}
              >
                Credential &amp; Certification Engine (§4.14)
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
                Chapter Certificates Hub
              </h1>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Design custom templates, bulk issue verified event credentials, and cryptographically verify credentials.
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              className="glass-panel"
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <FileText size={18} color="var(--google-blue)" />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Total Issued
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {certificates.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
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
          <GraduationCap size={16} color={activeTab === 'issued' ? 'var(--google-blue)' : 'currentColor'} />
          <span>Issued Credentials ({certificates.length})</span>
        </button>

        {isLeadership && (
          <>
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
              <PlusCircle size={16} color={activeTab === 'issue' ? 'var(--google-green)' : 'currentColor'} />
              <span>Issue New Batch</span>
            </button>

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
              <Palette size={16} color={activeTab === 'templates' ? '#a855f7' : 'currentColor'} />
              <span>Template Builder</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: ISSUED CREDENTIALS */}
      {activeTab === 'issued' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search bar */}
          <div
            className="glass-panel"
            style={{
              padding: '1rem 1.5rem',
              borderRadius: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by recipient name, serial number, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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

          {/* Credentials Table */}
          <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1.5fr 1fr 120px 160px',
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
              <span>Recipient</span>
              <span>Title</span>
              <span>Date</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {filteredCerts.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <GraduationCap size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  No certificates found
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {searchQuery ? 'Try changing your search keywords.' : 'Issue your first batch using the "Issue New Batch" tab.'}
                </div>
              </div>
            ) : (
              filteredCerts.map((cert) => (
                <div
                  key={cert.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1.5fr 1fr 120px 160px',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    fontSize: '0.88rem',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Serial */}
                  <div>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--google-blue)',
                        background: 'rgba(66, 133, 244, 0.1)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                      }}
                    >
                      {cert.certificate_number}
                    </span>
                  </div>

                  {/* Recipient */}
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      {cert.recipient_name}
                    </div>
                    {cert.recipient_email && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {cert.recipient_email}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
                    {cert.title}
                  </div>

                  {/* Date */}
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {cert.issue_date}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
                      <Download size={15} />
                    </a>

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
                      <Shield size={15} />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ISSUE NEW BATCH */}
      {activeTab === 'issue' && isLeadership && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Issue form configuration */}
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Batch Configuration
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Template Picker */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Certificate Template *
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {templates.length === 0 && (
                    <option value="" style={{ background: '#1a1d2e' }}>No templates saved — using default</option>
                  )}
                  {templates.map((t) => (
                    <option key={t.id} value={t.id} style={{ background: '#1a1d2e' }}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Credential Title *
                </label>
                <input
                  type="text"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  placeholder="e.g. Certificate of Achievement, Workshop Completion"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Optional Event Link */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Associated Event (Optional)
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="" style={{ background: '#1a1d2e' }}>None / General Chapter Credential</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id} style={{ background: '#1a1d2e' }}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Recipient Selector Component */}
          <RecipientSelector
            selectedRecipients={selectedRecipients}
            onRecipientsChange={(recs, evId, evTitle) => {
              setSelectedRecipients(recs);
              if (evId && !selectedEventId) {
                setSelectedEventId(evId);
              }
              if (evTitle) {
                setCertTitle(`Certificate of Attendance — ${evTitle}`);
              }
            }}
          />

          {/* Submit Action Bar */}
          <div
            className="glass-panel"
            style={{
              padding: '1.25rem 1.75rem',
              borderRadius: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                Ready to generate credentials
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {selectedRecipients.length} recipient(s) selected for issuance.
              </div>
            </div>

            <button
              onClick={handleIssueSubmit}
              disabled={isIssuing || selectedRecipients.length === 0}
              id="btn-confirm-issue-batch"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1.75rem',
                borderRadius: '12px',
                background: selectedRecipients.length > 0 ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.9rem',
                border: 'none',
                cursor: isIssuing || selectedRecipients.length === 0 ? 'not-allowed' : 'pointer',
                boxShadow: selectedRecipients.length > 0 ? '0 4px 14px rgba(66, 133, 244, 0.4)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {isIssuing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Issuing Batch (Rendering PDFs &amp; QR)...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Issue {selectedRecipients.length} Certificates</span>
                </>
              )}
            </button>
          </div>

          {/* Result Alert */}
          {issueResult && (
            <div
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                border: issueResult.success
                  ? '1px solid rgba(52, 168, 83, 0.4)'
                  : '1px solid rgba(234, 67, 53, 0.4)',
                background: issueResult.success
                  ? 'rgba(52, 168, 83, 0.1)'
                  : 'rgba(234, 67, 53, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {issueResult.success ? (
                <CheckCircle2 size={20} color="var(--google-green)" />
              ) : (
                <AlertCircle size={20} color="var(--google-red)" />
              )}
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                {issueResult.message}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEMPLATE BUILDER */}
      {activeTab === 'templates' && isLeadership && (
        <TemplateBuilder
          initialTemplate={templates[0]}
          onSaved={(savedTmpl) => {
            alert(`Template "${savedTmpl.name}" saved successfully!`);
          }}
        />
      )}
    </div>
  );
}
