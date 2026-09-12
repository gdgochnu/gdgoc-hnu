import { NextResponse } from 'next/server';
import { checkAndAutoTransitionPastEvents } from '@/app/events/actions';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = verifyCronAuth(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const result = await checkAndAutoTransitionPastEvents();
    return NextResponse.json({
      status: result.success ? 'success' : 'error',
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error?.message || 'Error executing event auto-complete job.',
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
