/**
 * In-Memory Sliding Window Rate Limiter
 * Spec §9, §10, Checklist 23.2
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up records older than 10 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 300000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
  error?: string;
}

/**
 * Checks if an operation is within allowed rate limits.
 * @param key Unique key (e.g. "ip:event_reg" or "user_id:recruitment")
 * @param limit Max allowed attempts in the window
 * @param windowMs Window duration in milliseconds (default 60 seconds)
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetInSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetInSeconds,
      error: `Too many attempts. Rate limit exceeded. Please wait ${resetInSeconds} seconds before trying again.`,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);

  return {
    allowed: true,
    limit,
    remaining,
    resetInSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Helper to reset rate limits for test environments
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Extracts best-effort client IP from HTTP headers
 */
export function extractClientIp(headersObj: Headers | Record<string, string | string[] | undefined>): string {
  try {
    let headerVal: string | null = null;
    if (typeof (headersObj as any).get === 'function') {
      headerVal = (headersObj as Headers).get('x-forwarded-for') || (headersObj as Headers).get('x-real-ip');
    } else {
      const h = headersObj as Record<string, any>;
      headerVal = h['x-forwarded-for'] || h['x-real-ip'] || null;
    }

    if (headerVal) {
      const parts = headerVal.split(',');
      return parts[0].trim();
    }
  } catch {}
  return '127.0.0.1';
}
