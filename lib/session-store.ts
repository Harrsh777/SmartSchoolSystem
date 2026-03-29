/**
 * Server-side session store (database-backed).
 * Session token is stored in HttpOnly cookie; session data lives in Supabase `sessions` table.
 */

import { randomBytes } from 'crypto';
import { NextRequest } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import {
  AUTH_COOKIE_NAME,
  SESSION_ID_COOKIE_NAME,
  getSessionTokenFromCookieGetter,
  parseAuthCookie,
} from '@/lib/auth-cookie';
import type { AuthRole } from '@/lib/auth-cookie';
import { cookies } from 'next/headers';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days – user stays logged in until they click Logout
const TOKEN_BYTES = 32;

function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export interface SessionData {
  id: string;
  session_token: string;
  role: AuthRole;
  school_code: string | null;
  user_id: string | null;
  user_payload: Record<string, unknown> | null;
  expires_at: string;
  created_at: string;
}

export interface CreateSessionOptions {
  role: AuthRole;
  schoolCode?: string | null;
  userId?: string | null;
  userPayload?: Record<string, unknown> | null;
  maxAgeSeconds?: number;
}

/**
 * Create a new session row and return the session token (to set in cookie).
 */
export async function createSession(options: CreateSessionOptions): Promise<{
  sessionToken: string;
  expiresAt: Date;
}> {
  const { role, schoolCode = null, userId = null, userPayload = null, maxAgeSeconds = SESSION_TTL_SECONDS } = options;
  const supabase = getServiceRoleClient();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);

  const { error } = await supabase.from('sessions').insert({
    session_token: sessionToken,
    role,
    school_code: schoolCode ?? null,
    user_id: userId ?? null,
    user_payload: userPayload ?? null,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return { sessionToken, expiresAt };
}

/**
 * Get session by token. Returns null if not found or expired.
 * Optionally refresh expires_at for sliding expiry.
 */
export async function getSession(
  sessionToken: string,
  options?: { sliding?: boolean; extendSeconds?: number }
): Promise<SessionData | null> {
  if (!sessionToken?.trim()) return null;
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_token', sessionToken)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const expiresAt = new Date((row.expires_at as string) || 0);
  if (expiresAt.getTime() <= Date.now()) {
    await destroySession(sessionToken);
    return null;
  }

  if (options?.sliding && options?.extendSeconds) {
    const newExpires = new Date(Date.now() + options.extendSeconds * 1000);
    await supabase
      .from('sessions')
      .update({ expires_at: newExpires.toISOString() })
      .eq('session_token', sessionToken);
    row.expires_at = newExpires.toISOString();
  }

  return {
    id: row.id as string,
    session_token: row.session_token as string,
    role: row.role as AuthRole,
    school_code: (row.school_code as string) ?? null,
    user_id: (row.user_id as string) ?? null,
    user_payload: (row.user_payload as Record<string, unknown>) ?? null,
    expires_at: row.expires_at as string,
    created_at: row.created_at as string,
  };
}

export function sessionMatchesParsedAuth(
  session: SessionData,
  auth: { role: AuthRole; schoolCode?: string }
): boolean {
  if (session.role !== auth.role) return false;
  if (auth.role === 'school') {
    return (
      !!auth.schoolCode &&
      String(session.school_code ?? '').toUpperCase() === auth.schoolCode.toUpperCase()
    );
  }
  if (auth.schoolCode) {
    return String(session.school_code ?? '').toUpperCase() === auth.schoolCode.toUpperCase();
  }
  return true;
}

/**
 * Delete session by token (logout).
 */
export async function destroySession(sessionToken: string): Promise<void> {
  if (!sessionToken?.trim()) return;
  const supabase = getServiceRoleClient();
  await supabase.from('sessions').delete().eq('session_token', sessionToken);
}

/**
 * Delete all sessions for a user (e.g. "logout everywhere").
 */
export async function destroySessionsForUser(role: AuthRole, userId: string): Promise<void> {
  const supabase = getServiceRoleClient();
  await supabase.from('sessions').delete().eq('role', role).eq('user_id', userId);
}

/**
 * Read session token from request cookies and return session data.
 * Use in API routes to authorize requests.
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const authRaw = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const parsed = authRaw ? parseAuthCookie(authRaw) : null;
  if (!parsed) {
    const legacyOnly = request.cookies.get(SESSION_ID_COOKIE_NAME)?.value;
    if (!legacyOnly) return null;
    const session = await getSession(legacyOnly, { sliding: true, extendSeconds: SESSION_TTL_SECONDS });
    return session;
  }
  const token = getSessionTokenFromCookieGetter(request.cookies, parsed);
  if (!token) return null;
  const session = await getSession(token, { sliding: true, extendSeconds: SESSION_TTL_SECONDS });
  if (!session || !sessionMatchesParsedAuth(session, parsed)) return null;
  return session;
}

/**
 * Read session token from Next.js cookies() (e.g. in Server Components or route handlers).
 * Use when you need the session in a context where you don't have NextRequest.
 */
export async function getSessionFromCookies(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const authRaw = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const parsed = authRaw ? parseAuthCookie(authRaw) : null;
  if (!parsed) {
    const legacyOnly = cookieStore.get(SESSION_ID_COOKIE_NAME)?.value;
    if (!legacyOnly) return null;
    return getSession(legacyOnly, { sliding: true, extendSeconds: SESSION_TTL_SECONDS });
  }
  const token = getSessionTokenFromCookieGetter(cookieStore, parsed);
  if (!token) return null;
  const session = await getSession(token, { sliding: true, extendSeconds: SESSION_TTL_SECONDS });
  if (!session || !sessionMatchesParsedAuth(session, parsed)) return null;
  return session;
}
