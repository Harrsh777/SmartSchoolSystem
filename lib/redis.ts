/**
 * Redis client for School ERP.
 * Rules: Redis is never source of truth; all writes go to Supabase.
 * If Redis is down, the app must fallback to Supabase (see lib/cache.ts).
 *
 * Redis is **off by default**. Set REDIS_ENABLED=true and REDIS_URL to use it.
 *
 * Flaky Redis (ECONNRESET, etc.): opens a long circuit breaker and, after repeated
 * failures, disables Redis for the rest of the Node process so the app stays on DB-only
 * without log spam or reconnect storms.
 */

import Redis from 'ioredis';

let client: Redis | null = null;
/** While Date.now() < this, getRedis() returns null (skip Redis entirely). */
let circuitOpenUntil = 0;
/** After too many failures, never use Redis again until process restart. */
let redisHardOff = false;

function parseCircuitMs(): number {
  const raw = process.env.REDIS_CIRCUIT_MS;
  if (raw == null || raw === '') return 300_000; // 5 minutes — avoids reconnect hammering
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 5_000) return 300_000;
  return Math.min(n, 3_600_000);
}

const CIRCUIT_MS = parseCircuitMs();

/** Rapid tripCircuit calls in this window count toward hard-off. */
const TRIP_WINDOW_MS = 120_000;
const TRIPS_BEFORE_HARD_OFF = 4;
let tripWindowStart = 0;
let tripsInWindow = 0;

let lastErrorLogAt = 0;
const ERROR_LOG_THROTTLE_MS = 15_000;
const REDIS_DEBUG = process.env.REDIS_DEBUG === 'true';

function throttledWarn(message: string): void {
  const now = Date.now();
  if (now - lastErrorLogAt < ERROR_LOG_THROTTLE_MS) return;
  lastErrorLogAt = now;
  console.warn(message);
}

function debugLog(...args: unknown[]): void {
  if (!REDIS_DEBUG) return;
  console.log('[Redis Debug]', ...args);
}

function isRedisExplicitlyEnabled(): boolean {
  return process.env.REDIS_ENABLED === 'true';
}

function getRedisUrl(): string | undefined {
  if (!isRedisExplicitlyEnabled()) return undefined;
  return process.env.REDIS_URL?.trim() || undefined;
}

function connectionLikeMessage(msg: string): boolean {
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|EPIPE|Connection is closed|Command timed out|Socket closed|READONLY|Broken pipe/i.test(
    msg
  );
}

function killClient(c: Redis | null): void {
  if (!c) return;
  try {
    c.removeAllListeners();
  } catch {
    /* ignore */
  }
  try {
    c.disconnect(true);
  } catch {
    /* ignore */
  }
}

/**
 * Drop the client and pause Redis usage. Idempotent while circuit is already open.
 */
function tripCircuit(reason: string): void {
  if (redisHardOff) return;

  const now = Date.now();
  /** Same outage often emits many errors; only count when opening from a closed circuit. */
  const circuitWasOpen = now < circuitOpenUntil;

  if (!circuitWasOpen) {
    if (now - tripWindowStart > TRIP_WINDOW_MS) {
      tripWindowStart = now;
      tripsInWindow = 0;
    }
    tripsInWindow += 1;

    if (tripsInWindow >= TRIPS_BEFORE_HARD_OFF) {
      redisHardOff = true;
      circuitOpenUntil = Number.MAX_SAFE_INTEGER;
      killClient(client);
      client = null;
      throttledWarn(
        '[Redis] Disabled for this process after repeated connection failures. ' +
          'Fix REDIS_URL / network or set REDIS_ENABLED=false. Using database only.'
      );
      return;
    }
  }

  circuitOpenUntil = now + CIRCUIT_MS;
  const c = client;
  client = null;
  killClient(c);

  if (!circuitWasOpen) {
    throttledWarn(
      `[Redis] Circuit open ~${Math.round(CIRCUIT_MS / 1000)}s (DB only): ${reason.slice(0, 100)}`
    );
  }
}

/**
 * Get Redis client. Returns null if disabled, hard-off, circuit open, or init failed.
 */
export function getRedis(): Redis | null {
  if (redisHardOff) return null;
  if (Date.now() < circuitOpenUntil) return null;
  if (client) return client;

  const url = getRedisUrl();
  if (!url) return null;

  try {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy() {
        return null;
      },
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 4000,
      socketTimeout: 10000,
    });

    client.on('error', (err: Error) => {
      tripCircuit(err.message || 'error');
    });

    return client;
  } catch (err) {
    tripCircuit((err as Error).message || 'init');
    return null;
  }
}

/**
 * Call once at app startup (e.g. in a route or middleware) to connect and verify Redis.
 */
export async function connectRedis(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch (e) {
    tripCircuit((e as Error).message);
    return false;
  }
}

/**
 * Simple write/read/keys/ttl diagnostic.
 * Logs expected values to help confirm Redis connectivity and key expiry behavior.
 */
export async function runRedisDiagnostics(): Promise<{
  connected: boolean;
  value: string | null;
  ttl: number | null;
  keys: string[];
}> {
  const redis = getRedis();
  if (!redis) {
    console.warn('[Redis Test] Redis client unavailable (disabled/circuit-open/misconfigured).');
    return { connected: false, value: null, ttl: null, keys: [] };
  }

  try {
    await redis.set('test_key', 'working', 'EX', 60);
    const value = await redis.get('test_key');
    console.log('Redis Test:', value);

    const keys = await redis.keys('*');
    console.log('All Redis Keys:', keys);

    const ttl = await redis.ttl('test_key');
    console.log('TTL:', ttl);

    return { connected: true, value, ttl, keys };
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (connectionLikeMessage(msg)) tripCircuit(msg);
    console.error('[Redis Test] Diagnostics failed:', msg);
    return { connected: false, value: null, ttl: null, keys: [] };
  }
}

/**
 * Whether Redis is configured and the circuit allows attempts (does not create a client).
 */
export function isRedisAvailable(): boolean {
  if (redisHardOff) return false;
  if (Date.now() < circuitOpenUntil) return false;
  return Boolean(getRedisUrl());
}

/**
 * Safe get: returns null on any error. Opens circuit on transport failures.
 */
export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    debugLog('Getting from Redis:', key);
    return await redis.get(key);
  } catch (err) {
    const msg = (err as Error).message || String(err);
    if (connectionLikeMessage(msg)) tripCircuit(msg);
    return null;
  }
}

/**
 * Safe set with TTL. Returns false on error (caller should not depend on cache).
 */
export async function redisSet(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    debugLog('Setting in Redis:', key, 'EX', ttlSeconds);
    await redis.setex(key, ttlSeconds, value);
    return true;
  } catch (err) {
    const msg = (err as Error).message || String(err);
    if (connectionLikeMessage(msg)) tripCircuit(msg);
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
    debugLog('Deleting from Redis:', key);
    await redis.del(key);
    return true;
  } catch (err) {
    const msg = (err as Error).message || String(err);
    if (connectionLikeMessage(msg)) tripCircuit(msg);
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
    debugLog('Deleting by Redis pattern:', pattern);
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
    const msg = (err as Error).message || String(err);
    if (connectionLikeMessage(msg)) tripCircuit(msg);
    return 0;
  }
}
