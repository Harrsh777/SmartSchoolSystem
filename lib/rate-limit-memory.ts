/**
 * In-process sliding-window rate limiter (resets on server restart).
 * For multi-instance production, prefer Redis-backed limits.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: true } | { ok: false; retry_after_ms: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const prev = buckets.get(key) || [];
  const recent = prev.filter((t) => t > windowStart);
  if (recent.length >= max) {
    const oldest = recent[0]!;
    return { ok: false, retry_after_ms: Math.max(0, oldest + windowMs - now) };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}
