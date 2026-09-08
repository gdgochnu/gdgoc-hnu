'use client';

import React, { useState, useTransition } from 'react';
import {
  Camera,
  Video,
  FileText,
  FolderOpen,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Eye,
  Clock,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Film,
  Mic,
  Share2,
} from 'lucide-react';
import {
  CoverageItem,
  EventCoverageSummary,
  toggleCoverageItem,
  addCoverageItem,
  deleteCoverageItem,
  uploadCoverageFile,
} from '@/app/events/coverage-actions';

interface EventMediaCoverageProps {
  eventId: string;
  eventTitle: string;
  initialCoverage: EventCoverageSummary;
  availableMembers?: { id: string; full_name: string }[];
  canManage: boolean;
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'photo':
      return Camera;
    case 'video':
      return Video;
    case 'speaker_asset':
      return Mic;
    case 'recap':
      return Share2;
    default:
      return ImageIcon;
  }
}

function getCategoryColor(cat: string) {
  switch (cat) {
    case 'photo':
      return '#8ab4f8';
    case 'video':
      return '#C084FC';
    case 'speaker_asset':
      return '#34A853';
    case 'recap':
      return '#FBBC04';
    default:
      return '#9AA0A6';
  }
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

export function EventMediaCoverage({
  eventId,
  eventTitle,
  initialCoverage,
  availableMembers = [],
  canManage,
}: EventMediaCoverageProps) {
  const [items, setItems] = useState<CoverageItem[]>(initialCoverage.items);
  const [folderUrl, setFolderUrl] = useState<string | undefined>(initialCoverage.folderUrl);
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'before' | 'during' | 'after'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'photo' | 'video' | 'speaker_asset' | 'recap'>('photo');
  const [newPhase, setNewPhase] = useState<'before' | 'during' | 'after'>('during');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload state & progress per item
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    itemId: string;
    percent: number;
    speed: number;
    transferred: number;
    total: number;
    stage: string;
  } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle item
  const handleToggle = async (item: CoverageItem) => {
    const nextStatus = !item.is_completed;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, is_completed: nextStatus, completed_at: nextStatus ? new Date().toISOString() : null } : i
      )
    );

    const res = await toggleCoverageItem(item.id, nextStatus);
    if (!res.success) {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_completed: item.is_completed } : i))
      );
      showToast('error', res.error || 'Failed to update item');
    } else {
      showToast('success', nextStatus ? 'Shot marked as captured!' : 'Shot uncompleted');
    }
  };

  // Delete item
  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this shot checklist item?')) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    const res = await deleteCoverageItem(itemId);
    if (!res.success) {
      showToast('error', res.error || 'Failed to delete item');
    } else {
      showToast('success', 'Checklist item removed');
    }
  };

  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await addCoverageItem(eventId, {
        title: newTitle.trim(),
        category: newCategory,
        phase: newPhase,
        assignedTo: newAssignedTo || null,
        notes: newNotes.trim() || null,
      });

      if (res.success && res.item) {
        setItems((prev) => [...prev, res.item!]);
        setShowAddModal(false);
        setNewTitle('');
        setNewNotes('');
        setNewAssignedTo('');
        showToast('success', 'Coverage shot added');
      } else {
        showToast('error', res.error || 'Failed to add shot');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Upload media file to Drive /Media-Coverage/ folder for item
  const handleFileUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingItemId(itemId);
    setUploadProgress({
      itemId,
      percent: 0,
      speed: 0,
      transferred: 0,
      total: file.size,
      stage: 'Uploading…',
    });

    const startTime = Date.now();

    try {
      // 1. First attempt: Use XMLHttpRequest with multipart FormData for real-time progress & speed
      const formData = new FormData();
      formData.append('file', file);
      formData.append('itemId', itemId);
      formData.append('eventId', eventId);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speed = elapsedSec > 0.1 ? event.loaded / elapsedSec : 0;
          setUploadProgress({
            itemId,
            percent,
            speed,
            transferred: event.loaded,
            total: event.total,
            stage: percent < 100 ? 'Uploading to Drive…' : 'Finalizing & updating Drive…',
          });
        }
      };

      const result = await new Promise<{ success: boolean; data?: any; error?: string }>((resolve) => {
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.success) {
              resolve({ success: true, data });
            } else {
              resolve({ success: false, error: data.error || `Server status ${xhr.status}` });
            }
          } catch {
            resolve({ success: false, error: 'Malformed response' });
          }
        };
        xhr.onerror = () => resolve({ success: false, error: 'Network error' });
        xhr.open('POST', '/api/events/coverage/upload');
        xhr.send(formData);
      });

      if (result.success && result.data) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  is_completed: true,
                  drive_file_url: result.data.driveFileUrl || null,
                  thumbnail_url: result.data.thumbnailUrl || null,
                }
              : i
          )
        );
        showToast('success', `Uploaded "${file.name}" to Drive /Media-Coverage/!`);
        return;
      }

      // 2. Fallback: Server Action with configured 50MB body size limit
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');

      const res = await uploadCoverageFile(eventId, itemId, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data,
      });

      if (res.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  is_completed: true,
                  drive_file_url: res.driveFileUrl || null,
                  thumbnail_url: res.thumbnailUrl || null,
                }
              : i
          )
        );
        showToast('success', `Uploaded "${file.name}" to Drive /Media-Coverage/!`);
      } else {
        showToast('error', res.error || result.error || 'Upload to Drive failed');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Upload failed');
    } finally {
      setTimeout(() => {
        setUploadingItemId(null);
        setUploadProgress(null);
      }, 1000);
    }
  };

  // Filter items
  const filtered = items.filter((item) => {
    const matchPhase = phaseFilter === 'all' || item.phase === phaseFilter;
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchPhase && matchCat && matchSearch;
  });

  const total = items.length;
  const completedCount = items.filter((i) => i.is_completed).length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return (
    <div
      id="event-media-coverage-section"
      className="glass-panel"
      style={{
        padding: '2rem',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: toastMessage.type === 'success' ? 'rgba(52,168,83,0.95)' : 'rgba(234,67,53,0.95)',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toastMessage.text}
        </div>
      )}

      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Camera size={22} color="#8ab4f8" />
            Event Media Coverage
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Shot-list checklists & captured visual assets tied to Google Drive <code style={{ color: '#8ab4f8', background: 'rgba(66,133,244,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>/Media-Coverage/</code>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {folderUrl && (
            <a
              id="coverage-drive-folder-link"
              href={folderUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(52,168,83,0.12)',
                border: '1px solid rgba(52,168,83,0.3)',
                borderRadius: '8px',
                padding: '0.45rem 0.9rem',
                color: '#81c995',
                fontSize: '0.82rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <FolderOpen size={14} /> Open /Media-Coverage/ in Drive
            </a>
          )}

          {canManage && (
            <button
              id="add-coverage-shot-btn"
              onClick={() => setShowAddModal(true)}
              style={{
                background: 'var(--google-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Plus size={15} /> Add Shot
            </button>
          )}
        </div>
      </div>

      {/* Coverage Progress Card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="var(--google-yellow)" />
            <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Coverage Progress</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ({completedCount} of {total} shots completed)
            </span>
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: percentage === 100 ? '#81c995' : '#8ab4f8' }}>
            {percentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              borderRadius: '4px',
              background: 'linear-gradient(90deg, #4285F4, #34A853)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Categories breakdown */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>📸 <strong>{items.filter((i) => i.category === 'photo').length}</strong> Photos</span>
          <span>🎬 <strong>{items.filter((i) => i.category === 'video').length}</strong> Videos</span>
          <span>🎤 <strong>{items.filter((i) => i.category === 'speaker_asset').length}</strong> Speaker Assets</span>
          <span>📱 <strong>{items.filter((i) => i.category === 'recap').length}</strong> Recaps</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Phase Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
          {(['all', 'before', 'during', 'after'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPhaseFilter(p)}
              style={{
                padding: '0.35rem 0.8rem',
                border: 'none',
                background: phaseFilter === p ? 'rgba(66,133,244,0.2)' : 'transparent',
                color: phaseFilter === p ? '#8ab4f8' : 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: phaseFilter === p ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {p === 'all' ? 'All Phases' : p}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '0.35rem 0.65rem',
            fontSize: '0.8rem',
          }}
        >
          <option value="all">All Categories</option>
          <option value="photo">Photos</option>
          <option value="video">Videos</option>
          <option value="speaker_asset">Speaker Assets</option>
          <option value="recap">Recap & Stories</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search shots…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            marginLeft: 'auto',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            maxWidth: '220px',
          }}
        />
      </div>

      {/* Checklist Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No coverage items found for the selected filters.
          </div>
        ) : (
          filtered.map((item) => {
            const CatIcon = getCategoryIcon(item.category);
            const catColor = getCategoryColor(item.category);
            const isUploadingThis = uploadingItemId === item.id;

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  background: item.is_completed ? 'rgba(52,168,83,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${item.is_completed ? 'rgba(52,168,83,0.2)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Toggle Checkbox */}
                <button
                  onClick={() => handleToggle(item)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={item.is_completed ? 'Mark uncompleted' : 'Mark as captured'}
                >
                  {item.is_completed ? (
                    <CheckCircle2 size={20} color="#34A853" />
                  ) : (
                    <Circle size={20} color="var(--text-muted)" />
                  )}
                </button>

                {/* Category Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `rgba(${catColor.includes('4285') ? '66,133,244' : '154,160,166'},0.12)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CatIcon size={16} color={catColor} />
                </div>

                {/* Title & Metadata */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: item.is_completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: item.is_completed ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.2rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.phase}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: catColor }}>
                      {item.category.replace('_', ' ')}
                    </span>
                    {item.notes && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        • {item.notes}
                      </span>
                    )}
                  </div>

                  {/* Upload Progress Bar & Speed Indicator */}
                  {uploadProgress?.itemId === item.id && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(66, 133, 244, 0.3)',
                        borderRadius: '8px',
                        padding: '0.5rem 0.75rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: '#8ab4f8',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                          {uploadProgress.stage}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#34A853' }}>
                          ⚡ {formatSpeed(uploadProgress.speed)} • {formatFileSize(uploadProgress.transferred)} / {formatFileSize(uploadProgress.total)} ({uploadProgress.percent}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${uploadProgress.percent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4285F4, #34A853)',
                            transition: 'width 0.15s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Captured Evidence / Thumbnail */}
                {item.drive_file_url && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {item.thumbnail_url && (
                      <img
                        src={item.thumbnail_url}
                        alt="Captured Shot"
                        onClick={() => setPreviewImageUrl(item.thumbnail_url!)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                        }}
                        title="Click to zoom"
                      />
                    )}
                    <a
                      href={item.drive_file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.75rem',
                        color: '#8ab4f8',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        background: 'rgba(66,133,244,0.1)',
                        padding: '0.3rem 0.55rem',
                        borderRadius: '6px',
                      }}
                      title="View file in Google Drive"
                    >
                      <ExternalLink size={12} /> Drive File
                    </a>
                  </div>
                )}

                {/* Upload Action Button */}
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '7px',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: isUploadingThis ? 'not-allowed' : 'pointer',
                  }}
                  title="Upload photo/video to /Media-Coverage/ in Drive"
                >
                  {isUploadingThis ? (
                    <>
                      <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={12} /> {item.drive_file_url ? 'Replace' : 'Upload'}
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    disabled={isUploadingThis}
                    onChange={(e) => handleFileUpload(item.id, e)}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Delete Button */}
                {canManage && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete shot"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Shot Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--google-blue)" /> Add Coverage Shot Item
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Shot Title / Description:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Keynote Speaker with audience backdrop"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Category:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="speaker_asset">Speaker Asset</option>
                    <option value="recap">Recap & Story</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Phase:
                  </label>
                  <select
                    value={newPhase}
                    onChange={(e) => setNewPhase(e.target.value as any)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="before">Before Event</option>
                    <option value="during">During Event</option>
                    <option value="after">After Event</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Notes / Shot Instructions (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Use 50mm lens, capture raw format"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: 'var(--google-blue)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.45rem 1.25rem',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Adding…' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {previewImageUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
          onClick={() => setPreviewImageUrl(null)}
        >
          <img
            src={previewImageUrl}
            alt="Zoomed Shot"
            style={{
              maxWidth: '90vw',
              maxHeight: '85vh',
              borderRadius: '12px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}
          />
        </div>
      )}
    </div>
  );
}
