import { NextRequest } from 'next/server';

/**
 * Get client IP from request. Safe behind proxies (Vercel, Nginx, etc.).
 * Use x-forwarded-for first (first hop = client), then request IP/socket.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const ip = (request as unknown as { ip?: string }).ip;
  if (ip) return ip;
  return 'UNKNOWN';
}

export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || '';
}
