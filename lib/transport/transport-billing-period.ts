export type TransportBillingFrequency = 'MONTHLY' | 'QUARTERLY';

export function normalizeBillingFrequency(raw: string | null | undefined): TransportBillingFrequency {
  const u = String(raw || 'MONTHLY').toUpperCase().trim();
  return u === 'QUARTERLY' ? 'QUARTERLY' : 'MONTHLY';
}

/** First day of calendar month for a Date (local). */
export function monthStartFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** First day of calendar quarter containing the given date (local). */
export function quarterStartFromDate(d: Date): string {
  const monthIndex = d.getMonth(); // 0–11
  const q0 = Math.floor(monthIndex / 3) * 3;
  const y = d.getFullYear();
  const m = String(q0 + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/**
 * Canonical billing period start for the UI "billing month" control and student frequency.
 * @param billingMonthIso e.g. "2026-04-01" or "2026-04" (normalized to first of month)
 */
export function periodStartForBilling(
  billingMonthIso: string,
  frequency: TransportBillingFrequency
): string {
  const s = String(billingMonthIso || '').trim();
  const d = new Date(s.length <= 7 ? `${s}-01` : s);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return frequency === 'QUARTERLY' ? quarterStartFromDate(now) : monthStartFromDate(now);
  }
  return frequency === 'QUARTERLY' ? quarterStartFromDate(d) : monthStartFromDate(d);
}

export function dayBeforeIso(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function quarterLabel(periodStart: string): string {
  const d = new Date(`${periodStart}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return periodStart;
  const m = d.getUTCMonth() + 1;
  const q = Math.floor((m - 1) / 3) + 1;
  const y = d.getUTCFullYear();
  return `Q${q} ${y}`;
}

export function formatPeriodLabel(periodStart: string, frequency: TransportBillingFrequency): string {
  if (frequency === 'QUARTERLY') return quarterLabel(periodStart);
  const d = new Date(`${periodStart}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return periodStart;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
