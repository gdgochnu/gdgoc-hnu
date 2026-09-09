import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRecognitionWallData,
  sendShoutOut,
} from '@/lib/gamification/recognition-engine';
import { fetchRecognitionWallAction } from '@/app/gamification/actions';

/**
 * GET /api/test-step-19-7
 * Verify: Recognition Wall & Live Feed Engine (§4.13)
 * Tests:
 *   1. Member of the Month calculation & spotlight structure
 *   2. Live Recognition Feed aggregation (badges earned + kudos/shout-outs + point awards)
 *   3. Peer Shout-Out creation flow (+15 bonus points & in-app notification)
 *   4. Server action fetchRecognitionWallAction integration
 */
export async function GET() {
  const results: Record<string, unknown> = {};
  const admin = createAdminClient();

  // Test 1: Recognition Wall Data & Member of the Month
  try {
    const wallData = await getRecognitionWallData(10);

    results['1_recognition_wall_data'] = {
      hasMemberOfTheMonth: !!wallData.memberOfTheMonth,
      motm: wallData.memberOfTheMonth
        ? {
            name: wallData.memberOfTheMonth.fullName,
            dept: wallData.memberOfTheMonth.departmentCode,
            tier: wallData.memberOfTheMonth.tier,
            monthlyPoints: wallData.memberOfTheMonth.monthlyPoints,
            totalPoints: wallData.memberOfTheMonth.totalPoints,
            month: wallData.memberOfTheMonth.monthName,
          }
        : null,
      feedItemCount: wallData.feed.length,
      sampleFeedItem: wallData.feed[0]
        ? {
            type: wallData.feed[0].type,
            title: wallData.feed[0].title,
            recipient: wallData.feed[0].recipient.name,
            points: wallData.feed[0].points,
            message: wallData.feed[0].message,
          }
        : null,
    };
  } catch (e: any) {
    results['1_recognition_wall_data'] = { error: e.message };
  }

  // Test 2: Live Feed Sorting & Types
  try {
    const wallData = await getRecognitionWallData(20);
    const isSorted = wallData.feed.every((item, idx, arr) => {
      if (idx === 0) return true;
      return new Date(arr[idx - 1].timestamp).getTime() >= new Date(item.timestamp).getTime();
    });

    const hasTypes = {
      hasBadges: wallData.feed.some((f) => f.type === 'badge_earned'),
      hasPoints: wallData.feed.some((f) => f.type === 'points_award' || f.type === 'shoutout'),
    };

    results['2_feed_sorting_and_types'] = {
      isChronologicallyDescending: isSorted,
      feedComposition: hasTypes,
    };
  } catch (e: any) {
    results['2_feed_sorting_and_types'] = { error: e.message };
  }

  // Test 3: Peer Shout-Out Creation Flow
  try {
    // Pick two active members for testing
    const { data: members } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('status', 'active')
      .limit(2);

    if (members && members.length >= 2) {
      const sender = members[0];
      const recipient = members[1];

      const shoutOutRes = await sendShoutOut({
        senderProfileId: sender.id,
        targetProfileId: recipient.id,
        message: 'Outstanding leadership and support during chapter setup!',
        points: 15,
      });

      // Verify points log entry created
      const { data: logEntry } = await admin
        .from('points_log')
        .select('id, points, reason, action_key')
        .eq('profile_id', recipient.id)
        .eq('action_key', 'shoutout')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Verify notification created
      const { data: notif } = await admin
        .from('notifications')
        .select('id, title, message')
        .eq('recipient_profile_id', recipient.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      results['3_peer_shoutout_flow'] = {
        success: shoutOutRes.success,
        pointsAwarded: shoutOutRes.pointsAwarded,
        logVerified: !!logEntry && logEntry.points === 15,
        notificationVerified: !!notif && notif.title.includes('Shout-out'),
      };
    } else {
      results['3_peer_shoutout_flow'] = { error: 'Insufficient active members for shout-out test' };
    }
  } catch (e: any) {
    results['3_peer_shoutout_flow'] = { error: e.message };
  }

  // Test 4: Server Action Execution
  try {
    const actionRes = await fetchRecognitionWallAction(5);
    results['4_server_action'] = {
      success: actionRes.success,
      hasData: !!actionRes.data,
      feedLength: actionRes.data?.feed.length,
    };
  } catch (e: any) {
    results['4_server_action'] = { error: e.message };
  }

  return NextResponse.json(results);
}
