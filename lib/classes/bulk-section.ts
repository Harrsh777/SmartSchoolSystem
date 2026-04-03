/** Single uppercase letter A–Z only; empty → skip. */
export function normalizeBulkSectionInput(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!t) return null;
  if (t.length !== 1) return null;
  if (!/^[A-Z]$/.test(t)) return null;
  return t;
}

/** For paste or multi-char: take first valid letter if any. */
export function sanitizeSectionKeystroke(raw: string): string {
  const u = raw.toUpperCase().replace(/[^A-Z]/g, '');
  return u.slice(0, 1);
}
