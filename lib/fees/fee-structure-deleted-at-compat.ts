import type { PostgrestError } from '@supabase/supabase-js';

/** True when Postgres reports undefined column `fee_structures.deleted_at` (migration not applied). */
export function isMissingFeeStructuresDeletedAtColumn(err: PostgrestError | null | undefined): boolean {
  if (!err) return false;
  if (String(err.code) !== '42703') return false;
  const m = String(err.message || '').toLowerCase();
  return m.includes('deleted_at') && m.includes('does not exist');
}

/** True when an update/insert failed because `deleted_at` is not on the table (incl. schema cache wording). */
export function isSoftDeleteBlockedByMissingDeletedAtColumn(err: PostgrestError | null | undefined): boolean {
  if (!err) return false;
  if (isMissingFeeStructuresDeletedAtColumn(err)) return true;
  const m = String(err.message || '').toLowerCase();
  return (
    m.includes('deleted_at') &&
    (m.includes('does not exist') || m.includes('schema cache') || m.includes('could not find'))
  );
}

/** Paste into Supabase Dashboard → SQL Editor, then run. Reload API schema if PostgREST still errors. */
export const FEE_STRUCTURES_DELETED_AT_SQL = `
ALTER TABLE fee_structures
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN fee_structures.deleted_at IS 'When set, structure is hidden from management; student_fees rows remain for collection history.';

CREATE INDEX IF NOT EXISTS idx_fee_structures_school_not_deleted
  ON fee_structures (school_code)
  WHERE deleted_at IS NULL;
`.trim();
