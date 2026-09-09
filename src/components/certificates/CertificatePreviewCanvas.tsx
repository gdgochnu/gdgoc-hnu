'use client';

import React, { useRef, useEffect, useState } from 'react';
import { QrCode } from 'lucide-react';
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

/**
 * Converts a stored fontSize (PDF points, relative to 842pt wide page)
 * to screen pixels based on the actual canvas container width.
 */
function pdfPxToScreenPx(pdfFontSize: number, containerWidth: number): number {
  return Math.max(8, (pdfFontSize / PDF_WIDTH) * containerWidth);
}

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
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState<number>(700); // SSR-safe default

  useEffect(() => {
    if (!canvasRef.current) return;
    const update = () => {
      if (canvasRef.current) {
        setCanvasWidth(canvasRef.current.offsetWidth);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  // Helper: scale PDF fontSize to screen px
  const fs = (pdfSize?: number, fallback = 14) =>
    pdfPxToScreenPx(pdfSize ?? fallback, canvasWidth);

  // QR size in screen pixels
  const qrPdfSize = fieldLayout?.qr_code?.fontSize ?? 60;
  const qrScreenSize = Math.max(36, (qrPdfSize / PDF_WIDTH) * canvasWidth);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${PDF_WIDTH} / ${PDF_HEIGHT}`,
        borderRadius: '16px',
        overflow: 'hidden',
        background: templateBg
          ? `url(${templateBg}) center/cover no-repeat`
          : 'linear-gradient(135deg, #0b1120 0%, #1e293b 50%, #0b1120 100%)',
        border: '2px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
        userSelect: 'none',
      }}
    >
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
            <div style={{ fontSize: fs(10), fontWeight: 900, letterSpacing: '0.08em', color: '#fff' }}>
              GOOGLE DEVELOPER GROUPS ON CAMPUS
            </div>
            <div style={{ fontSize: fs(8), fontWeight: 700, color: 'var(--google-yellow)' }}>
              HELWAN UNIVERSITY
            </div>
          </div>
          <div style={{ textAlign: 'center', opacity: 0.12, fontSize: fs(36), fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>
            CERTIFICATE
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: fs(8), color: 'rgba(255,255,255,0.4)' }}>
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
            fontSize: `${fs(fieldLayout?.recipient_name?.fontSize, 28)}px`,
            fontWeight: fieldLayout?.recipient_name?.fontWeight === 'black' ? 900 : fieldLayout?.recipient_name?.fontWeight === 'bold' ? 700 : 900,
            color: fieldLayout?.recipient_name?.color || '#ffffff',
            textAlign: fieldLayout?.recipient_name?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
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
            fontSize: `${fs(fieldLayout?.title?.fontSize, 18)}px`,
            fontWeight: fieldLayout?.title?.fontWeight === 'black' ? 900 : fieldLayout?.title?.fontWeight === 'bold' ? 700 : 800,
            color: fieldLayout?.title?.color || '#38bdf8',
            textAlign: fieldLayout?.title?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
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
            fontSize: `${fs(fieldLayout?.issue_date?.fontSize, 12)}px`,
            fontWeight: fieldLayout?.issue_date?.fontWeight === 'bold' ? 700 : 600,
            color: fieldLayout?.issue_date?.color || '#ffffff',
            textAlign: fieldLayout?.issue_date?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
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
            fontSize: `${fs(fieldLayout?.certificate_number?.fontSize, 11)}px`,
            fontWeight: fieldLayout?.certificate_number?.fontWeight === 'bold' ? 700 : 700,
            fontFamily: 'monospace',
            color: fieldLayout?.certificate_number?.color || '#cbd5e1',
            background: 'rgba(0, 0, 0, 0.45)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: fieldLayout?.certificate_number?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
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
            fontSize: `${fs(fieldLayout?.issuer_name?.fontSize, 12)}px`,
            fontWeight: fieldLayout?.issuer_name?.fontWeight === 'bold' ? 700 : 700,
            color: fieldLayout?.issuer_name?.color || '#ffffff',
            textAlign: fieldLayout?.issuer_name?.align || 'center',
            whiteSpace: 'nowrap',
            zIndex: 10,
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <div
            style={{
              width: `${qrScreenSize}px`,
              height: `${qrScreenSize}px`,
              background: '#ffffff',
              borderRadius: '6px',
              padding: '3px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            }}
          >
            <img src={qrCodeDataUrl} alt="Verify QR" style={{ width: '100%', height: '100%' }} />
          </div>
          <span style={{ fontSize: `${fs(6)}px`, color: '#94a3b8', fontWeight: 600 }}>
            Scan to Verify
          </span>
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
                fontSize: `${fs(f!.fontSize, 14)}px`,
                fontWeight: f!.fontWeight === 'black' ? 900 : f!.fontWeight === 'bold' ? 700 : 600,
                color: f!.color || '#ffffff',
                textAlign: f!.align || 'center',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              {f!.sampleText || k}
            </div>
          ))}
    </div>
  );
}
