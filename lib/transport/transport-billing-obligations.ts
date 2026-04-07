import type { SupabaseClient } from '@supabase/supabase-js';
import type { TransportBillingFrequency } from '@/lib/transport/transport-billing-period';
import { periodStartForBilling } from '@/lib/transport/transport-billing-period';

function isMissingObligationTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const m = String(err.message || '');
  return err.code === '42P01' || m.includes('transport_billing_obligations') || m.includes('does not exist');
}

/**
 * Upserts the canonical obligation row for student + period. Enforces one row per (school, student, period_start).
 * Does not clear assignment_version_id when params.assignmentVersionId is null (roster sync).
 */
export async function upsertTransportBillingObligation(
  supabase: SupabaseClient,
  params: {
    schoolCode: string;
    studentId: string;
    billingMonthIso: string;
    billingFrequency: TransportBillingFrequency;
    amountDue: number;
    assignmentVersionId: string | null;
  }
): Promise<void> {
  const code = params.schoolCode.toUpperCase().trim();
  const periodStart = periodStartForBilling(params.billingMonthIso, params.billingFrequency);
  const amt = Math.round(params.amountDue * 100) / 100;

  const probe = await supabase.from('transport_billing_obligations').select('id').limit(1);
  if (probe.error && isMissingObligationTableError(probe.error)) {
    return;
  }

  const { data: existing, error: exErr } = await supabase
    .from('transport_billing_obligations')
    .select('id')
    .eq('school_code', code)
    .eq('student_id', params.studentId)
    .eq('period_start', periodStart)
    .maybeSingle();

  if (exErr && !isMissingObligationTableError(exErr)) {
    console.warn('[transport_billing_obligations] select:', exErr.message);
    return;
  }

  const now = new Date().toISOString();

  if (!existing?.id) {
    const insertRow: Record<string, unknown> = {
      school_code: code,
      student_id: params.studentId,
      period_start: periodStart,
      billing_frequency: params.billingFrequency,
      amount_due: amt,
      assignment_version_id: params.assignmentVersionId,
      updated_at: now,
    };
    const { error } = await supabase.from('transport_billing_obligations').insert(insertRow);
    if (error && !isMissingObligationTableError(error)) {
      console.warn('[transport_billing_obligations] insert:', error.message);
    }
    return;
  }

  const patch: Record<string, unknown> = {
    amount_due: amt,
    billing_frequency: params.billingFrequency,
    updated_at: now,
  };
  if (params.assignmentVersionId != null) {
    patch.assignment_version_id = params.assignmentVersionId;
  }

  const { error: upErr } = await supabase
    .from('transport_billing_obligations')
    .update(patch)
    .eq('id', existing.id);

  if (upErr && !isMissingObligationTableError(upErr)) {
    console.warn('[transport_billing_obligations] update:', upErr.message);
  }
}

export async function fetchObligationAmount(
  supabase: SupabaseClient,
  schoolCode: string,
  studentId: string,
  billingMonthIso: string,
  billingFrequency: TransportBillingFrequency
): Promise<number | null> {
  const code = schoolCode.toUpperCase().trim();
  const periodStart = periodStartForBilling(billingMonthIso, billingFrequency);

  const { data, error } = await supabase
    .from('transport_billing_obligations')
    .select('amount_due')
    .eq('school_code', code)
    .eq('student_id', studentId)
    .eq('period_start', periodStart)
    .maybeSingle();

  if (error || !data) return null;
  const n = Number((data as { amount_due?: number }).amount_due);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
