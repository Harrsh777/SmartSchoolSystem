/**
 * Calls logout API (current session only) and navigates so Set-Cookie from the response applies.
 */
export async function logoutCurrentSessionAndGo(
  fallbackPath = '/login',
  options?: { beforeNavigate?: () => void }
): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }).catch(() => null);

  let next = fallbackPath;
  if (res?.ok) {
    const j = (await res.json().catch(() => ({}))) as { redirectTo?: string };
    if (typeof j.redirectTo === 'string' && j.redirectTo.length > 0) {
      next = j.redirectTo;
    }
  }
  options?.beforeNavigate?.();
  window.location.assign(next);
}
