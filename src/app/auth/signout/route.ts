import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { invalidateUserContextCache } from '@/lib/auth/get-user-context';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

async function performSignOut(request: Request) {
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
    } catch {}

    revalidatePath('/', 'layout');
  } catch (err) {
    console.error('[auth/signout] error:', err);
  }

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 302 });
}

export async function GET(request: Request) {
  return performSignOut(request);
}

export async function POST(request: Request) {
  return performSignOut(request);
}
