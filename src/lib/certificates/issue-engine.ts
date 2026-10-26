import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadFileToDrive } from '@/lib/drive/drive-client';
import { notifyCertificateIssued } from '@/lib/notifications/triggers';
import { CertificatePDFDocument, CertificateData } from './pdf-template';
import { generateStyledQRSVG } from './qr-generator';
import sharp from 'sharp';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';
import { getAppBaseUrl } from '@/lib/utils';
import type {
  CertificateTemplate,
  IssueCertificatesBatchInput,
  IssueCertificatesResult,
} from '@/types/certificates';

/**
 * GDGoC HNU OS — Certificate Issuing & Verification Engine (§4.14)
 */

export interface RenderCertificateInput {
  recipientName: string;
  recipientEmail: string;
  title: string;
  issueDate: string;
  certificateNumber: string;
  verificationCode: string;
  fieldLayout?: any;
  backgroundImageUrl?: string | null;
}

/**
 * Render a single certificate to a PDF Buffer
 */
export async function renderCertificatePDFBuffer(
  input: RenderCertificateInput
): Promise<{ buffer: Buffer; verifyUrl: string; qrCodeDataUrl: string }> {
  const baseUrl = getAppBaseUrl();
  // Use distinctive serial number in verifyUrl so QR code points directly to canonical serial
  const verifyUrl = `${baseUrl}/verify/${input.certificateNumber}`;

  // PNG so @react-pdf/renderer paints the center icon.svg mark
  const qrSvg = await generateStyledQRSVG(verifyUrl, 240);
  let qrCodeDataUrl: string;
  try {
    const pngBuffer = await sharp(Buffer.from(qrSvg), { density: 192 })
      .resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    qrCodeDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    console.warn('Fallback to SVG QR data URL:', err);
    qrCodeDataUrl = `data:image/svg+xml;base64,${Buffer.from(qrSvg, 'utf-8').toString('base64')}`;
  }


  const certData: CertificateData = {
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    title: input.title,
    issueDate: input.issueDate,
    certificateNumber: input.certificateNumber,
    verificationCode: input.verificationCode,
    verifyUrl,
    qrCodeDataUrl,
    backgroundImageUrl: input.backgroundImageUrl,
    fieldLayout: input.fieldLayout || DEFAULT_FIELD_LAYOUT,
  };

  const doc = React.createElement(CertificatePDFDocument, { data: certData });
  const uint8Buffer = await renderToBuffer(doc as any);
  const buffer = Buffer.from(uint8Buffer);

    return {
    buffer,
    verifyUrl,
    qrCodeDataUrl,
  };
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders a crisp, high-resolution PNG buffer of the certificate using sharp.
 */
export async function renderCertificatePNGBuffer(
  input: RenderCertificateInput,
  existingQrCodeDataUrl?: string
): Promise<Buffer> {
  const baseUrl = getAppBaseUrl();
  const verifyUrl = `${baseUrl}/verify/${input.certificateNumber}`;

  // Dimensions (2x scale for crisp Retina quality: 1684 x 1190)
  const WIDTH = 1684;
  const HEIGHT = 1190;
  const SCALE = 2;

  let qrPngBuffer: Buffer | null = null;
  if (existingQrCodeDataUrl && existingQrCodeDataUrl.startsWith('data:image/png;base64,')) {
    try {
      qrPngBuffer = Buffer.from(existingQrCodeDataUrl.replace('data:image/png;base64,', ''), 'base64');
    } catch {}
  }

  if (!qrPngBuffer) {
    try {
      const qrSvg = await generateStyledQRSVG(verifyUrl, 240);
      qrPngBuffer = await sharp(Buffer.from(qrSvg), { density: 192 })
        .resize(480, 480, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch (e) {
      console.warn('QR render error for PNG certificate:', e);
    }
  }

  // Prepare background buffer
  let bgBuffer: Buffer | null = null;
  if (input.backgroundImageUrl && input.backgroundImageUrl.startsWith('http')) {
    try {
      const res = await fetch(input.backgroundImageUrl, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const rawBg = Buffer.from(await res.arrayBuffer());
        bgBuffer = await sharp(rawBg)
          .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
          .png()
          .toBuffer();
      }
    } catch (bgErr) {
      console.warn('Background image fetch warning for PNG certificate:', bgErr);
    }
  }

  const layout = input.fieldLayout || DEFAULT_FIELD_LAYOUT;
  const qrField = layout.qr_code || { x: 82, y: 76, fontSize: 85 };
  const qrSize = Math.max(48, qrField.fontSize || 85) * SCALE;
  const qrLeft = Math.round((qrField.x / 100) * WIDTH - qrSize / 2);
  const qrTop = Math.round((qrField.y / 100) * HEIGHT - qrSize / 2);

  // If no background image, create official fallback background
  if (!bgBuffer) {
    const bgSvg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>
        <!-- Google Brand Color Top Bar -->
        <rect x="0" y="0" width="${WIDTH / 4}" height="12" fill="#4285F4"/>
        <rect x="${WIDTH / 4}" y="0" width="${WIDTH / 4}" height="12" fill="#EA4335"/>
        <rect x="${(WIDTH / 4) * 2}" y="0" width="${WIDTH / 4}" height="12" fill="#FBBC04"/>
        <rect x="${(WIDTH / 4) * 3}" y="0" width="${WIDTH / 4}" height="12" fill="#34A853"/>
        <!-- Border Frame -->
        <rect x="48" y="48" width="${WIDTH - 96}" height="${HEIGHT - 96}" rx="16" fill="none" stroke="#e2e8f0" stroke-width="4"/>
        <!-- Header Text -->
        <text x="${WIDTH / 2}" y="120" font-family="Arial, 'Google Sans', sans-serif" font-size="24" font-weight="bold" fill="#475569" text-anchor="middle" letter-spacing="3">GOOGLE DEVELOPER GROUPS ON CAMPUS</text>
        <text x="${WIDTH / 2}" y="156" font-family="Arial, 'Google Sans', sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">Helwan National University Chapter • Cairo, Egypt</text>
      </svg>
    `;
    bgBuffer = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  }

  // Build Text SVG Overlay
  const textElements: string[] = [];

  const addField = (field: any, text: string) => {
    if (!field || field.visible === false || !text) return;
    const fontSize = (field.fontSize || 14) * SCALE;
    const align = field.align || 'center';
    const color = field.color || '#1e293b';
    const isBold = field.fontWeight === 'bold' || field.fontWeight === 'black';
    const fontWeight = isBold ? 'bold' : 'normal';

    const x = Math.round((field.x / 100) * WIDTH);
    const y = Math.round((field.y / 100) * HEIGHT);

    let textAnchor = 'middle';
    if (align === 'left') textAnchor = 'start';
    if (align === 'right') textAnchor = 'end';

    textElements.push(
      `<text x="${x}" y="${y}" font-family="Arial, 'Google Sans', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}" text-anchor="${textAnchor}">${escapeXml(text)}</text>`
    );
  };

  addField(layout.recipient_name, input.recipientName);
  addField(layout.title, input.title);
  addField(layout.issue_date, input.issueDate);
  addField(layout.certificate_number, input.certificateNumber);
  if (layout.issuer_name && layout.issuer_name.visible !== false) {
    addField(layout.issuer_name, layout.issuer_name.sampleText || 'Chapter Presidential Leadership');
  }

  // Any custom elements
  Object.entries(layout)
    .filter(
      ([k, f]: any) =>
        !['recipient_name', 'title', 'issue_date', 'certificate_number', 'issuer_name', 'qr_code', 'signature_image'].includes(k) &&
        f &&
        f.visible !== false &&
        f.sampleText
    )
    .forEach(([, f]: any) => {
      addField(f, f.sampleText);
    });

  const textOverlaySvg = `
    <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${textElements.join('\n')}
    </svg>
  `;

  const compositeLayers: Array<{ input: Buffer; top?: number; left?: number }> = [
    { input: Buffer.from(textOverlaySvg) },
  ];

  if (qrPngBuffer && qrField.visible !== false) {
    const resizedQr = await sharp(qrPngBuffer)
      .resize(qrSize, qrSize)
      .png()
      .toBuffer();
    compositeLayers.push({
      input: resizedQr,
      top: qrTop,
      left: qrLeft,
    });
  }

  return await sharp(bgBuffer)
    .composite(compositeLayers)
    .png({ quality: 90, compressionLevel: 8 })
    .toBuffer();
}

/**
 * Issue certificates in bulk to selected recipients
 * Spec §4.14: Renders PDF, uploads to Drive, inserts into certificates, dispatches notifications.
 */
export async function issueCertificatesBatch(
  input: IssueCertificatesBatchInput,
  callerProfileId?: string
): Promise<IssueCertificatesResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const issuedCertificates: IssueCertificatesResult['issuedCertificates'] = [];

  // 1. Fetch template
  const { data: template, error: tmplErr } = await admin
    .from('certificate_templates')
    .select('*')
    .eq('id', input.templateId)
    .maybeSingle();

  const fieldLayout = template?.field_layout || DEFAULT_FIELD_LAYOUT;
  const backgroundUrl = template?.background_image_drive_file_id || null;

  const currentYear = new Date().getFullYear();
  const issueDateStr =
    input.issueDate ||
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  for (let i = 0; i < input.recipients.length; i++) {
    const recipient = input.recipients[i];
    try {
      const verificationCode = crypto.randomUUID();
      // Generate distinctive serial format: GDGoC-HNU-YYYY-XXXXXX (letters and digits)
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      const digits = '23456789';
      const allChars = letters + digits;
      const part = [
        letters.charAt(Math.floor(Math.random() * letters.length)),
        letters.charAt(Math.floor(Math.random() * letters.length)),
        digits.charAt(Math.floor(Math.random() * digits.length)),
        digits.charAt(Math.floor(Math.random() * digits.length)),
        allChars.charAt(Math.floor(Math.random() * allChars.length)),
        allChars.charAt(Math.floor(Math.random() * allChars.length)),
      ];
      for (let sIdx = part.length - 1; sIdx > 0; sIdx--) {
        const rIdx = Math.floor(Math.random() * (sIdx + 1));
        [part[sIdx], part[rIdx]] = [part[rIdx], part[sIdx]];
      }
      const certificateNumber = `GDGoC-HNU-${currentYear}-${part.join('')}`;

      // 2. Render PDF with embedded verification QR
      const { buffer, verifyUrl } = await renderCertificatePDFBuffer({
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        title: input.title,
        issueDate: issueDateStr,
        certificateNumber,
        verificationCode,
        fieldLayout,
        backgroundImageUrl: backgroundUrl,
      });

      // 3. Upload PDF to Drive
      let driveFileId: string | null = null;
      let driveUrl: string | null = null;

      try {
        const driveRes = await uploadFileToDrive({
          fileName: `${certificateNumber}_${recipient.name.replace(/\s+/g, '_')}.pdf`,
          mimeType: 'application/pdf',
          base64Data: buffer.toString('base64'),
          makePublic: true,
        });

        if (driveRes.success && driveRes.data) {
          driveFileId = driveRes.data.fileId;
          driveUrl = driveRes.data.fileUrl || driveRes.data.downloadUrl || null;
        }
      } catch (driveErr) {
        console.warn('[issueCertificates] Drive upload warning:', driveErr);
      }

      // 4. Insert certificates row in Supabase
      const { data: insertedCert, error: insErr } = await admin
        .from('certificates')
        .insert({
          template_id: input.templateId || null,
          recipient_profile_id: recipient.profileId || null,
          recipient_name: recipient.name,
          recipient_email: recipient.email,
          event_id: input.eventId || null,
          title: input.title,
          issue_date: new Date().toISOString().split('T')[0],
          certificate_number: certificateNumber,
          verification_code: verificationCode,
          pdf_drive_file_id: driveFileId,
          pdf_drive_url: driveUrl || verifyUrl,
          issued_by: callerProfileId || null,
        })
        .select('id')
        .single();

      if (insErr) {
        errors.push(`Failed to save certificate for ${recipient.email}: ${insErr.message}`);
        continue;
      }

      // 5. Notify recipient in-app & by email (§4.14 item 5)
      if (recipient.profileId) {
        await notifyCertificateIssued({
          certificateId: insertedCert.id,
          certificateTitle: input.title,
          recipientId: recipient.profileId,
        }).catch((e) => console.warn('Notification warning:', e));
      }

      issuedCertificates.push({
        id: insertedCert.id,
        recipientName: recipient.name,
        certificateNumber,
        verificationCode,
        pdfUrl: driveUrl || verifyUrl,
      });
    } catch (itemErr: any) {
      errors.push(`Error generating certificate for ${recipient.email}: ${itemErr.message}`);
    }
  }

  return {
    success: issuedCertificates.length > 0,
    totalRequested: input.recipients.length,
    totalIssued: issuedCertificates.length,
    issuedCertificates,
    errors: errors.length > 0 ? errors : undefined,
  };
}
