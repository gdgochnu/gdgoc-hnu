'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface ProfileFormData {
  fullName: string;
  phone: string;
  universityId: string;
  faculty: string;
  academicYear: string;
  departmentId: string;
  position: string;
  skills: string[];
  portfolioUrl?: string;
  motivation: string;
  howHeard: string;
  availabilityHours: number;
  agreeCodeOfConduct: boolean;
}

export async function submitProfileCompletion(formData: ProfileFormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Unauthorized: You must be signed in with Google to complete your profile.' };
  }

  // Basic server-side validation
  if (!formData.fullName?.trim()) return { success: false, error: 'Full name is required.' };
  if (!formData.phone?.trim()) return { success: false, error: 'Phone number is required.' };
  if (!formData.universityId?.trim()) return { success: false, error: 'University / Student ID is required.' };
  if (!formData.faculty?.trim()) return { success: false, error: 'Faculty / College is required.' };
  if (!formData.academicYear?.trim()) return { success: false, error: 'Academic year is required.' };
  if (!formData.departmentId?.trim()) return { success: false, error: 'Target committee selection is required.' };
  if (!formData.motivation?.trim()) return { success: false, error: 'Motivation statement is required.' };
  if (!formData.agreeCodeOfConduct) return { success: false, error: 'You must agree to the Code of Conduct.' };

  try {
    const admin = createAdminClient();

    // 1. Upsert profiles table so it always succeeds whether the row already exists or not
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: formData.fullName.trim(),
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        phone: formData.phone.trim(),
        university_id: formData.universityId.trim(),
        faculty: formData.faculty.trim(),
        academic_year: formData.academicYear.trim(),
        department_id: formData.departmentId,
        position: formData.position?.trim() || 'Member',
        skills: formData.skills || [],
        portfolio_url: formData.portfolioUrl?.trim() || null,
        motivation: formData.motivation.trim(),
        how_heard: formData.howHeard || 'Social Media',
        availability_hours: Number(formData.availabilityHours) || 5,
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting profile:', upsertError);
      return { success: false, error: upsertError.message };
    }

    // 2. Check or create approval instance
    const { data: existingInstance } = await admin
      .from('approval_instances')
      .select('id')
      .eq('workflow_type', 'account_approval')
      .eq('entity_id', user.id)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (!existingInstance) {
      const { data: newInstance } = await admin
        .from('approval_instances')
        .insert({
          workflow_type: 'account_approval',
          entity_id: user.id,
          current_step: 1,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (newInstance) {
        await admin.from('approval_instance_steps').insert({
          instance_id: newInstance.id,
          step_order: 1,
          approver_rule: 'president_or_co_president',
          status: 'pending',
        });
      }
    }

    // 3. Log to immutable audit_logs
    await admin.from('audit_logs').insert({
      actor_id: user.id,
      action: 'account_submitted_for_review',
      entity_type: 'profile',
      entity_id: user.id,
      metadata: {
        department_id: formData.departmentId,
        full_name: formData.fullName,
        email: user.email,
      },
    });

    // 4. Notify President & Co-President
    const { data: leadership } = await admin
      .from('profiles')
      .select('id')
      .in('role', ['president', 'co_president'])
      .eq('status', 'active');

    if (leadership && leadership.length > 0) {
      const notifs = leadership.map((leader) => ({
        profile_id: leader.id,
        type: 'account_approval',
        title: 'New Member Application Pending',
        message: `${formData.fullName} applied for ${formData.position || 'Member'} and is awaiting approval.`,
        related_entity_type: 'profile',
        related_entity_id: user.id,
      }));
      await admin.from('notifications').insert(notifs);
    }

    revalidatePath('/', 'layout');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/onboarding/status');
    revalidatePath('/approvals');

    return { success: true };
  } catch (err: unknown) {
    console.error('Unexpected error submitting profile:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error occurred' };
  }
}
