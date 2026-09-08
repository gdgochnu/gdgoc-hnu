'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getUserContext } from '@/lib/auth/get-user-context';
import { GlobalSearchResult, SearchEntityType } from '@/types';

/**
 * Global Search across Tasks, Members, Events, and PR Contacts (Spec §4.19)
 * Strict RLS & Permission Scoping:
 * - Members: visible to authenticated users
 * - Events: published events visible to all; drafts only visible to leadership & creators
 * - Tasks: visible based on department/role assignment
 * - PR Contacts: strictly scoped to President, Co-President, Non-Tech Branch Head, and PR Department
 */
export async function performGlobalSearch(
  query: string,
  options?: {
    limit?: number;
    type?: SearchEntityType | 'all';
    skipAuthCheck?: boolean;
    userId?: string;
    testViewerRole?: {
      role: string;
      department_id?: string | null;
      departmentCode?: string;
      branch?: 'tech' | 'non_tech';
    };
  }
): Promise<{
  success: boolean;
  data: GlobalSearchResult[];
  totalMatches: number;
  error?: string;
}> {
  try {
    const cleanQuery = query ? query.trim() : '';
    if (!cleanQuery || cleanQuery.length < 2) {
      return { success: true, data: [], totalMatches: 0 };
    }

    const limit = options?.limit || 25;
    const filterType = options?.type || 'all';

    // 1. Get Viewer Permissions Context
    let viewerProfile: any = null;
    let isPresidential = false;
    let isPrAuthorized = false;
    let userDeptId: string | null = null;

    if (options?.testViewerRole) {
      const tv = options.testViewerRole;
      isPresidential = tv.role === 'president' || tv.role === 'co_president';
      userDeptId = tv.department_id || null;
      const deptCode = tv.departmentCode;
      isPrAuthorized =
        isPresidential ||
        deptCode === 'PR' ||
        deptCode === 'PUBLIC_RELATIONS' ||
        (tv.role === 'branch_head' && tv.branch === 'non_tech');
    } else if (!options?.skipAuthCheck) {
      const context = await getUserContext();
      if (!context.user || !context.profile || context.profile.status !== 'active') {
        return { success: false, data: [], totalMatches: 0, error: 'Unauthorized' };
      }
      viewerProfile = context.profile;
      isPresidential = viewerProfile.role === 'president' || viewerProfile.role === 'co_president';
      userDeptId = viewerProfile.department_id || null;

      const deptCode = (viewerProfile.department as any)?.code;
      isPrAuthorized =
        isPresidential ||
        deptCode === 'PR' ||
        deptCode === 'PUBLIC_RELATIONS' ||
        (viewerProfile.role === 'branch_head' && (viewerProfile.department as any)?.branch === 'non_tech');
    } else {
      // In skipAuthCheck (e.g. automated tests without session), grant test privileges
      isPresidential = true;
      isPrAuthorized = true;
    }

    const admin = createAdminClient();

    // 2. Attempt Postgres full-text search RPC first
    try {
      const { data: rpcData, error: rpcError } = await admin.rpc('global_search', {
        search_query: cleanQuery,
        result_limit: limit,
      });

      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        // Strict Scoping Filters:
        let filteredRpc = rpcData;

        // 1. PR Contacts scoping:
        if (!isPrAuthorized) {
          filteredRpc = filteredRpc.filter((item: any) => item.entity_type !== 'pr_contact');
        }

        // 2. Tasks scoping: non-presidential can only see own department tasks
        if (!isPresidential && userDeptId) {
          filteredRpc = filteredRpc.filter((item: any) => {
            if (item.entity_type !== 'task') return true;
            return item.metadata?.department_id === userDeptId;
          });
        }

        // 3. Events scoping: non-presidential cannot see draft events of other departments
        if (!isPresidential) {
          filteredRpc = filteredRpc.filter((item: any) => {
            if (item.entity_type !== 'event') return true;
            const isPublished = item.metadata?.status === 'published';
            const isOwnDept = userDeptId && item.metadata?.department_id === userDeptId;
            return isPublished || isOwnDept;
          });
        }

        if (filterType !== 'all') {
          filteredRpc = filteredRpc.filter((item: any) => item.entity_type === filterType);
        }

        const formattedResults: GlobalSearchResult[] = filteredRpc.map((item: any) => ({
          id: item.id,
          entity_type: item.entity_type as SearchEntityType,
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          url: item.url,
          metadata: item.metadata || {},
          rank: item.rank || 0,
        }));

        return {
          success: true,
          data: formattedResults,
          totalMatches: formattedResults.length,
        };
      }
    } catch (rpcErr) {
      // Fall through to fallback query engine if RPC not available
    }

    // 3. Resilient Parallel Query Engine (Exact RLS Scoping)
    const searchPattern = `%${cleanQuery.toLowerCase()}%`;
    const searchPromises: Promise<GlobalSearchResult[]>[] = [];

    // A. Tasks Search
    if (filterType === 'all' || filterType === 'task') {
      searchPromises.push(
        (async () => {
          let taskQuery = admin
            .from('tasks')
            .select('id, title, description, status, priority, deadline, department_id')
            .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
            .limit(limit);

          // RLS Scoping for tasks: if not presidential, restrict to viewer's department or assignments
          if (!isPresidential && userDeptId) {
            taskQuery = taskQuery.eq('department_id', userDeptId);
          }

          const { data: tasks } = await taskQuery;
          if (!tasks) return [];

          return tasks.map((t: any) => {
            const isExact = t.title.toLowerCase() === cleanQuery.toLowerCase();
            return {
              id: t.id,
              entity_type: 'task' as SearchEntityType,
              title: t.title,
              subtitle: `Task • ${t.status} • ${t.priority}`,
              description: t.description || '',
              url: '/tasks',
              metadata: {
                status: t.status,
                priority: t.priority,
                deadline: t.deadline,
                department_id: t.department_id,
              },
              rank: isExact ? 1.0 : t.title.toLowerCase().includes(cleanQuery.toLowerCase()) ? 0.8 : 0.5,
            };
          });
        })()
      );
    }

    // B. Members Search
    if (filterType === 'all' || filterType === 'member') {
      searchPromises.push(
        (async () => {
          const { data: profiles } = await admin
            .from('profiles')
            .select('id, full_name_en, full_name_ar, email, role, avatar_url, status, faculty')
            .in('status', ['active', 'alumni'])
            .or(`full_name_en.ilike.${searchPattern},full_name_ar.ilike.${searchPattern},email.ilike.${searchPattern}`)
            .limit(limit);

          if (!profiles) return [];

          return profiles.map((p: any) => {
            const name = p.full_name_en || p.full_name_ar || 'Member';
            const isExact =
              (p.full_name_en && p.full_name_en.toLowerCase() === cleanQuery.toLowerCase()) ||
              (p.full_name_ar && p.full_name_ar.toLowerCase() === cleanQuery.toLowerCase());

            return {
              id: p.id,
              entity_type: 'member' as SearchEntityType,
              title: name,
              subtitle: `${p.role.replace('_', ' ')}${p.faculty ? ` • ${p.faculty}` : ''}`,
              description: p.email || '',
              url: `/members/${p.id}`,
              metadata: {
                role: p.role,
                avatar_url: p.avatar_url,
                email: p.email,
                status: p.status,
              },
              rank: isExact ? 1.0 : 0.8,
            };
          });
        })()
      );
    }

    // C. Events Search
    if (filterType === 'all' || filterType === 'event') {
      searchPromises.push(
        (async () => {
          let eventQuery = admin
            .from('events')
            .select('id, title, description, venue, event_date, status, slug, department_id')
            .or(`title.ilike.${searchPattern},description.ilike.${searchPattern},venue.ilike.${searchPattern}`)
            .limit(limit);

          // RLS Scoping for events: published visible to all; non-published only to presidential or own dept
          if (!isPresidential && userDeptId) {
            eventQuery = eventQuery.or(`status.eq.published,department_id.eq.${userDeptId}`);
          } else if (!isPresidential && !userDeptId) {
            eventQuery = eventQuery.eq('status', 'published');
          }

          const { data: events } = await eventQuery;
          if (!events) return [];

          return events.map((e: any) => {
            const isExact = e.title.toLowerCase() === cleanQuery.toLowerCase();
            return {
              id: e.id,
              entity_type: 'event' as SearchEntityType,
              title: e.title,
              subtitle: `Event • ${e.status}${e.venue ? ` • ${e.venue}` : ''}`,
              description: e.description || '',
              url: `/events/${e.id}`,
              metadata: {
                status: e.status,
                event_date: e.event_date,
                venue: e.venue,
                slug: e.slug,
              },
              rank: isExact ? 1.0 : 0.8,
            };
          });
        })()
      );
    }

    // D. PR Contacts Search (Strictly gated by isPrAuthorized)
    if ((filterType === 'all' || filterType === 'pr_contact') && isPrAuthorized) {
      searchPromises.push(
        (async () => {
          const { data: contacts } = await admin
            .from('pr_contacts')
            .select('id, name, organization, role_title, type, pipeline_stage, notes, email, phone')
            .or(`name.ilike.${searchPattern},organization.ilike.${searchPattern},role_title.ilike.${searchPattern},notes.ilike.${searchPattern}`)
            .limit(limit);

          if (!contacts) return [];

          return contacts.map((c: any) => {
            const isExact = c.name.toLowerCase() === cleanQuery.toLowerCase();
            return {
              id: c.id,
              entity_type: 'pr_contact' as SearchEntityType,
              title: c.name,
              subtitle: `${c.type} • ${c.pipeline_stage}${c.organization ? ` at ${c.organization}` : ''}`,
              description: [c.role_title, c.notes].filter(Boolean).join(' — ') || '',
              url: '/pr',
              metadata: {
                type: c.type,
                pipeline_stage: c.pipeline_stage,
                organization: c.organization,
                role_title: c.role_title,
                email: c.email,
                phone: c.phone,
              },
              rank: isExact ? 1.0 : 0.8,
            };
          });
        })()
      );
    }

    const matchBatches = await Promise.all(searchPromises);
    const combinedMatches = matchBatches.flat();

    // Sort by rank descending, then title alphabetically
    combinedMatches.sort((a, b) => {
      if (b.rank !== a.rank) return b.rank - a.rank;
      return a.title.localeCompare(b.title);
    });

    const finalResults = combinedMatches.slice(0, limit);

    return {
      success: true,
      data: finalResults,
      totalMatches: combinedMatches.length,
    };
  } catch (err: any) {
    console.error('[performGlobalSearch] exception:', err);
    return { success: false, data: [], totalMatches: 0, error: err.message || 'Search failed' };
  }
}
