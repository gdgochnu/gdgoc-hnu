'use client';

import React, { useState, useCallback, useTransition } from 'react';
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
} from 'lucide-react';

export interface MediaFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  downloadUrl: string;
  dateCreated?: string;
  category?: string; // committee/event label injected by page
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
  onUpload?: (file: File, departmentId: string | null) => Promise<{ success: boolean; error?: string }>;
  onDelete?: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  onRefresh?: () => Promise<MediaFile[]>;
}

const MIME_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {};

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

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';
  return 'other';
}

export function MediaLibraryClient({
  initialFiles,
  folderUrl,
  canUpload,
  canDelete,
  departments,
  onUpload,
  onDelete,
  onRefresh,
}: MediaLibraryClientProps) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadDept, setUploadDept] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter logic
  const filtered = files.filter((f) => {
    const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || (f.entityLabel || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'all' || getFileType(f.mimeType) === filterType;
    const matchDept = filterDept === 'all' || f.entityId === filterDept;
    return matchSearch && matchType && matchDept;
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setUploadingFile(droppedFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setUploadingFile(f);
  };

  const handleUpload = async () => {
    if (!uploadingFile || !onUpload) return;
    setUploadStatus('uploading');
    setUploadError('');
    try {
      const res = await onUpload(uploadingFile, uploadDept || null);
      if (res.success) {
        setUploadStatus('success');
        setUploadingFile(null);
        setUploadDept('');
        // Refresh files
        if (onRefresh) {
          const updated = await onRefresh();
          setFiles(updated);
        }
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
        setUploadError(res.error || 'Upload failed');
      }
    } catch (err: any) {
      setUploadStatus('error');
      setUploadError(err.message || 'Upload failed');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!onDelete || deletingId) return;
    if (!confirm('Delete this file from Google Drive? This cannot be undone.')) return;
    setDeletingId(fileId);
    try {
      const res = await onDelete(fileId);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        alert('Delete failed: ' + (res.error || 'Unknown error'));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = await onRefresh();
      setFiles(updated);
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ImageIcon size={24} color="#8ab4f8" />
            Central Media Library
          </h1>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Browse, upload, and manage all chapter media — backed by Google Drive
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
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: '0.4rem 0.85rem', background: viewMode === v ? 'rgba(66,133,244,0.2)' : 'transparent', border: 'none', color: viewMode === v ? '#8ab4f8' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: viewMode === v ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s' }}>
                {v === 'grid' ? '⊞ Grid' : '☰ List'}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            id="media-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.45rem 0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>

          {folderUrl && (
            <a href={folderUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(52,168,83,0.1)', border: '1px solid rgba(52,168,83,0.3)', borderRadius: '8px', padding: '0.45rem 0.85rem', color: '#81c995', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
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
            border: `2px dashed ${isDragging ? 'rgba(66,133,244,0.7)' : 'rgba(255,255,255,0.1)'}`,
            background: isDragging ? 'rgba(66,133,244,0.06)' : 'transparent',
            borderRadius: '14px',
            transition: 'all 0.2s',
          }}
        >
          {uploadingFile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <File size={16} color="#8ab4f8" />
                  {uploadingFile.name}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({formatFileSize(uploadingFile.size)})</span>
                </div>
                <select
                  value={uploadDept}
                  onChange={(e) => setUploadDept(e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', padding: '0.3rem 0.6rem', fontSize: '0.8rem', width: '100%', maxWidth: '260px' }}
                >
                  <option value="">General Media Library</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name} Media</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {uploadStatus === 'success' && <CheckCircle2 size={18} color="#34A853" />}
                {uploadStatus === 'error' && <AlertCircle size={18} color="#EA4335" />}
                <button
                  id="media-upload-confirm-btn"
                  onClick={handleUpload}
                  disabled={uploadStatus === 'uploading'}
                  style={{ background: 'var(--google-blue)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Upload size={14} />
                  {uploadStatus === 'uploading' ? 'Uploading…' : uploadStatus === 'success' ? 'Done!' : 'Upload to Drive'}
                </button>
                <button onClick={() => { setUploadingFile(null); setUploadStatus('idle'); setUploadError(''); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <X size={14} />
                </button>
              </div>
              {uploadError && <div style={{ width: '100%', color: '#EA4335', fontSize: '0.8rem', marginTop: '0.25rem' }}>{uploadError}</div>}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={20} color="#8ab4f8" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>Drop files here or click to upload</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Images, videos, documents, and more — stored in Google Drive</div>
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.35)', borderRadius: '9px', padding: '0.5rem 1rem', color: '#8ab4f8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                <Upload size={14} />
                Choose File
                <input type="file" accept="*/*" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
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
            style={{ width: '100%', paddingLeft: '32px', paddingRight: '10px', paddingTop: '0.35rem', paddingBottom: '0.35rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', fontSize: '0.82rem', boxSizing: 'border-box' }}
          />
        </div>

        <Filter size={14} color="var(--text-muted)" />

        <select
          id="media-type-filter"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', padding: '0.35rem 0.65rem', fontSize: '0.82rem', cursor: 'pointer' }}
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
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '7px', color: 'var(--text-primary)', padding: '0.35rem 0.65rem', fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <option value="all">All Committees</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {filtered.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            const color = getFileColor(file.mimeType);
            const isImg = file.mimeType.startsWith('image/');
            return (
              <div
                key={file.id}
                className="glass-panel"
                style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', position: 'relative', transition: 'all 0.15s' }}
              >
                {/* Preview thumbnail or icon */}
                <div style={{ width: '100%', height: '100px', borderRadius: '10px', background: `rgba(${color.includes('4285') ? '66,133,244' : '154,160,166'},0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {isImg && file.url ? (
                    <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <FileIcon size={36} color={color} />
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.15rem' }} title={file.name}>
                    {file.name}
                  </div>
                  {file.entityLabel && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.entityLabel}</div>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{formatFileSize(file.size)}</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    title="View file"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.35rem', borderRadius: '7px', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.25)', color: '#8ab4f8', textDecoration: 'none', fontWeight: 600 }}
                  >
                    <Eye size={13} /> View
                  </a>
                  <a
                    href={file.downloadUrl || file.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem 0.5rem', borderRadius: '7px', background: 'rgba(52,168,83,0.1)', border: '1px solid rgba(52,168,83,0.25)', color: '#81c995', textDecoration: 'none' }}
                  >
                    <Download size={13} />
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="Delete"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem 0.5rem', borderRadius: '7px', background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.25)', color: '#f28b82', cursor: 'pointer' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            const color = getFileColor(file.mimeType);
            return (
              <div
                key={file.id}
                className="glass-panel"
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.1rem' }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileIcon size={18} color={color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.15rem' }}>
                    {file.entityLabel && <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{file.entityLabel}</span>}
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</span>
                    {file.dateCreated && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        <Clock size={10} /> {new Date(file.dateCreated).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <a href={file.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.35rem 0.7rem', borderRadius: '7px', background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.25)', color: '#8ab4f8', textDecoration: 'none', fontWeight: 600 }}>
                    <Eye size={13} /> View
                  </a>
                  <a href={file.downloadUrl || file.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(52,168,83,0.1)', border: '1px solid rgba(52,168,83,0.25)', color: '#81c995', textDecoration: 'none' }}>
                    <Download size={13} />
                  </a>
                  {canDelete && (
                    <button onClick={() => handleDelete(file.id)} disabled={deletingId === file.id} style={{ display: 'flex', alignItems: 'center', padding: '0.35rem 0.55rem', borderRadius: '7px', background: 'rgba(234,67,53,0.1)', border: '1px solid rgba(234,67,53,0.25)', color: '#f28b82', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
