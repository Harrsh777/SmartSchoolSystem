/** Helpers for fee collection list: academic dues for the current calendar month vs. transport. */

const DUE_EPS = 0.01;

export function feeRowYearMonth(fee: { due_month?: unknown; due_date?: unknown }): string | null {
  const dm = fee.due_month != null ? String(fee.due_month).trim() : '';
  if (dm.length >= 7) return dm.slice(0, 7);
  const dd = fee.due_date != null ? String(fee.due_date).trim() : '';
  if (dd.length >= 7) return dd.slice(0, 7);
  return null;
}

export type AcademicFeeColumnState =
  | { kind: 'NONE'; amount: number; due_date: string }
  | { kind: 'CURRENT_DUE'; amount: number; due_date: string }
  | { kind: 'CURRENT_CLEAR'; amount: number; due_date: string };

type FeeLike = {
  total_due: number;
  late_fee?: number;
  due_date: string;
  due_month?: string;
};

/**
 * List column rules:
 * - If there is unpaid academic in the current calendar month → show that sum + earliest due date in that month.
 * - Else if student has some unpaid academic (other months) → current month is clear → Paid.
 * - Else → no academic dues in pending set (e.g. transport-only) → NONE.
 */
export function computeAcademicFeeColumnState(
  academicFees: FeeLike[],
  today: Date = new Date()
): AcademicFeeColumnState {
  const unpaid = academicFees.filter((f) => Number(f.total_due || 0) > DUE_EPS);
  if (unpaid.length === 0) {
    return { kind: 'NONE', amount: 0, due_date: '' };
  }

  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const currentYm = `${y}-${String(m).padStart(2, '0')}`;

  const currentUnpaid = unpaid.filter((f) => feeRowYearMonth(f) === currentYm);
  if (currentUnpaid.length > 0) {
    const amount =
      Math.round(currentUnpaid.reduce((s, f) => s + Number(f.total_due || 0), 0) * 100) / 100;
    let due_date = '';
    for (const f of currentUnpaid) {
      const d = String(f.due_date || '').trim();
      if (d && (!due_date || d < due_date)) due_date = d;
    }
    return { kind: 'CURRENT_DUE', amount, due_date };
  }

  return { kind: 'CURRENT_CLEAR', amount: 0, due_date: '' };
}

export function sumLateFeeForFees(fees: FeeLike[]): number {
  return Math.round(fees.reduce((s, f) => s + Number(f.late_fee || 0), 0) * 100) / 100;
}
