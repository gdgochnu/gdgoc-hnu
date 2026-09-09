'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Save,
  Upload,
  Type,
  Move,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Calendar,
  Award,
  Hash,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Sliders,
  Image as ImageIcon,
} from 'lucide-react';
import {
  CertificateTemplate,
  CertificateFieldLayout,
  FieldPosition,
  DEFAULT_FIELD_LAYOUT,
} from '@/types/certificates';
import { saveCertificateTemplateAction } from '@/lib/certificates/template-actions';

interface TemplateBuilderProps {
  initialTemplate?: CertificateTemplate;
  onSaved?: (template: CertificateTemplate) => void;
  canEdit?: boolean;
}

interface CustomFieldMeta {
  key: string;
  label: string;
  isCustom?: boolean;
}

export function TemplateBuilder({
  initialTemplate,
  onSaved,
  canEdit = true,
}: TemplateBuilderProps) {
  const [templateName, setTemplateName] = useState(
    initialTemplate?.name || 'Official Workshop Completion Certificate'
  );

  // Background state — initialized from saved file/URL
  const savedBg =
    initialTemplate?.background_image_drive_file_id ||
    initialTemplate?.background_image_url ||
    null;
  const [backgroundDriveId, setBackgroundDriveId] = useState<string>(savedBg || '');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(savedBg);

  const [layout, setLayout] = useState<CertificateFieldLayout>(
    initialTemplate?.field_layout || DEFAULT_FIELD_LAYOUT
  );

  const [selectedField, setSelectedField] = useState<string>('recipient_name');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFieldKey, setDraggedFieldKey] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // New Custom Element modal/input state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  // Handle updates to any field's properties
  const handleFieldChange = (
    fieldKey: string,
    updates: Partial<FieldPosition>
  ) => {
    setLayout((prev) => ({
      ...prev,
      [fieldKey]: {
        ...(prev[fieldKey] || {
          x: 50,
          y: 50,
          fontSize: 14,
          color: '#ffffff',
          align: 'center',
          visible: true,
          sampleText: 'Custom Field',
        }),
        ...updates,
      },
    }));
  };

  // Upload background image: reads base64 and updates both preview and persistence ID
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatusMsg({ type: 'error', text: 'Image size exceeds 5MB limit. Please upload a smaller image.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBackgroundImageUrl(dataUrl);
        setBackgroundDriveId(dataUrl);
        setStatusMsg({ type: 'success', text: 'Background image uploaded! Remember to click "Save Template" to persist.' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    setBackgroundImageUrl(null);
    setBackgroundDriveId('');
  };

  // Drag and Drop implementation
  const handleMouseDownOnField = (fieldKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedField(fieldKey);
    setDraggedFieldKey(fieldKey);
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !draggedFieldKey || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const xPx = e.clientX - rect.left;
      const yPx = e.clientY - rect.top;

      const xPct = Math.min(96, Math.max(4, Math.round((xPx / rect.width) * 100)));
      const yPct = Math.min(96, Math.max(4, Math.round((yPx / rect.height) * 100)));

      handleFieldChange(draggedFieldKey, { x: xPct, y: yPct });
    },
    [isDragging, draggedFieldKey]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDraggedFieldKey(null);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add a new custom text element
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const safeKey = `custom_${newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    setLayout((prev) => ({
      ...prev,
      [safeKey]: {
        x: 50,
        y: 60,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        align: 'center',
        visible: true,
        sampleText: newFieldLabel.trim(),
      },
    }));

    setSelectedField(safeKey);
    setNewFieldLabel('');
    setIsAddingField(false);
  };

  const handleDeleteField = (fieldKey: string) => {
    setLayout((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    setSelectedField('recipient_name');
  };

  // Save template
  const handleSave = async () => {
    if (!templateName.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter a template name.' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await saveCertificateTemplateAction({
        id: initialTemplate?.id,
        name: templateName.trim(),
        backgroundImageDriveFileId: backgroundDriveId.trim() || backgroundImageUrl || null,
        fieldLayout: layout,
      });

      if (res.success && res.template) {
        setStatusMsg({
          type: 'success',
          text: `Template "${res.template.name}" and background saved successfully!`,
        });
        if (onSaved) onSaved(res.template);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to save template' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Standard fields catalog
  const standardFields: Array<{ key: string; label: string; icon: any }> = [
    { key: 'recipient_name', label: 'Recipient Name', icon: Type },
    { key: 'title', label: 'Certificate Title', icon: Award },
    { key: 'issue_date', label: 'Issue Date', icon: Calendar },
    { key: 'certificate_number', label: 'Serial Number', icon: Hash },
    { key: 'qr_code', label: 'Verification QR', icon: QrCode },
    { key: 'issuer_name', label: 'Issuer Sign-off', icon: Sparkles },
  ];

  // Derive all active fields (standard + custom)
  const standardKeys = new Set(standardFields.map((f) => f.key));
  const customFieldKeys = Object.keys(layout).filter((k) => !standardKeys.has(k) && layout[k]);

  const allFieldList: Array<{ key: string; label: string; icon: any; isCustom: boolean }> = [
    ...standardFields.map((f) => ({ ...f, isCustom: false })),
    ...customFieldKeys.map((k) => ({
      key: k,
      label: layout[k]?.sampleText || k.replace(/^custom_/, '').replace(/_[0-9]+$/, ''),
      icon: Type,
      isCustom: true,
    })),
  ];

  const currentField = layout[selectedField] || layout.recipient_name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Top Controls Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(66, 133, 244, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--google-blue)',
            }}
          >
            <Award size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Flutter Bootcamp Completion Certificate"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 700,
                outline: 'none',
                padding: '0.2rem 0',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Upload Background Button */}
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              borderRadius: '10px',
              background: backgroundImageUrl ? 'rgba(52, 168, 83, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              border: backgroundImageUrl ? '1px solid rgba(52, 168, 83, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
              color: backgroundImageUrl ? '#86efac' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Upload size={15} />
            <span>{backgroundImageUrl ? 'Change Background' : 'Upload Background Image'}</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/svg+xml, image/webp"
              onChange={handleBackgroundUpload}
              style={{ display: 'none' }}
            />
          </label>

          {backgroundImageUrl && (
            <button
              onClick={handleRemoveBackground}
              title="Remove custom background"
              style={{
                padding: '0.65rem',
                borderRadius: '10px',
                background: 'rgba(234, 67, 53, 0.12)',
                border: '1px solid rgba(234, 67, 53, 0.3)',
                color: 'var(--google-red)',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={15} />
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              id="btn-save-template"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--google-blue), #1d4ed8)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: statusMsg.type === 'success' ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(52, 168, 83, 0.4)' : 'rgba(234, 67, 53, 0.4)'}`,
            color: statusMsg.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Workspace: Interactive Drag-and-Drop Canvas + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Certificate Preview Canvas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Move size={14} color="var(--google-blue)" />
              <span>Interactive Drag &amp; Drop Canvas</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
              💡 Click and drag any element on the certificate to move it
            </span>
          </div>

          <div
            ref={canvasRef}
            className="glass-panel"
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '842 / 595',
              borderRadius: '16px',
              overflow: 'hidden',
              background: backgroundImageUrl
                ? `url(${backgroundImageUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
              border: '2px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
              userSelect: 'none',
            }}
          >
            {/* If no custom image uploaded, render chapter border watermark */}
            {!backgroundImageUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: '16px',
                  border: '2px solid rgba(251, 188, 4, 0.25)',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
                    GOOGLE DEVELOPER GROUPS ON CAMPUS
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--google-yellow)' }}>
                    HELWAN UNIVERSITY
                  </div>
                </div>

                <div style={{ textAlign: 'center', opacity: 0.12, fontSize: '3rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>
                  CERTIFICATE
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>OFFICIAL VERIFIED CREDENTIAL</span>
                  <span>HELWAN, CAIRO, EGYPT</span>
                </div>
              </div>
            )}

            {/* Draggable Field Markers Placed Over Background */}
            {allFieldList.map(({ key, label }) => {
              const field = layout[key];
              if (!field || !field.visible) return null;
              const isSelected = selectedField === key;
              const isBeingDragged = isDragging && draggedFieldKey === key;

              return (
                <div
                  key={key}
                  onMouseDown={(e) => handleMouseDownOnField(key, e)}
                  style={{
                    position: 'absolute',
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: isBeingDragged ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '2px solid var(--google-blue)'
                      : '1px dashed rgba(255, 255, 255, 0.25)',
                    background: isSelected
                      ? 'rgba(66, 133, 244, 0.35)'
                      : 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(6px)',
                    textAlign: field.align,
                    zIndex: isSelected ? 30 : 10,
                    boxShadow: isSelected ? '0 0 15px rgba(66, 133, 244, 0.6)' : 'none',
                    transition: isBeingDragged ? 'none' : 'border 0.15s ease, box-shadow 0.15s ease',
                  }}
                  title={`Drag to reposition "${label}" (X: ${field.x}%, Y: ${field.y}%)`}
                >
                  {/* Position Badge indicator when selected */}
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--google-blue)',
                        color: '#fff',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {label} ({field.x}%, {field.y}%)
                    </div>
                  )}

                  {key === 'qr_code' ? (
                    <div
                      style={{
                        width: `${field.fontSize || 54}px`,
                        height: `${field.fontSize || 54}px`,
                        background: '#ffffff',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                      }}
                    >
                      <QrCode size={Math.floor((field.fontSize || 54) * 0.75)} />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: `${Math.max(10, Math.floor(field.fontSize * 0.85))}px`,
                        fontWeight: field.fontWeight === 'bold' ? 800 : field.fontWeight === 'black' ? 900 : 500,
                        color: field.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {field.sampleText || label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Field Editor Sidebar */}
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          {/* Element Selector & Add Button */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Certificate Elements
              </span>
              <button
                onClick={() => setIsAddingField(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  background: 'rgba(52, 168, 83, 0.15)',
                  border: '1px solid rgba(52, 168, 83, 0.3)',
                  color: '#86efac',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Plus size={12} />
                <span>Add Element</span>
              </button>
            </div>

            {/* Add Custom Element Input Inline */}
            {isAddingField && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <input
                  type="text"
                  placeholder="e.g. Dean Signature, Special Honors"
                  value={newFieldLabel}
                  onChange={(e) => setNewFieldLabel(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#1a1d2e',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleAddCustomField}
                    style={{
                      flex: 1,
                      padding: '0.35rem',
                      borderRadius: '6px',
                      background: 'var(--google-green)',
                      color: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setIsAddingField(false); setNewFieldLabel(''); }}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.08)',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Element Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
              {allFieldList.map(({ key, label, icon: Icon, isCustom }) => {
                const isSelected = selectedField === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedField(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 0.6rem',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--google-blue)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? 'rgba(66, 133, 244, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Icon size={13} color={isSelected ? 'var(--google-blue)' : 'currentColor'} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls for current field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>
                {allFieldList.find((f) => f.key === selectedField)?.label || selectedField}
              </strong>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={currentField?.visible ?? true}
                    onChange={(e) => handleFieldChange(selectedField, { visible: e.target.checked })}
                  />
                  <span>Visible</span>
                </label>

                {allFieldList.find((f) => f.key === selectedField)?.isCustom && (
                  <button
                    onClick={() => handleDeleteField(selectedField)}
                    title="Delete this custom field"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--google-red)',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Position X */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Horizontal X Position</span>
                <strong style={{ color: '#fff' }}>{currentField?.x || 50}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={currentField?.x || 50}
                onChange={(e) => handleFieldChange(selectedField, { x: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--google-blue)', marginTop: '0.3rem' }}
              />
            </div>

            {/* Position Y */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Vertical Y Position</span>
                <strong style={{ color: '#fff' }}>{currentField?.y || 50}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={currentField?.y || 50}
                onChange={(e) => handleFieldChange(selectedField, { y: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--google-blue)', marginTop: '0.3rem' }}
              />
            </div>

            {/* Font / Box Size */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{selectedField === 'qr_code' ? 'QR Code Size' : 'Font Size'}</span>
                <strong style={{ color: '#fff' }}>{currentField?.fontSize || 16}px</strong>
              </div>
              <input
                type="range"
                min="10"
                max="72"
                value={currentField?.fontSize || 16}
                onChange={(e) => handleFieldChange(selectedField, { fontSize: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--google-blue)', marginTop: '0.3rem' }}
              />
            </div>

            {/* Color Picker & Weight */}
            {selectedField !== 'qr_code' && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Color
                  </label>
                  <input
                    type="color"
                    value={currentField?.color || '#ffffff'}
                    onChange={(e) => handleFieldChange(selectedField, { color: e.target.value })}
                    style={{ width: '100%', height: '34px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Weight
                  </label>
                  <select
                    value={currentField?.fontWeight || 'normal'}
                    onChange={(e) => handleFieldChange(selectedField, { fontWeight: e.target.value as any })}
                    style={{ width: '100%', height: '34px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1a1d2e', color: '#fff', fontSize: '0.78rem', padding: '0 0.5rem' }}
                  >
                    <option value="normal">Regular</option>
                    <option value="medium">Medium</option>
                    <option value="bold">Bold</option>
                    <option value="black">Heavy Black</option>
                  </select>
                </div>
              </div>
            )}

            {/* Sample Text */}
            {selectedField !== 'qr_code' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Preview Sample Text
                </label>
                <input
                  type="text"
                  value={currentField?.sampleText || ''}
                  onChange={(e) => handleFieldChange(selectedField, { sampleText: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '0.8rem',
                  }}
                />
              </div>
            )}

            {/* Reset Defaults button */}
            <button
              onClick={() => handleFieldChange(selectedField, DEFAULT_FIELD_LAYOUT[selectedField as keyof CertificateFieldLayout] || {})}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                justifyContent: 'center',
                padding: '0.45rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Field Placement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
