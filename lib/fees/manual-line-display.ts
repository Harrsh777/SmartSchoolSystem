/** UI / receipt label for a manual fee line (student or class source). */
export function manualLineReceiptLabel(line: { kind: string; label: string }): string {
  if (line.kind === 'discount') return 'Discount';
  const label = String(line.label || '').trim();
  if (!label) return 'Additional charge';
  return label;
}

/** Section heading on collection UI and receipts. */
export const MANUAL_LINES_SECTION_TITLE = 'Discounts, fines & additional charges';

export function formatManualLineAmount(amount: number): { sign: '+' | '−'; abs: number } {
  const n = Number(amount);
  if (n < 0) return { sign: '−', abs: Math.abs(n) };
  return { sign: '+', abs: Math.abs(n) };
}
