import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SLOTS_COOKIE_NAME,
  SESSION_ID_COOKIE_NAME,
  ERP_SID_PREFIX,
  buildAuthCookieValue,
  clearAllSessionSlotCookies,
  clearAuthCookie,
  clearSessionSlotCookie,
  getSessionTokenFromCookieGetter,
  parseAuthCookie,
  parseAuthSlots,
  redirectPathForAuth,
  setAuthCookieFromSlotKey,
  writeAuthSlotsCookie,
  SESSION_MAX_AGE,
} from '@/lib/auth-cookie';
import { destroySession } from '@/lib/session-store';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { all?: boolean };
  const logoutAll = body.all === true;

  let redirectTo: string | undefined;
  let switchedTo: string | undefined;
  let slotKeyForClear: string | undefined;
  let slotsAfterLogout: string[] = [];

  if (logoutAll) {
    const seen = new Set<string>();
    for (const c of request.cookies.getAll()) {
      if (c.name.startsWith(ERP_SID_PREFIX) && c.value && !seen.has(c.value)) {
        seen.add(c.value);
        await destroySession(c.value);
      }
    }
    const leg = request.cookies.get(SESSION_ID_COOKIE_NAME)?.value;
    if (leg && !seen.has(leg)) {
      await destroySession(leg);
    }
  } else {
    const authRaw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const parsed = authRaw ? parseAuthCookie(authRaw) : null;

    if (parsed) {
      const token = getSessionTokenFromCookieGetter(request.cookies, parsed);
      if (token) await destroySession(token);
      slotKeyForClear = buildAuthCookieValue(parsed.role, parsed.schoolCode);
      let slots = parseAuthSlots(request.cookies.get(AUTH_SLOTS_COOKIE_NAME)?.value);
      slots = slots.filter((s) => s !== slotKeyForClear);
      slotsAfterLogout = slots;
      if (slots.length > 0) {
        const nextKey = slots[slots.length - 1];
        const nextParsed = parseAuthCookie(nextKey);
        if (nextParsed) {
          switchedTo = nextKey;
          redirectTo = redirectPathForAuth(nextParsed);
        }
      }
    } else {
      const legacy = request.cookies.get(SESSION_ID_COOKIE_NAME)?.value;
      if (legacy) await destroySession(legacy);
    }
  }

  const res = NextResponse.json({ success: true as const, redirectTo, switchedTo });

  if (logoutAll) {
    clearAuthCookie(res);
    clearAllSessionSlotCookies(res, request);
  } else if (slotKeyForClear) {
    clearSessionSlotCookie(res, slotKeyForClear);
    writeAuthSlotsCookie(res, slotsAfterLogout, SESSION_MAX_AGE);
    if (slotsAfterLogout.length > 0 && switchedTo) {
      setAuthCookieFromSlotKey(res, switchedTo, SESSION_MAX_AGE);
    } else {
      clearAuthCookie(res);
      writeAuthSlotsCookie(res, [], SESSION_MAX_AGE);
    }
  } else {
    clearAuthCookie(res);
    clearAllSessionSlotCookies(res, request);
  }

  return res;
}
