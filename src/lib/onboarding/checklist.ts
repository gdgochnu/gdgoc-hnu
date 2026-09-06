import { createAdminClient } from '@/lib/supabase/admin';
import { OnboardingChecklistItem } from '@/types';

export const DEFAULT_CHECKLIST_TEMPLATES = [
  { item: 'Read the code of conduct', sort_order: 1 },
  { item: 'Meet your Committee Head', sort_order: 2 },
  { item: "Join your committee's Drive folder", sort_order: 3 },
  { item: 'Complete your first task', sort_order: 4 },
];

/**
 * Generates a personalized onboarding checklist for an approved member.
 * Automatically checks off "Read the code of conduct" (as required during signup).
 */
export async function generateOnboardingChecklistForProfile(
  profileId: string,
  departmentId?: string | null
): Promise<OnboardingChecklistItem[]> {
  const admin = createAdminClient();

  // 1. Prevent duplicate generation if items already exist
  const { data: existingItems } = await admin
    .from('onboarding_checklist_items')
    .select('*')
    .eq('profile_id', profileId);

  if (existingItems && existingItems.length > 0) {
    return existingItems as OnboardingChecklistItem[];
  }

  // 2. Fetch templates matching global (null department) or specific department
  let templatesToUse: { id?: string; item: string; sort_order: number }[] = [];

  const { data: dbTemplates, error: templatesErr } = await admin
    .from('onboarding_checklist_templates')
    .select('id, item, sort_order, department_id')
    .or(departmentId ? `department_id.is.null,department_id.eq.${departmentId}` : 'department_id.is.null')
    .order('sort_order', { ascending: true });

  if (!templatesErr && dbTemplates && dbTemplates.length > 0) {
    templatesToUse = dbTemplates;
  } else {
    templatesToUse = DEFAULT_CHECKLIST_TEMPLATES;
  }

  const now = new Date().toISOString();

  // 3. Map templates to personalized items
  const itemsToInsert = templatesToUse.map((tmpl) => {
    const isCodeOfConduct = tmpl.item.toLowerCase().includes('code of conduct');
    return {
      profile_id: profileId,
      template_id: tmpl.id || null,
      label: tmpl.item,
      is_done: isCodeOfConduct,
      completed_at: isCodeOfConduct ? now : null,
    };
  });

  const { data: createdItems, error: insertErr } = await admin
    .from('onboarding_checklist_items')
    .insert(itemsToInsert)
    .select('*');

  if (insertErr) {
    console.error('Failed to generate onboarding checklist items:', insertErr);
    throw new Error(`Failed to generate onboarding checklist: ${insertErr.message}`);
  }

  return (createdItems || []) as OnboardingChecklistItem[];
}

/**
 * Toggles or updates an onboarding checklist item.
 * If all items become completed, awards the "onboarded" badge and points.
 */
