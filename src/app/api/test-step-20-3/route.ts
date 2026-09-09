import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  renderCertificatePDFBuffer,
  issueCertificatesBatch,
} from '@/lib/certificates/issue-engine';
import {
  saveCertificateTemplateAction,
  deleteCertificateTemplateAction,
} from '@/lib/certificates/template-actions';
import { DEFAULT_FIELD_LAYOUT } from '@/types/certificates';

/**
 * GET /api/test-step-20-3
 * Verify: PDF Generation Route & Certificate Issuing Engine (§4.14)
 * Tests:
 *   1. Direct PDF rendering with verification QR code integration
 *   2. Batch issuing flow: creates certificates table row, unique verification UUID, Drive upload link
 *   3. Teardown of generated test certificate and template
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Direct PDF Buffer & QR Rendering
  try {
    const renderRes = await renderCertificatePDFBuffer({
      recipientName: 'Test Recipient #1',
      recipientEmail: 'recipient1@example.com',
      title: 'Certificate of Achievement — Cloud Workshop',
      issueDate: 'September 9, 2026',
      certificateNumber: 'GDGOC-2026-999001',
      verificationCode: 'c3f1b4c2-9e2a-4a2e-8b1e-2f3a4b5c6d7e',
    });

    results['1_direct_pdf_rendering'] = {
      isBufferValid: Boolean(renderRes.buffer && ((renderRes.buffer as any).length > 0 || (renderRes.buffer as any).byteLength > 0)),
      bufferSizeBytes: (renderRes.buffer as any).length || (renderRes.buffer as any).byteLength,
      hasVerificationUrl: renderRes.verifyUrl.includes('/verify/c3f1b4c2'),
      hasQrCodeDataUrl: renderRes.qrCodeDataUrl.startsWith('data:image/png;base64,'),
    };
  } catch (e: any) {
    results['1_direct_pdf_rendering'] = { error: e.message };
  }

  // Test 2: Batch Issuing Engine Flow
  let templateId: string | null = null;
  let issuedCertId: string | null = null;

  try {
    // Create temporary template
    const tmplRes = await saveCertificateTemplateAction({
      name: `Batch Test Template #${Date.now()}`,
      fieldLayout: DEFAULT_FIELD_LAYOUT,
      bypassAuth: true,
    });

    if (tmplRes.success && tmplRes.template) {
      templateId = tmplRes.template.id;

      // Issue batch of 1
      const batchRes = await issueCertificatesBatch({
        templateId,
        title: 'Flutter Developer Masterclass',
        recipients: [
          {
            name: 'Ali Ahmed Hassan',
            email: 'ali.ahmed.test@example.com',
            attendancePct: 100,
          },
        ],
      });

      if (batchRes.success && batchRes.issuedCertificates.length > 0) {
        issuedCertId = batchRes.issuedCertificates[0].id;
        const certRecord = batchRes.issuedCertificates[0];

        // Verify record in database
        const { data: dbCert } = await admin
          .from('certificates')
          .select('id, certificate_number, verification_code, pdf_drive_url, title')
          .eq('id', issuedCertId)
          .single();

        results['2_batch_issuing_flow'] = {
          success: true,
          totalIssued: batchRes.totalIssued,
          certificateNumber: certRecord.certificateNumber,
          verificationCode: certRecord.verificationCode,
          dbVerified: !!dbCert && dbCert.certificate_number === certRecord.certificateNumber,
          hasPdfLink: Boolean(dbCert?.pdf_drive_url),
        };
      } else {
        results['2_batch_issuing_flow'] = { success: false, errors: batchRes.errors };
      }
    } else {
      results['2_batch_issuing_flow'] = { error: 'Failed to create template' };
    }
  } catch (e: any) {
    results['2_batch_issuing_flow'] = { error: e.message };
  }

  // Clean up
  if (issuedCertId) {
    await admin.from('certificates').delete().eq('id', issuedCertId);
  }
  if (templateId) {
    await deleteCertificateTemplateAction(templateId, true);
  }

  return NextResponse.json(results);
}
