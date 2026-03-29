import { NextRequest, NextResponse } from 'next/server';
import {
  parseAuthCookie,
  redirectPathForAuth,
  setAuthCookieFromSlotKey,
  slotKeyToCookieName,
  SESSION_MAX_AGE,
} from '@/lib/auth-cookie';
import { getSession, sessionMatchesParsedAuth } from '@/lib/session-store';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { slotKey?: string };
    const slotKey = typeof body.slotKey === 'string' ? body.slotKey.trim() : '';
    if (!slotKey) {
      return NextResponse.json({ error: 'slotKey is required' }, { status: 400 });
    }

    const parsed = parseAuthCookie(slotKey);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }

    const token = request.cookies.get(slotKeyToCookieName(slotKey))?.value;
    if (!token) {
      return NextResponse.json({ error: 'No session for this role' }, { status: 401 });
    }

    const row = await getSession(token, {
      sliding: true,
      extendSeconds: SESSION_MAX_AGE,
    });
    if (!row || !sessionMatchesParsedAuth(row, parsed)) {
      return NextResponse.json({ error: 'Session expired or invalid' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      redirectTo: redirectPathForAuth(parsed),
    });
    setAuthCookieFromSlotKey(res, slotKey, SESSION_MAX_AGE);
    return res;
  } catch (e) {
    console.error('auth/switch', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
