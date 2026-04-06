import type { SupabaseClient } from '@supabase/supabase-js';

export type TransportFeeMode = 'MERGED' | 'SEPARATE';

export function normalizeTransportFeeMode(raw: string | null | undefined): TransportFeeMode {
  const u = String(raw || 'MERGED').toUpperCase().trim();
  return u === 'SEPARATE' ? 'SEPARATE' : 'MERGED';
}

/**
 * Per-school: MERGED keeps transport on student_fees + main receipts; SEPARATE uses transport_fee_payment_entries only.
 */
export async function getTransportFeeMode(
  supabase: SupabaseClient,
  schoolCode: string
): Promise<TransportFeeMode> {
  const code = schoolCode.toUpperCase().trim();
  const { data, error } = await supabase
    .from('fee_configuration')
    .select('transport_fee_mode')
    .eq('school_code', code)
    .maybeSingle();

  if (
    error &&
    (error.code === '42703' ||
      /transport_fee_mode|does not exist/i.test(String(error.message || '')))
  ) {
    return 'MERGED';
  }
  if (error && error.code !== 'PGRST116') {
    console.warn('[transport-fee-mode] fetch:', error.message);
  }

  const mode = (data as { transport_fee_mode?: string } | null)?.transport_fee_mode;
  return normalizeTransportFeeMode(mode);
}

export function isSeparateTransportMode(mode: TransportFeeMode): boolean {
  return mode === 'SEPARATE';
}

/**
 * When SEPARATE: hide settled transport rows from main fee collection; keep legacy partial (total_due > 0).
 */
export function includeTransportStudentFeeRowForMainFeesUi(
  mode: TransportFeeMode,
  feeSource: string | null | undefined,
  totalDue: number
): boolean {
  if (String(feeSource || '') !== 'transport') return true;
  if (mode === 'MERGED') return true;
  const due = Number(totalDue || 0);
  return due > 0.02;
}
