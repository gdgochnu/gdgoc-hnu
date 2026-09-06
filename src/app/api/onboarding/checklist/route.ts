import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  getProfileOnboardingProgress, 
  toggleChecklistItem, 
  generateOnboardingChecklistForProfile 
} from '@/lib/onboarding/checklist';

export const dynamic = 'force-dynamic';

async function resolveCallerId(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let callerId = user?.id;

  if ((!callerId || process.env.NODE_ENV !== 'production')) {
    const { searchParams } = new URL(req.url);
    const mockUserId = searchParams.get('mock_user_id');
    const mockRole = searchParams.get('mock');

    if (mockUserId) {
      callerId = mockUserId;
    } else if (mockRole) {
      const admin = createAdminClient();
      const { data: mockUser } = await admin
        .from('profiles')
        .select('id')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();
      if (mockUser) callerId = mockUser.id;
    }
  }

  return callerId;
}

export async function GET(req: NextRequest) {
  try {
    const callerId = await resolveCallerId(req);
    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, department_id, status')
      .eq('id', callerId)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let progress = await getProfileOnboardingProgress(callerId);

    // Auto-generate if active member has no checklist yet
    if (progress.total === 0 && profile.status === 'active') {
      await generateOnboardingChecklistForProfile(callerId, profile.department_id);
      progress = await getProfileOnboardingProgress(callerId);
    }

    return NextResponse.json({ status: 'ok', progress });
  } catch (err: any) {
    console.error('Error in GET /api/onboarding/checklist:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const callerId = await resolveCallerId(req);
    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, isDone } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const result = await toggleChecklistItem({
      itemId,
      profileId: callerId,
      isDone: typeof isDone === 'boolean' ? isDone : undefined,
    });

    const progress = await getProfileOnboardingProgress(callerId);

    return NextResponse.json({
      status: 'ok',
      ...result,
      progress,
    });
  } catch (err: any) {
    console.error('Error in POST /api/onboarding/checklist:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
