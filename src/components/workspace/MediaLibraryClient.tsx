'use client';

import React, { useState, useCallback, useTransition, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  ExternalLink,
  Trash2,
  Upload,
  Search,
  Filter,
  FolderOpen,
  RefreshCw,
  Download,
  Eye,
  Clock,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  X,
  File,
  Edit3,
  Check,
  Zap,
  ZoomIn,
} from 'lucide-react';

export interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  dateCreated?: string;
  category?: string;
  entityType?: string;
  entityId?: string | null;
  entityLabel?: string;
}

interface MediaLibraryClientProps {
  initialFiles: MediaFile[];
  folderUrl?: string;
  canUpload: boolean;
  canDelete: boolean;
  departments: { id: string; name: string; code: string }[];
  onUpload?: (file: File, departmentId: string | null, customName?: string) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  onRename?: (fileId: string, newName: string, entityType?: string, entityId?: string | null) => Promise<{ success: boolean; error?: string }>;
  onRefresh?: () => Promise<MediaFile[]>;
}

function getFileIcon(mimeType: string): React.ComponentType<{ size?: number; color?: string }> {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return Archive;
  return File;
}

function getFileColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '#8ab4f8';
  if (mimeType.startsWith('video/')) return '#C084FC';
  if (mimeType.startsWith('audio/')) return '#34A853';
  if (mimeType.includes('pdf')) return '#EA4335';
  if (mimeType.includes('document') || mimeType.includes('text')) return '#FBBC04';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '#F97316';
  return '#9AA0A6';
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
  return 'other';
}

/**
 * Thumbnail component with multi-stage fallback and loading skeleton
 */
