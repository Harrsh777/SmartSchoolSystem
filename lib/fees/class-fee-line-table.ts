/**
 * Detect PostgREST / Postgres errors when `class_fee_line_adjustments` is missing
 * (migration not applied or schema cache stale).
 */
export function isClassFeeLineTableMissingError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = String(error.code ?? '');
  const msg = String(error.message ?? '');
  return (
    code === '42P01' ||
    /does not exist/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /relation\s+["']?(public\.)?class_fee_line_adjustments/i.test(msg)
  );
}
