import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export const ADMIN_SESSION_COOKIE = 'erp_admin_sid';

const TOKEN_BYTES = 32;
const DEFAULT_MAX_AGE_SEC = 8 * 60 * 60; // 8 hours

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function adminSessionCookieOptions(maxAgeSec: number = DEFAULT_MAX_AGE_SEC) {
  return {
    httpOnly: true as const,
    secure: isProduction(),
    sameSite: 'lax' as const,
    path: '/' as const,
    maxAge: maxAgeSec,
  };
}

export function generateAdminSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

export async function createAdminPanelSession(
  maxAgeSec: number = DEFAULT_MAX_AGE_SEC
): Promise<{ token: string; expiresAt: Date }> {
  const supabase = getServiceRoleClient();
  const token = generateAdminSessionToken();
  const expiresAt = new Date(Date.now() + maxAgeSec * 1000);

  const { error } = await supabase.from('admin_panel_sessions').insert({
    session_token: token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(`admin_panel_sessions insert failed: ${error.message}`);
  }

  return { token, expiresAt };
}

export async function getAdminPanelSessionByToken(
  token: string | undefined | null
): Promise<{ id: string; expires_at: string } | null> {
  if (!token?.trim()) return null;
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('admin_panel_sessions')
    .select('id, expires_at')
    .eq('session_token', token.trim())
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { id: string; expires_at: string };
  const exp = new Date(row.expires_at).getTime();
  if (exp <= Date.now()) {
    await destroyAdminPanelSession(token.trim());
    return null;
  }

  const extend = new Date(Date.now() + DEFAULT_MAX_AGE_SEC * 1000);
  await supabase
    .from('admin_panel_sessions')
    .update({ last_seen_at: new Date().toISOString(), expires_at: extend.toISOString() })
    .eq('session_token', token.trim());

  return { id: row.id, expires_at: extend.toISOString() };
}

export async function destroyAdminPanelSession(token: string): Promise<void> {
  if (!token?.trim()) return;
  const supabase = getServiceRoleClient();
  await supabase.from('admin_panel_sessions').delete().eq('session_token', token.trim());
}

export async function getAdminSessionFromRequest(
  request: NextRequest
): Promise<{ id: string; expires_at: string } | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return getAdminPanelSessionByToken(token);
}
