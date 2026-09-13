import React from 'react';
import { 
  Image as ImageIcon, 
  Search, 
  RefreshCw, 
  FolderOpen, 
  Upload, 
  FileText, 
  Film, 
  Archive, 
  Music 
} from 'lucide-react';

export function MediaLibrarySkeleton() {
  const categoryPills = [
    { label: 'All Files', count: '' },
    { label: 'Images', count: '' },
    { label: 'Videos', count: '' },
    { label: 'Documents', count: '' },
    { label: 'Archives', count: '' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Header - exact match */}
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
          {/* Stats pill */}
          <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', gap: '1.25rem' }}>
            <div className="skeleton-pulse" style={{ height: '14px', width: '55px', borderRadius: '4px' }} />
            <div className="skeleton-pulse" style={{ height: '14px', width: '65px', borderRadius: '4px' }} />
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '0.4rem 0.85rem', background: 'rgba(66,133,244,0.2)', color: '#8ab4f8', fontSize: '0.8rem', fontWeight: 700 }}>
              ⊞ Grid
            </div>
            <div style={{ padding: '0.4rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              ☰ List
            </div>
          </div>

          {/* Refresh Button */}
          <div
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </div>

          {/* Drive Folder Button */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(52,168,83,0.1)',
              border: '1px solid rgba(52,168,83,0.3)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem',
              color: '#86EFAC',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <FolderOpen size={14} />
            <span>Drive Folder</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <div
              className="input-field"
              style={{ paddingLeft: '2.4rem', height: '40px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}
            >
              <span style={{ opacity: 0.6 }}>Search media by filename, department, or event...</span>
            </div>
          </div>

          {/* Department Filter dropdown */}
          <div className="input-field" style={{ height: '40px', minWidth: '180px', display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            All Locations
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {categoryPills.map((pill, idx) => (
            <div
              key={idx}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '999px',
                background: idx === 0 ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${idx === 0 ? 'rgba(66, 133, 244, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                color: idx === 0 ? '#93C5FD' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {pill.label}
            </div>
          ))}
        </div>
      </div>

      {/* Media Cards Grid - exact match */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
          const FileIcon = idx % 3 === 0 ? Film : idx % 2 === 0 ? FileText : ImageIcon;
          const iconColor = idx % 3 === 0 ? '#C084FC' : idx % 2 === 0 ? '#EA4335' : '#8ab4f8';
          return (
            <div
              key={idx}
              className="glass-panel"
              style={{
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Thumbnail Area */}
              <div
                style={{
                  height: '140px',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <FileIcon size={36} color={iconColor} style={{ opacity: 0.7 }} />
                <div className="skeleton-pulse" style={{ height: '10px', width: '45px', borderRadius: '4px' }} />
              </div>

              {/* Card Meta */}
              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="skeleton-pulse" style={{ height: '14px', width: '85%', borderRadius: '4px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="skeleton-pulse" style={{ height: '11px', width: '45px', borderRadius: '4px' }} />
                  <div className="skeleton-pulse" style={{ height: '11px', width: '60px', borderRadius: '4px' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
