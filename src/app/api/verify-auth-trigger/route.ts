import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: triggerInfo, error } = await admin.rpc('check_auth_trigger_status');

    if (error || !triggerInfo || triggerInfo.length === 0) {
      return NextResponse.json({
        success: false,
        step: '2.2',
        error: error?.message || 'Trigger on_auth_user_created not found on auth.users',
        message: 'Step 2.2 pending: Run migration 010 in Supabase SQL Editor to attach the handle_new_user trigger to auth.users.',
      });
    }

    const trigger = triggerInfo[0];

    return NextResponse.json({
      success: true,
      step: '2.2',
      trigger: {
        name: trigger.trigger_name,
        targetTable: 'auth.users',
        timing: trigger.action_timing,
        event: trigger.event_manipulation,
        function: 'public.handle_new_user()',
        targetProfileStatus: 'incomplete',
        targetProfileRole: 'member',
      },
      message: 'Step 2.2 Verified: The on_auth_user_created trigger is active on auth.users and will automatically create an incomplete profile on first sign-in.',
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error checking trigger status',
    }, { status: 500 });
  }
}
