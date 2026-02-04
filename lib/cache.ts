/**
 * Cache-first helper for School ERP.
 * Pattern: Redis read → on miss, fetch from Supabase (via fetcher) → set in Redis with TTL → return.
 * All writes to persisted data must invalidate cache (see invalidateCache).
 *
 * Key format: <domain>:<entity>:<identifier>  e.g. dashboard:student:123, auth:role:teacher_99
 */

import { redisGet, redisSet, redisDel, redisDelByPattern } from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

/**
 * Cache-first get. Returns cached value or calls fetcher and caches result.
 * If Redis is down, always calls fetcher and returns (no cache write).
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttlSeconds?: number; serialize?: (v: T) => string; deserialize?: (s: string) => T } = {}
): Promise<T> {
  const { ttlSeconds = DEFAULT_TTL_SECONDS, serialize = JSON.stringify, deserialize = JSON.parse } = options;

  const raw = await redisGet(key);
  if (raw !== null) {
    try {
      return deserialize(raw) as T;
    } catch {
      // Invalid cached value; fall through to fetcher
    }
  }

  const data = await fetcher();
  const toStore = serialize(data);
  await redisSet(key, toStore, ttlSeconds);
  return data;
}

/**
 * Invalidate a single key. Call after any write that affects that resource.
 */
export async function invalidateCache(key: string): Promise<void> {
  await redisDel(key);
}

/**
 * Invalidate by pattern. E.g. invalidateCachePattern('dashboard:student:*') after student update.
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  return redisDelByPattern(pattern);
}

/**
 * Predefined key builders (follows <domain>:<entity>:<identifier>).
 */
export const cacheKeys = {
  dashboard: (role: string, userId: string) => `dashboard:${role}:${userId}`,
  authRole: (userId: string) => `auth:role:${userId}`,
  attendance: (date: string, classId: string) => `attendance:${date}:${classId}`,
  feesSummary: (studentId: string) => `fees:summary:${studentId}`,
  notificationsCount: (userId: string) => `notifications:count:${userId}`,
  rate: (ip: string, route: string) => `rate:${ip}:${route}`,
};
