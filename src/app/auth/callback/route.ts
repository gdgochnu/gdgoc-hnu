import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // If next is specified, redirect there, otherwise go to /dashboard
  let next = searchParams.get('next') ?? '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard';
  }

  // Determine proper canonical base URL
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL 
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` 
    : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  let baseUrl = origin;
  if (process.env.NODE_ENV === 'production' || !origin.includes('localhost')) {
    if (forwardedHost) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else if (configuredAppUrl) {
      baseUrl = configuredAppUrl.replace(/\/$/, '');
    } else if (vercelUrl) {
      baseUrl = vercelUrl.replace(/\/$/, '');
    }
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // If there's an error exchanging code, redirect to error info
  return NextResponse.redirect(`${baseUrl}/auth/login?error=auth_exchange_failed`);
}

