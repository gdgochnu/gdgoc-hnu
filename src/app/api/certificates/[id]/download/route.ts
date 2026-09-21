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
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(id);

    // 1. Fetch certificate record
    let certQuery = admin
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
      `);

    const { data: cert } = isUuid
      ? await certQuery.eq('id', id).maybeSingle()
      : await certQuery.ilike('certificate_number', id).maybeSingle();

    let certToRender: any = cert;

    // Fallback: check student_certificates table
    if (!certToRender) {
      let stuCertQuery = admin
        .from('student_certificates')
        .select(`
          id,
          title,
          issue_date,
          certificate_number,
          verification_code,
          template_id,
          student:student_profiles(full_name_en, full_name_ar, email)
        `);

      const { data: stuCert } = isUuid
        ? await stuCertQuery.eq('id', id).maybeSingle()
        : await stuCertQuery.ilike('certificate_number', id).maybeSingle();

      if (stuCert) {
        const studentObj = Array.isArray(stuCert.student) ? stuCert.student[0] : stuCert.student;
        certToRender = {
          id: stuCert.id,
          recipient_name: studentObj?.full_name_en || studentObj?.full_name_ar || 'Student Member',
          recipient_email: studentObj?.email || '',
          title: stuCert.title,
          issue_date: stuCert.issue_date,
          certificate_number: stuCert.certificate_number,
          verification_code: stuCert.verification_code,
          template_id: stuCert.template_id,
        };
      }
    }

    if (!certToRender) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const activeCert = certToRender;

    let template: any = null;
    if (activeCert.template_id) {
      const { data: tmpl } = await admin
        .from('certificate_templates')
        .select('id, name, background_image_drive_file_id, field_layout')
        .eq('id', activeCert.template_id)
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
      recipientName: activeCert.recipient_name,
      recipientEmail: activeCert.recipient_email,
      title: activeCert.title,
      issueDate: new Date(activeCert.issue_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      certificateNumber: activeCert.certificate_number,
      verificationCode: activeCert.verification_code,
      fieldLayout: template?.field_layout,
      backgroundImageUrl: template?.background_image_drive_file_id,
    });

    pdfCache.set(id, {
      buffer,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    const safeFilename = `Certificate_${activeCert.certificate_number}.pdf`;

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
