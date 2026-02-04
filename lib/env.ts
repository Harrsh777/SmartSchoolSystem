/**
 * Centralized app URL for server-side fetch and redirects.
 * Set NEXT_PUBLIC_APP_URL in production (e.g. https://your-domain.com).
 * In development, falls back to localhost only when the env is unset.
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  return '';
}

/**
 * Base URL for verification links and similar (must be absolute in production).
 * Prefer getAppUrl() for API-to-API calls; use this when building user-facing links.
 */
export function getPublicBaseUrl(): string {
  return getAppUrl();
}
