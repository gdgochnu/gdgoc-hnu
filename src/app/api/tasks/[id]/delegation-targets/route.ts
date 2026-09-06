import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    let callerId = user?.id;

    // Check query param for mock development testing
    const { searchParams } = new URL(req.url);
    const mockRole = searchParams.get('mock');

    if ((!callerId || mockRole) && mockRole && process.env.NODE_ENV !== 'production') {
      const { data: mockUser } = await admin
        .from('profiles')
        .select('id, role, department_id')
        .eq('role', mockRole)
        .limit(1)
        .maybeSingle();

      if (mockUser) callerId = mockUser.id;
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // 1. Fetch caller profile
    const { data: callerProfile, error: callerErr } = await admin
      .from('profiles')
      .select('id, full_name, role, department_id')
      .eq('id', callerId)
      .single();

    if (callerErr || !callerProfile) {
      return NextResponse.json({ error: 'Caller profile not found' }, { status: 404 });
    }

    // 2. Fetch target task
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select(`
        id,
        title,
        status,
        department_id,
        assignee_id,
        departments:department_id (id, name, code, branch)
      `)
      .eq('id', taskId)
      .single();

    if (taskErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const callerRole = callerProfile.role;
    const isPresident = callerRole === 'president' || callerRole === 'co_president';
    const isBranchHead = callerRole === 'branch_head';
    const isCommitteeHead = callerRole === 'committee_head' || callerRole === 'committee_co_head';

    if (!isPresident && !isBranchHead && !isCommitteeHead) {
      return NextResponse.json(
        { error: 'Members do not have downstream delegation authority' },
        { status: 403 }
      );
    }

    // Determine caller's branch if Branch Head
    let branchName: 'tech' | 'non_tech' | null = null;
    if (isBranchHead && callerProfile.department_id) {
      const { data: dept } = await admin
        .from('departments')
        .select('branch')
        .eq('id', callerProfile.department_id)
        .single();
      branchName = dept?.branch || null;
    }

    // 3. Fetch eligible departments for delegation/broadcast
    let deptQuery = admin.from('departments').select('id, name, code, branch');
    if (isBranchHead && branchName) {
      deptQuery = deptQuery.eq('branch', branchName);
    } else if (isCommitteeHead && callerProfile.department_id) {
      deptQuery = deptQuery.eq('id', callerProfile.department_id);
    }

    const { data: eligibleDepts } = await deptQuery.order('name');
    const deptIds = (eligibleDepts || []).map((d) => d.id);

    // 4. Fetch candidate profiles
    let profilesQuery = admin
      .from('profiles')
      .select('id, full_name, role, position, avatar_url, department_id')
      .eq('status', 'active')
      .neq('id', callerId);

    if (isPresident) {
      // President can delegate to Branch Heads, Committee Heads, or Members
      profilesQuery = profilesQuery.in('role', ['branch_head', 'committee_head', 'committee_co_head', 'member']);
    } else if (isBranchHead) {
      // Branch Head can delegate to Committee Heads and Members under their branch
      if (deptIds.length > 0) {
        profilesQuery = profilesQuery
          .in('department_id', deptIds)
          .in('role', ['committee_head', 'committee_co_head', 'member']);
      } else {
        profilesQuery = profilesQuery.in('role', ['committee_head', 'committee_co_head', 'member']);
      }
    } else if (isCommitteeHead) {
      // Committee Head can delegate only to members of their committee
      profilesQuery = profilesQuery
        .eq('department_id', callerProfile.department_id)
        .eq('role', 'member');
    }

    const { data: candidateProfiles } = await profilesQuery.order('full_name');

    // Count active members per department for broadcast pills
    const { data: memberCounts } = await admin
      .from('profiles')
      .select('department_id')
      .eq('status', 'active');

    const countsMap: Record<string, number> = {};
    (memberCounts || []).forEach((m) => {
      if (m.department_id) {
        countsMap[m.department_id] = (countsMap[m.department_id] || 0) + 1;
      }
    });

    const enrichedDepts = (eligibleDepts || []).map((d) => ({
      ...d,
      memberCount: countsMap[d.id] || 0,
    }));

    return NextResponse.json({
      status: 'ok',
      caller: {
        id: callerProfile.id,
        role: callerRole,
        full_name: callerProfile.full_name,
      },
      departments: enrichedDepts,
      candidates: candidateProfiles || [],
    });
  } catch (err: any) {
    console.error('Error fetching delegation targets:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
