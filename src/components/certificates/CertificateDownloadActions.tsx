'use client';

import React, { useState } from 'react';
import { Download, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CertificateDownloadActionsProps {
  certificateId: string;
  certificateNumber: string;
  recipientName: string;
}

export function CertificateDownloadActions({
  certificateId,
  certificateNumber,
  recipientName,
}: CertificateDownloadActionsProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [pngSuccess, setPngSuccess] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Download Official PDF with live interactive progress state
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      setErrorMessage(null);

      const res = await fetch(`/api/certificates/${certificateId}/download`);
      if (!res.ok) {
        throw new Error('Failed to generate PDF from chapter registry.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${certificateNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err: any) {
      console.error('[DownloadPDF] error:', err);
      setErrorMessage(err.message || 'Error preparing PDF certificate');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // 2. Download High-Res PNG Image with live interactive progress state
  const handleDownloadPng = async () => {
    if (isDownloadingPng) return;
    try {
      setIsDownloadingPng(true);
      setErrorMessage(null);

      let downloaded = false;
      const canvasNode = document.getElementById('certificate-preview-canvas');

      if (canvasNode) {
        try {
          const { toBlob } = await import('html-to-image');
          const blob = await toBlob(canvasNode, {
            pixelRatio: 3, // 3x ultra-high-definition capture
            cacheBust: true,
          });

          if (blob && blob.size > 1000) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Certificate_${certificateNumber}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            downloaded = true;
          }
        } catch (captureErr) {
          console.warn('[DownloadPNG] client canvas capture warning, falling back to server render:', captureErr);
        }
      }

      if (!downloaded) {
        const res = await fetch(`/api/certificates/${certificateId}/image`);
        if (!res.ok) {
          throw new Error('Failed to render PNG certificate.');
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Certificate_${certificateNumber}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      setPngSuccess(true);
      setTimeout(() => setPngSuccess(false), 3000);
    } catch (err: any) {
      console.error('[DownloadPNG] error:', err);
      setErrorMessage(err.message || 'Error generating PNG image');
    } finally {
      setIsDownloadingPng(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Button 1: Download Official PDF */}
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloadingPdf}
          id="btn-download-verified-pdf"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.85rem 1.65rem',
            borderRadius: '12px',
            background: pdfSuccess
              ? 'linear-gradient(135deg, #34A853, #15803d)'
              : 'linear-gradient(135deg, #4285F4, #1d4ed8)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: isDownloadingPdf ? 'wait' : 'pointer',
            boxShadow: isDownloadingPdf
              ? '0 0 20px rgba(66, 133, 244, 0.6)'
              : '0 4px 14px rgba(66, 133, 244, 0.4)',
            transition: 'all 0.2s ease',
            opacity: isDownloadingPdf ? 0.9 : 1,
          }}
        >
          {isDownloadingPdf ? (
            <>
              <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Generating Official PDF...</span>
            </>
          ) : pdfSuccess ? (
            <>
              <CheckCircle2 size={18} />
              <span>PDF Downloaded!</span>
            </>
          ) : (
            <>
              <Download size={18} />
              <span>Download Official PDF</span>
            </>
          )}
        </button>

        {/* Button 2: Download as PNG Image */}
        <button
          onClick={handleDownloadPng}
          disabled={isDownloadingPng}
          id="btn-download-verified-png"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.85rem 1.65rem',
            borderRadius: '12px',
            background: pngSuccess
              ? 'linear-gradient(135deg, #34A853, #15803d)'
              : 'rgba(255, 255, 255, 0.07)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            cursor: isDownloadingPng ? 'wait' : 'pointer',
            boxShadow: isDownloadingPng
              ? '0 0 20px rgba(52, 168, 83, 0.5)'
              : '0 4px 14px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s ease',
            opacity: isDownloadingPng ? 0.9 : 1,
          }}
        >
          {isDownloadingPng ? (
            <>
              <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Rendering High-Res PNG...</span>
            </>
          ) : pngSuccess ? (
            <>
              <CheckCircle2 size={18} />
              <span>Image Downloaded!</span>
            </>
          ) : (
            <>
              <ImageIcon size={18} color="#34A853" />
              <span>Download as PNG Image</span>
            </>
          )}
        </button>
      </div>

      {/* Optional feedback message on error */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#f87171',
            fontSize: '0.82rem',
            marginTop: '0.25rem',
          }}
        >
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
