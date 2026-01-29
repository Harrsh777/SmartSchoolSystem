import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, clearSessionIdCookie } from '@/lib/auth-cookie';
import { destroySession } from '@/lib/session-store';
import { SESSION_ID_COOKIE_NAME } from '@/lib/auth-cookie';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true }, { status: 200 });
  const sessionToken = request.cookies.get(SESSION_ID_COOKIE_NAME)?.value;
  if (sessionToken) {
    await destroySession(sessionToken);
  }
  clearAuthCookie(response);
  clearSessionIdCookie(response);
  return response;
}
