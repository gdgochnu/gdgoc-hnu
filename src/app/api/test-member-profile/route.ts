import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const results: Record<string, any> = {};

  try {
    // 1. Fetch all profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email, role, status, department_id, skills, faculty, academic_year')
      .order('created_at', { ascending: false });

    results.profiles = profiles;

    return NextResponse.json({
      status: 'ok',
      message: 'Member profile data retrieval verified!',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message || 'Error executing test',
    }, { status: 500 });
  }
}
