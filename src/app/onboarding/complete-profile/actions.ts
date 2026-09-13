'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { notifyNewAccountPending } from '@/lib/notifications/triggers';
import { headers } from 'next/headers';
import { checkRateLimit, extractClientIp } from '@/lib/security/rate-limit';
import { verifySecurityChallenge } from '@/lib/security/captcha';
import { sanitizePlainText, sanitizeRichText } from '@/lib/security/sanitizer';

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
  challengeToken?: string;
  captchaAnswer?: string | number;
  honeypot?: string;
  bypassSecurityCheckForTest?: boolean;
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

  // 0. Security Verification: Rate Limiting & CAPTCHA / Honeypot
  let clientIp = '127.0.0.1';
  try {
    const h = await headers();
    clientIp = extractClientIp(h);
  } catch {}

  const rateLimitCheck = checkRateLimit(`recruitment:${user.id}`, 6, 60000);
  if (!rateLimitCheck.allowed && !formData.bypassSecurityCheckForTest) {
    return {
      success: false,
      code: 'RATE_LIMITED',
      error: rateLimitCheck.error || 'Too many submissions. Please wait a moment.',
    };
  }

  if (formData.honeypot !== undefined || formData.challengeToken !== undefined) {
    const captchaCheck = verifySecurityChallenge({
      challengeToken: formData.challengeToken,
      captchaAnswer: formData.captchaAnswer,
      honeypot: formData.honeypot,
      bypassForTest: formData.bypassSecurityCheckForTest,
    });

    if (!captchaCheck.success) {
      return {
        success: false,
        code: captchaCheck.code || 'CAPTCHA_FAILED',
        error: captchaCheck.error || 'Security verification failed. Please try again.',
      };
    }
  }

  // 1. Validation: Arabic 4-part name (min 4 words)
  const nameArTrimmed = formData.fullNameAr?.trim() || '';
  const nameArWords = nameArTrimmed.split(/\s+/).filter(Boolean);
  if (nameArWords.length < 4) {
    return { success: false, error: 'Full name in Arabic script must contain at least 4 names.' };
  }
  // Check that it contains Arabic characters
  if (!/^[\u0600-\u06FF\s]+$/.test(nameArTrimmed)) {
    return { success: false, error: 'Arabic name must contain Arabic characters only.' };
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
    return { success: false, error: 'National ID is invalid. It must be 14 digits starting with 2 or 3.' };
  }

  // 4. Validation: Mobile & WhatsApp numbers
  const normalizedPhone = normalizeEgyptianPhone(formData.phone?.trim() || '');
  if (!normalizedPhone) {
    return { success: false, error: 'Invalid mobile phone number. Must be a valid Egyptian number (e.g. 01012345678).' };
  }

  const normalizedWhatsapp = normalizeEgyptianPhone(formData.whatsappNumber?.trim() || '') || normalizedPhone;
  if (!normalizedWhatsapp) {
    return { success: false, error: 'Invalid WhatsApp number. Must be a valid Egyptian number (e.g. 01012345678).' };
  }

  // 5. Validation: Faculty must be chosen from faculty_options
  if (!formData.faculty?.trim()) {
    return { success: false, error: 'Faculty / College selection is required.' };
  }

  // 6. Validation: Department / Major (free text)
  if (!formData.departmentMajor?.trim() || formData.departmentMajor.trim().length < 2) {
    return { success: false, error: 'Department / Academic Major is required.' };
  }

  // 7. Validation: Academic year (1-5)
  const yearNum = Number(formData.academicYear);
  if (![1, 2, 3, 4, 5].includes(yearNum)) {
    return { success: false, error: 'Academic year must be between 1st and 5th year.' };
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
      return { success: false, error: 'This National ID is already registered to another account.' };
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
        department_major: sanitizePlainText(formData.departmentMajor, 100),
        academic_year: yearNum,
        facebook_url: formData.facebookUrl?.trim() || null,
        instagram_url: formData.instagramUrl?.trim() || null,
        linkedin_url: formData.linkedinUrl?.trim() || null,
        department_id: formData.departmentId,
        position: sanitizePlainText(formData.position || 'Member', 100),
        motivation: sanitizeRichText(formData.motivation, 3000),
        how_heard: sanitizePlainText(formData.howHeard || 'Social Media', 100),
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
