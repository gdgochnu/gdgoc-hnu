'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { invalidateUserContextCache } from '@/lib/auth/get-user-context';
import { sanitizePlainText, sanitizeRichText } from '@/lib/security/sanitizer';
import { uploadEntityFile } from '@/app/drive/actions';

export interface CustomSocialLink {
  id?: string;
  platform: string;
  label: string;
  url: string;
}

export interface UpdateProfileInput {
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  phone?: string;
  whatsappNumber?: string;
  universityId?: string;
  faculty?: string;
  departmentMajor?: string;
  academicYear?: number | string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  avatarUrl?: string;
  skills?: string[];
  motivation?: string;
  availabilityHours?: number | string;
  customSocialLinks?: CustomSocialLink[];
}

export async function updateMyProfileAction(input: UpdateProfileInput) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized. Please sign in to update your profile.' };
  }

  try {
    const admin = createAdminClient();

    // Fetch existing profile to check current national_id and custom_fields
    const { data: currentProfile } = await admin
      .from('profiles')
      .select('id, national_id, custom_fields')
      .eq('id', user.id)
      .single();

    // Prepare updates
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // If National ID was not previously set and is provided now
    if (input.nationalId !== undefined && (!currentProfile?.national_id || currentProfile.national_id.trim() === '')) {
      const cleanedNid = input.nationalId.trim();
      if (cleanedNid.length > 0) {
        if (!/^[0-9]{14}$/.test(cleanedNid)) {
          return {
            success: false,
            error: 'National ID must be exactly 14 digits.',
          };
        }

        // Verify uniqueness
        const { data: existingNid } = await admin
          .from('profiles')
          .select('id')
          .eq('national_id', cleanedNid)
          .neq('id', user.id)
          .maybeSingle();

        if (existingNid) {
          return {
            success: false,
            error: 'This National ID is already registered to another account.',
          };
        }

        updates.national_id = cleanedNid;
      }
    }

    if (input.fullNameEn !== undefined) {
      const trimmedEn = input.fullNameEn.trim();
      if (trimmedEn.length > 0) {
        updates.full_name_en = sanitizePlainText(trimmedEn, 150);
        updates.full_name = updates.full_name_en; // keep synchronized
      }
    }

    if (input.fullNameAr !== undefined) {
      updates.full_name_ar = input.fullNameAr.trim() ? sanitizePlainText(input.fullNameAr.trim(), 150) : null;
    }

    if (input.phone !== undefined) {
      updates.phone = input.phone.trim() ? sanitizePlainText(input.phone.trim(), 30) : null;
    }

    if (input.whatsappNumber !== undefined) {
      updates.whatsapp_number = input.whatsappNumber.trim() ? sanitizePlainText(input.whatsappNumber.trim(), 30) : null;
    }

    if (input.universityId !== undefined) {
      updates.university_id = input.universityId.trim() ? sanitizePlainText(input.universityId.trim(), 50) : null;
    }

    if (input.faculty !== undefined) {
      updates.faculty = input.faculty.trim() ? sanitizePlainText(input.faculty.trim(), 100) : null;
    }

    if (input.departmentMajor !== undefined) {
      updates.department_major = input.departmentMajor.trim() ? sanitizePlainText(input.departmentMajor.trim(), 100) : null;
    }

    if (input.academicYear !== undefined) {
      const yearNum = Number(input.academicYear);
      updates.academic_year = !isNaN(yearNum) && yearNum >= 1 && yearNum <= 6 ? yearNum : null;
    }

    if (input.linkedinUrl !== undefined) {
      updates.linkedin_url = input.linkedinUrl.trim() ? sanitizePlainText(input.linkedinUrl.trim(), 255) : null;
    }

    if (input.portfolioUrl !== undefined) {
      updates.portfolio_url = input.portfolioUrl.trim() ? sanitizePlainText(input.portfolioUrl.trim(), 255) : null;
    }

    if (input.facebookUrl !== undefined) {
      updates.facebook_url = input.facebookUrl.trim() ? sanitizePlainText(input.facebookUrl.trim(), 255) : null;
    }

    if (input.instagramUrl !== undefined) {
      updates.instagram_url = input.instagramUrl.trim() ? sanitizePlainText(input.instagramUrl.trim(), 255) : null;
    }

    if (input.avatarUrl !== undefined) {
      updates.avatar_url = input.avatarUrl.trim() ? sanitizePlainText(input.avatarUrl.trim(), 500) : null;
    }

    if (input.skills !== undefined) {
      const cleanedSkills = Array.isArray(input.skills)
        ? input.skills
            .map((s) => sanitizePlainText(String(s).trim(), 50))
            .filter((s) => s.length > 0)
        : [];
      updates.skills = cleanedSkills;
    }

    if (input.motivation !== undefined) {
      updates.motivation = input.motivation.trim() ? sanitizeRichText(input.motivation.trim(), 3000) : null;
    }

    if (input.availabilityHours !== undefined) {
      const hoursNum = Number(input.availabilityHours);
      updates.availability_hours = !isNaN(hoursNum) && hoursNum >= 0 && hoursNum <= 168 ? hoursNum : 5;
    }

    // Handle custom social links in custom_fields
    if (input.customSocialLinks !== undefined) {
      const cleanedSocialLinks = (input.customSocialLinks || [])
        .map((link) => ({
          platform: sanitizePlainText(link.platform || 'other', 50),
          label: sanitizePlainText(link.label || 'Link', 60),
          url: sanitizePlainText((link.url || '').trim(), 500),
        }))
        .filter((link) => link.url.length > 0);

      const existingCustomFields =
        typeof currentProfile?.custom_fields === 'object' && currentProfile?.custom_fields !== null
          ? currentProfile.custom_fields
          : {};

      updates.custom_fields = {
        ...existingCustomFields,
        social_links: cleanedSocialLinks,
      };

      // Auto-sync standard URLs if provided inside customSocialLinks
      for (const sl of cleanedSocialLinks) {
        if (sl.platform === 'linkedin' && !updates.linkedin_url) {
          updates.linkedin_url = sl.url;
        } else if (sl.platform === 'facebook' && !updates.facebook_url) {
          updates.facebook_url = sl.url;
        } else if (sl.platform === 'instagram' && !updates.instagram_url) {
          updates.instagram_url = sl.url;
        } else if ((sl.platform === 'portfolio' || sl.platform === 'github') && !updates.portfolio_url) {
          updates.portfolio_url = sl.url;
        }
      }
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return { success: false, error: updateError.message || 'Failed to update profile.' };
    }

    // Invalidate caches
    invalidateUserContextCache(user.id);
    revalidatePath('/profile');
    revalidatePath('/members');
    revalidatePath(`/members/${user.id}`);
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateMyProfileAction:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function uploadProfilePhotoAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Unauthorized. Please sign in.' };
  }

  try {
    const file = formData.get('photo') as File | null;
    if (!file) {
      return { success: false, error: 'No image file provided.' };
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image (JPEG, PNG, WebP, GIF).' };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'Image size exceeds 5MB limit.' };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const ext = file.name.split('.').pop() || 'jpg';
    const cleanFileName = `avatar_${user.id}_${Date.now()}.${ext}`;

    // Attempt upload to Google Drive under member entity
    const driveUpload = await uploadEntityFile({
      entityType: 'member',
      entityId: user.id,
      fileName: cleanFileName,
      mimeType,
      base64Data,
      makePublic: true,
      skipAuthCheck: true,
    });

    let finalPhotoUrl = '';
    if (driveUpload.success && driveUpload.file) {
      finalPhotoUrl =
        driveUpload.file.fileUrl ||
        driveUpload.file.downloadUrl ||
        `/api/workspace/media/thumbnail?id=${driveUpload.file.fileId}`;
    } else {
      // Fallback: Direct data URI
      finalPhotoUrl = `data:${mimeType};base64,${base64Data}`;
    }

    // Update avatar_url in profiles table
    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({
        avatar_url: finalPhotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    invalidateUserContextCache(user.id);
    revalidatePath('/profile');
    revalidatePath('/members');
    revalidatePath(`/members/${user.id}`);
    revalidatePath('/dashboard');

    return { success: true, url: finalPhotoUrl };
  } catch (err: any) {
    console.error('Error uploading profile photo:', err);
    return { success: false, error: err.message || 'Failed to upload image.' };
  }
}
