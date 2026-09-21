import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the user's Supabase session and enforces centralized route guards.
 * Ensures cookies are synchronized and unauthorized visitors are redirected.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Calling getUser() refreshes the auth token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper to create redirect response while preserving updated session cookies
  const createRedirect = (destination: string) => {
    const url = new URL(destination, request.url);
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  };

  // ---------------------------------------------------------------------------
  // Centralized Route Protection Guards (for GET navigation requests)
  // ---------------------------------------------------------------------------
  if (request.method === 'GET') {
    const nextUrl = encodeURIComponent(pathname + (request.nextUrl.search || ''));

    // 1. Student Portal Protected Routes
    const isStudentProtectedRoute =
      pathname === '/student/dashboard' ||
      pathname.startsWith('/student/my-qr') ||
      pathname.startsWith('/student/certificates') ||
      pathname.startsWith('/student/notifications') ||
      pathname === '/student/onboarding';

    if (isStudentProtectedRoute && !user) {
      return createRedirect(`/student?signin=true&next=${nextUrl}`);
    }

    // 2. Admin & Chapter Operating System Protected Routes
    const isTeamAdminRoute =
      pathname.startsWith('/student-portal/admin') ||
      pathname === '/dashboard' ||
      pathname.startsWith('/tasks') ||
      pathname.startsWith('/approvals') ||
      pathname.startsWith('/hr') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/command-center') ||
      pathname.startsWith('/meetings') ||
      pathname.startsWith('/workspace') ||
      pathname.startsWith('/drive') ||
      pathname.startsWith('/members') ||
      pathname.startsWith('/leaderboard') ||
      pathname.startsWith('/gamification') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/pr') ||
      pathname.startsWith('/stats') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/events');

    if (isTeamAdminRoute && !user) {
      return createRedirect(`/?signin=true&next=${nextUrl}`);
    }
  }

  return supabaseResponse;
}

