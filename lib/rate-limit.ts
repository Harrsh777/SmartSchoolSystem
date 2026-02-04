/**
 * Rate limiter for API routes. Uses Redis when REDIS_URL is set (multi-instance safe);
 * otherwise falls back to in-memory (per-process).
 * Key format: rate:{ip}:{route} per Redis usage doc.
 */

import { getRedis } from '@/lib/redis';
import { cacheKeys } from '@/lib/cache';

const store = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX = 10; // requests per window

export interface RateLimitOptions {
  /** Window in milliseconds (default 60000) */
  windowMs?: number;
  /** Max requests per window per key (default 10) */
  max?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

/** Redis key: rate:{ip}:{route} */
function rateLimitKey(ip: string, route: string): string {
  return cacheKeys.rate(ip, route);
}

/**
 * Rate limit using Redis when available. Fallback: in-memory.
 */
export async function checkRateLimit(
  request: Request,
  prefix: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const { windowMs = DEFAULT_WINDOW_MS, max = DEFAULT_MAX } = options;
  const clientId = getClientId(request);
  const key = rateLimitKey(clientId, prefix);
  const ttlSeconds = Math.ceil(windowMs / 1000);

  const redis = getRedis();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, ttlSeconds);
      const remaining = Math.max(0, max - count);
      const ttl = await redis.ttl(key);
      const resetAt = Date.now() + ttl * 1000;
      return {
        success: count <= max,
        remaining,
        resetAt,
      };
    } catch {
      // Redis failed; fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  let entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { success: true, remaining: max - 1, resetAt: entry.resetAt };
  }
  entry.count += 1;
  const remaining = Math.max(0, max - entry.count);
  return {
    success: entry.count <= max,
    remaining,
    resetAt: entry.resetAt,
  };
}

/** Cleanup in-memory store when Redis is not used */
const CLEANUP_INTERVAL_MS = 60 * 1000;
let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }, CLEANUP_INTERVAL_MS);
}
scheduleCleanup();
