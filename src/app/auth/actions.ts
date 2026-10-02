'use server';

import { createClient } from '@/lib/supabase/server';
import { invalidateUserContextCache } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

/**
 * Server-side Sign Out Action
 * Completely purges Supabase auth session, HTTP cookies, and in-memory caches.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      invalidateUserContextCache(user.id);
    } else {
      invalidateUserContextCache();
    }

    await supabase.auth.signOut();

    // Clear all Supabase auth cookies explicitly
    try {
      const cookieStore = await cookies();
      const allCookies = cookieStore.getAll();
      for (const cookie of allCookies) {
        if (
          cookie.name.includes('sb-') ||
          cookie.name.includes('supabase') ||
          cookie.name.includes('auth-token')
        ) {
          cookieStore.delete(cookie.name);
        }
      }
    } catch (cookieErr) {
      console.warn('Cookie purge warning:', cookieErr);
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    console.error('signOutAction exception:', err);
    return { success: false };
  }
}