export async function toggleChecklistItem(params: {
  itemId: string;
  profileId: string;
  isDone?: boolean;
}): Promise<{
  item: OnboardingChecklistItem;
  allCompleted: boolean;
  badgeAwarded: boolean;
}> {
  const admin = createAdminClient();
  const { itemId, profileId } = params;

  // 1. Fetch item
  const { data: existingItem, error: fetchErr } = await admin
    .from('onboarding_checklist_items')
    .select('*')
    .eq('id', itemId)
    .eq('profile_id', profileId)
    .single();

  if (fetchErr || !existingItem) {
    throw new Error('Checklist item not found or does not belong to this profile.');
  }

  const newStatus = typeof params.isDone === 'boolean' ? params.isDone : !existingItem.is_done;
  const now = new Date().toISOString();

  // 2. Update item
  const { data: updatedItem, error: updateErr } = await admin
    .from('onboarding_checklist_items')
    .update({
      is_done: newStatus,
      completed_at: newStatus ? now : null,
      updated_at: now,
    })
    .eq('id', itemId)
    .select('*')
    .single();

  if (updateErr || !updatedItem) {
    throw new Error(`Failed to update checklist item: ${updateErr?.message}`);
  }

  // 3. Check overall completion for this profile
  const { data: allItems } = await admin
    .from('onboarding_checklist_items')
    .select('id, is_done')
    .eq('profile_id', profileId);

  const total = allItems?.length || 0;
  const completedCount = allItems?.filter((i) => i.is_done).length || 0;
  const allCompleted = total > 0 && completedCount === total;

  let badgeAwarded = false;

  // 4. Award "Onboarded" badge if 100% complete
  if (allCompleted) {
    // Check if 'onboarded' badge exists in catalog
    const { data: badgeRecord } = await admin
      .from('badges')
      .select('id, code, name, points_reward')
      .eq('code', 'onboarded')
      .maybeSingle();

    let badgeId = badgeRecord?.id;

    // Fallback if badge wasn't seeded yet
    if (!badgeId) {
      const { data: newBadge } = await admin
        .from('badges')
        .insert({
          code: 'onboarded',
          name: 'Official Chapter Member',
          description: 'Completed onboarding checklist and joined committee',
          category: 'milestone',
          tier: 'bronze',
          points_reward: 10,
        })
        .select('id')
        .single();
      badgeId = newBadge?.id;
    }

    if (badgeId) {
      // Check if already awarded
      const { data: existingBadge } = await admin
        .from('member_badges')
        .select('id')
        .eq('profile_id', profileId)
        .eq('badge_id', badgeId)
        .maybeSingle();

      if (!existingBadge) {
        // Award badge
        await admin.from('member_badges').insert({
          profile_id: profileId,
          badge_id: badgeId,
          awarded_at: now,
          notes: 'Completed all new-member onboarding checklist items.',
        });
        badgeAwarded = true;

        // Award points in points_log
        await admin.from('points_log').insert({
          profile_id: profileId,
          action_key: 'onboarding_completed',
          points: 10,
          reason: 'Awarded for completing the new-member onboarding checklist.',
          season: '2026-Fall',
        });

        // Send celebration notification
        await admin.from('notifications').insert({
          profile_id: profileId,
          type: 'badge_awarded',
          title: 'Badge Unlocked: Official Chapter Member! 🏅',
          message: 'Congratulations! You have completed all onboarding steps and earned the "Onboarded" badge!',
          related_entity_type: 'badge',
          related_entity_id: badgeId,
          is_read: false,
        });
      }
    }
  }

  return {
    item: updatedItem as OnboardingChecklistItem,
    allCompleted,
    badgeAwarded,
  };
}

/**
 * Retrieves the current onboarding progress and items for a profile.
 */
export async function getProfileOnboardingProgress(profileId: string) {
  const admin = createAdminClient();

  const [itemsRes, badgesRes] = await Promise.all([
    admin
      .from('onboarding_checklist_items')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true }),
    admin
      .from('member_badges')
      .select('id, badge:badges(code, name, description, tier)')
      .eq('profile_id', profileId),
  ]);

  const items: OnboardingChecklistItem[] = (itemsRes.data || []) as OnboardingChecklistItem[];
  const total = items.length;
  const completed = items.filter((i) => i.is_done).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isComplete = total > 0 && completed === total;

  const hasOnboardedBadge = (badgesRes.data || []).some(
    (b: any) => b.badge?.code === 'onboarded'
  );

  return {
    total,
    completed,
    percentage,
    isComplete,
    hasOnboardedBadge,
    items,
  };
}

/**
 * Returns committee members who still have incomplete onboarding checklists.
 * Spec §4.15 & §4.25 (useful for Committee Heads during recruitment).
 */
export async function getCommitteeIncompleteOnboarding(departmentId: string) {
  const admin = createAdminClient();

  const { data: members } = await admin
    .from('profiles')
    .select('id, full_name, email, role, avatar_url')
    .eq('department_id', departmentId)
    .eq('status', 'active');

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);

  const { data: allItems } = await admin
    .from('onboarding_checklist_items')
    .select('id, profile_id, label, is_done')
    .in('profile_id', memberIds);

  const results = members.map((member) => {
    const memberItems = (allItems || []).filter((i) => i.profile_id === member.id);
    const total = memberItems.length;
    const completed = memberItems.filter((i) => i.is_done).length;
    const isComplete = total > 0 && completed === total;

    return {
      member,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      isComplete,
      pendingItems: memberItems.filter((i) => !i.is_done).map((i) => i.label),
    };
  });

  return results.filter((r) => !r.isComplete);
}
