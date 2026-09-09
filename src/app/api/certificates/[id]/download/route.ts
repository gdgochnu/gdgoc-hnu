import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderCertificatePDFBuffer } from '@/lib/certificates/issue-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/certificates/[id]/download
 * Renders and streams the official PDF certificate for download
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();

    // 1. Fetch certificate record with template
    const { data: cert, error: certErr } = await admin
      .from('certificates')
      .select(`
        id,
        recipient_name,
        recipient_email,
        title,
        issue_date,
        certificate_number,
        verification_code,
        template:certificate_templates(id, name, background_image_drive_file_id, field_layout)
      `)
      .eq('id', id)
      .single();

    if (certErr || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const template = cert.template as any;

    // 2. Render PDF buffer
    const { buffer } = await renderCertificatePDFBuffer({
      recipientName: cert.recipient_name,
      recipientEmail: cert.recipient_email,
      title: cert.title,
      issueDate: new Date(cert.issue_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      certificateNumber: cert.certificate_number,
      verificationCode: cert.verification_code,
      fieldLayout: template?.field_layout,
      backgroundImageUrl: template?.background_image_drive_file_id,
    });

    const safeFilename = `Certificate_${cert.certificate_number}.pdf`;

    return new NextResponse(new Blob([buffer as any]), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[CertificateDownloadAPI] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
