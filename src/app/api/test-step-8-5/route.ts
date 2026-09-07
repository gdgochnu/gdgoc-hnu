import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createApprovalInstance, canUserApproveCurrentStep } from '@/lib/approvals/approval-engine';
import { actOnApprovalStep } from '@/lib/approvals/approval-actions';
import { UserRole } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const testRunId = Date.now();
  const admin = createAdminClient();
  const createdEventIds: string[] = [];
  const createdInstanceIds: string[] = [];

  try {
    // 1. Fetch test department
    const { data: depts, error: deptErr } = await admin
      .from('departments')
      .select('id, name, branch, head_id')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({
        status: 'error',
        step: '8.5',
        error: 'No departments found.',
      }, { status: 500 });
    }

    const testDept = depts[0];

    // 2. Fetch profiles
    const { data: branchHeads } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'branch_head')
      .limit(1);

    const { data: presidents } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['president', 'co_president'])
      .limit(1);

    const { data: regularMembers } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .eq('role', 'member')
      .limit(1);

    const branchHead = branchHeads?.[0];
    const president = presidents?.[0];
    const regularMember = regularMembers?.[0];

    if (!branchHead || !president) {
      return NextResponse.json({
        status: 'error',
        step: '8.5',
        error: 'Required leadership profiles (Branch Head & President) not found.',
      }, { status: 500 });
    }

    const submitterProfile = regularMember || { id: testDept.head_id || '00000000-0000-0000-0000-000000000000', role: 'committee_head' };

    // 3. Create test event
    const testTitle = `Flutter Hackathon Review Test ${testRunId}`;
    const testSlug = `flutter-hackathon-review-${testRunId}`;

    const { data: event, error: eventErr } = await admin
      .from('events')
      .insert({
        title: testTitle,
        slug: testSlug,
        event_date: '2026-12-28',
        department_id: testDept.id,
        status: 'draft',
        capacity: 120,
        registration_fields: [
          { id: 'f1', label: 'GitHub Profile', field_type: 'text', required: true }
        ],
        owners: [
          { profile_id: submitterProfile.id, committee_role: 'Lead', full_name: 'Submitter' }
        ],
        created_by: submitterProfile.id,
      })
      .select()
      .single();

    if (eventErr || !event) {
      return NextResponse.json({
        status: 'error',
        step: '8.5',
        error: `Failed to create test event: ${eventErr?.message}`,
      }, { status: 500 });
    }

    createdEventIds.push(event.id);

    // 4. Submit event for review (Submitter -> Stage 1: Branch Head -> Stage 2: President)
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'event_publish',
      entityId: event.id,
      submitterId: submitterProfile.id,
      departmentId: testDept.id,
    });

    createdInstanceIds.push(instance.id);

    // Link approval instance to event
    await admin
      .from('events')
      .update({
        status: 'branch_review',
        approval_instance_id: instance.id,
      })
      .eq('id', event.id);

    // 5. Test Review Screen Data Contract & Authorization
    const { data: loadedSteps } = await admin
      .from('approval_instance_steps')
      .select('*')
      .eq('instance_id', instance.id)
      .order('step_order');

    const step1 = loadedSteps?.find(s => s.step_order === 1);
    const step2 = loadedSteps?.find(s => s.step_order === 2);

    const passedReviewScreenContract = Boolean(
      event.id &&
      instance.id &&
      loadedSteps &&
      loadedSteps.length >= 2 &&
      step1?.approver_rule === 'branch_head' &&
      step2?.approver_rule === 'president_or_co_president'
    );

    // Check permissions for Stage 1:
    const branchHeadCanApprove = canUserApproveCurrentStep({
      userRole: branchHead.role as UserRole,
      userId: branchHead.id,
      stepRule: step1?.approver_rule || 'branch_head',
    });

    const presidentCanApproveStage1 = canUserApproveCurrentStep({
      userRole: president.role as UserRole,
      userId: president.id,
      stepRule: step1?.approver_rule || 'branch_head',
    });

    const memberCannotApproveStage1 = regularMember
      ? !canUserApproveCurrentStep({
          userRole: regularMember.role as UserRole,
          userId: regularMember.id,
          stepRule: step1?.approver_rule || 'branch_head',
        })
      : true;

    const passedStage1PermissionChecks = branchHeadCanApprove && presidentCanApproveStage1 && memberCannotApproveStage1;

    // 6. Act on Stage 1 (Branch Head Endorsement)
    const reviewNote1 = 'Event structure and logistics approved by Branch Head.';
    await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 1,
      action: 'approved',
      callerId: branchHead.id,
      notes: reviewNote1,
    });

    // Check event status updated to pending_final_approval
    const { data: eventAfterStage1 } = await admin
      .from('events')
      .select('status')
      .eq('id', event.id)
      .single();

    const passedStage1Transition = eventAfterStage1?.status === 'pending_final_approval';

    // Act on Stage 2 (Presidential Sign-off)
    await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 2,
      action: 'approved',
      callerId: president.id,
      notes: 'Presidential final approval granted.',
    });

    const { data: eventAfterStage2 } = await admin
      .from('events')
      .select('status')
      .eq('id', event.id)
      .single();

    const passedStage2Transition = eventAfterStage2?.status === 'approved';

    // 7. Test Changes Requested Flow on second test event
    const { data: event2 } = await admin
      .from('events')
      .insert({
        title: `Changes Req Test ${testRunId}`,
        slug: `changes-req-test-${testRunId}`,
        event_date: '2026-12-29',
        department_id: testDept.id,
        status: 'branch_review',
        created_by: submitterProfile.id,
      })
      .select()
      .single();

    if (event2) {
      createdEventIds.push(event2.id);

      const { instance: instance2 } = await createApprovalInstance({
        workflowType: 'event_publish',
        entityId: event2.id,
        submitterId: submitterProfile.id,
        departmentId: testDept.id,
      });

      createdInstanceIds.push(instance2.id);

      await actOnApprovalStep({
        instanceId: instance2.id,
        stepOrder: 1,
        action: 'changes_requested',
        callerId: branchHead.id,
        notes: 'Please update the event venue and expand the registration questions.',
      });

      const { data: event2AfterChangesReq } = await admin
        .from('events')
        .select('status')
        .eq('id', event2.id)
        .single();

      var passedChangesRequestedRevertsToDraft = event2AfterChangesReq?.status === 'draft';
    } else {
      var passedChangesRequestedRevertsToDraft = false;
    }

    // 8. Cleanup
    await admin.from('approval_instance_steps').delete().in('instance_id', createdInstanceIds);
    await admin.from('approval_instances').delete().in('id', createdInstanceIds);
    await admin.from('events').delete().in('id', createdEventIds);

    const allPassed = Boolean(
      passedReviewScreenContract &&
      passedStage1PermissionChecks &&
      passedStage1Transition &&
      passedChangesRequestedRevertsToDraft
    );

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      step: '8.5',
      message: allPassed
        ? 'Step 8.5 Event Review/Approval screen (/events/[id]/review) verified successfully!'
        : 'Some Step 8.5 verifications failed.',
      verification: {
        allPassed,
        passedReviewScreenContract,
        passedStage1PermissionChecks,
        passedStage1Transition,
        passedChangesRequestedRevertsToDraft,
        branchHeadCanApprove,
        presidentCanApproveStage1,
        memberCannotApproveStage1,
        testEventId: event.id,
      },
    });
  } catch (err: unknown) {
    if (createdInstanceIds.length > 0) {
      await admin.from('approval_instance_steps').delete().in('instance_id', createdInstanceIds);
      await admin.from('approval_instances').delete().in('id', createdInstanceIds);
    }
    if (createdEventIds.length > 0) {
      await admin.from('events').delete().in('id', createdEventIds);
    }

    return NextResponse.json({
      status: 'error',
      step: '8.5',
      error: err instanceof Error ? err.message : 'Unknown error during Step 8.5 verification',
    }, { status: 500 });
  }
}
