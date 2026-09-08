import { NextResponse } from 'next/server';
import { performGlobalSearch } from '@/app/search/actions';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const admin = createAdminClient();

    // 1. Get or create sample PR contact for testing
    let { data: sampleContact } = await admin
      .from('pr_contacts')
      .select('id, name, organization')
      .limit(1)
      .single();

    if (!sampleContact) {
      const { data: newContact } = await admin
        .from('pr_contacts')
        .insert({
          name: 'Confidential Partner Sponsor',
          organization: 'Google Developers HQ',
          role_title: 'Sponsorship Director',
          type: 'sponsor',
          pipeline_stage: 'negotiating',
          notes: 'Sensitive financial discussions',
        })
        .select('id, name, organization')
        .single();
      sampleContact = newContact;
    }

    const prSearchQuery = sampleContact?.name?.split(' ')[0] || 'Partner';

    // 2. Test PR Scoping: President vs PR Member vs Tech Member
    // Case A: President
    const presidentSearch = await performGlobalSearch(prSearchQuery, {
      testViewerRole: {
        role: 'president',
      },
    });
    const presidentFoundPr = presidentSearch.data.some((r) => r.entity_type === 'pr_contact');

    results['1_president_can_access_pr_contacts'] = {
      pass: presidentFoundPr,
      totalResults: presidentSearch.totalMatches,
      foundPrContact: presidentFoundPr,
    };

    // Case B: PR Department Member
    const prMemberSearch = await performGlobalSearch(prSearchQuery, {
      testViewerRole: {
        role: 'member',
        departmentCode: 'PR',
      },
    });
    const prMemberFoundPr = prMemberSearch.data.some((r) => r.entity_type === 'pr_contact');

    results['2_pr_member_can_access_pr_contacts'] = {
      pass: prMemberFoundPr,
      totalResults: prMemberSearch.totalMatches,
      foundPrContact: prMemberFoundPr,
    };

    // Case C: Non-PR General / Tech Member (MUST NOT LEAK PR CONTACTS!)
    const techMemberSearch = await performGlobalSearch(prSearchQuery, {
      testViewerRole: {
        role: 'member',
        departmentCode: 'WEB_DEV',
        branch: 'tech',
      },
    });
    const techMemberFoundPr = techMemberSearch.data.some((r) => r.entity_type === 'pr_contact');

    results['3_tech_member_zero_pr_contact_leak'] = {
      pass: !techMemberFoundPr, // MUST BE FALSE to prevent data leak!
      prContactsReturned: techMemberSearch.data.filter((r) => r.entity_type === 'pr_contact').length,
      leaked: techMemberFoundPr,
    };

    // 3. Test Task Scoping: Department Isolation
    // Get two distinct departments
    const { data: departments } = await admin
      .from('departments')
      .select('id, name, code')
      .limit(2);

    if (departments && departments.length >= 2) {
      const deptA = departments[0];
      const deptB = departments[1];

      // Query tasks with a broad query as Dept A member
      const deptAMemberSearch = await performGlobalSearch('Task', {
        type: 'task',
        testViewerRole: {
          role: 'member',
          department_id: deptA.id,
          departmentCode: deptA.code,
        },
      });

      // Confirm no tasks from Dept B are returned
      const leakedOtherDeptTasks = deptAMemberSearch.data.some(
        (t) => t.metadata?.department_id && t.metadata.department_id === deptB.id
      );

      results['4_department_task_isolation_no_leak'] = {
        pass: !leakedOtherDeptTasks,
        deptAId: deptA.id,
        deptBId: deptB.id,
        tasksReturned: deptAMemberSearch.totalMatches,
        leakedOtherDeptTasks,
      };
    } else {
      results['4_department_task_isolation_no_leak'] = {
        pass: true,
        note: 'Fewer than 2 departments configured',
      };
    }

    // 4. Test Event Scoping: Draft events of other departments not leaked
    const draftEventQuery = await admin
      .from('events')
      .select('id, title, department_id, status')
      .eq('status', 'draft')
      .limit(1)
      .maybeSingle();

    if (draftEventQuery.data) {
      const draftEvent = draftEventQuery.data;
      const otherDeptMemberSearch = await performGlobalSearch(draftEvent.title, {
        type: 'event',
        testViewerRole: {
          role: 'member',
          department_id: '00000000-0000-0000-0000-000000000000', // unrelated dept
        },
      });

      const leakedDraftEvent = otherDeptMemberSearch.data.some((e) => e.id === draftEvent.id);

      results['5_draft_events_not_leaked_to_unrelated_members'] = {
        pass: !leakedDraftEvent,
        draftEventTitle: draftEvent.title,
        leaked: leakedDraftEvent,
      };
    } else {
      results['5_draft_events_not_leaked_to_unrelated_members'] = {
        pass: true,
        note: 'No draft events found in database to test',
      };
    }

    const allPassed = Object.values(results).every((r: any) => r.pass);

    return NextResponse.json({
      success: allPassed,
      step: '12.3',
      title: 'Confirm results are correctly scoped by the viewers existing RLS permissions (no data leaks through search)',
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stack: err.stack,
      },
      { status: 500 }
    );
  }
}
