import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions, destroyAdminPanelSession } from '@/lib/admin-panel-session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await destroyAdminPanelSession(token);
  }
  const res = NextResponse.json({ ok: true });
  const opts = adminSessionCookieOptions(1);
  res.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...opts,
    maxAge: 0,
  });
  return res;
}
