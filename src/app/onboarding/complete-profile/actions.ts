'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { notifyNewAccountPending } from '@/lib/notifications/triggers';

export interface ProfileFormData {
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string;
  phone: string;
  whatsappNumber: string;
  faculty: string;
  departmentMajor: string;
  academicYear: number;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  departmentId: string;
  position: string;
  motivation: string;
  howHeard: string;
  availabilityHours: number;
  agreeCodeOfConduct: boolean;
}

function normalizeEgyptianPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  if (/^01[0125]\d{8}$/.test(cleaned)) return cleaned;
  if (/^2001[0125]\d{8}$/.test(cleaned)) return cleaned.slice(2);
  if (/^201[0125]\d{8}$/.test(cleaned)) return '0' + cleaned.slice(2);
  return null;
}

export async function submitProfileCompletion(formData: ProfileFormData) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'Unauthorized: You must be signed in with Google to complete your profile.' };
  }

  // 1. Validation: Arabic 4-part name (min 4 words)
  const nameArTrimmed = formData.fullNameAr?.trim() || '';
  const nameArWords = nameArTrimmed.split(/\s+/).filter(Boolean);
  if (nameArWords.length < 4) {
    return { success: false, error: 'الاسم الرباعي باللغة العربية يجب أن يتكون من 4 أسماء على الأقل (Full name in Arabic must contain at least 4 parts).' };
  }
  // Check that it contains Arabic characters
  if (!/^[\u0600-\u06FF\s]+$/.test(nameArTrimmed)) {
    return { success: false, error: 'الاسم بالعربية يجب أن يحتوي على أحرف عربية فقط (Arabic name must contain Arabic letters only).' };
  }

  // 2. Validation: English 4-part name (min 4 words)
  const nameEnTrimmed = formData.fullNameEn?.trim() || '';
  const nameEnWords = nameEnTrimmed.split(/\s+/).filter(Boolean);
  if (nameEnWords.length < 4) {
    return { success: false, error: 'Full name in English must contain at least 4 parts.' };
  }
  if (!/^[a-zA-Z\s\-']+$/.test(nameEnTrimmed)) {
    return { success: false, error: 'English name must contain Latin letters only.' };
  }

  // 3. Validation: 14-digit Egyptian National ID
  const nationalIdTrimmed = formData.nationalId?.trim() || '';
  if (!/^[23]\d{13}$/.test(nationalIdTrimmed)) {
    return { success: false, error: 'الرقم القومي غير صحيح. يجب أن يتكون من 14 رقماً ويبدأ بـ 2 أو 3 (National ID must be 14 digits starting with 2 or 3).' };
  }

  // 4. Validation: Mobile & WhatsApp numbers
  const normalizedPhone = normalizeEgyptianPhone(formData.phone?.trim() || '');
  if (!normalizedPhone) {
    return { success: false, error: 'رقم الهاتف غير صحيح. يجب أن يكون رقم محمول مصري صحيح (e.g. 01012345678).' };
  }

  const normalizedWhatsapp = normalizeEgyptianPhone(formData.whatsappNumber?.trim() || '') || normalizedPhone;
  if (!normalizedWhatsapp) {
    return { success: false, error: 'رقم الواتساب غير صحيح. يجب أن يكون رقم محمول مصري صحيح (e.g. 01012345678).' };
  }

  // 5. Validation: Faculty must be chosen from faculty_options
  if (!formData.faculty?.trim()) {
    return { success: false, error: 'يرجى اختيار الكلية (Faculty/College selection is required).' };
  }

  // 6. Validation: Department / Major (free text)
  if (!formData.departmentMajor?.trim() || formData.departmentMajor.trim().length < 2) {
    return { success: false, error: 'يرجى إدخال القسم أو التخصص الأكاديمي (Department/Major is required).' };
  }

  // 7. Validation: Academic year (1-5)
  const yearNum = Number(formData.academicYear);
  if (![1, 2, 3, 4, 5].includes(yearNum)) {
    return { success: false, error: 'السنة الدراسية غير صحيحة (Academic year must be between 1st and 5th year).' };
  }

  // 8. Validation: Target committee
  if (!formData.departmentId?.trim()) {
    return { success: false, error: 'Target committee selection is required.' };
  }

  // 9. Validation: Motivation statement
  if (!formData.motivation?.trim() || formData.motivation.trim().length < 10) {
    return { success: false, error: 'Please share your motivation for joining GDGoC HNU (at least 10 characters).' };
  }

  // 10. Validation: Code of conduct
  if (!formData.agreeCodeOfConduct) {
    return { success: false, error: 'You must agree to the Code of Conduct.' };
  }

  try {
    const admin = createAdminClient();

    // Verify National ID uniqueness against other users
    const { data: existingWithNid } = await admin
      .from('profiles')
      .select('id')
      .eq('national_id', nationalIdTrimmed)
      .neq('id', user.id)
      .maybeSingle();

    if (existingWithNid) {
      return { success: false, error: 'الرقم القومي مسجل بالفعل لحساب آخر (This National ID is already registered to another account).' };
    }

    // Verify faculty exists in faculty_options
    const { data: validFaculty } = await admin
      .from('faculty_options')
      .select('id, name_ar, name_en')
      .or(`name_ar.eq.${formData.faculty.trim()},name_en.eq.${formData.faculty.trim()}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const facultyValue = validFaculty ? validFaculty.name_ar : formData.faculty.trim();

    // 1. Upsert public.profiles table with v4 columns
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name_ar: nameArTrimmed,
        full_name_en: nameEnTrimmed,
        full_name: nameEnTrimmed, // Keep legacy field synchronized
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        national_id: nationalIdTrimmed,
        phone: normalizedPhone,
        whatsapp_number: normalizedWhatsapp,
        faculty: facultyValue,
        department_major: formData.departmentMajor.trim(),
        academic_year: yearNum,
        facebook_url: formData.facebookUrl?.trim() || null,
        instagram_url: formData.instagramUrl?.trim() || null,
        linkedin_url: formData.linkedinUrl?.trim() || null,
        department_id: formData.departmentId,
        position: formData.position?.trim() || 'Member',
        motivation: formData.motivation.trim(),
        how_heard: formData.howHeard || 'Social Media',
        availability_hours: Number(formData.availabilityHours) || 5,
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting v4 profile:', upsertError);
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
        full_name_ar: nameArTrimmed,
        full_name_en: nameEnTrimmed,
        national_id: nationalIdTrimmed,
        email: user.email,
      },
    });

    // 4. Notify Chapter Leadership (President, Co-President & Committee Head per Spec §4.11)
    await notifyNewAccountPending({
      applicantId: user.id,
      applicantName: `${nameEnTrimmed} (${nameArTrimmed})`,
      departmentId: formData.departmentId,
      position: formData.position || 'Member',
    });

    revalidatePath('/', 'layout');
    revalidatePath('/onboarding/complete-profile');
    revalidatePath('/onboarding/status');
    revalidatePath('/approvals');
    revalidatePath('/members');

    return { success: true };
  } catch (err: unknown) {
    console.error('Unexpected error submitting v4 profile:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Server error occurred' };
  }
}
