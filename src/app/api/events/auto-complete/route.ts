import { NextResponse } from 'next/server';
import { checkAndAutoTransitionPastEvents } from '@/app/events/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

export async function POST() {
  return GET();
}
