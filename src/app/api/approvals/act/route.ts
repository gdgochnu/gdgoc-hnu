import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { actOnApprovalStep } from '@/lib/approvals/approval-actions';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let callerId = user?.id;

    // Support mock tester in local development if no session cookie
    if (!callerId) {
      const { searchParams } = new URL(req.url);
      const mockRole = searchParams.get('mock');
      if (mockRole && process.env.NODE_ENV !== 'production') {
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

    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { instanceId, stepOrder, action, notes } = body;

    if (!instanceId || !stepOrder || !action) {
      return NextResponse.json({ error: 'Missing required parameters (instanceId, stepOrder, action)' }, { status: 400 });
    }

    if (!['approved', 'rejected', 'changes_requested'].includes(action)) {
      return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
    }

    const result = await actOnApprovalStep({
      instanceId,
      stepOrder: Number(stepOrder),
      action,
      notes,
      callerId,
    });

    return NextResponse.json({ status: 'ok', result });
  } catch (err: any) {
    console.error('Error acting on approval step:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
