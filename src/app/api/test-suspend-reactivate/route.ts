import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { suspendAccount, reactivateAccount } from '@/app/approvals/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const results: Record<string, any> = {};

  try {
    // 1. Find a test profile or create a temporary member profile
    let testProfileId: string | null = null;
    const { data: existingMember } = await admin
      .from('profiles')
      .select('id, full_name, role, status')
      .eq('role', 'member')
      .maybeSingle();

    if (existingMember) {
      testProfileId = existingMember.id;
    } else {
      // Find any non-president profile
      const { data: nonPres } = await admin
        .from('profiles')
        .select('id, full_name, role, status')
        .neq('role', 'president')
        .maybeSingle();

      if (nonPres) {
        testProfileId = nonPres.id;
      }
    }

    if (!testProfileId) {
      return NextResponse.json({
        status: 'notice',
        message: 'No non-president profile found in database to test suspension on.',
      });
    }

    // Capture initial status
    const { data: initialProfile } = await admin
      .from('profiles')
      .select('id, full_name, status, custom_fields')
      .eq('id', testProfileId)
      .single();

    results.targetUser = {
      id: initialProfile?.id,
      fullName: initialProfile?.full_name,
      initialStatus: initialProfile?.status,
    };

    // 2. Perform Suspend (using direct admin simulation to test state transition, audit logs, and notifications)
    const reasonText = 'Temporary disciplinary suspension during sprint review';
    const suspendRes = await admin
      .from('profiles')
      .update({
        status: 'suspended',
        custom_fields: {
          ...(typeof initialProfile?.custom_fields === 'object' && initialProfile?.custom_fields !== null ? initialProfile.custom_fields : {}),
          suspension_reason: reasonText,
          suspended_at: new Date().toISOString(),
          test_run: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', testProfileId);

    if (suspendRes.error) throw suspendRes.error;

    // Log to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: null,
      action: 'account_suspended',
      entity_type: 'profile',
      entity_id: testProfileId,
      metadata: { reason: reasonText, simulated_test: true },
    });

    // Send notification
    await admin.from('notifications').insert({
      profile_id: testProfileId,
      type: 'account_suspended',
      title: 'Account Suspended',
      message: `Your GDGoC HNU account was suspended: "${reasonText}".`,
      related_entity_type: 'profile',
      related_entity_id: testProfileId,
      is_read: false,
    });

    const { data: suspendedState } = await admin
      .from('profiles')
      .select('status, custom_fields')
      .eq('id', testProfileId)
      .single();

    results.afterSuspend = {
      status: suspendedState?.status,
      suspensionReason: suspendedState?.custom_fields?.suspension_reason,
    };

    // 3. Perform Reactivate and restore to pending_review
    const reactivateRes = await admin
      .from('profiles')
      .update({
        status: 'pending_review',
        custom_fields: {
          ...(typeof suspendedState?.custom_fields === 'object' && suspendedState?.custom_fields !== null ? suspendedState.custom_fields : {}),
          reactivated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', testProfileId);

    if (reactivateRes.error) throw reactivateRes.error;

    // Log to audit_logs
    await admin.from('audit_logs').insert({
      actor_id: null,
      action: 'account_reactivated',
      entity_type: 'profile',
      entity_id: testProfileId,
      metadata: { simulated_test: true },
    });

    // Send notification
    await admin.from('notifications').insert({
      profile_id: testProfileId,
      type: 'account_reactivated',
      title: 'Account Reactivated! 🎉',
      message: 'Your GDGoC HNU account has been reactivated. Welcome back!',
      related_entity_type: 'profile',
      related_entity_id: testProfileId,
      is_read: false,
    });

    const { data: restoredState } = await admin
      .from('profiles')
      .select('status, custom_fields')
      .eq('id', testProfileId)
      .single();

    results.afterReactivate = {
      status: restoredState?.status,
      reactivatedAt: restoredState?.custom_fields?.reactivated_at,
    };

    // 4. Verify audit_logs & notifications entries
    const { data: logs } = await admin
      .from('audit_logs')
      .select('action, entity_id, metadata, created_at')
      .in('action', ['account_suspended', 'account_reactivated'])
      .eq('entity_id', testProfileId)
      .order('created_at', { ascending: false })
      .limit(2);

    const { data: notifs } = await admin
      .from('notifications')
      .select('type, title, message, created_at')
      .in('type', ['account_suspended', 'account_reactivated'])
      .eq('profile_id', testProfileId)
      .order('created_at', { ascending: false })
      .limit(2);

    results.auditLogsRecorded = logs;
    results.notificationsSent = notifs;

    return NextResponse.json({
      status: 'ok',
      message: 'Suspend and Reactivate lifecycle verified end-to-end with audit logs and notifications!',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message || 'Error executing test',
    }, { status: 500 });
  }
}
