/** Normalize student_fees / class_fee_line due_month for comparisons (YYYY-MM-DD prefix). */
export function normalizeFeeDueMonthKey(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : t;
}
