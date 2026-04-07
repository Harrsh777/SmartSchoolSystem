import type { SupabaseClient } from '@supabase/supabase-js';
import { dayBeforeIso, type TransportBillingFrequency } from '@/lib/transport/transport-billing-period';

function isMissingAssignmentTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const m = String(err.message || '');
  return err.code === '42P01' || m.includes('transport_assignment_versions') || m.includes('does not exist');
}

/**
 * Closes the open assignment row (effective_to) and inserts a new version. Returns new row id or null if tables are absent.
 */
export async function recordTransportAssignmentVersion(
  supabase: SupabaseClient,
  params: {
    schoolCode: string;
    studentId: string;
    routeId: string;
    pickupStopId: string | null;
    dropoffStopId: string | null;
    transportCustomFare: number | null;
    transportFee: number;
    billingFrequency: TransportBillingFrequency;
    effectiveFrom: string;
  }
): Promise<string | null> {
  const code = params.schoolCode.toUpperCase().trim();

  const probe = await supabase.from('transport_assignment_versions').select('id').limit(1);
  if (probe.error) {
    if (isMissingAssignmentTableError(probe.error)) return null;
    console.warn('[transport_assignment_versions] probe:', probe.error.message);
    return null;
  }

  const { data: openRows, error: openErr } = await supabase
    .from('transport_assignment_versions')
    .select('id')
    .eq('school_code', code)
    .eq('student_id', params.studentId)
    .is('effective_to', null)
    .limit(1);

  if (openErr && !isMissingAssignmentTableError(openErr)) {
    console.warn('[transport_assignment_versions] list open:', openErr.message);
  }

  const openId = openRows?.[0]?.id as string | undefined;
  if (openId) {
    const effectiveTo = dayBeforeIso(params.effectiveFrom);
    const { error: closeErr } = await supabase
      .from('transport_assignment_versions')
      .update({ effective_to: effectiveTo })
      .eq('id', openId);
    if (closeErr) {
      console.warn('[transport_assignment_versions] close:', closeErr.message);
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('transport_assignment_versions')
    .insert({
      school_code: code,
      student_id: params.studentId,
      route_id: params.routeId,
      transport_pickup_stop_id: params.pickupStopId,
      transport_dropoff_stop_id: params.dropoffStopId,
      transport_custom_fare: params.transportCustomFare,
      transport_fee: params.transportFee,
      billing_frequency: params.billingFrequency,
      effective_from: params.effectiveFrom,
      effective_to: null,
    })
    .select('id')
    .single();

  if (insErr) {
    if (isMissingAssignmentTableError(insErr)) return null;
    console.warn('[transport_assignment_versions] insert:', insErr.message);
    return null;
  }
  return inserted?.id ? String(inserted.id) : null;
}

export async function closeTransportAssignmentVersionsForStudent(
  supabase: SupabaseClient,
  schoolCode: string,
  studentId: string,
  closeEffectiveTo: string
): Promise<void> {
  const code = schoolCode.toUpperCase().trim();
  const probe = await supabase.from('transport_assignment_versions').select('id').limit(1);
  if (probe.error && isMissingAssignmentTableError(probe.error)) return;

  await supabase
    .from('transport_assignment_versions')
    .update({ effective_to: closeEffectiveTo })
    .eq('school_code', code)
    .eq('student_id', studentId)
    .is('effective_to', null);
}
