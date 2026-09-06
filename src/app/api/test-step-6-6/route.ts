import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { POST as delegatePOST } from '@/app/api/tasks/[id]/delegate/route';
import { PATCH as evidencePATCH } from '@/app/api/tasks/[id]/evidence/route';
import { POST as submitReviewPOST } from '@/app/api/tasks/[id]/submit-review/route';
import { POST as approveDelegationPOST } from '@/app/api/tasks/[id]/approve-delegation/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = createAdminClient();
  const testRunId = Date.now();

  try {
    // -------------------------------------------------------------
    // SETUP: Resolve Roles & Department according to Spec §4.2 Part B #7
    // President, Non-Tech Head, Media Department, Media Head, Media Members
    // -------------------------------------------------------------

    // 1. President
    const { data: presUser } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'president')
      .limit(1)
      .single();

    if (!presUser) {
      return NextResponse.json({ error: 'President profile not found.' }, { status: 500 });
    }

    // 2. Media Department (Branch: non_tech)
    let { data: mediaDept } = await admin
      .from('departments')
      .select('id, name, branch, head_id')
      .eq('branch', 'non_tech')
      .ilike('name', '%media%')
      .limit(1)
      .maybeSingle();

    if (!mediaDept) {
      // Find any non_tech department or create/update one
      const { data: anyNonTech } = await admin
        .from('departments')
        .select('id, name, branch, head_id')
        .eq('branch', 'non_tech')
        .limit(1)
        .maybeSingle();

      if (anyNonTech) {
        mediaDept = anyNonTech;
      } else {
        const { data: newDept, error: deptErr } = await admin
          .from('departments')
          .insert({
            name: 'Media & Branding Committee',
            code: `media_${testRunId.toString().slice(-4)}`,
            branch: 'non_tech',
          })
          .select('*')
          .single();

        if (deptErr || !newDept) throw new Error(`Failed to create Media department: ${deptErr?.message}`);
        mediaDept = newDept;
      }
    }

    if (!mediaDept) {
      return NextResponse.json({ error: 'Media department not found.' }, { status: 500 });
    }

    const resolvedDept = mediaDept;

    // 3. Non-Tech Head (Branch Head)
    let { data: nonTechHead } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'branch_head')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!nonTechHead) {
      return NextResponse.json({ error: 'Branch Head profile not found.' }, { status: 500 });
    }

    // 4. Media Head (Committee Head)
    let { data: mediaHead } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('role', 'committee_head')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!mediaHead) {
      return NextResponse.json({ error: 'Committee Head profile not found.' }, { status: 500 });
    }

    // Ensure mediaHead is associated with resolvedDept
    if (mediaHead.department_id !== resolvedDept.id) {
      await admin
        .from('profiles')
        .update({ department_id: resolvedDept.id })
        .eq('id', mediaHead.id);
      await admin
        .from('departments')
        .update({ head_id: mediaHead.id })
        .eq('id', resolvedDept.id);
    }

    // 5. Media Committee Members: Ensure at least 2 active members exist in resolvedDept
    const { data: memberProfiles } = await admin
      .from('profiles')
      .select('id, full_name, role, status, department_id')
      .in('role', ['member'])
      .limit(3);

    if (memberProfiles && memberProfiles.length > 0) {
      for (const m of memberProfiles) {
        await admin
          .from('profiles')
          .update({ status: 'active', department_id: resolvedDept.id })
          .eq('id', m.id);
      }
    }

    const { data: mediaMembers } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('department_id', resolvedDept.id)
      .eq('status', 'active')
      .neq('id', mediaHead.id)
      .limit(2);

    if (!mediaMembers || mediaMembers.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 active members in Media department for broadcast.' }, { status: 500 });
    }

    const member1 = mediaMembers[0];
    const member2 = mediaMembers[1];

    // -------------------------------------------------------------
    // SCENARIO STEP 1: President creates a task for the Non-Tech Head
    // -------------------------------------------------------------
    const rootTaskTitle = `[Spec Scenario] Launch Chapter Rebranding Campaign #${testRunId}`;
    const { data: rootTask, error: rootErr } = await admin
      .from('tasks')
      .insert({
        title: rootTaskTitle,
        description: 'Executive directive: Refresh GDGoC HNU visual identity for 2026.',
        department_id: resolvedDept.id,
        assignee_id: nonTechHead.id,
        created_by: presUser.id,
        assignment_mode: 'single',
        priority: 'high',
        status: 'in_progress',
        deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
      })
      .select('*')
      .single();

    if (rootErr || !rootTask) {
      throw new Error(`Step 1 failed: Could not create root task: ${rootErr?.message}`);
    }

    const step1Passed = rootTask.status === 'in_progress' && rootTask.assignee_id === nonTechHead.id;

    // -------------------------------------------------------------
    // SCENARIO STEP 2: Non-Tech Head delegates to Media Head (with notes)
    // -------------------------------------------------------------
    const step2Notes = 'Align all visual identity elements with Google Developer Groups 2026 guidelines.';
    const delegateReq1 = new NextRequest(`http://localhost:3000/api/tasks/${rootTask.id}/delegate?mock=branch_head`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_mode: 'single',
        recipient_profile_id: mediaHead.id,
        delegation_notes: step2Notes,
        title: `[Media Execution] Rebranding Visual Design #${testRunId}`,
        priority: 'high',
      }),
    });

    const delegateRes1 = await delegatePOST(delegateReq1, { params: Promise.resolve({ id: rootTask.id }) });
    const delegateData1 = await delegateRes1.json();
    if (!delegateRes1.ok) {
      throw new Error(`Step 2 failed: Delegation to Media Head failed: ${delegateData1.error}`);
    }

    const intermediateTaskId = delegateData1.childTask.id;

    // Verify Root Task is now 'delegated'
    const { data: step2RootTask } = await admin.from('tasks').select('*').eq('id', rootTask.id).single();
    const { data: intermediateTask } = await admin.from('tasks').select('*').eq('id', intermediateTaskId).single();

    const step2Passed =
      step2RootTask?.status === 'delegated' &&
      intermediateTask?.parent_task_id === rootTask.id &&
      intermediateTask?.assignee_id === mediaHead.id &&
      intermediateTask?.delegated_by_id === nonTechHead.id &&
      intermediateTask?.description.includes(step2Notes);

    // -------------------------------------------------------------
    // SCENARIO STEP 3: Media Head delegates as broadcast to all Media members
    // -------------------------------------------------------------
    const step3Notes = 'All media creatives: Create individual concept variants for chapter logo, social banner, and poster.';
    const delegateReq2 = new NextRequest(`http://localhost:3000/api/tasks/${intermediateTaskId}/delegate?mock=committee_head`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_mode: 'broadcast',
        recipient_department_id: resolvedDept.id,
        delegation_notes: step3Notes,
        title: `[Broadcast] Design Rebranding Concepts #${testRunId}`,
        priority: 'high',
      }),
    });

    const delegateRes2 = await delegatePOST(delegateReq2, { params: Promise.resolve({ id: intermediateTaskId }) });
    const delegateData2 = await delegateRes2.json();
    if (!delegateRes2.ok) {
      throw new Error(`Step 3 failed: Broadcast delegation failed: ${delegateData2.error}`);
    }

    const broadcastTaskId = delegateData2.childTask.id;

    // Verify intermediate task is now 'delegated' and broadcast child created
    const { data: step3IntermediateTask } = await admin.from('tasks').select('*').eq('id', intermediateTaskId).single();
    const { data: broadcastTask } = await admin.from('tasks').select('*').eq('id', broadcastTaskId).single();
    const { data: broadcastAssignees } = await admin.from('task_assignees').select('*').eq('task_id', broadcastTaskId);

    const step3Passed =
      step3IntermediateTask?.status === 'delegated' &&
      broadcastTask?.assignment_mode === 'broadcast' &&
      broadcastTask?.parent_task_id === intermediateTaskId &&
      broadcastAssignees &&
      broadcastAssignees.length >= 2;

    // -------------------------------------------------------------
    // SCENARIO STEP 4: Members submit their deliverables
    // -------------------------------------------------------------
    const member1Evidence = `https://drive.google.com/file/d/rebrand-concept-m1-${testRunId}`;
    const member2Evidence = `https://drive.google.com/file/d/rebrand-concept-m2-${testRunId}`;

    // Member 1 submission
    const submitM1Req = new NextRequest(
      `http://localhost:3000/api/tasks/${broadcastTaskId}/evidence?mock_user_id=${member1.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrl: member1Evidence }),
      }
    );
    const submitM1Res = await evidencePATCH(submitM1Req, { params: Promise.resolve({ id: broadcastTaskId }) });
    if (!submitM1Res.ok) throw new Error('Step 4 failed: Member 1 evidence submission failed');

    // Member 2 submission
    const submitM2Req = new NextRequest(
      `http://localhost:3000/api/tasks/${broadcastTaskId}/evidence?mock_user_id=${member2.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrl: member2Evidence }),
      }
    );
    const submitM2Res = await evidencePATCH(submitM2Req, { params: Promise.resolve({ id: broadcastTaskId }) });
    if (!submitM2Res.ok) throw new Error('Step 4 failed: Member 2 evidence submission failed');

    // Verify both assignees submitted
    const { data: freshAssignees } = await admin.from('task_assignees').select('*').eq('task_id', broadcastTaskId);
    const a1 = freshAssignees?.find((a) => a.profile_id === member1.id);
    const a2 = freshAssignees?.find((a) => a.profile_id === member2.id);

    const step4Passed =
      a1?.status === 'submitted' &&
      a1?.evidence_url === member1Evidence &&
      a2?.status === 'submitted' &&
      a2?.evidence_url === member2Evidence;

    // -------------------------------------------------------------
    // SCENARIO STEP 5: Media Head picks the best and submits upward
    // -------------------------------------------------------------
    const consolidationNotes = `Selected ${member1.full_name}'s deliverable (${member1Evidence}) as the official chapter rebranding concept.`;
    const consolidateReq = new NextRequest(
      `http://localhost:3000/api/tasks/${broadcastTaskId}/submit-review?mock=committee_head`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidence_url: member1Evidence,
          notes: consolidationNotes,
        }),
      }
    );

    const consolidateRes = await submitReviewPOST(consolidateReq, { params: Promise.resolve({ id: broadcastTaskId }) });
    const consolidateData = await consolidateRes.json();
    if (!consolidateRes.ok) {
      throw new Error(`Step 5 failed: Media Head submission failed: ${consolidateData.error}`);
    }

    // Verify Upward auto-submit: Intermediate Task flipped from 'delegated' to 'review'
    const { data: step5IntermediateTask } = await admin.from('tasks').select('*').eq('id', intermediateTaskId).single();
    const { data: nonTechHeadNotifs } = await admin
      .from('notifications')
      .select('*')
      .eq('profile_id', nonTechHead.id)
      .eq('related_entity_id', intermediateTaskId);

    const step5Passed =
      step5IntermediateTask?.status === 'review' &&
      step5IntermediateTask?.evidence_url === member1Evidence &&
      nonTechHeadNotifs &&
      nonTechHeadNotifs.length > 0;

    // -------------------------------------------------------------
    // SCENARIO STEP 6: Non-Tech Head reviews and submits upward
    // -------------------------------------------------------------
    const step6Notes = 'Non-Tech Branch reviewed the visual concepts and endorses this rebranding deliverable for executive approval.';
    const approveUpwardReq = new NextRequest(
      `http://localhost:3000/api/tasks/${intermediateTaskId}/approve-delegation?mock=branch_head`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_upward',
          notes: step6Notes,
        }),
      }
    );

    const approveUpwardRes = await approveDelegationPOST(approveUpwardReq, { params: Promise.resolve({ id: intermediateTaskId }) });
    const approveUpwardData = await approveUpwardRes.json();
    if (!approveUpwardRes.ok) {
      throw new Error(`Step 6 failed: Non-Tech Head upward submission failed: ${approveUpwardData.error}`);
    }

    // Verify Upward auto-submit to Root Task: Root task flipped from 'delegated' to 'review'
    const { data: step6RootTask } = await admin.from('tasks').select('*').eq('id', rootTask.id).single();
    const { data: presidentNotifs } = await admin
      .from('notifications')
      .select('*')
      .eq('profile_id', presUser.id)
      .eq('related_entity_id', rootTask.id);

    const step6Passed =
      step6RootTask?.status === 'review' &&
      step6RootTask?.evidence_url === member1Evidence &&
      presidentNotifs &&
      presidentNotifs.length > 0;

    // -------------------------------------------------------------
    // SCENARIO STEP 7: President gives final approval → Task closes Done
    // -------------------------------------------------------------
    const step7Notes = 'Executive approval granted! The new chapter visual identity is officially approved for immediate deployment.';
    const finalSignoffReq = new NextRequest(
      `http://localhost:3000/api/tasks/${rootTask.id}/approve-delegation?mock=president`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'final_signoff',
          notes: step7Notes,
        }),
      }
    );

    const finalSignoffRes = await approveDelegationPOST(finalSignoffReq, { params: Promise.resolve({ id: rootTask.id }) });
    const finalSignoffData = await finalSignoffRes.json();
    if (!finalSignoffRes.ok) {
      throw new Error(`Step 7 failed: President final sign-off failed: ${finalSignoffData.error}`);
    }

    // Verify that the whole chain closed as 'Done' (Spec §4.2 Part B #7)
    const [finalRootTask, finalIntermediateTask, finalBroadcastTask] = await Promise.all([
      admin.from('tasks').select('status, evidence_url').eq('id', rootTask.id).single(),
      admin.from('tasks').select('status, evidence_url').eq('id', intermediateTaskId).single(),
      admin.from('tasks').select('status, evidence_url').eq('id', broadcastTaskId).single(),
    ]);

    const step7Passed =
      finalRootTask.data?.status === 'done' &&
      finalIntermediateTask.data?.status === 'done' &&
      finalBroadcastTask.data?.status === 'done';

    // Verify final comments & audit logs
    const { data: finalAuditLogs } = await admin
      .from('audit_logs')
      .select('action')
      .in('entity_id', [rootTask.id, intermediateTaskId, broadcastTaskId]);

    const hasClosureAudit = finalAuditLogs?.some((a) =>
      a.action.includes('task_delegation_final_signed_off') || a.action.includes('task_delegation_chain_closed')
    );

    const allScenarioAssertionsPassed =
      step1Passed &&
      step2Passed &&
      step3Passed &&
      step4Passed &&
      step5Passed &&
      step6Passed &&
      step7Passed &&
      hasClosureAudit;

    return NextResponse.json({
      status: allScenarioAssertionsPassed ? 'ok' : 'assertion_failed',
      message: allScenarioAssertionsPassed
        ? 'Phase 6 - Step 6.6 Full Spec Scenario Confirmation PASSED flawlessly!'
        : 'One or more scenario steps failed.',
      scenario: {
        step1_presidentCreatesForNonTechHead: {
          passed: step1Passed,
          rootTaskId: rootTask.id,
          assignee: nonTechHead.full_name,
          status: rootTask.status,
        },
        step2_nonTechHeadDelegatesToMediaHead: {
          passed: step2Passed,
          intermediateTaskId,
          assignee: mediaHead.full_name,
          delegator: nonTechHead.full_name,
          notes: step2Notes,
          rootTaskStatus: step2RootTask?.status,
        },
        step3_mediaHeadBroadcastsToMediaMembers: {
          passed: step3Passed,
          broadcastTaskId,
          targetCommittee: resolvedDept.name,
          broadcastAssigneesCount: broadcastAssignees?.length,
          intermediateTaskStatus: step3IntermediateTask?.status,
        },
        step4_membersSubmitDeliverables: {
          passed: step4Passed,
          member1: { name: member1.full_name, status: a1?.status, evidence: a1?.evidence_url },
          member2: { name: member2.full_name, status: a2?.status, evidence: a2?.evidence_url },
        },
        step5_mediaHeadPicksBestAndSubmitsUp: {
          passed: step5Passed,
          selectedEvidence: member1Evidence,
          intermediateTaskStatusFlippedTo: step5IntermediateTask?.status,
          nonTechHeadNotified: !!(nonTechHeadNotifs && nonTechHeadNotifs.length > 0),
        },
        step6_nonTechHeadReviewsAndSubmitsUp: {
          passed: step6Passed,
          rootTaskStatusFlippedTo: step6RootTask?.status,
          presidentNotified: !!(presidentNotifs && presidentNotifs.length > 0),
        },
        step7_presidentFinalApprovalWholeChainClosesDone: {
          passed: step7Passed,
          rootTaskFinalStatus: finalRootTask.data?.status,
          intermediateTaskFinalStatus: finalIntermediateTask.data?.status,
          broadcastTaskFinalStatus: finalBroadcastTask.data?.status,
          wholeChainDone: step7Passed,
          hasClosureAudit,
        },
      },
      urls: {
        rootTaskUrl: `/tasks/${rootTask.id}`,
        intermediateTaskUrl: `/tasks/${intermediateTaskId}`,
        broadcastTaskUrl: `/tasks/${broadcastTaskId}`,
        broadcastReviewGridUrl: `/tasks/${broadcastTaskId}/review-submissions`,
      },
    });
  } catch (err: any) {
    console.error('Error during Step 6.6 full scenario verification:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error during scenario verification' },
      { status: 500 }
    );
  }
}
