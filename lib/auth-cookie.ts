/**
 * Server-side auth cookie helpers for middleware and login APIs.
 * Cookie is HttpOnly so client JS cannot read it; middleware can.
 */

export const AUTH_COOKIE_NAME = 'auth_session';

/** Session duration in seconds (20 minutes) */
const SESSION_MAX_AGE = 20 * 60;

export type AuthRole = 'school' | 'teacher' | 'student' | 'accountant';

/**
 * Build cookie value: "school:SCH001" | "teacher" | "student" | "accountant"
 */
export function buildAuthCookieValue(role: AuthRole, schoolCode?: string): string {
  if (role === 'school' && schoolCode) {
    return `school:${schoolCode.toUpperCase()}`;
  }
  return role;
}

/**
 * Set auth cookie on a NextResponse (use in login API routes).
 */
export function setAuthCookie(
  response: Response,
  role: AuthRole,
  schoolCode?: string,
  maxAge: number = SESSION_MAX_AGE
): void {
  const value = buildAuthCookieValue(role, schoolCode);
  const isProd = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(value)}`,
    `Path=/`,
    `Max-Age=${maxAge}`,
    `SameSite=Lax`,
    `HttpOnly`,
  ];
  if (isProd) {
    cookieParts.push('Secure');
  }
  response.headers.append('Set-Cookie', cookieParts.join('; '));
}

/**
 * Clear auth cookie (use in logout API and on login failure if needed).
 */
export function clearAuthCookie(response: Response): void {
  response.headers.append(
    'Set-Cookie',
    `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`
  );
}

/**
 * Parse cookie value from middleware: returns { role, schoolCode } or null.
 */
export function parseAuthCookie(value: string): { role: AuthRole; schoolCode?: string } | null {
  const decoded = decodeURIComponent(value).trim();
  if (!decoded) return null;
  if (decoded.startsWith('school:')) {
    const schoolCode = decoded.slice(7);
    return schoolCode ? { role: 'school', schoolCode } : null;
  }
  if (decoded === 'teacher' || decoded === 'student' || decoded === 'accountant') {
    return { role: decoded as AuthRole };
  }
  return null;
}
