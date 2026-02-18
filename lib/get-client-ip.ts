import { NextRequest } from 'next/server';

/**
 * Get client IP from request. Safe behind proxies (Vercel, Nginx, etc.).
 * Order: x-forwarded-for (first hop = client) → x-real-ip → cf-connecting-ip → request.ip.
 * Behind a reverse proxy, set X-Forwarded-For or X-Real-IP so production does not see ::1/localhost.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const ip = (request as unknown as { ip?: string }).ip;
  if (ip) return ip;
  return 'UNKNOWN';
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || '';
}
