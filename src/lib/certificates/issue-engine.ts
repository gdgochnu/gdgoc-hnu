import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadFileToDrive } from '@/lib/drive/drive-client';
import { notifyCertificateIssued } from '@/lib/notifications/triggers';
import { CertificatePDFDocument, CertificateData } from './pdf-template';
import { generateStyledQRDataURL } from './qr-generator';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/verify/${input.verificationCode}`;

  // Generate styled QR code with GDGoC logo & brand colors
  const qrCodeDataUrl = await generateStyledQRDataURL(verifyUrl, 240);


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
      // Generate readable serial format: GDGOC-YYYY-XXXXXX
      const certSeq = Math.floor(100000 + Math.random() * 900000);
      const certificateNumber = `GDGOC-${currentYear}-${certSeq}`;

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
