import { NextResponse } from 'next/server';
import { generateSecurityChallenge } from '@/lib/security/captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  const challenge = generateSecurityChallenge();
  return NextResponse.json(challenge);
}
