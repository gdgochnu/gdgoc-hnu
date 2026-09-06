import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isConfigured = Boolean(
    url && 
    url !== 'https://your-project.supabase.co' && 
    url.startsWith('https://') &&
    anonKey && 
    anonKey !== 'your-supabase-anon-key'
  );

  let connectionStatus = 'not_configured';
  let latencyMs = 0;
  let details = 'Supabase environment variables have not been configured yet.';

  if (isConfigured) {
    const start = Date.now();
    try {
      // Test basic reachability to Supabase Auth health endpoint
      const res = await fetch(`${url}/auth/v1/health`, {
        headers: {
          apikey: anonKey!,
        },
      });
      latencyMs = Date.now() - start;

      // Check external providers
      let googleOAuthEnabled = false;
      try {
        const settingsRes = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: anonKey! },
        });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          googleOAuthEnabled = Boolean(settings?.external?.google);
        }
      } catch {
        // non-blocking
      }

      if (res.ok) {
        connectionStatus = 'connected';
        details = googleOAuthEnabled
          ? 'Connected to Supabase. Google OAuth is enabled.'
          : 'Connected to Supabase, but Google OAuth provider is not enabled yet.';
      } else {
        connectionStatus = 'error';
        details = `Supabase responded with status ${res.status}: ${res.statusText}`;
      }

      return NextResponse.json({
        status: connectionStatus,
        configured: isConfigured,
        hasServiceRole,
        googleOAuthEnabled,
        supabaseUrl: isConfigured ? url : null,
        latencyMs: isConfigured ? latencyMs : null,
        details,
      });
    } catch (err: unknown) {
      connectionStatus = 'unreachable';
      details = err instanceof Error ? err.message : 'Network error reaching Supabase URL.';
    }
  }

  return NextResponse.json({
    status: connectionStatus,
    configured: isConfigured,
    hasServiceRole,
    supabaseUrl: isConfigured ? url : null,
    latencyMs: isConfigured ? latencyMs : null,
    details,
  });
}
