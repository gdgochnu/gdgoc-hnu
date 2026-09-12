'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

// Verify caller is Chapter President
async function verifyPresidentCaller() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  const admin = createAdminClient();
  let { data: profile } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .maybeSingle();

  // Local development bootstrap if no president exists
  if (!profile || !['president', 'co_president'].includes(profile.role) || profile.status !== 'active') {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'president');

    if (count === 0) {
      await admin
        .from('profiles')
        .update({ role: 'president', status: 'active' })
        .eq('id', user.id);
      profile = { id: user.id, role: 'president', status: 'active' };
    } else {
      throw new Error('Unauthorized: Chapter President privileges required.');
    }
  }

  return { user, profile, admin };
}

export interface CreateFacultyInput {
  name_ar: string;
  name_en: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateFacultyInput {
  name_ar?: string;
  name_en?: string;
  sort_order?: number;
  is_active?: boolean;
}

// 1. Create a new faculty
export async function createFaculty(input: CreateFacultyInput) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    const nameAr = input.name_ar?.trim();
    const nameEn = input.name_en?.trim();

    if (!nameAr || !nameEn) {
      return { success: false, error: 'Both Arabic and English faculty names are required.' };
    }

    // Default sort_order to maximum sort_order + 1 if not specified
    let sortOrder = input.sort_order;
    if (sortOrder === undefined || sortOrder === null) {
      const { data: maxRow } = await admin
        .from('faculty_options')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      sortOrder = (maxRow?.sort_order ?? 0) + 1;
    }

    const { data: newFaculty, error: insertError } = await admin
      .from('faculty_options')
      .insert({
        name_ar: nameAr,
        name_en: nameEn,
        sort_order: sortOrder,
        is_active: input.is_active ?? true,
      })
      .select('*')
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // Audit log
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'faculty_created',
      entity_type: 'faculty_options',
      entity_id: newFaculty.id,
      metadata: { name_ar: nameAr, name_en: nameEn, sort_order: sortOrder },
    });

    revalidatePath('/settings/faculties');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/', 'layout');

    return { success: true, faculty: newFaculty };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create faculty.' };
  }
}

// 2. Update an existing faculty
export async function updateFaculty(id: string, input: UpdateFacultyInput) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    if (!id) return { success: false, error: 'Faculty ID is required.' };

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name_ar !== undefined) {
      const nameAr = input.name_ar.trim();
      if (!nameAr) return { success: false, error: 'Arabic name cannot be empty.' };
      updates.name_ar = nameAr;
    }

    if (input.name_en !== undefined) {
      const nameEn = input.name_en.trim();
      if (!nameEn) return { success: false, error: 'English name cannot be empty.' };
      updates.name_en = nameEn;
    }

    if (input.sort_order !== undefined) {
      updates.sort_order = Number(input.sort_order);
    }

    if (input.is_active !== undefined) {
      updates.is_active = Boolean(input.is_active);
    }

    const { data: updatedFaculty, error: updateError } = await admin
      .from('faculty_options')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Audit log
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'faculty_updated',
      entity_type: 'faculty_options',
      entity_id: id,
      metadata: updates,
    });

    revalidatePath('/settings/faculties');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/', 'layout');

    return { success: true, faculty: updatedFaculty };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update faculty.' };
  }
}

// 3. Quick Toggle Active/Inactive
export async function toggleFacultyActive(id: string, currentStatus: boolean) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    const newStatus = !currentStatus;

    const { data: updatedFaculty, error: updateError } = await admin
      .from('faculty_options')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'faculty_status_toggled',
      entity_type: 'faculty_options',
      entity_id: id,
      metadata: { is_active: newStatus },
    });

    revalidatePath('/settings/faculties');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/', 'layout');

    return { success: true, is_active: newStatus };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to toggle faculty status.' };
  }
}

// 4. Move Faculty Order (Up or Down)
export async function moveFacultyOrder(id: string, direction: 'up' | 'down') {
  try {
    const { admin } = await verifyPresidentCaller();

    // Fetch all faculties sorted
    const { data: allFaculties } = await admin
      .from('faculty_options')
      .select('id, sort_order')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!allFaculties || allFaculties.length <= 1) {
      return { success: true };
    }

    const currentIndex = allFaculties.findIndex((f) => f.id === id);
    if (currentIndex === -1) return { success: false, error: 'Faculty not found.' };

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= allFaculties.length) {
      // Already at top or bottom
      return { success: true };
    }

    const currentItem = allFaculties[currentIndex];
    const targetItem = allFaculties[targetIndex];

    // Swap sort orders
    let currentOrder = currentItem.sort_order;
    let targetOrder = targetItem.sort_order;

    if (currentOrder === targetOrder) {
      // If equal, space them out
      currentOrder = targetIndex;
      targetOrder = currentIndex;
    }

    await Promise.all([
      admin.from('faculty_options').update({ sort_order: targetOrder }).eq('id', currentItem.id),
      admin.from('faculty_options').update({ sort_order: currentOrder }).eq('id', targetItem.id),
    ]);

    revalidatePath('/settings/faculties');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reorder faculty.' };
  }
}

// 5. Delete Faculty
export async function deleteFaculty(id: string) {
  try {
    const { user, admin } = await verifyPresidentCaller();

    const { error: deleteError } = await admin
      .from('faculty_options')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'faculty_deleted',
      entity_type: 'faculty_options',
      entity_id: id,
    });

    revalidatePath('/settings/faculties');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete faculty.' };
  }
}
