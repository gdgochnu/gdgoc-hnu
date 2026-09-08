'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getDriveSettings,
  saveDriveSettings,
  generateRandomSecret,
  testDriveConnection,
  getDriveFolderMappings,
  DriveSettingsData,
  DriveFolderMappingItem,
} from './actions';
import {
  FolderGit2,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Globe,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  FolderTree,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Save,
} from 'lucide-react';

export default function DriveSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isPresident, setIsPresident] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [webAppUrl, setWebAppUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [rootFolderId, setRootFolderId] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Test Connection State
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    pingResult?: any;
    error?: string;
  } | null>(null);

  // Mappings State
  const [mappings, setMappings] = useState<DriveFolderMappingItem[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadSettings();
    loadMappings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getDriveSettings();
      if (!res.success) {
        setIsPresident(false);
        setErrorMessage(res.error || 'Access denied');
      } else {
        setIsPresident(true);
        if (res.settings) {
          setWebAppUrl(res.settings.webAppUrl || '');
          setSecret(res.settings.secret || '');
          setRootFolderId(res.settings.rootFolderId || '');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    try {
      const res = await getDriveFolderMappings();
      if (res.success) {
        setMappings(res.mappings);
      }
    } catch (err) {
      // Non-fatal
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await saveDriveSettings({
        webAppUrl,
        secret,
        rootFolderId,
      });

      if (res.success) {
        setSuccessMessage('Drive Bridge configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const res = await testDriveConnection(webAppUrl, secret);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || 'Connection test threw an unexpected error',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleGenerateSecret = async () => {
    const newSecret = await generateRandomSecret();
    setSecret(newSecret);
    setShowSecret(true);
    setSuccessMessage('Generated new secret token. Remember to save settings and update Script Properties in Apps Script!');
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #9AA0A6)',
          gap: '0.75rem',
        }}
      >
        <Loader2 size={24} className="animate-spin" />
        <span>Loading Drive Bridge Configuration...</span>
      </div>
    );
  }

  // Role Protection: Non-Presidents
  if (!isPresident) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', padding: '0 1.5rem' }}>
        <div
          className="glass-panel"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            borderRadius: '16px',
            background: 'rgba(234, 67, 53, 0.05)',
            border: '1px solid rgba(234, 67, 53, 0.2)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(234, 67, 53, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              color: '#F28B82',
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.75rem' }}>
            President-Only Restricted Area
          </h1>
          <p
            style={{
              color: 'var(--text-secondary, #9AA0A6)',
              fontSize: '0.95rem',
              maxWidth: '520px',
              margin: '0 auto 2rem',
              lineHeight: '1.6',
            }}
          >
            Google Drive Bridge settings manage core chapter storage integrations and shared secret keys. Access is restricted exclusively to Chapter Presidents.
          </p>
          <Link
            href="/dashboard"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        color: '#FFFFFF',
      }}
    >
      {/* Header Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(52, 168, 83, 0.2))',
              border: '1px solid rgba(66, 133, 244, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-blue, #4285F4)',
            }}
          >
            <FolderGit2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Google Drive Bridge</h1>
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  color: '#8ab4f8',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  fontWeight: 600,
                }}
              >
                President Settings
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary, #9AA0A6)', fontSize: '0.9rem', margin: '4px 0 0' }}>
              Manage the chapter's Google Drive Web App endpoint, rotate shared secrets, and inspect folder mappings
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(52, 168, 83, 0.12)',
            border: '1px solid rgba(52, 168, 83, 0.3)',
            color: '#81c995',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(234, 67, 53, 0.12)',
            border: '1px solid rgba(234, 67, 53, 0.3)',
            color: '#F28B82',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Main Settings Form */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 1.5rem' }}>Connection Parameters</h2>

          <form onSubmit={handleSave}>
            {/* Web App URL */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: 'var(--text-secondary, #9AA0A6)',
                }}
              >
                Google Apps Script Web App URL
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Globe
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    color: 'var(--text-secondary, #9AA0A6)',
                  }}
                />
                <input
                  type="url"
                  id="drive-bridge-url-input"
                  value={webAppUrl}
                  onChange={(e) => setWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  style={{
                    width: '100%',
                    padding: '0.75rem 3rem 0.75rem 2.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                {webAppUrl && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webAppUrl, 'url')}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary, #9AA0A6)',
                      cursor: 'pointer',
                    }}
                    title="Copy URL"
                  >
                    {copiedField === 'url' ? <Check size={16} color="#81c995" /> : <Copy size={16} />}
                  </button>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9AA0A6)', marginTop: '4px', display: 'block' }}>
                Obtained from Google Apps Script editor via <strong>Deploy &gt; New deployment &gt; Web app</strong>.
              </span>
            </div>

            {/* Shared Secret Token */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary, #9AA0A6)',
                  }}
                >
                  Shared Secret Token
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSecret}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#8ab4f8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={12} /> Generate / Rotate Secret
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    color: 'var(--text-secondary, #9AA0A6)',
                  }}
                />
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="drive-bridge-secret-input"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter or generate shared secret token"
                  style={{
                    width: '100%',
                    padding: '0.75rem 5rem 0.75rem 2.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    fontFamily: showSecret ? 'inherit' : 'monospace',
                  }}
                />
                <div style={{ position: 'absolute', right: '0.75rem', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary, #9AA0A6)',
                      cursor: 'pointer',
                    }}
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {secret && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(secret, 'secret')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary, #9AA0A6)',
                        cursor: 'pointer',
                      }}
                      title="Copy Secret"
                    >
                      {copiedField === 'secret' ? <Check size={16} color="#81c995" /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #9AA0A6)', marginTop: '4px', display: 'block' }}>
                Must match the <code>DRIVE_BRIDGE_SECRET</code> property set in Apps Script Script Properties.
              </span>
            </div>

            {/* Root Folder ID (Optional) */}
            <div style={{ marginBottom: '2rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: 'var(--text-secondary, #9AA0A6)',
                }}
              >
                Root Folder ID (Optional)
              </label>
              <input
                type="text"
                id="drive-root-folder-id-input"
                value={rootFolderId}
                onChange={(e) => setRootFolderId(e.target.value)}
                placeholder="Auto-created as 'GDGoC HNU OS Workspace' if left blank"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'var(--google-blue, #4285F4)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Configuration</span>
              </button>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !webAppUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: testing || !webAppUrl ? 0.6 : 1,
                }}
              >
                {testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'transparent',
                  color: 'var(--text-secondary, #9AA0A6)',
                  border: 'none',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                <HelpCircle size={16} />
                <span>{showGuide ? 'Hide Setup Guide' : 'How to deploy?'}</span>
              </button>
            </div>
          </form>

          {/* Test Connection Output Box */}
          {testResult && (
            <div
              style={{
                marginTop: '1.75rem',
                padding: '1.25rem',
                borderRadius: '12px',
                background: testResult.success ? 'rgba(52, 168, 83, 0.08)' : 'rgba(234, 67, 53, 0.08)',
                border: testResult.success ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(234, 67, 53, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {testResult.success ? (
                  <CheckCircle2 size={18} color="#81c995" />
                ) : (
                  <AlertCircle size={18} color="#F28B82" />
                )}
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    color: testResult.success ? '#81c995' : '#F28B82',
                  }}
                >
                  {testResult.success ? 'Bridge Connection Active' : 'Connection Test Failed'}
                </span>
                {testResult.latencyMs !== undefined && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9AA0A6)', marginLeft: 'auto' }}>
                    Latency: {testResult.latencyMs}ms
                  </span>
                )}
              </div>

              {testResult.success ? (
                <div style={{ fontSize: '0.85rem', color: '#FFFFFF', lineHeight: '1.5' }}>
                  <div>Root Folder: <strong>{testResult.pingResult?.rootFolderName || 'GDGoC HNU OS Workspace'}</strong></div>
                  <div style={{ color: 'var(--text-secondary, #9AA0A6)' }}>
                    Folder ID: <code>{testResult.pingResult?.rootFolderId || 'root'}</code>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.85rem', color: '#F28B82', margin: 0 }}>
                  {testResult.error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Collapsible Setup Guide */}
        {showGuide && (
          <div
            className="glass-panel"
            style={{
              padding: '1.75rem',
              borderRadius: '16px',
              background: 'rgba(66, 133, 244, 0.03)',
              border: '1px solid rgba(66, 133, 244, 0.2)',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--google-blue, #4285F4)" />
              Setup Guide: Deploying the Google Apps Script Web App
            </h3>

            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.8' }}>
              <li>
                Log into the chapter's official Google Account and visit{' '}
                <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: '#8ab4f8' }}>
                  script.google.com
                </a>
                .
              </li>
              <li>Create a new project named <code>GDGoC HNU OS Drive Bridge</code>.</li>
              <li>
                Copy the code from <code>google-apps-script/Code.gs</code> in this repository into the script editor.
              </li>
              <li>
                Go to <strong>Project Settings (⚙️) &gt; Script Properties</strong>, click <em>Add script property</em>:
                <div style={{ margin: '0.25rem 0', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontFamily: 'monospace' }}>
                  Property: DRIVE_BRIDGE_SECRET | Value: [Your Secret Token]
                </div>
              </li>
              <li>
                Click <strong>Deploy &gt; New deployment</strong>, select <strong>Web app</strong>, set <em>"Execute as: Me"</em> and <em>"Who has access: Anyone"</em>.
              </li>
              <li>Copy the generated Web App URL and paste it into the form above.</li>
            </ol>
          </div>
        )}

        {/* Mapped Folders Overview */}
        <div
          className="glass-panel"
          style={{
            padding: '2rem',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderTree size={20} color="var(--google-green, #34A853)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Auto-Created Folder Mappings</h2>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9AA0A6)' }}>
              {mappings.length} {mappings.length === 1 ? 'folder mapped' : 'folders mapped'}
            </span>
          </div>

          {mappings.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'var(--text-secondary, #9AA0A6)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Entity Type</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Entity Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Drive Folder ID</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#FFFFFF',
                            textTransform: 'capitalize',
                          }}
                        >
                          {m.entityType.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{m.entityName}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary, #9AA0A6)', fontSize: '0.8rem' }}>
                        {m.driveFolderId}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <a
                          href={m.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#8ab4f8',
                            textDecoration: 'none',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <span>Open in Drive</span>
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                color: 'var(--text-secondary, #9AA0A6)',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                No entities mapped yet. Folders are automatically generated when departments, events, or media assets are uploaded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
