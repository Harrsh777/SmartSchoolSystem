/**
 * Multi-session auth cookies: active role in `auth_session`, per-slot tokens in `erp_sid_*`,
 * and `auth_slots` (JSON list) for bookkeeping. Legacy `session_id` is still read as fallback.
 */

import type { NextRequest } from 'next/server';

export const AUTH_COOKIE_NAME = 'auth_session';

/** Legacy single-session cookie (still honored when slot cookies are absent) */
export const SESSION_ID_COOKIE_NAME = 'session_id';

/** HttpOnly list of logged-in slot keys (same strings as auth_session values) */
export const AUTH_SLOTS_COOKIE_NAME = 'auth_slots';

export const ERP_SID_PREFIX = 'erp_sid_';

/** Session duration in seconds (30 days) */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export type AuthRole = 'school' | 'teacher' | 'student' | 'accountant';

function resolveCookiePath(): string {
  return '/';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Canonical slot / auth value: school:CODE, teacher:CODE, student:CODE, accountant:CODE,
 * or bare teacher | student | accountant when no school segment (legacy).
 */
export function buildAuthCookieValue(role: AuthRole, schoolCode?: string): string {
  if (role === 'school' && schoolCode) {
    return `school:${schoolCode.toUpperCase()}`;
  }
  if (schoolCode && ['teacher', 'student', 'accountant'].includes(role)) {
    return `${role}:${schoolCode.toUpperCase()}`;
  }
  return role;
}

export function slotKeyToCookieName(slotKey: string): string {
  return ERP_SID_PREFIX + slotKey.replace(/:/g, '_');
}

export function cookieNameToSlotKey(cookieName: string): string | null {
  if (!cookieName.startsWith(ERP_SID_PREFIX)) return null;
  const rest = cookieName.slice(ERP_SID_PREFIX.length);
  const roles = ['school', 'teacher', 'student', 'accountant'] as const;
  for (const r of roles) {
    if (rest === r) return r;
    const prefix = `${r}_`;
    if (rest.startsWith(prefix)) {
      return `${r}:${rest.slice(prefix.length)}`;
    }
  }
  return null;
}

export function parseAuthCookie(value: string): { role: AuthRole; schoolCode?: string } | null {
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return null;
  if (decoded.startsWith('school:')) {
    const schoolCode = decoded.slice(7);
    return schoolCode ? { role: 'school', schoolCode } : null;
  }
  for (const r of ['teacher', 'student', 'accountant'] as const) {
    if (decoded === r) return { role: r };
    if (decoded.startsWith(`${r}:`)) {
      const code = decoded.slice(r.length + 1);
      return code ? { role: r, schoolCode: code } : null;
    }
  }
  return null;
}

/** Inverse of buildAuthCookieValue for slot keys stored in auth_slots */
export function parseAuthSlotKey(slotKey: string): { role: AuthRole; schoolCode?: string } | null {
  return parseAuthCookie(slotKey);
}

export function parseAuthSlots(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function setAuthCookie(
  response: Response,
  role: AuthRole,
  schoolCode?: string,
  maxAge: number = SESSION_MAX_AGE
): void {
  const value = buildAuthCookieValue(role, schoolCode);
  const cookiePath = resolveCookiePath();
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=${cookiePath}`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (isProduction()) {
    cookieParts.push('Secure');
  }
  response.headers.append('Set-Cookie', cookieParts.join('; '));
}

/** Set active auth from an existing slot key string (e.g. after switch). */
export function setAuthCookieFromSlotKey(response: Response, slotKey: string, maxAge: number = SESSION_MAX_AGE): void {
  const cookiePath = resolveCookiePath();
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(slotKey)}`,
    `Path=${cookiePath}`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (isProduction()) {
    cookieParts.push('Secure');
  }
  response.headers.append('Set-Cookie', cookieParts.join('; '));
}

export function clearAuthCookie(response: Response, schoolCode?: string): void {
  response.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
  );
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/dashboard; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/teacher; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/student; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${AUTH_COOKIE_NAME}=; Path=/accountant; Max-Age=0; SameSite=Lax; HttpOnly`);
  if (schoolCode) {
    response.headers.append(
      'Set-Cookie',
      `${AUTH_COOKIE_NAME}=; Path=/dashboard/${String(schoolCode).toUpperCase()}; Max-Age=0; SameSite=Lax; HttpOnly`
    );
  }
}

export function setSessionSlotCookie(
  response: Response,
  sessionToken: string,
  maxAge: number,
  slotKey: string
): void {
  const name = slotKeyToCookieName(slotKey);
  const cookiePath = resolveCookiePath();
  const cookieParts = [
    `${name}=${encodeURIComponent(sessionToken)}`,
    `Path=${cookiePath}`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (isProduction()) {
    cookieParts.push('Secure');
  }
  response.headers.append('Set-Cookie', cookieParts.join('; '));
}

export function clearSessionSlotCookie(response: Response, slotKey: string): void {
  const name = slotKeyToCookieName(slotKey);
  response.headers.append('Set-Cookie', `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
}

export function mergeAuthSlotsCookie(
  response: Response,
  slotKey: string,
  maxAge: number,
  existingSlotsRaw: string | undefined
): void {
  const slots = parseAuthSlots(existingSlotsRaw);
  if (!slots.includes(slotKey)) {
    slots.push(slotKey);
  }
  writeAuthSlotsCookie(response, slots, maxAge);
}

export function writeAuthSlotsCookie(response: Response, slots: string[], maxAge: number): void {
  const cookiePath = resolveCookiePath();
  if (slots.length === 0) {
    response.headers.append(
      'Set-Cookie',
      `${AUTH_SLOTS_COOKIE_NAME}=; Path=${cookiePath}; Max-Age=0; SameSite=Lax; HttpOnly`
    );
    return;
  }
  const value = encodeURIComponent(JSON.stringify(slots));
  const cookieParts = [
    `${AUTH_SLOTS_COOKIE_NAME}=${value}`,
    `Path=${cookiePath}`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (isProduction()) {
    cookieParts.push('Secure');
  }
  response.headers.append('Set-Cookie', cookieParts.join('; '));
}

/**
 * Apply cookies after successful login: active session, slot token, auth_slots merge.
 */
export function applyLoginCookies(
  response: Response,
  request: NextRequest,
  sessionToken: string,
  role: AuthRole,
  schoolCode: string | null | undefined
): void {
  const maxAge = SESSION_MAX_AGE;
  const sc =
    schoolCode && String(schoolCode).trim() ? String(schoolCode).trim().toUpperCase() : undefined;
  setAuthCookie(response, role, sc, maxAge);
  const slotKey = buildAuthCookieValue(role, sc);
  setSessionSlotCookie(response, sessionToken, maxAge, slotKey);
  const existing = request.cookies.get(AUTH_SLOTS_COOKIE_NAME)?.value;
  mergeAuthSlotsCookie(response, slotKey, maxAge, existing);
}

export type CookieGetter = { get: (name: string) => { value: string } | undefined };

export function getSessionTokenFromCookieGetter(
  getter: CookieGetter,
  parsed: { role: AuthRole; schoolCode?: string }
): string | undefined {
  const primaryName = slotKeyToCookieName(buildAuthCookieValue(parsed.role, parsed.schoolCode));
  let raw = getter.get(primaryName)?.value;
  if (raw) return raw;
  if (parsed.role !== 'school') {
    const bareName = slotKeyToCookieName(buildAuthCookieValue(parsed.role, undefined));
    if (bareName !== primaryName) {
      raw = getter.get(bareName)?.value;
      if (raw) return raw;
    }
  }
  return getter.get(SESSION_ID_COOKIE_NAME)?.value;
}

/** @deprecated Use applyLoginCookies; slot cookies replace a single global session_id write */
export function setSessionIdCookie(
  response: Response,
  sessionToken: string,
  maxAge: number = SESSION_MAX_AGE,
  role?: AuthRole,
  schoolCode?: string
): void {
  if (!role) {
    const cookiePath = resolveCookiePath();
    const cookieParts = [
      `${SESSION_ID_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`,
      `Path=${cookiePath}`,
      `Max-Age=${maxAge}`,
      `SameSite=Lax`,
      `HttpOnly`,
    ];
    if (isProduction()) {
      cookieParts.push('Secure');
    }
    response.headers.append('Set-Cookie', cookieParts.join('; '));
    return;
  }
  const sc =
    schoolCode && String(schoolCode).trim() ? String(schoolCode).trim().toUpperCase() : undefined;
  const slotKey = buildAuthCookieValue(role, sc);
  setSessionSlotCookie(response, sessionToken, maxAge, slotKey);
}

export function clearSessionIdCookie(response: Response, schoolCode?: string): void {
  response.headers.append(
    'Set-Cookie',
    `${SESSION_ID_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
  );
  response.headers.append('Set-Cookie', `${SESSION_ID_COOKIE_NAME}=; Path=/dashboard; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${SESSION_ID_COOKIE_NAME}=; Path=/teacher; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${SESSION_ID_COOKIE_NAME}=; Path=/student; Max-Age=0; SameSite=Lax; HttpOnly`);
  response.headers.append('Set-Cookie', `${SESSION_ID_COOKIE_NAME}=; Path=/accountant; Max-Age=0; SameSite=Lax; HttpOnly`);
  if (schoolCode) {
    response.headers.append(
      'Set-Cookie',
      `${SESSION_ID_COOKIE_NAME}=; Path=/dashboard/${String(schoolCode).toUpperCase()}; Max-Age=0; SameSite=Lax; HttpOnly`
    );
  }
}

/** Clear legacy session_id and every erp_sid_* / auth_slots seen on the request. */
export function clearAllSessionSlotCookies(response: Response, request: NextRequest): void {
  clearSessionIdCookie(response);
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith(ERP_SID_PREFIX) || c.name === AUTH_SLOTS_COOKIE_NAME) {
      response.headers.append('Set-Cookie', `${c.name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`);
    }
  }
}

export function getAuthCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    path: '/' as const,
    maxAge,
    sameSite: 'lax' as const,
    secure: isProduction(),
  };
}

export function redirectPathForAuth(auth: { role: AuthRole; schoolCode?: string }): string {
  switch (auth.role) {
    case 'school':
      return auth.schoolCode ? `/dashboard/${auth.schoolCode.toUpperCase()}` : '/admin/login';
    case 'teacher':
      return '/teacher/dashboard';
    case 'student':
      return '/student/dashboard';
    case 'accountant':
      return '/accountant/dashboard';
    default:
      return '/login';
  }
}
