import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStyledQRDataURL } from '@/lib/certificates/qr-generator';
import { getAppBaseUrl } from '@/lib/utils';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const imageCache = new Map<string, { buffer: Buffer; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * GET /api/certificates/[id]/image
 * Renders a high-resolution PNG image of the official certificate
 * strictly matching the template layout and custom background image.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check in-memory cache
    const cached = imageCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return new NextResponse(new Blob([cached.buffer as any]), {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="Certificate_${id.substring(0, 8)}.png"`,
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
        template_id,
        event_id,
        issued_by
      `)
      .eq('id', id)
      .single();

    if (certErr || !cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    // 2. Fetch template, event, and issuer in parallel
    const [tmplRes, eventRes, issuerRes] = await Promise.all([
      cert.template_id
        ? admin
            .from('certificate_templates')
            .select('background_image_drive_file_id, field_layout')
            .eq('id', cert.template_id)
            .maybeSingle()
        : admin
            .from('certificate_templates')
            .select('background_image_drive_file_id, field_layout')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
      cert.event_id
        ? admin.from('events').select('title').eq('id', cert.event_id).maybeSingle()
        : Promise.resolve({ data: null }),
      cert.issued_by
        ? admin.from('profiles').select('full_name, role').eq('id', cert.issued_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const template = tmplRes?.data;
    const fieldLayout: Record<string, any> = template?.field_layout || {};
    const bgUrl = template?.background_image_drive_file_id;

    let bgDataUri: string | null = null;
    if (bgUrl && (bgUrl.startsWith('http://') || bgUrl.startsWith('https://'))) {
      try {
        const bgFetch = await fetch(bgUrl);
        if (bgFetch.ok) {
          const bgBuf = Buffer.from(await bgFetch.arrayBuffer());
          const contentType = bgFetch.headers.get('content-type') || 'image/jpeg';
          bgDataUri = `data:${contentType};base64,${bgBuf.toString('base64')}`;
        }
      } catch (bgErr) {
        console.warn('[CertificateImageAPI] Could not fetch template background image:', bgErr);
      }
    }

    const issuerName = issuerRes?.data
      ? `${issuerRes.data.full_name} (${issuerRes.data.role.replace('_', ' ')})`
      : 'Chapter Leadership';

    const baseUrl = getAppBaseUrl();
    const verifyUrl = `${baseUrl}/verify/${cert.verification_code}`;

    // 3. Generate styled QR code
    const qrDataUrl = await generateStyledQRDataURL(verifyUrl, 240);

    const formattedDate = cert.issue_date
      ? new Date(cert.issue_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Official Record';

    // 4. Construct SVG matching exact layout (W: 1920, H: 1356, aspect ratio 842 / 595)
    const W = 1920;
    const H = 1356;
    const scale = W / 842;

    const escapeXml = (str: string) =>
      String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    // Helpers to extract field positions
    const getPos = (field: any, defaultX: number, defaultY: number, defaultSize: number, defaultColor: string) => {
      const x = ((field?.x ?? defaultX) / 100) * W;
      const y = ((field?.y ?? defaultY) / 100) * H;
      const size = (field?.fontSize ?? defaultSize) * scale;
      const color = field?.color || defaultColor;
      const align = field?.align === 'left' ? 'start' : field?.align === 'right' ? 'end' : 'middle';
      const weight = field?.fontWeight === 'black' ? '900' : field?.fontWeight === 'bold' ? '700' : '500';
      return { x, y, size, color, align, weight };
    };

    const recPos = getPos(fieldLayout.recipient_name, 50, 48, 28, '#ffffff');
    const titlePos = getPos(fieldLayout.title, 50, 38, 18, '#38bdf8');
    const datePos = getPos(fieldLayout.issue_date, 22, 82, 12, '#ffffff');
    const certNumPos = getPos(fieldLayout.certificate_number, 82, 15, 11, '#cbd5e1');
    const issuerPos = getPos(fieldLayout.issuer_name, 50, 82, 12, '#ffffff');

    const qrSize = (fieldLayout.qr_code?.fontSize ?? 85) * scale;
    const qrX = ((fieldLayout.qr_code?.x ?? 85) / 100) * W - qrSize / 2;
    const qrY = ((fieldLayout.qr_code?.y ?? 85) / 100) * H - qrSize / 2;

    // Custom fields if configured in template
    const customFieldsSvg: string[] = [];
    Object.entries(fieldLayout).forEach(([key, f]: [string, any]) => {
      if (['recipient_name', 'title', 'issue_date', 'certificate_number', 'issuer_name', 'qr_code'].includes(key)) return;
      if (f && f.visible !== false && f.sampleText) {
        const p = getPos(f, 50, 50, 14, '#ffffff');
        customFieldsSvg.push(
          `<text x="${p.x}" y="${p.y}" text-anchor="${p.align}" font-family="system-ui, -apple-system, sans-serif" font-weight="${p.weight}" font-size="${p.size}" fill="${p.color}">${escapeXml(f.sampleText)}</text>`
        );
      }
    });

    const svg = `
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b1120"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0b1120"/>
        </linearGradient>
      </defs>

      <!-- Background Layer -->
      ${
        bgDataUri
          ? `<image href="${bgDataUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`
          : `
            <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
            <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="20" fill="none" stroke="rgba(251, 188, 4, 0.25)" stroke-width="3"/>
            <text x="70" y="90" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#ffffff" letter-spacing="2">GOOGLE DEVELOPER GROUPS ON CAMPUS</text>
            <text x="${W - 70}" y="90" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="18" fill="#FBBC04">HELWAN UNIVERSITY</text>
            <text x="${W / 2}" y="740" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="120" fill="#ffffff" fill-opacity="0.05" letter-spacing="20">CERTIFICATE</text>
          `
      }

      <!-- 1. Recipient Name -->
      <text x="${recPos.x}" y="${recPos.y}" text-anchor="${recPos.align}" font-family="system-ui, -apple-system, sans-serif" font-weight="${recPos.weight}" font-size="${recPos.size}" fill="${recPos.color}">
        ${escapeXml(cert.recipient_name)}
      </text>

      <!-- 2. Certificate Title -->
      <text x="${titlePos.x}" y="${titlePos.y}" text-anchor="${titlePos.align}" font-family="system-ui, -apple-system, sans-serif" font-weight="${titlePos.weight}" font-size="${titlePos.size}" fill="${titlePos.color}">
        ${escapeXml(cert.title)}
      </text>

      <!-- 3. Issue Date -->
      <text x="${datePos.x}" y="${datePos.y}" text-anchor="${datePos.align}" font-family="system-ui, -apple-system, sans-serif" font-weight="${datePos.weight}" font-size="${datePos.size}" fill="${datePos.color}">
        ${escapeXml(formattedDate)}
      </text>

      <!-- 4. Certificate Number -->
      <text x="${certNumPos.x}" y="${certNumPos.y}" text-anchor="${certNumPos.align}" font-family="monospace" font-weight="${certNumPos.weight}" font-size="${certNumPos.size}" fill="${certNumPos.color}">
        ${escapeXml(cert.certificate_number)}
      </text>

      <!-- 5. Issuer Sign-off -->
      <text x="${issuerPos.x}" y="${issuerPos.y}" text-anchor="${issuerPos.align}" font-family="system-ui, -apple-system, sans-serif" font-weight="${issuerPos.weight}" font-size="${issuerPos.size}" fill="${issuerPos.color}">
        ${escapeXml(issuerName)}
      </text>

      <!-- Custom Layout Fields -->
      ${customFieldsSvg.join('\n')}

      <!-- QR Code -->
      <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}"/>
    </svg>
    `;

    // 5. Convert SVG to PNG via Sharp
    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 100, compressionLevel: 6 })
      .toBuffer();

    // Cache buffer
    imageCache.set(id, {
      buffer: pngBuffer,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    const safeFilename = `Certificate_${cert.certificate_number}.png`;

    return new NextResponse(new Blob([pngBuffer as any]), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('[CertificateImageAPI] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
