'use client';

import React, { useState, useTransition } from 'react';
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
} from 'lucide-react';
import { RecipientSelector } from '@/components/certificates/RecipientSelector';
import { TemplateBuilder } from '@/components/certificates/TemplateBuilder';
import { issueBatchAction, deleteIssuedCertificateAction } from './actions';
import { deleteCertificateTemplateAction } from '@/lib/certificates/template-actions';
import type { CertificateRecipientInput, CertificateTemplate } from '@/types/certificates';

interface CertificateRecord {
  id: string;
  title: string;
  certificate_number: string;
  verification_code: string;
  issue_date: string;
  recipient_name: string;
  recipient_email?: string | null;
  recipient_profile_id?: string | null;
  pdf_drive_url?: string | null;
  event_id?: string | null;
  issued_by?: string | null;
  created_at: string;
  event?: { id: string; title: string } | null;
}

interface CertificatesClientProps {
  initialCertificates: CertificateRecord[];
  myCertificates?: CertificateRecord[];
  templates: CertificateTemplate[];
  events: Array<{ id: string; title: string }>;
  userRole: string;
  currentUserId: string;
  userEmail?: string;
}

export function CertificatesClient({
  initialCertificates,
  myCertificates = [],
  templates,
  events,
  userRole,
  currentUserId,
  userEmail,
}: CertificatesClientProps) {
  const isPresident = ['president', 'co_president'].includes(userRole);
  const isLeadership = [
    'president',
    'co_president',
    'branch_head',
    'committee_head',
    'committee_co_head',
  ].includes(userRole);

  // Regular members default to 'my-certs', leadership defaults to 'my-certs' if they have certs, else 'issued'
  const [activeTab, setActiveTab] = useState<'my-certs' | 'issued' | 'issue' | 'templates'>(
    !isLeadership || myCertificates.length > 0 ? 'my-certs' : 'issued'
  );
  const [myCerts, setMyCerts] = useState<CertificateRecord[]>(myCertificates);
  const [myCertsSearch, setMyCertsSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyLink = (code: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/verify/${code}`;
      navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2200);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [certificates, setCertificates] = useState<CertificateRecord[]>(initialCertificates);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);

  const handleDeleteCertificate = async (certId: string, recipientName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the certificate for "${recipientName}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingCertId(certId);
    try {
      const res = await deleteIssuedCertificateAction(certId);
      if (res.success) {
        setCertificates((prev) => prev.filter((c) => c.id !== certId));
      } else {
        alert(res.error || 'Failed to delete certificate');
      }
    } catch (err: any) {
      alert(err?.message || 'Error deleting certificate');
    } finally {
      setDeletingCertId(null);
    }
  };

  // Template Management State
  const [templateList, setTemplateList] = useState<CertificateTemplate[]>(templates);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    templates[0]?.id || null
  );
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

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

  const filteredMyCerts = myCerts.filter((c) => {
    if (!myCertsSearch.trim()) return true;
    const q = myCertsSearch.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.certificate_number?.toLowerCase().includes(q) ||
      c.verification_code?.toLowerCase().includes(q) ||
      c.recipient_name?.toLowerCase().includes(q) ||
      c.event?.title?.toLowerCase().includes(q)
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
          const newRecords: CertificateRecord[] = res.issuedCertificates.map((ic) => {
            const matchedInput = selectedRecipients.find(
              (sr) => sr.name.trim().toLowerCase() === ic.recipientName.trim().toLowerCase()
            );
            return {
              id: ic.id,
              title: certTitle,
              certificate_number: ic.certificateNumber,
              verification_code: ic.verificationCode,
              issue_date: new Date().toISOString().split('T')[0],
              recipient_name: ic.recipientName,
              recipient_email: matchedInput?.email || '',
              recipient_profile_id: matchedInput?.profileId || null,
              pdf_drive_url: ic.pdfUrl || undefined,
              event_id: selectedEventId || undefined,
              created_at: new Date().toISOString(),
              event: selectedEventId ? events.find((ev) => ev.id === selectedEventId) || null : null,
            };
          });
          setCertificates((prev) => [...newRecords, ...prev]);

          // Also check if any belong to current user
          const myNewRecords = newRecords.filter(
            (nr) =>
              (currentUserId && nr.recipient_profile_id === currentUserId) ||
              (userEmail && nr.recipient_email && nr.recipient_email.toLowerCase() === userEmail.toLowerCase())
          );
          if (myNewRecords.length > 0) {
            setMyCerts((prev) => [...myNewRecords, ...prev]);
          }

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

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    setIsDeletingTemplate(true);
    try {
      const res = await deleteCertificateTemplateAction(templateId);
      if (res.success) {
        const nextList = templateList.filter((t) => t.id !== templateId);
        setTemplateList(nextList);
        setEditingTemplateId(nextList[0]?.id || null);
        if (selectedTemplateId === templateId) {
          setSelectedTemplateId(nextList[0]?.id || '');
        }
      } else {
        alert(res.error || 'Failed to delete template');
      }
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const currentEditingTemplate = templateList.find((t) => t.id === editingTemplateId);

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

          {/* Quick Stats Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div
              className="glass-panel"
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: '1px solid rgba(251, 188, 4, 0.25)',
                background: 'rgba(251, 188, 4, 0.06)',
              }}
            >
              <Award size={18} color="#FBBC04" />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                  My Certificates
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FBBC04' }}>
                  {myCerts.length}
                </div>
              </div>
            </div>

            {isLeadership && (
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
                    Chapter Issued
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                    {certificates.length}
                  </div>
                </div>
              </div>
            )}
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
        {/* Tab 1: My Certificates (All Members) */}
        <button
          onClick={() => setActiveTab('my-certs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.25rem',
            borderRadius: '12px',
            border: activeTab === 'my-certs' ? '1px solid #FBBC04' : '1px solid transparent',
            background: activeTab === 'my-certs' ? 'rgba(251, 188, 4, 0.12)' : 'transparent',
            color: activeTab === 'my-certs' ? '#FBBC04' : 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Award size={16} color={activeTab === 'my-certs' ? '#FBBC04' : 'currentColor'} />
          <span>My Certificates ({myCerts.length})</span>
        </button>

        {/* Leadership-only Tabs: Chapter Registry */}
        {isLeadership && (
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
            <span>Chapter Registry ({certificates.length})</span>
          </button>
        )}

        {/* Presidential-only Tabs: Issue Batch & Template Builder */}
        {isPresident && (
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
              <span>Template Builder ({templateList.length})</span>
            </button>
          </>
        )}
      </div>

      {/* TAB: MY CERTIFICATES */}
      {activeTab === 'my-certs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Search bar & summary */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px' }}>
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search my certificates by title, event, or serial number..."
                value={myCertsSearch}
                onChange={(e) => setMyCertsSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
              {myCertsSearch && (
                <button
                  onClick={() => setMyCertsSearch('')}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#FBBC04', fontWeight: 700 }}>
                <Sparkles size={16} />
                {myCerts.length} Credential{myCerts.length === 1 ? '' : 's'} Earned
              </span>
            </div>
          </div>

          {/* Certificates Grid / Empty State */}
          {filteredMyCerts.length === 0 ? (
            <div
              className="glass-panel"
              style={{
                padding: '4rem 2rem',
                borderRadius: '24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.25rem',
                maxWidth: '680px',
                margin: '1.5rem auto',
                position: 'relative',
                overflow: 'hidden',
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
              <div
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, rgba(251, 188, 4, 0.2), rgba(66, 133, 244, 0.2))',
                  border: '1px solid rgba(251, 188, 4, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FBBC04',
                  boxShadow: '0 8px 24px rgba(251, 188, 4, 0.15)',
                }}
              >
                <Award size={40} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
                  {myCertsSearch ? 'No Matching Certificates' : 'No Certificates Issued Yet'}
                </h3>
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {myCertsSearch
                    ? `No certificates matched your search "${myCertsSearch}". Try a different keyword.`
                    : 'You have not received any certificates yet. Attend GDGoC Al-Hussein Bin Talal University workshops, hackathons, and technical sessions to earn official verified credentials!'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
                <Link
                  href="/events"
                  className="btn-google-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.4rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <Calendar size={16} />
                  <span>Browse Chapter Events</span>
                </Link>
                {isLeadership && (
                  <button
                    onClick={() => setActiveTab('issued')}
                    className="btn-google-ghost"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem 1.4rem',
                      borderRadius: '12px',
                      fontWeight: 600,
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    <GraduationCap size={16} />
                    <span>Browse Chapter Registry</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {filteredMyCerts.map((cert) => {
                const isCopied = copiedCode === cert.verification_code;
                return (
                  <div
                    key={cert.id}
                    className="glass-panel"
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                  >
                    {/* 4-Color Google Strip */}
                    <div
                      style={{
                        height: '4px',
                        width: '100%',
                        background:
                          'linear-gradient(90deg, #4285F4 25%, #EA4335 25% 50%, #FBBC04 50% 75%, #34A853 75%)',
                      }}
                    />

                    {/* Card Body */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                      {/* Top badges row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            background: 'rgba(52, 168, 83, 0.15)',
                            border: '1px solid rgba(52, 168, 83, 0.3)',
                            color: 'var(--google-green)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                          }}
                        >
                          <CheckCircle2 size={13} />
                          Verified Credential
                        </span>

                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.72rem',
                            color: 'var(--text-muted)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          {cert.certificate_number}
                        </span>
                      </div>

                      {/* Title & Event */}
                      <div>
                        <h4
                          style={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            margin: '0 0 0.35rem 0',
                            lineHeight: 1.3,
                          }}
                        >
                          {cert.title}
                        </h4>
                        {cert.event?.title && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.8rem',
                              color: 'var(--google-blue)',
                              fontWeight: 600,
                            }}
                          >
                            <Calendar size={13} />
                            <span>{cert.event.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Recipient & Metadata Box */}
                      <div
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem',
                          marginTop: 'auto',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Issued To:</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cert.recipient_name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Issue Date:</span>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{cert.issue_date}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingTop: '0.25rem', borderTop: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Verification Code:</span>
                          <button
                            onClick={() => handleCopyLink(cert.verification_code)}
                            title="Click to copy verification URL"
                            style={{
                              background: isCopied ? 'rgba(52, 168, 83, 0.2)' : 'rgba(66, 133, 244, 0.1)',
                              border: isCopied ? '1px solid var(--google-green)' : '1px solid rgba(66, 133, 244, 0.25)',
                              borderRadius: '6px',
                              padding: '0.2rem 0.5rem',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: isCopied ? 'var(--google-green)' : 'var(--google-blue)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copied Link!' : cert.verification_code}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      style={{
                        padding: '0.85rem 1.25rem',
                        background: 'rgba(0, 0, 0, 0.15)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <a
                        href={`/api/certificates/${cert.id}/download`}
                        download
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.45rem',
                          padding: '0.55rem 1rem',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #4285F4, #1a73e8)',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(66, 133, 244, 0.25)',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Download size={14} />
                        <span>Download PDF</span>
                      </a>

                      <a
                        href={`/verify/${cert.verification_code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '10px',
                          background: 'rgba(52, 168, 83, 0.12)',
                          border: '1px solid rgba(52, 168, 83, 0.25)',
                          color: 'var(--google-green)',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          textDecoration: 'none',
                          transition: 'all 0.2s',
                        }}
                        title="View official public verification certificate"
                      >
                        <Shield size={14} />
                        <span>Verify</span>
                      </a>

                      <button
                        onClick={() => handleCopyLink(cert.verification_code)}
                        title="Share certificate verification link"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: isCopied ? 'var(--google-green)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ISSUED CREDENTIALS (CHAPTER REGISTRY - LEADERSHIP ONLY) */}
      {isLeadership && activeTab === 'issued' && (
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

                    {isPresident && (
                      <button
                        onClick={() => handleDeleteCertificate(cert.id, cert.recipient_name)}
                        disabled={deletingCertId === cert.id}
                        title="Delete Certificate"
                        style={{
                          padding: '0.45rem',
                          borderRadius: '8px',
                          background: 'rgba(234, 67, 53, 0.15)',
                          border: '1px solid rgba(234, 67, 53, 0.3)',
                          color: 'var(--google-red)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: deletingCertId === cert.id ? 'not-allowed' : 'pointer',
                          opacity: deletingCertId === cert.id ? 0.6 : 1,
                        }}
                      >
                        {deletingCertId === cert.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ISSUE NEW BATCH */}
      {activeTab === 'issue' && isPresident && (
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
                  {templateList.length === 0 && (
                    <option value="" style={{ background: '#1a1d2e' }}>No templates saved — using default</option>
                  )}
                  {templateList.map((t) => (
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

      {/* TAB 3: TEMPLATE BUILDER & TEMPLATE MANAGER */}
      {activeTab === 'templates' && isPresident && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Template Switcher Bar */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
              <Layers size={20} color="#a855f7" />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Select Template to Edit
                </span>
                <select
                  value={editingTemplateId || ''}
                  onChange={(e) => setEditingTemplateId(e.target.value || null)}
                  style={{
                    width: '100%',
                    maxWidth: '360px',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#1a1d2e',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginTop: '0.2rem',
                    outline: 'none',
                  }}
                >
                  {templateList.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id} style={{ background: '#1a1d2e' }}>
                      {tmpl.name}
                    </option>
                  ))}
                  <option value="" style={{ background: '#1a1d2e' }}>
                    + [Create New Blank Template]
                  </option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => setEditingTemplateId(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem 1rem',
                  borderRadius: '10px',
                  background: !editingTemplateId ? 'var(--google-blue)' : 'rgba(255, 255, 255, 0.08)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Plus size={15} />
                <span>New Template</span>
              </button>

              {editingTemplateId && (
                <button
                  onClick={() => handleDeleteTemplate(editingTemplateId)}
                  disabled={isDeletingTemplate}
                  title="Delete this template"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.9rem',
                    borderRadius: '10px',
                    background: 'rgba(234, 67, 53, 0.15)',
                    border: '1px solid rgba(234, 67, 53, 0.3)',
                    color: 'var(--google-red)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isDeletingTemplate ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Trash2 size={15} />
                  <span>{isDeletingTemplate ? 'Deleting...' : 'Delete Template'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Template Builder Instance */}
          <TemplateBuilder
            key={editingTemplateId || 'new'}
            initialTemplate={currentEditingTemplate}
            onSaved={handleTemplateSaved}
          />
        </div>
      )}
    </div>
  );
}