function MediaThumbnail({ file, onClick }: { file: MediaFile; onClick?: () => void }) {
  const isImg = file.mimeType.startsWith('image/');
  const [loadStage, setLoadStage] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const candidateUrls = React.useMemo(() => {
    if (!isImg) return [];
    const urls: string[] = [];
    if (file.thumbnailUrl) urls.push(file.thumbnailUrl);
    urls.push(`/api/workspace/media/thumbnail?id=${encodeURIComponent(file.id)}`);
    urls.push(`https://drive.google.com/thumbnail?id=${encodeURIComponent(file.id)}&sz=w600`);
    urls.push(`https://lh3.googleusercontent.com/d/${encodeURIComponent(file.id)}=w600`);
    return Array.from(new Set(urls));
  }, [isImg, file.id, file.thumbnailUrl]);

  const currentSrc = candidateUrls[fallbackIndex] || '';

  const handleImageError = () => {
    if (fallbackIndex + 1 < candidateUrls.length) {
      setFallbackIndex((prev) => prev + 1);
    } else {
      setLoadStage('error');
    }
  };

  const FileIcon = getFileIcon(file.mimeType);
  const color = getFileColor(file.mimeType);

  if (!isImg || loadStage === 'error') {
    return (
      <div
        onClick={onClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(${color.includes('4285') ? '66,133,244' : '154,160,166'},0.08)`,
          cursor: onClick ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        <FileIcon size={38} color={color} />
        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {file.mimeType.split('/')[1]?.slice(0, 8) || 'FILE'}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.03)',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {loadStage === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ImageIcon size={22} color="rgba(255,255,255,0.2)" />
        </div>
      )}
      <img
        src={currentSrc}
        alt={file.name}
        onLoad={() => setLoadStage('loaded')}
        onError={handleImageError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: loadStage === 'loaded' ? 'block' : 'none',
          transition: 'transform 0.25s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      />
    </div>
  );
}

export function MediaLibraryClient({
  initialFiles,
  folderUrl,
  canUpload,
  canDelete,
  departments,
  onUpload,
  onDelete,
  onRename,
  onRefresh,
}: MediaLibraryClientProps) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);

  // Staging file before upload
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [uploadDept, setUploadDept] = useState<string>('');

  // Upload progress states
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<number>(0);
  const [uploadTransferred, setUploadTransferred] = useState<number>(0);
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string>('');

  // Operations states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Preview Lightbox
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  // Renaming state (after upload)
  const [renamingFile, setRenamingFile] = useState<MediaFile | null>(null);
  const [newFileName, setNewFileName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update staged file
  const handleSelectFile = (f: File) => {
    setStagedFile(f);
    setStagedFileName(f.name);
    setUploadStatus('idle');
    setUploadError('');
    setUploadProgress(0);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleSelectFile(dropped);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleSelectFile(f);
  };

  // Upload with real-time XHR progress tracking
  const handleUpload = async () => {
    if (!stagedFile) return;

    const finalName = stagedFileName.trim() || stagedFile.name;
    setUploadStatus('uploading');
    setUploadError('');
    setUploadProgress(0);
    setUploadSpeed(0);
    setUploadTransferred(0);
    setUploadTotal(stagedFile.size);

    const startTime = Date.now();

    // Use XMLHttpRequest for accurate upload progress and speed metrics
    try {
      const formData = new FormData();
      formData.append('file', stagedFile);
      formData.append('fileName', finalName);
      if (uploadDept) formData.append('departmentId', uploadDept);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speed = elapsedSec > 0.1 ? event.loaded / elapsedSec : 0;
          setUploadProgress(percent);
          setUploadTransferred(event.loaded);
          setUploadTotal(event.total);
          setUploadSpeed(speed);
        }
      };

      const result = await new Promise<{ success: boolean; file?: any; error?: string }>((resolve) => {
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.success) {
              resolve({ success: true, file: data.file });
            } else {
              resolve({ success: false, error: data.error || `Upload failed with status ${xhr.status}` });
            }
          } catch (e: any) {
            resolve({ success: false, error: 'Malformed response from upload server' });
          }
        };

        xhr.onerror = () => {
          resolve({ success: false, error: 'Network error during upload' });
        };

        xhr.open('POST', '/api/workspace/media/upload');
        xhr.send(formData);
      });

      if (result.success) {
        setUploadProgress(100);
        setUploadStatus('success');

        // Optimistically add to files
        if (result.file) {
          const newFile: MediaFile = {
            id: result.file.id,
            name: result.file.name,
            mimeType: result.file.mimeType,
            size: result.file.size,
            url: result.file.url,
            downloadUrl: result.file.downloadUrl,
            thumbnailUrl: result.file.thumbnailUrl || (result.file.mimeType?.startsWith('image/') ? `/api/workspace/media/thumbnail?id=${result.file.id}` : undefined),
            dateCreated: result.file.dateCreated,
            entityType: result.file.entityType,
            entityId: result.file.entityId,
            entityLabel: uploadDept ? departments.find((d) => d.id === uploadDept)?.name : 'General',
          };
          setFiles((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
        }

        // Also trigger full refresh if available
        if (onRefresh) {
          onRefresh().then((updated) => setFiles(updated)).catch(() => {});
        }

        setTimeout(() => {
          setStagedFile(null);
          setStagedFileName('');
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 2200);
      } else {
        // Fallback to server action if API route failed
        if (onUpload) {
          const actionRes = await onUpload(stagedFile, uploadDept || null, finalName);
          if (actionRes.success) {
            setUploadProgress(100);
            setUploadStatus('success');
            if (onRefresh) {
              const updated = await onRefresh();
              setFiles(updated);
            }
            setTimeout(() => {
              setStagedFile(null);
              setStagedFileName('');
              setUploadStatus('idle');
            }, 2200);
            return;
          }
        }
        setUploadStatus('error');
        setUploadError(result.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setUploadError(err.message || 'Upload error');
    }
  };

  // Delete file
  const handleDelete = async (fileId: string) => {
    if (!onDelete || deletingId) return;
    if (!confirm('Are you sure you want to delete this file from Google Drive? This cannot be undone.')) return;
    setDeletingId(fileId);
    try {
      const res = await onDelete(fileId);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
        if (previewFile?.id === fileId) setPreviewFile(null);
        showNotification('success', 'File deleted from Google Drive');
      } else {
        showNotification('error', 'Delete failed: ' + (res.error || 'Unknown error'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Start renaming a file
  const handleOpenRename = (file: MediaFile) => {
    setRenamingFile(file);
    setNewFileName(file.name);
    setRenameError('');
  };

  // Confirm rename
  const handleConfirmRename = async () => {
    if (!renamingFile) return;
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setRenameError('File name cannot be empty');
      return;
    }
    if (trimmed === renamingFile.name) {
      setRenamingFile(null);
      return;
    }

    setIsRenaming(true);
    setRenameError('');
    try {
      if (onRename) {
        const res = await onRename(renamingFile.id, trimmed, renamingFile.entityType, renamingFile.entityId);
        if (!res.success) {
          setRenameError(res.error || 'Rename failed');
          return;
        }
      }

      // Optimistically update file name in state
      setFiles((prev) =>
        prev.map((f) => (f.id === renamingFile.id ? { ...f, name: trimmed } : f))
      );
      if (previewFile?.id === renamingFile.id) {
        setPreviewFile((prev) => (prev ? { ...prev, name: trimmed } : null));
      }

      showNotification('success', `Renamed file to "${trimmed}"`);
      setRenamingFile(null);
    } catch (err: any) {
      setRenameError(err.message || 'Rename failed');
    } finally {
      setIsRenaming(false);
    }
  };

  // Refresh files
  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = await onRefresh();
      setFiles(updated);
      showNotification('success', 'Refreshed media files from Google Drive');
    } finally {
      setIsRefreshing(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  // Keyboard escape for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewFile) setPreviewFile(null);
        if (renamingFile) setRenamingFile(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewFile, renamingFile]);

  // Filter files
  const filtered = files.filter((f) => {
    const matchSearch =
      !searchQuery ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.entityLabel || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || getFileType(f.mimeType) === filterType;
    const matchDept = filterDept === 'all' || f.entityId === filterDept;
    return matchSearch && matchType && matchDept;
  });

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Floating Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            background: notification.type === 'success' ? 'rgba(52,168,83,0.95)' : 'rgba(234,67,53,0.95)',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ImageIcon size={24} color="#8ab4f8" />
            Central Media Library
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Browse, upload, preview, and manage all chapter media — backed by Google Drive
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Stats */}
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1.25rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{files.length}</strong> files
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{formatFileSize(totalSize)}</strong> total
            </span>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: viewMode === v ? 'rgba(66,133,244,0.2)' : 'transparent',
                  border: 'none',
                  color: viewMode === v ? '#8ab4f8' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: viewMode === v ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {v === 'grid' ? '⊞ Grid' : '☰ List'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            id="media-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
            }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          {folderUrl && (
            <a
              href={folderUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(52,168,83,0.1)',
                border: '1px solid rgba(52,168,83,0.3)',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                color: '#81c995',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <FolderOpen size={14} /> Open in Drive
            </a>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {canUpload && (
        <div
          id="media-upload-zone"
          className="glass-panel"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            padding: '1.5rem',
            border: `2px dashed ${isDragging ? 'rgba(66,133,244,0.7)' : 'rgba(255,255,255,0.12)'}`,
            background: isDragging ? 'rgba(66,133,244,0.06)' : 'rgba(255,255,255,0.02)',
            borderRadius: '14px',
            transition: 'all 0.2s ease',
          }}
        >
          {stagedFile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* File Info & Editable Name Before Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(66,133,244,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <File size={22} color="#8ab4f8" />
                </div>

                <div style={{ flex: 1, minWidth: '260px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    File Name (يمكنك تعديل اسم الملف قبل الرفع):
                  </label>
                  <input
                    id="media-upload-name-input"
                    type="text"
                    value={stagedFileName}
                    disabled={uploadStatus === 'uploading'}
                    onChange={(e) => setStagedFileName(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                    placeholder="Enter file name..."
                  />
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Original: {stagedFile.name} • {formatFileSize(stagedFile.size)}
                  </div>
                </div>

                {/* Target Committee Select */}
                <div style={{ minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Destination Folder:
                  </label>
                  <select
                    value={uploadDept}
                    disabled={uploadStatus === 'uploading'}
                    onChange={(e) => setUploadDept(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.85rem',
                      width: '100%',
                    }}
                  >
                    <option value="">General Media Library</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} Media
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
                  {uploadStatus === 'idle' && (
                    <>
                      <button
                        id="media-upload-confirm-btn"
                        onClick={handleUpload}
                        style={{
                          background: 'var(--google-blue)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0.55rem 1.25rem',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 4px 12px rgba(66,133,244,0.3)',
                        }}
                      >
                        <Upload size={15} /> Upload to Drive
                      </button>
                      <button
                        onClick={() => {
                          setStagedFile(null);
                          setStagedFileName('');
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '8px',
                          padding: '0.55rem 0.75rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                        title="Cancel"
                      >
                        <X size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Upload Progress Bar & Real-time Speed */}
              {uploadStatus === 'uploading' && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(66,133,244,0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#8ab4f8' }}>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      {uploadProgress < 100 ? 'Uploading to Drive…' : 'Finalizing on Google Drive…'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {uploadSpeed > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#81c995', fontWeight: 600 }}>
                          <Zap size={13} /> {formatSpeed(uploadSpeed)}
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)' }}>
                        {formatFileSize(uploadTransferred)} / {formatFileSize(uploadTotal)}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--text-primary)', minWidth: '38px', textAlign: 'right' }}>
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${uploadProgress}%`,
                        height: '100%',
                        borderRadius: '4px',
                        background: 'linear-gradient(90deg, #4285F4, #34A853)',
                        transition: 'width 0.2s ease-out',
                        boxShadow: '0 0 10px rgba(66,133,244,0.5)',
                      }}
                    />
                  </div>
                </div>
              )}

              {uploadStatus === 'success' && (
                <div
                  style={{
                    background: 'rgba(52,168,83,0.12)',
                    border: '1px solid rgba(52,168,83,0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#81c995',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle2 size={18} /> File uploaded successfully to Google Drive!
                </div>
              )}

              {uploadStatus === 'error' && (
                <div
                  style={{
                    background: 'rgba(234,67,53,0.12)',
                    border: '1px solid rgba(234,67,53,0.3)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: '#f28b82',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} /> {uploadError || 'Upload failed'}
                  </span>
                  <button
                    onClick={handleUpload}
                    style={{
                      background: 'rgba(234,67,53,0.2)',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(66,133,244,0.12)',
                  border: '1px solid rgba(66,133,244,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Upload size={20} color="#8ab4f8" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  Drop files here or click to upload
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Images, videos, documents, and more — stored in Google Drive
                </div>
              </div>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(66,133,244,0.1)',
                  border: '1px solid rgba(66,133,244,0.35)',
                  borderRadius: '9px',
                  padding: '0.5rem 1rem',
                  color: '#8ab4f8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                Choose File
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '180px', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            id="media-search-input"
            type="text"
            placeholder="Search files…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '32px',
              paddingRight: '10px',
              paddingTop: '0.35rem',
              paddingBottom: '0.35rem',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '7px',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <Filter size={14} color="var(--text-muted)" />

        <select
          id="media-type-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '7px',
            color: 'var(--text-primary)',
            padding: '0.35rem 0.65rem',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Types</option>
          <option value="image">🖼 Images</option>
          <option value="video">🎬 Videos</option>
          <option value="audio">🎵 Audio</option>
          <option value="pdf">📄 PDFs</option>
          <option value="document">📝 Documents</option>
          <option value="archive">📦 Archives</option>
          <option value="other">📎 Other</option>
        </select>

        <select
          id="media-dept-filter"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '7px',
            color: 'var(--text-primary)',
            padding: '0.35rem 0.65rem',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Committees</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <div style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {filtered.length} / {files.length} files
        </div>
      </div>

      {/* File Grid / List */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <HardDrive size={40} style={{ opacity: 0.25, marginBottom: '1rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            {files.length === 0 ? 'No files uploaded yet' : 'No files match your filters'}
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            {files.length === 0 && canUpload ? 'Upload your first file above to get started.' : 'Try changing your search or filter.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.1rem' }}>
          {filtered.map((file) => {
            const isImg = file.mimeType.startsWith('image/');
            return (
              <div
                key={file.id}
                className="glass-panel"
                style={{
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  position: 'relative',
                  borderRadius: '12px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {/* Image Thumbnail or File Icon */}
                <div
                  style={{
                    width: '100%',
                    height: '130px',
                    borderRadius: '9px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                    position: 'relative',
                  }}
                >
                  <MediaThumbnail
                    file={file}
                    onClick={isImg ? () => setPreviewFile(file) : undefined}
                  />

                  {/* Zoom badge for images */}
                  {isImg && (
                    <button
                      onClick={() => setPreviewFile(file)}
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        right: '6px',
                        background: 'rgba(0,0,0,0.65)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        padding: '0.25rem',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(4px)',
                      }}
                      title="Preview Image"
                    >
                      <ZoomIn size={12} />
                    </button>
                  )}
                </div>

                {/* File Details */}
                <div>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '0.2rem',
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{file.entityLabel || 'General'}</span>
                    <span>{formatFileSize(file.size)}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                  {/* View / Lightbox */}
                  {isImg ? (
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="View full preview"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        padding: '0.35rem',
                        borderRadius: '7px',
                        background: 'rgba(66,133,244,0.12)',
                        border: '1px solid rgba(66,133,244,0.25)',
                        color: '#8ab4f8',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> View
                    </button>
                  ) : (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in Drive"
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        padding: '0.35rem',
                        borderRadius: '7px',
                        background: 'rgba(66,133,244,0.12)',
                        border: '1px solid rgba(66,133,244,0.25)',
                        color: '#8ab4f8',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> View
                    </a>
                  )}

                  {/* Rename button */}
                  {canUpload && (
                    <button
                      id={`media-rename-btn-${file.id}`}
                      onClick={() => handleOpenRename(file)}
                      title="Rename file"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '7px',
                        background: 'rgba(251,188,4,0.12)',
                        border: '1px solid rgba(251,188,4,0.25)',
                        color: '#fdd663',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                  )}

                  {/* Download button */}
                  <a
                    href={file.downloadUrl || file.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '7px',
                      background: 'rgba(52,168,83,0.12)',
                      border: '1px solid rgba(52,168,83,0.25)',
                      color: '#81c995',
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={13} />
                  </a>

                  {/* Delete button */}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="Delete"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.35rem 0.5rem',
                        borderRadius: '7px',
                        background: 'rgba(234,67,53,0.12)',
                        border: '1px solid rgba(234,67,53,0.25)',
                        color: '#f28b82',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {filtered.map((file) => {
            const isImg = file.mimeType.startsWith('image/');
            const FileIcon = getFileIcon(file.mimeType);
            const color = getFileColor(file.mimeType);
            return (
              <div
                key={file.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1.1rem',
                  borderRadius: '10px',
                }}
              >
                {/* Thumbnail / Icon */}
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isImg ? (
                    <MediaThumbnail file={file} onClick={() => setPreviewFile(file)} />
                  ) : (
                    <FileIcon size={20} color={color} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {file.entityLabel || 'General'}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                      {formatFileSize(file.size)}
                    </span>
                    {file.dateCreated && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        <Clock size={11} /> {new Date(file.dateCreated).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  {isImg ? (
                    <button
                      onClick={() => setPreviewFile(file)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '7px',
                        background: 'rgba(66,133,244,0.12)',
                        border: '1px solid rgba(66,133,244,0.25)',
                        color: '#8ab4f8',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> View
                    </button>
                  ) : (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.78rem',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '7px',
                        background: 'rgba(66,133,244,0.12)',
                        border: '1px solid rgba(66,133,244,0.25)',
                        color: '#8ab4f8',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} /> View
                    </a>
                  )}

                  {canUpload && (
                    <button
                      onClick={() => handleOpenRename(file)}
                      title="Rename"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '7px',
                        background: 'rgba(251,188,4,0.12)',
                        border: '1px solid rgba(251,188,4,0.25)',
                        color: '#fdd663',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit3 size={13} />
                    </button>
                  )}

                  <a
                    href={file.downloadUrl || file.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.35rem 0.55rem',
                      borderRadius: '7px',
                      background: 'rgba(52,168,83,0.12)',
                      border: '1px solid rgba(52,168,83,0.25)',
                      color: '#81c995',
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={13} />
                  </a>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="Delete"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '7px',
                        background: 'rgba(234,67,53,0.12)',
                        border: '1px solid rgba(234,67,53,0.25)',
                        color: '#f28b82',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: 'rgba(5, 8, 16, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <ImageIcon size={18} color="#8ab4f8" />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {previewFile.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ({formatFileSize(previewFile.size)})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {canUpload && (
                  <button
                    onClick={() => handleOpenRename(previewFile)}
                    style={{
                      background: 'rgba(251,188,4,0.12)',
                      border: '1px solid rgba(251,188,4,0.3)',
                      color: '#fdd663',
                      borderRadius: '7px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Edit3 size={13} /> Rename
                  </button>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '0.35rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image View */}
            <div
              style={{
                flex: 1,
                minHeight: '320px',
                maxHeight: '65vh',
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                overflow: 'hidden',
              }}
            >
              <img
                src={previewFile.thumbnailUrl || `/api/workspace/media/thumbnail?id=${encodeURIComponent(previewFile.id)}`}
                alt={previewFile.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '62vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '0.85rem 1.25rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Folder: <strong style={{ color: 'var(--text-primary)' }}>{previewFile.entityLabel || 'General'}</strong>
                {previewFile.dateCreated && (
                  <span style={{ marginLeft: '1rem' }}>
                    Uploaded: {new Date(previewFile.dateCreated).toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.85rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <ExternalLink size={13} /> Open in Drive
                </a>
                <a
                  href={previewFile.downloadUrl || previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: 'var(--google-blue)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '0.45rem 1rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={13} /> Download Image
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog Modal */}
      {renamingFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9500,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setRenamingFile(null)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Edit3 size={18} color="#fdd663" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Rename File in Google Drive</h3>
            </div>

            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
              New File Name:
            </label>
            <input
              id="media-rename-input"
              type="text"
              autoFocus
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmRename();
              }}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                padding: '0.55rem 0.8rem',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            {renameError && (
              <div style={{ color: '#f28b82', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                {renameError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button
                onClick={() => setRenamingFile(null)}
                disabled={isRenaming}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  padding: '0.45rem 1rem',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                id="media-rename-confirm-btn"
                onClick={handleConfirmRename}
                disabled={isRenaming}
                style={{
                  background: 'var(--google-blue)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.45rem 1.25rem',
                  color: '#fff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isRenaming ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Renaming…
                  </>
                ) : (
                  <>
                    <Check size={14} /> Save Name
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
