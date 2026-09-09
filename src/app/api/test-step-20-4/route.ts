import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyCertificateIssued } from '@/lib/notifications/triggers';

/**
 * GET /api/test-step-20-4
 * Verify: Recipient Notification & Profile Certificates Tab (§4.14 & §4.6)
 * Tests:
 *   1. Certificate issuance notification trigger creates in-app notifications
 *   2. Member profile certificates lookup by profile ID and recipient email
 *   3. Teardown of test records
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Notification Trigger
  let testMemberId: string | null = null;
  let testMemberEmail: string | null = null;
  let testCertId: string | null = null;

  try {
    const { data: member } = await admin
      .from('profiles')
      .select('id, full_name, email')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (member) {
      testMemberId = member.id;
      testMemberEmail = member.email;

      // Create a test certificate
      const { data: cert } = await admin
        .from('certificates')
        .insert({
          recipient_profile_id: member.id,
          recipient_name: member.full_name,
          recipient_email: member.email,
          title: 'Official Notification Test Certificate',
          certificate_number: `GDGOC-TEST-${Date.now()}`,
          verification_code: crypto.randomUUID(),
        })
        .select('id')
        .single();

      if (cert) {
        testCertId = cert.id;

        // Trigger notification
        const notifRes = await notifyCertificateIssued({
          certificateId: cert.id,
          certificateTitle: 'Official Notification Test Certificate',
          recipientId: member.id,
        });

        // Verify notification row
        const { data: notifRow } = await admin
          .from('notifications')
          .select('id, title, type, related_entity_type, related_entity_id')
          .eq('profile_id', member.id)
          .eq('type', 'certificate_issued')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        results['1_recipient_notification_trigger'] = {
          success: notifRes > 0,
          notificationCreated: Boolean(notifRow),
          type: notifRow?.type,
          relatedCertificateId: notifRow?.related_entity_id,
        };
      }
    } else {
      results['1_recipient_notification_trigger'] = { error: 'No active profile found' };
    }
  } catch (e: any) {
    results['1_recipient_notification_trigger'] = { error: e.message };
  }

  // Test 2: Profile Certificates Tab Query
  try {
    if (testMemberId && testMemberEmail) {
      const { data: profileCerts } = await admin
        .from('certificates')
        .select(`
          id,
          title,
          certificate_number,
          verification_code,
          issue_date
        `)
        .or(`recipient_profile_id.eq.${testMemberId},recipient_email.eq.${testMemberEmail}`)
        .order('created_at', { ascending: false });

      results['2_profile_certificates_query'] = {
        success: true,
        certificatesFound: profileCerts?.length || 0,
        hasTestCertificate: profileCerts?.some((c) => c.id === testCertId) || false,
      };
    } else {
      results['2_profile_certificates_query'] = { error: 'Test member not initialized' };
    }
  } catch (e: any) {
    results['2_profile_certificates_query'] = { error: e.message };
  }

  // Clean up
  if (testCertId) {
    await admin.from('certificates').delete().eq('id', testCertId);
  }

  return NextResponse.json(results);
}
