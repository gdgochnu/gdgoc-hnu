import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createApprovalInstance } from '@/lib/approvals/approval-engine';
import { actOnApprovalStep } from '@/lib/approvals/approval-actions';

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
      .select('id, name, branch, head_id, co_head_id')
      .limit(1);

    if (deptErr || !depts || depts.length === 0) {
      return NextResponse.json({
        status: 'error',
        step: '8.4',
        error: 'No departments found.',
      }, { status: 500 });
    }

    const testDept = depts[0];

    // 2. Fetch profiles for leadership hierarchy
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

    const { data: committeeHeads } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .in('role', ['committee_head', 'committee_co_head'])
      .limit(1);

    const branchHead = branchHeads?.[0];
    const president = presidents?.[0];
    const committeeHead = committeeHeads?.[0] || {
      id: testDept.head_id || branchHead?.id || president?.id,
      role: 'committee_head',
    };

    if (!president || !branchHead) {
      return NextResponse.json({
        status: 'error',
        step: '8.4',
        error: 'President and Branch Head profiles are required in database to test Step 8.4.',
      }, { status: 500 });
    }

    // 3. Create test event draft
    const testTitle = `Tech Innovation Fair ${testRunId}`;
    const testSlug = `tech-innovation-fair-${testRunId}`;

    const { data: draftEvent, error: draftErr } = await admin
      .from('events')
      .insert({
        title: testTitle,
        slug: testSlug,
        event_date: '2026-12-25',
        department_id: testDept.id,
        status: 'draft',
        created_by: committeeHead.id,
      })
      .select()
      .single();

    if (draftErr || !draftEvent) {
      return NextResponse.json({
        status: 'error',
        step: '8.4',
        error: `Failed to create draft event: ${draftErr?.message}`,
      }, { status: 500 });
    }

    createdEventIds.push(draftEvent.id);

    // 4. Test Step 8.4: Wire "Submit for Review" → Approval Engine (Branch Head → President/Co-President)
    const { instance, computation } = await createApprovalInstance({
      workflowType: 'event_publish',
      entityId: draftEvent.id,
      submitterId: committeeHead.id,
      departmentId: testDept.id,
    });
    const isAutoApproved = computation.isAutoApproved;

    createdInstanceIds.push(instance.id);

    // Fetch generated steps
    const { data: steps, error: stepsErr } = await admin
      .from('approval_instance_steps')
      .select('*')
      .eq('instance_id', instance.id)
      .order('step_order');

    if (stepsErr || !steps || steps.length === 0) {
      return NextResponse.json({
        status: 'error',
        step: '8.4',
        error: 'Failed to generate approval steps for event_publish.',
      }, { status: 500 });
    }

    // Verification Criteria for Step 8.4:
    // - Committee Head stage MUST be skipped for event_publish (Spec §4.3 item 2)
    const hasCommitteeHeadStep = steps.some(s => s.approver_rule === 'committee_head');
    const passedSkippedCommitteeHead = !hasCommitteeHeadStep;

    // - Stage 1 MUST be Branch Head
    const step1 = steps.find(s => s.step_order === 1);
    const passedStep1BranchHead = step1?.approver_rule === 'branch_head';

    // - Stage 2 MUST be President / Co-President
    const step2 = steps.find(s => s.step_order === 2);
    const passedStep2President = step2?.approver_rule === 'president_or_co_president';

    // 5. Update event status to branch_review and link approval_instance_id
    const { data: eventSubmitted } = await admin
      .from('events')
      .update({
        status: 'branch_review',
        approval_instance_id: instance.id,
      })
      .eq('id', draftEvent.id)
      .select()
      .single();

    const passedEventStatusBranchReview = eventSubmitted?.status === 'branch_review' &&
      eventSubmitted?.approval_instance_id === instance.id;

    // 6. Test Stage 1 Approval by Branch Head → transitions event to pending_final_approval
    await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 1,
      action: 'approved',
      callerId: branchHead.id,
      notes: 'Branch Head endorsed event proposal and venue logistics.',
    });

    const { data: eventAfterStage1 } = await admin
      .from('events')
      .select('status')
      .eq('id', draftEvent.id)
      .single();

    const { data: instAfterStage1 } = await admin
      .from('approval_instances')
      .select('current_step, status')
      .eq('id', instance.id)
      .single();

    const passedStage1Endorsement = eventAfterStage1?.status === 'pending_final_approval' &&
      instAfterStage1?.current_step === 2;

    // 7. Test Stage 2 Approval by President → transitions event to approved
    await actOnApprovalStep({
      instanceId: instance.id,
      stepOrder: 2,
      action: 'approved',
      callerId: president.id,
      notes: 'Presidential final approval granted. Ready for publication.',
    });

    const { data: eventAfterStage2 } = await admin
      .from('events')
      .select('status')
      .eq('id', draftEvent.id)
      .single();

    const { data: instAfterStage2 } = await admin
      .from('approval_instances')
      .select('status, resolved_at')
      .eq('id', instance.id)
      .single();

    const passedStage2FinalApproval = eventAfterStage2?.status === 'approved' &&
      instAfterStage2?.status === 'approved' &&
      Boolean(instAfterStage2?.resolved_at);

    // 8. Test Presidential Auto-Approval (Spec §4.2 / §4.3)
    const { data: presEventDraft } = await admin
      .from('events')
      .insert({
        title: `Presidential Keynote ${testRunId}`,
        slug: `presidential-keynote-${testRunId}`,
        event_date: '2026-12-30',
        department_id: testDept.id,
        status: 'draft',
        created_by: president.id,
      })
      .select()
      .single();

    let passedPresidentAutoApproval = false;
    if (presEventDraft) {
      createdEventIds.push(presEventDraft.id);
      const presResult = await createApprovalInstance({
        workflowType: 'event_publish',
        entityId: presEventDraft.id,
        submitterId: president.id,
        departmentId: testDept.id,
      });

      createdInstanceIds.push(presResult.instance.id);
      passedPresidentAutoApproval = presResult.computation.isAutoApproved && presResult.instance.status === 'approved';
    }

    // 9. Cleanup test records
    await admin.from('approval_instance_steps').delete().in('instance_id', createdInstanceIds);
    await admin.from('approval_instances').delete().in('id', createdInstanceIds);
    await admin.from('events').delete().in('id', createdEventIds);

    const allPassed = Boolean(
      passedSkippedCommitteeHead &&
      passedStep1BranchHead &&
      passedStep2President &&
      passedEventStatusBranchReview &&
      passedStage1Endorsement &&
      passedStage2FinalApproval &&
      passedPresidentAutoApproval
    );

    return NextResponse.json({
      status: allPassed ? 'ok' : 'partial',
      step: '8.4',
      message: allPassed
        ? 'Step 8.4 Submit for Review → Approval Engine (Branch Head → President) verified successfully!'
        : 'Some Step 8.4 verifications failed.',
      verification: {
        allPassed,
        passedSkippedCommitteeHead,
        passedStep1BranchHead,
        passedStep2President,
        passedEventStatusBranchReview,
        passedStage1Endorsement,
        passedStage2FinalApproval,
        passedPresidentAutoApproval,
        stepsCount: steps.length,
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
      step: '8.4',
      error: err instanceof Error ? err.message : 'Unknown error during Step 8.4 verification',
    }, { status: 500 });
  }
}
