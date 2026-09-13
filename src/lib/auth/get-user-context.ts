import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserRole, ProfileStatus, DepartmentBranch } from '@/types';

export interface UserContextDepartment {
  id: string;
  name: string;
  code: string;
  branch: DepartmentBranch;
}

export interface UserContextProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  status: ProfileStatus;
  position: string | null;
  department_id: string | null;
  department?: UserContextDepartment | null;
}

export interface UserContext {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: UserContextProfile | null;
  pendingApprovalsCount: number;
  unreadNotificationsCount: number;
}

interface UserContextCacheEntry {
  context: UserContext;
  expiresAt: number;
}

const userContextCache = new Map<string, UserContextCacheEntry>();
const CONTEXT_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Clear cached user context on profile mutation or signout
 */
export function invalidateUserContextCache(userId?: string) {
  if (userId) {
    userContextCache.delete(userId);
  } else {
    userContextCache.clear();
  }
}

/**
 * Highly optimized, per-request cached User Context.
 * Uses React cache() to deduplicate calls within the same render pass,
 * memory cache to accelerate navigations, and Promise.all() for parallelism.
 */
export const getUserContext = cache(async (): Promise<UserContext> => {
  let user = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (authErr) {
    console.warn('[getUserContext] Auth user fetch exception:', authErr);
  }

  if (!user) {
    return {
      user: null,
      profile: null,
      pendingApprovalsCount: 0,
      unreadNotificationsCount: 0,
    };
  }

  // Fast memory cache check for rapid page-to-page navigation
  const cached = userContextCache.get(user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.context;
  }

  const admin = createAdminClient();

  // Run initial queries in parallel
  const [profileResult, deptResult, unreadResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, status, position, department_id')
      .eq('id', user.id)
      .maybeSingle(),
    admin
      .from('departments')
      .select('id, name, code, branch'),
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('is_read', false),
  ]);

  let profile = profileResult.data;

  // Transient retry if query encountered a network hiccup
  if (!profile && profileResult.error) {
    console.warn('[getUserContext] Transient profile fetch error, retrying once:', profileResult.error.message);
    const retry = await admin
      .from('profiles')
      .select('id, full_name, email, avatar_url, role, status, position, department_id')
      .eq('id', user.id)
      .maybeSingle();
    profile = retry.data;
  }

  const deptList = deptResult.data || [];
  const deptMap = new Map(deptList.map((d) => [d.id, d]));

  // Early bootstrap if no profile exists at all
  if (!profile) {
    return {
      user: { id: user.id, email: user.email },
      profile: null,
      pendingApprovalsCount: 0,
      unreadNotificationsCount: 0,
    };
  }

  // Resolve department in memory instantly (0ms)
  const department = profile.department_id ? deptMap.get(profile.department_id) || null : null;

  // If user has leadership privileges, fetch pending count
  let pendingApprovalsCount = 0;
  const isLeadership = ['president', 'co_president', 'branch_head', 'committee_head', 'committee_co_head'].includes(profile.role);
  
  if (isLeadership && profile.status === 'active') {
    let pendingQuery = admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_review');

    if (['committee_head', 'committee_co_head'].includes(profile.role) && profile.department_id) {
      pendingQuery = pendingQuery.eq('department_id', profile.department_id);
    }

    const { count } = await pendingQuery;
    pendingApprovalsCount = count || 0;
  }

  const result: UserContext = {
    user: { id: user.id, email: user.email },
    profile: {
      ...profile,
      department,
    },
    pendingApprovalsCount,
    unreadNotificationsCount: unreadResult.count || 0,
  };

  userContextCache.set(user.id, {
    context: result,
    expiresAt: Date.now() + CONTEXT_CACHE_TTL_MS,
  });

  return result;
});
