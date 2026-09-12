import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUrl = new URL('/auth/login', request.url);
  url.searchParams.forEach((val, key) => {
    redirectUrl.searchParams.set(key, val);
  });
  return NextResponse.redirect(redirectUrl);
}
