'use client';

import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { QrCode, Maximize2, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import type { CertificateFieldLayout } from '@/types/certificates';

interface CertificatePreviewCanvasProps {
  recipientName: string;
  title: string;
  formattedDate: string;
  certificateNumber: string;
  issuerName: string;
  eventTitle: string | null;
  fieldLayout: CertificateFieldLayout | null;
  templateBg: string | null;
  qrCodeDataUrl: string;
}

const PDF_WIDTH = 842;
const PDF_HEIGHT = 595;

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function CertificatePreviewCanvas({
  recipientName,
  title,
  formattedDate,
  certificateNumber,
  issuerName,
  eventTitle,
  fieldLayout,
  templateBg,
  qrCodeDataUrl,
}: CertificatePreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [modalZoom, setModalZoom] = useState<number>(1);

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        if (width > 0) {
          setScale(width / PDF_WIDTH);
          setIsMounted(true);
        }
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(containerRef.current);
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const qrPdfSize = fieldLayout?.qr_code?.fontSize ?? 85;

  const renderContent = () => (
    <>
      {/* Fallback frame watermark if no custom background image */}
      {!templateBg && (
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
            <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
              GOOGLE DEVELOPER GROUPS ON CAMPUS
            </div>
            <div style={{ fontSize: '8px', fontWeight: 700, color: 'var(--google-yellow)' }}>
              HELWAN NATIONAL UNIVERSITY
            </div>
          </div>
          <div style={{ textAlign: 'center', opacity: 0.12, fontSize: '36px', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>
            CERTIFICATE
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(255,255,255,0.4)' }}>
            <span>OFFICIAL VERIFIED CREDENTIAL</span>
            <span>HELWAN, CAIRO, EGYPT</span>
          </div>
        </div>
      )}

      {/* 1. Recipient Name */}
      {(!fieldLayout || fieldLayout.recipient_name?.visible !== false) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.recipient_name?.x ?? 50}%`,
            top: `${fieldLayout?.recipient_name?.y ?? 48}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${fieldLayout?.recipient_name?.fontSize || 28}px`,
            fontWeight:
              fieldLayout?.recipient_name?.fontWeight === 'black'
                ? 900
                : fieldLayout?.recipient_name?.fontWeight === 'bold'
                ? 700
                : 900,
            color: fieldLayout?.recipient_name?.color || '#ffffff',
            textAlign: fieldLayout?.recipient_name?.align || 'center',
            whiteSpace: 'nowrap',
            maxWidth: '92%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 10,
            textShadow: fieldLayout?.recipient_name?.shadow ? '0 2px 10px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {recipientName}
        </div>
      )}

      {/* 2. Certificate Title */}
      {(!fieldLayout || fieldLayout.title?.visible !== false) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.title?.x ?? 50}%`,
            top: `${fieldLayout?.title?.y ?? 38}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${fieldLayout?.title?.fontSize || 18}px`,
            fontWeight:
              fieldLayout?.title?.fontWeight === 'black'
                ? 900
                : fieldLayout?.title?.fontWeight === 'bold'
                ? 700
                : 800,
            color: fieldLayout?.title?.color || '#38bdf8',
            textAlign: fieldLayout?.title?.align || 'center',
            whiteSpace: 'nowrap',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textShadow: fieldLayout?.title?.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {title}
        </div>
      )}

      {/* 3. Issue Date */}
      {(!fieldLayout || fieldLayout.issue_date?.visible !== false) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.issue_date?.x ?? 22}%`,
            top: `${fieldLayout?.issue_date?.y ?? 82}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${fieldLayout?.issue_date?.fontSize || 12}px`,
            fontWeight: fieldLayout?.issue_date?.fontWeight === 'bold' ? 700 : 600,
            color: fieldLayout?.issue_date?.color || '#ffffff',
            textAlign: fieldLayout?.issue_date?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
            textShadow: fieldLayout?.issue_date?.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {formattedDate}
        </div>
      )}

      {/* 4. Certificate Number */}
      {(!fieldLayout || fieldLayout.certificate_number?.visible !== false) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.certificate_number?.x ?? 82}%`,
            top: `${fieldLayout?.certificate_number?.y ?? 15}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${fieldLayout?.certificate_number?.fontSize || 11}px`,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: fieldLayout?.certificate_number?.color || '#cbd5e1',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '3px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: fieldLayout?.certificate_number?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
            textShadow: fieldLayout?.certificate_number?.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {certificateNumber}
        </div>
      )}

      {/* 5. Issuer Sign-off */}
      {(!fieldLayout || (fieldLayout.issuer_name && fieldLayout.issuer_name.visible !== false)) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.issuer_name?.x ?? 50}%`,
            top: `${fieldLayout?.issuer_name?.y ?? 82}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${fieldLayout?.issuer_name?.fontSize || 12}px`,
            fontWeight: 700,
            color: fieldLayout?.issuer_name?.color || '#ffffff',
            textAlign: fieldLayout?.issuer_name?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
            textShadow: fieldLayout?.issuer_name?.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {issuerName || fieldLayout?.issuer_name?.sampleText || 'Chapter Leadership'}
        </div>
      )}

      {/* 6. QR Code */}
      {qrCodeDataUrl && (!fieldLayout || fieldLayout.qr_code?.visible !== false) && (
        <div
          style={{
            position: 'absolute',
            left: `${fieldLayout?.qr_code?.x ?? 82}%`,
            top: `${fieldLayout?.qr_code?.y ?? 76}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 15,
          }}
        >
          <img
            src={qrCodeDataUrl}
            alt="Verify QR"
            style={{
              width: `${qrPdfSize}px`,
              height: `${qrPdfSize}px`,
              display: 'block',
              filter: fieldLayout?.qr_code?.shadow ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' : 'none',
            }}
          />
        </div>
      )}

      {/* 7. Custom Added Elements */}
      {fieldLayout &&
        Object.entries(fieldLayout)
          .filter(
            ([k, v]) =>
              ![
                'recipient_name',
                'title',
                'issue_date',
                'certificate_number',
                'issuer_name',
                'qr_code',
                'signature_image',
              ].includes(k) &&
              v &&
              v.visible !== false
          )
          .map(([k, f]) => (
            <div
              key={k}
              style={{
                position: 'absolute',
                left: `${f!.x}%`,
                top: `${f!.y}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${f!.fontSize || 14}px`,
                fontWeight: f!.fontWeight === 'black' ? 900 : f!.fontWeight === 'bold' ? 700 : 600,
                color: f!.color || '#ffffff',
                textAlign: f!.align || 'center',
                whiteSpace: 'nowrap',
                zIndex: 10,
                textShadow: f!.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
              }}
            >
              {f!.sampleText || k}
            </div>
          ))}
    </>
  );

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: `${PDF_WIDTH} / ${PDF_HEIGHT}`,
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#080c14',
          border: '2px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
          userSelect: 'none',
        }}
      >
        {/* Floating Zoom / Inspect Button */}
        <button
          onClick={() => {
            setModalZoom(1);
            setIsFullscreen(true);
          }}
          type="button"
          aria-label="Inspect certificate fullscreen"
          title="عرض مكبّر للشهادة • Inspect / Zoom"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 30,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f8fafc',
            borderRadius: '8px',
            padding: '5px 9px',
            fontSize: '0.72rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            transition: 'background 0.15s ease, transform 0.15s ease',
          }}
        >
          <Maximize2 size={13} color="#60a5fa" />
          <span>Zoom</span>
        </button>

        {/* Scaled High-Res Live Canvas */}
        <div
          id="certificate-preview-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${PDF_WIDTH}px`,
            height: `${PDF_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: templateBg
              ? `url(${templateBg}) center/cover no-repeat`
              : 'linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0b1120 100%)',
            userSelect: 'none',
            opacity: isMounted ? 1 : 0.01,
            transition: 'opacity 0.15s ease',
          }}
        >
          {renderContent()}
        </div>
      </div>

      {/* Fullscreen / Inspection Modal */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 8, 16, 0.94)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFullscreen(false);
          }}
        >
          {/* Controls Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '860px',
              marginBottom: '0.75rem',
              color: '#fff',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>Certificate Inspection</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>• تفاصيل الشهادة بدقة كاملة</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', minWidth: '42px', textAlign: 'center' }}>
                {Math.round(modalZoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setModalZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={() => setModalZoom(1)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                title="Reset Zoom"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                style={{
                  background: 'rgba(234, 67, 53, 0.2)',
                  border: '1px solid rgba(234, 67, 53, 0.4)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  marginLeft: '8px',
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Viewport */}
          <div
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: 'calc(100vh - 120px)',
              overflow: 'auto',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#000',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                width: `${PDF_WIDTH * modalZoom}px`,
                height: `${PDF_HEIGHT * modalZoom}px`,
                position: 'relative',
                flexShrink: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${PDF_WIDTH}px`,
                  height: `${PDF_HEIGHT}px`,
                  transform: `scale(${modalZoom})`,
                  transformOrigin: 'top left',
                  background: templateBg
                    ? `url(${templateBg}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0b1120 100%)',
                  userSelect: 'none',
                }}
              >
                {renderContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
