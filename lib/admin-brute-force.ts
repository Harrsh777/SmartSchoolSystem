/**
 * Failed super-admin login tracking: lock IP after too many bad passwords.
 * Uses Redis when REDIS_ENABLED=true for multi-instance; otherwise in-memory.
 */

import { getRedis } from '@/lib/redis';

const FAIL_KEY_PREFIX = 'admin:login:fail:';
const MAX_FAILS = 10;
const LOCKOUT_SECONDS = 15 * 60;

const memoryFails = new Map<string, { count: number; resetAt: number }>();

function clientIdFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export async function isAdminLoginLocked(request: Request): Promise<{
  locked: boolean;
  retryAfterSec?: number;
}> {
  const ip = clientIdFromRequest(request);
  const redis = getRedis();
  if (redis) {
    try {
      const n = await redis.get(`${FAIL_KEY_PREFIX}${ip}`);
      if (n && parseInt(n, 10) >= MAX_FAILS) {
        const ttl = await redis.ttl(`${FAIL_KEY_PREFIX}${ip}`);
        return { locked: true, retryAfterSec: ttl > 0 ? ttl : LOCKOUT_SECONDS };
      }
    } catch {
      /* fall through */
    }
  }

  const now = Date.now();
  const e = memoryFails.get(ip);
  if (e && e.count >= MAX_FAILS && now < e.resetAt) {
    return { locked: true, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  }
  return { locked: false };
}

export async function registerAdminLoginFailure(request: Request): Promise<void> {
  const ip = clientIdFromRequest(request);
  const redis = getRedis();
  if (redis) {
    try {
      const k = `${FAIL_KEY_PREFIX}${ip}`;
      const n = await redis.incr(k);
      if (n === 1) await redis.expire(k, LOCKOUT_SECONDS);
      return;
    } catch {
      /* memory fallback */
    }
  }

  const now = Date.now();
  let e = memoryFails.get(ip);
  if (!e || now > e.resetAt) {
    e = { count: 1, resetAt: now + LOCKOUT_SECONDS * 1000 };
  } else {
    e = { ...e, count: e.count + 1 };
  }
  memoryFails.set(ip, e);
}

export async function clearAdminLoginFailures(request: Request): Promise<void> {
  const ip = clientIdFromRequest(request);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(`${FAIL_KEY_PREFIX}${ip}`);
    } catch {
      /* noop */
    }
  }
  memoryFails.delete(ip);
}
