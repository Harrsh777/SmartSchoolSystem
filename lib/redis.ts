/**
 * Redis client for School ERP.
 * Rules: Redis is never source of truth; all writes go to Supabase.
 * If Redis is down, the app must fallback to Supabase (see lib/cache.ts).
 *
 * Set REDIS_URL in env (e.g. redis://localhost:6379 or Redis Cloud URL).
 * If unset, getRedis() returns null and all cache/rate-limit logic falls back to DB/memory.
 */

import Redis from 'ioredis';

let client: Redis | null = null;
let available: boolean | null = null;

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim() || undefined;
}

/**
 * Get Redis client. Returns null if REDIS_URL is not set or connection fails.
 * All callers must handle null (fallback to Supabase or in-memory).
 */
export function getRedis(): Redis | null {
  if (available === false) return null;
  if (client) return client;

  const url = getRedisUrl();
  if (!url) {
    available = false;
    return null;
  }

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on('error', (err) => {
      console.error('[Redis] connection error:', err.message);
      available = false;
    });
    client.on('connect', () => {
      available = true;
    });

    return client;
  } catch (err) {
    console.error('[Redis] init error:', (err as Error).message);
    available = false;
    return null;
  }
}

/**
 * Call once at app startup (e.g. in a route or middleware) to connect and set `available`.
 * Optional; first use of getRedis() can also trigger lazy connect.
 */
export async function connectRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.ping();
    available = true;
    return true;
  } catch {
    available = false;
    return false;
  }
}

/**
 * Whether Redis is configured and currently usable.
 * Use this to decide whether to use cache or fallback.
 */
export function isRedisAvailable(): boolean {
  if (available !== null) return available;
  const r = getRedis();
  return r !== null;
}

/**
 * Safe get: returns null on any error. Caller should fallback to DB.
 */
export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.error('[Redis] GET error:', (err as Error).message);
    return null;
  }
}

/**
 * Safe set with TTL. Always use TTL for cache keys.
 */
export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.setex(key, ttlSeconds, value);
    return true;
  } catch (err) {
    console.error('[Redis] SET error:', (err as Error).message);
    return false;
  }
}

/**
 * Safe delete. Use for invalidation on writes.
 */
export async function redisDel(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error('[Redis] DEL error:', (err as Error).message);
    return false;
  }
}

/**
 * Delete by pattern (e.g. "dashboard:student:*"). Use SCAN to avoid blocking.
 */
export async function redisDelByPattern(pattern: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');
    return deleted;
  } catch (err) {
    console.error('[Redis] DEL pattern error:', (err as Error).message);
    return 0;
  }
}
