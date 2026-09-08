import { NextRequest, NextResponse } from 'next/server';
import { getMockFile } from '@/lib/drive/drive-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fileId = searchParams.get('id');
  const size = searchParams.get('sz') || '800';

  if (!fileId) {
    return new NextResponse('Missing file id', { status: 400 });
  }

  // 1. Check in-memory sandbox / mock file store first
  const mockFile = getMockFile(fileId);
  if (mockFile && mockFile.base64Data) {
    const buffer = Buffer.from(mockFile.base64Data, 'base64');
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mockFile.mimeType || 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Length': buffer.length.toString(),
      },
    });
  }

  // 2. Try fetching from live Google Drive thumbnail endpoints
  try {
    // Attempt A: Direct Google Drive thumbnail
    const thumbUrl = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;
    const response = await fetch(thumbUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GDGoC-Bridge/1.0)',
      },
      redirect: 'follow',
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': imageBuffer.length.toString(),
          },
        });
      }
    }

    // Attempt B: lh3 direct CDN
    const cdnUrl = `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w${size}`;
    const cdnRes = await fetch(cdnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GDGoC-Bridge/1.0)',
      },
      redirect: 'follow',
      next: { revalidate: 3600 },
    });

    if (cdnRes.ok) {
      const contentType = cdnRes.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const imageBuffer = Buffer.from(await cdnRes.arrayBuffer());
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': imageBuffer.length.toString(),
          },
        });
      }
    }

    // Attempt C: Export view
    const viewUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
    const viewRes = await fetch(viewUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GDGoC-Bridge/1.0)',
      },
      redirect: 'follow',
    });

    if (viewRes.ok) {
      const contentType = viewRes.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        const imageBuffer = Buffer.from(await viewRes.arrayBuffer());
        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'Content-Length': imageBuffer.length.toString(),
          },
        });
      }
    }
  } catch (err: any) {
    console.warn('[Thumbnail Proxy Error]:', err.message);
  }

  // Fallback: Elegant SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240" fill="none">
    <rect width="400" height="240" rx="12" fill="#131722"/>
    <rect x="1" y="1" width="398" height="238" rx="11" stroke="#2a3042" stroke-width="2"/>
    <circle cx="200" cy="100" r="32" fill="#4285F4" fill-opacity="0.12"/>
    <path d="M188 92L197 104L203 98L212 110H188V92Z" stroke="#8ab4f8" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="208" cy="90" r="3" fill="#8ab4f8"/>
    <text x="200" y="152" fill="#9aa0a6" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">Image Preview</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
