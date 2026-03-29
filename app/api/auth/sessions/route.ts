import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SLOTS_COOKIE_NAME,
  buildAuthCookieValue,
  parseAuthCookie,
  parseAuthSlots,
  redirectPathForAuth,
  slotKeyToCookieName,
} from '@/lib/auth-cookie';
import { getSession, sessionMatchesParsedAuth } from '@/lib/session-store';

export async function GET(request: NextRequest) {
  try {
    const activeRaw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const activeParsed = activeRaw ? parseAuthCookie(activeRaw) : null;
    const activeSlotKey = activeParsed ? buildAuthCookieValue(activeParsed.role, activeParsed.schoolCode) : '';

    const slots = parseAuthSlots(request.cookies.get(AUTH_SLOTS_COOKIE_NAME)?.value);
    const sessions = [];

    for (const slotKey of slots) {
      const parsed = parseAuthCookie(slotKey);
      const token = request.cookies.get(slotKeyToCookieName(slotKey))?.value;
      if (!parsed || !token) {
        sessions.push({
          slotKey,
          active: slotKey === activeSlotKey,
          valid: false,
          redirectTo: null as string | null,
          label: slotKey,
        });
        continue;
      }
      const row = await getSession(token, { sliding: false });
      const valid = !!row && sessionMatchesParsedAuth(row, parsed);
      const payload = row?.user_payload as Record<string, unknown> | null;
      let label = slotKey;
      if (payload) {
        if (parsed.role === 'school') {
          label = String(payload.school_name ?? payload.school_code ?? slotKey);
        } else if (parsed.role === 'teacher') {
          label = `Staff — ${String(payload.full_name ?? 'Teacher')}`;
        } else if (parsed.role === 'student') {
          label = `Student — ${String(payload.student_name ?? 'Student')}`;
        } else if (parsed.role === 'accountant') {
          const staff = payload.staff as Record<string, unknown> | undefined;
          label = `Accountant — ${String(staff?.full_name ?? 'Accountant')}`;
        }
      }
      sessions.push({
        slotKey,
        active: slotKey === activeSlotKey,
        valid,
        redirectTo: valid ? redirectPathForAuth(parsed) : null,
        label,
        role: parsed.role,
        schoolCode: parsed.schoolCode ?? null,
      });
    }

    return NextResponse.json({ success: true, sessions, activeSlotKey });
  } catch (e) {
    console.error('auth/sessions', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
