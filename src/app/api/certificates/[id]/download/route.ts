import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderCertificatePDFBuffer } from '@/lib/certificates/issue-engine';

export const dynamic = 'force-dynamic';

const pdfCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

    // Check in-memory cache for instant response
    const cached = pdfCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return new NextResponse(new Blob([cached.buffer as any]), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Certificate_${id.substring(0, 8)}.pdf"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    const admin = createAdminClient();

    // 1. Fetch certificate record
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
        template_id
      `)
      .eq('id', id)
      .single();

    if (certErr || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    let template: any = null;
    if (cert.template_id) {
      const { data: tmpl } = await admin
        .from('certificate_templates')
        .select('id, name, background_image_drive_file_id, field_layout')
        .eq('id', cert.template_id)
        .maybeSingle();
      template = tmpl;
    }

    // Fallback: if cert has no template_id or template not found, use latest template
    if (!template) {
      const { data: defaultTmpl } = await admin
        .from('certificate_templates')
        .select('id, name, background_image_drive_file_id, field_layout')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      template = defaultTmpl;
    }

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

    pdfCache.set(id, {
      buffer,
      expiresAt: Date.now() + CACHE_TTL_MS,
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
