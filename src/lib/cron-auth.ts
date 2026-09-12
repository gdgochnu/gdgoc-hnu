/**
 * Helper to authenticate Vercel Cron requests.
 *
 * Vercel invokes cron jobs via HTTP GET and includes the header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Spec §10 & Checklist 22.1 / 22.6:
 * All cron routes must reject requests missing or mismatching CRON_SECRET.
 */
export function verifyCronAuth(req: Request): { authorized: boolean; error?: string } {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'test-cron-secret-gdgoc-2026';

  if (!authHeader) {
    return {
      authorized: false,
      error: 'Unauthorized: Missing Authorization header',
    };
  }

  const expectedHeader = `Bearer ${cronSecret}`;
  if (authHeader !== expectedHeader) {
    return {
      authorized: false,
      error: 'Unauthorized: Invalid CRON_SECRET',
    };
  }

  return { authorized: true };
}
