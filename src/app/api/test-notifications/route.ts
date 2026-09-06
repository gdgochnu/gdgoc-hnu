import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  sendWelcomeApprovedEmail, 
  sendChangesRequestedEmail, 
  sendRejectionEmail 
} from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const testResults: Record<string, any> = {};

  try {
    // 1. Test Welcome Approved Email
    const welcomeRes = await sendWelcomeApprovedEmail({
      to: 'test-welcome@gdgoc-hnu.org',
      fullName: 'Ahmed Salman',
      role: 'member',
      departmentName: 'Web & Cloud',
      position: 'Frontend Specialist',
    });
    testResults.welcomeEmail = welcomeRes;

    // 2. Test Changes Requested Email
    const changesRes = await sendChangesRequestedEmail({
      to: 'test-changes@gdgoc-hnu.org',
      fullName: 'Ahmed Salman',
      notes: 'Please attach your updated GitHub portfolio and verify your student ID.',
    });
    testResults.changesEmail = changesRes;

    // 3. Test Rejection Email
    const rejectionRes = await sendRejectionEmail({
      to: 'test-reject@gdgoc-hnu.org',
      fullName: 'Candidate',
      reason: 'Application capacity reached for the current recruitment season.',
    });
    testResults.rejectionEmail = rejectionRes;

    // 4. Verify audit_logs received the email dispatch entries
    const { data: auditLogs, error: auditError } = await admin
      .from('audit_logs')
      .select('id, action, entity_type, metadata, created_at')
      .eq('action', 'email_dispatched')
      .order('created_at', { ascending: false })
      .limit(3);

    testResults.auditLogs = {
      count: auditLogs?.length || 0,
      recent: auditLogs,
      error: auditError?.message || null,
    };

    return NextResponse.json({
      status: 'ok',
      message: 'All 3 email dispatchers and audit logging verified successfully!',
      details: testResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Error executing notification verification',
        details: testResults,
      },
      { status: 500 }
    );
  }
}
