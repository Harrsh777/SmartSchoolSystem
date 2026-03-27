import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, clearSessionIdCookie } from '@/lib/auth-cookie';
import { destroySession } from '@/lib/session-store';
import { SESSION_ID_COOKIE_NAME } from '@/lib/auth-cookie';
import { AUTH_COOKIE_NAME, parseAuthCookie } from '@/lib/auth-cookie';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });
  const authCookieRaw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const parsedAuth = authCookieRaw ? parseAuthCookie(authCookieRaw) : null;
  const schoolCode = parsedAuth?.schoolCode;
  const sessionToken = request.cookies.get(SESSION_ID_COOKIE_NAME)?.value;
  if (sessionToken) {
    await destroySession(sessionToken);
  }
  clearAuthCookie(response, schoolCode);
  clearSessionIdCookie(response, schoolCode);
  return response;
}
