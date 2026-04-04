import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminPanelSession,
} from '@/lib/admin-panel-session';
import {
  clearAdminLoginFailures,
  isAdminLoginLocked,
  registerAdminLoginFailure,
} from '@/lib/admin-brute-force';
import { verifyTurnstileIfConfigured } from '@/lib/verify-turnstile';

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/** .env often uses \\$ so Next does not treat $ as expansion; strip those backslashes for bcrypt. */
function superAdminPasswordHashFromEnv(): string {
  const raw = process.env.SUPER_ADMIN_PASSWORD_HASH?.trim() ?? '';
  return raw.replace(/\\\$/g, '$');
}

export async function POST(request: NextRequest) {
  const lock = await isAdminLoginLocked(request);
  if (lock.locked) {
    return NextResponse.json(
      { error: 'Too many failed attempts. Try again later.', retryAfterSec: lock.retryAfterSec },
      {
        status: 429,
        headers: lock.retryAfterSec
          ? { 'Retry-After': String(lock.retryAfterSec) }
          : undefined,
      }
    );
  }

  const rate = await checkRateLimit(request, 'admin-login', { windowMs: 60 * 1000, max: 15 });
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const hash = superAdminPasswordHashFromEnv();
  if (!hash || !hash.startsWith('$2')) {
    return NextResponse.json(
      {
        error: 'Super admin login is not configured.',
        hint: 'Set SUPER_ADMIN_PASSWORD_HASH to a bcrypt hash (see scripts/hash-super-admin-password.mjs).',
      },
      { status: 503 }
    );
  }

  let body: { password?: string; turnstileToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ip = clientIp(request);
  const captcha = await verifyTurnstileIfConfigured(body.turnstileToken, ip);
  if (!captcha.ok) {
    return NextResponse.json({ error: captcha.message }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const ok = await bcrypt.compare(password, hash);
  if (!ok) {
    await registerAdminLoginFailure(request);
    const after = await isAdminLoginLocked(request);
    return NextResponse.json(
      { error: 'Invalid credentials', locked: after.locked, retryAfterSec: after.retryAfterSec },
      { status: 401 }
    );
  }

  await clearAdminLoginFailures(request);

  const maxAgeSec = 8 * 60 * 60;
  const { token } = await createAdminPanelSession(maxAgeSec);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieOptions(maxAgeSec));

  // Audit (best-effort)
  void fetch(new URL('/api/auth/log-login', request.url).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: null,
      name: 'Admin Panel',
      role: 'Super Admin',
      loginType: 'admin-panel',
      status: 'success',
    }),
  }).catch(() => {});

  return res;
}

