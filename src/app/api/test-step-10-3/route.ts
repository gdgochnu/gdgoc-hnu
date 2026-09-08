import { NextResponse } from 'next/server';
import {
  getLowEngagementAlerts,
  createHrMemberNote,
  updateHrMemberNoteStatus,
  getMemberHrNotes,
} from '@/app/hr/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, any> = {
    test: 'Step 10.3 - Low-engagement alerts (3+ missed events) + HR notes/follow-up log',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  try {
    // 1. Fetch low engagement alerts
    const alertsSummary = await getLowEngagementAlerts();
    results.checks.alertsSummary = {
      success: true,
      totalAlerts: alertsSummary.totalAlerts,
      openFollowUpsCount: alertsSummary.openFollowUpsCount,
      resolvedFollowUpsCount: alertsSummary.resolvedFollowUpsCount,
      recentNotesCount: alertsSummary.recentNotes.length,
    };

    // 2. Determine target profile for testing HR notes
    let targetProfileId: string | null = null;
    if (alertsSummary.alerts.length > 0) {
      targetProfileId = alertsSummary.alerts[0].profileId;
      results.checks.alertDetailSample = {
        fullName: alertsSummary.alerts[0].fullName,
        email: alertsSummary.alerts[0].email,
        role: alertsSummary.alerts[0].role,
        missedEventsCount: alertsSummary.alerts[0].missedEventsCount,
        attendanceRate: alertsSummary.alerts[0].attendanceRate,
        hasOpenFollowUp: alertsSummary.alerts[0].hasOpenFollowUp,
      };
    } else {
      // Fallback: pick any active profile
      const admin = createAdminClient();
      const { data: profiles } = await admin.from('profiles').select('id').eq('status', 'active').limit(1);
      if (profiles && profiles.length > 0) {
        targetProfileId = profiles[0].id;
      }
    }

    if (!targetProfileId) {
      throw new Error('No target profile found to test HR note creation');
    }

    // 3. Test note creation
    const noteCreationRes = await createHrMemberNote(
      {
        profileId: targetProfileId,
        noteType: 'low_engagement',
        note: 'Automated test follow-up note for Step 10.3 verification',
        actionTaken: 'WhatsApp check-in initiated',
        status: 'open',
        missedEventsCount: 3,
      },
      true
    );

    let testNoteId: string | null = null;
    if (noteCreationRes.success && noteCreationRes.note) {
      testNoteId = noteCreationRes.note.id;
      results.checks.noteCreation = {
        success: true,
        noteId: noteCreationRes.note.id,
        status: noteCreationRes.note.status,
        noteType: noteCreationRes.note.noteType,
      };
    } else {
      results.checks.noteCreation = {
        success: false,
        error: noteCreationRes.error,
      };
    }

    // 4. Test note status update
    if (testNoteId) {
      const updateRes = await updateHrMemberNoteStatus(
        testNoteId,
        'resolved',
        'Resolved via automated test',
        true
      );
      results.checks.noteStatusUpdate = {
        success: updateRes.success,
        updatedStatus: 'resolved',
      };
    }

    // 5. Test member HR notes retrieval
    const memberNotes = await getMemberHrNotes(targetProfileId);
    results.checks.memberNotesRetrieval = {
      success: true,
      notesCount: memberNotes.length,
      hasRecentNote: memberNotes.length > 0,
    };

    results.overallSuccess = true;
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    results.overallSuccess = false;
    results.error = error?.message || String(error);
    return NextResponse.json(results, { status: 500 });
  }
}
