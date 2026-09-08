'use client';

import React, { useState, useRef } from 'react';
import { uploadEntityFile, DriveEntityType } from '@/app/drive/actions';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface DriveFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: DriveEntityType;
  entityId?: string | null;
  entityName?: string;
  onUploadSuccess?: (file: any) => void;
}

export function DriveFileUploadModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  onUploadSuccess,
}: DriveFileUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedResult, setUploadedResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
      setUploadedResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
      setUploadedResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Read file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Content = (reader.result as string).split(',')[1];
          const res = await uploadEntityFile({
            entityType,
            entityId,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data: base64Content,
            makePublic: true,
          });

          if (res.success && res.file) {
            setUploadedResult(res.file);
            if (onUploadSuccess) onUploadSuccess(res.file);
          } else {
            setErrorMessage(res.error || 'Failed to upload file to Google Drive');
          }
        } catch (err: any) {
          setErrorMessage(err.message || 'Error processing file');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setErrorMessage('Failed to read file from disk');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error initiating upload');
      setIsUploading(false);
    }
  };

  const copyShareLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-card, #1A1D24)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.75rem',
          color: '#FFFFFF',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>
              Upload to Google Drive
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9AA0A6)', margin: '2px 0 0' }}>
              Target:{' '}
              <strong style={{ color: '#FFFFFF' }}>
                {entityName || entityType.replace('_', ' ')}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #9AA0A6)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {uploadedResult ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(52, 168, 83, 0.15)',
                color: '#81c995',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Upload Successful!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #9AA0A6)', marginBottom: '1.25rem' }}>
              "{uploadedResult.fileName}" was saved to the auto-created Drive subfolder.
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '1.5rem',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '340px' }}>
                {uploadedResult.fileUrl}
              </span>
              <button
                onClick={() => copyShareLink(uploadedResult.fileUrl)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8ab4f8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                {copied ? <Check size={14} color="#81c995" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <a
                href={uploadedResult.fileUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--google-blue, #4285F4)',
                  color: '#FFFFFF',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                <span>View on Google Drive</span>
                <ExternalLink size={14} />
              </a>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* File Selector & Upload Form */
          <div>
            {errorMessage && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(234, 67, 53, 0.1)',
                  border: '1px solid rgba(234, 67, 53, 0.25)',
                  color: '#F28B82',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(66, 133, 244, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                borderColor: file ? 'var(--google-blue, #4285F4)' : 'rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
                marginBottom: '1.25rem',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <UploadCloud
                size={36}
                style={{
                  color: file ? 'var(--google-blue, #4285F4)' : 'var(--text-secondary, #9AA0A6)',
                  margin: '0 auto 0.75rem',
                }}
              />
              {file ? (
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#FFFFFF' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #9AA0A6)', marginTop: '4px' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Document'}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem' }}>
                    Click or drag & drop files here to upload
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary, #9AA0A6)' }}>
                    Files are stored in the chapter's secure Google Drive workspace
                  </p>
                </div>
              )}
            </div>

            {/* Upload Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-secondary, #9AA0A6)',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--google-blue, #4285F4)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: !file || isUploading ? 0.6 : 1,
                }}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                <span>{isUploading ? 'Uploading...' : 'Upload to Drive'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
