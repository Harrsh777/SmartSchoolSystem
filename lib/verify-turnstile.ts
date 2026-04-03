/**
 * Optional Cloudflare Turnstile verification.
 * Set TURNSTILE_SECRET_KEY in env to enforce; omit to skip.
 */

export async function verifyTurnstileIfConfigured(
  token: string | undefined,
  remoteip: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { ok: true };
  }
  if (!token?.trim()) {
    return { ok: false, message: 'CAPTCHA verification required' };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token.trim());
  if (remoteip && remoteip !== 'unknown') {
    body.set('remoteip', remoteip);
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
  if (data.success === true) {
    return { ok: true };
  }
  return { ok: false, message: 'CAPTCHA verification failed' };
}
