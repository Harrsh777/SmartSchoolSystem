import type { SupabaseClient } from '@supabase/supabase-js';
import { getTransportFeeMode, isSeparateTransportMode } from '@/lib/fees/transport-fee-mode';

const TRANSPORT_CLASS = '__TRANSPORT__';
const TRANSPORT_NAME = 'Transport (system)';

export type TransportSnapshot = {
  amount: number;
  custom_fare: number | null;
  pickup_stop_id: string | null;
  drop_stop_id: string | null;
  pickup_name: string | null;
  drop_name: string | null;
  pickup_fare: number | null;
  drop_fare: number | null;
  route_id: string | null;
  synced_at: string;
};

/** In-process hook: replace with Bull/Queue worker in production. */
export async function scheduleTransportFeeSyncForStudent(
  _schoolCode: string,
  _studentId: string
): Promise<void> {
  /* e.g. await queue.add('recalculateTransportFees', { student_id }); */
}

function rollingDueDates(): { due_month: string; due_date: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const last = new Date(y, d.getMonth() + 1, 0).getDate();
  return {
    due_month: `${y}-${m}-01`,
    due_date: `${y}-${m}-${String(last).padStart(2, '0')}`,
  };
}

/**
 * Ensure one system fee structure per school for transport rows (FK + display name).
 */
export async function ensureSystemTransportFeeStructure(
  supabase: SupabaseClient,
  schoolCode: string
): Promise<string | null> {
  const code = schoolCode.toUpperCase().trim();

  const { data: existing } = await supabase
    .from('fee_structures')
    .select('id')
    .eq('school_code', code)
    .eq('class_name', TRANSPORT_CLASS)
    .eq('name', TRANSPORT_NAME)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: school, error: schoolErr } = await supabase
    .from('accepted_schools')
    .select('id')
    .eq('school_code', code)
    .single();

  if (schoolErr || !school) return null;

  const { data: head } = await supabase
    .from('fee_heads')
    .select('id')
    .eq('school_code', code)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!head?.id) {
    console.warn('[transport-fee-sync] No fee_heads for school; cannot create transport structure:', code);
    return null;
  }

  const insertPayload: Record<string, unknown> = {
    school_id: school.id,
    school_code: code,
    name: TRANSPORT_NAME,
    class_name: TRANSPORT_CLASS,
    section: null,
    academic_year: null,
    start_month: 4,
    end_month: 3,
    frequency: 'yearly',
    payment_due_day: 28,
    late_fee_type: null,
    late_fee_value: 0,
    grace_period_days: 0,
    is_active: true,
    is_system: true,
  };

  const tryInsert = async (payload: Record<string, unknown>) => {
    const res = await supabase.from('fee_structures').insert(payload).select('id').single();
    return {
      data: res.data as { id: string } | null,
      error: res.error as { message?: string } | null,
    };
  };

  let { data: fs, error: fsErr } = await tryInsert(insertPayload);
  if (fsErr?.message?.includes('is_system')) {
    const { is_system: _i, ...rest } = insertPayload;
    ({ data: fs, error: fsErr } = await tryInsert(rest));
  }

  if (fsErr || !fs?.id) {
    console.error('[transport-fee-sync] fee_structures insert:', fsErr);
    return null;
  }

  const fsId = String(fs.id);
  const { error: itemErr } = await supabase.from('fee_structure_items').insert({
    fee_structure_id: fsId,
    fee_head_id: head.id,
    amount: 0,
  });
  if (itemErr) {
    console.error('[transport-fee-sync] fee_structure_items insert:', itemErr);
    await supabase.from('fee_structures').delete().eq('id', fsId);
    return null;
  }

  return fsId;
}

/**
 * Build human-readable line for receipts / collection UI.
 */
export function formatTransportFeeLabel(snapshot: TransportSnapshot | null | undefined): string {
  if (!snapshot) return 'Transport';
  const parts: string[] = [];
  if (snapshot.pickup_name && Number(snapshot.pickup_fare) > 0) {
    parts.push(`Pickup: ${snapshot.pickup_name}`);
  }
  if (snapshot.drop_name && Number(snapshot.drop_fare) > 0) {
    parts.push(`Drop: ${snapshot.drop_name}`);
  }
  if (snapshot.custom_fare != null && Number.isFinite(Number(snapshot.custom_fare))) {
    parts.push(`Custom ₹${Number(snapshot.custom_fare).toLocaleString('en-IN')}`);
  }
  const detail = parts.length ? ` (${parts.join(' · ')})` : '';
  return `Transport${detail}`;
}

export async function deleteStudentTransportFeeRows(
  supabase: SupabaseClient,
  schoolCode: string,
  studentId: string
): Promise<void> {
  const code = schoolCode.toUpperCase().trim();
  const { error } = await supabase
    .from('student_fees')
    .delete()
    .eq('school_code', code)
    .eq('student_id', studentId)
    .eq('fee_source', 'transport');
  if (error && !String(error.message || '').includes('fee_source')) {
    console.warn('[transport-fee-sync] delete transport rows:', error.message);
  }
}

/** Remove only never-paid transport installments from main fees (SEPARATE mode). Keeps legacy partial/paid rows. */
export async function deleteUnpaidMainTransportFeeRows(
  supabase: SupabaseClient,
  schoolCode: string,
  studentId: string
): Promise<void> {
  const code = schoolCode.toUpperCase().trim();
  const { error } = await supabase
    .from('student_fees')
    .delete()
    .eq('school_code', code)
    .eq('student_id', studentId)
    .eq('fee_source', 'transport')
    .lte('paid_amount', 0.009);
  if (error && !String(error.message || '').includes('fee_source')) {
    console.warn('[transport-fee-sync] delete unpaid transport rows:', error.message);
  }
}

/**
 * Upsert the single transport student_fees row from students.* transport fields + stop names.
 */
export async function syncStudentTransportFeeRow(
  supabase: SupabaseClient,
  schoolCode: string,
  studentId: string
): Promise<{ ok: boolean; error?: string; student_fee_id?: string }> {
  const code = schoolCode.toUpperCase().trim();

  const mode = await getTransportFeeMode(supabase, code);
  if (isSeparateTransportMode(mode)) {
    await deleteUnpaidMainTransportFeeRows(supabase, code, studentId);
    return { ok: true };
  }

  const { data: st, error: stErr } = await supabase
    .from('students')
    .select(
      'id, school_id, transport_route_id, transport_pickup_stop_id, transport_dropoff_stop_id, transport_custom_fare, transport_fee'
    )
    .eq('id', studentId)
    .eq('school_code', code)
    .single();

  if (stErr || !st) {
    return { ok: false, error: 'Student not found' };
  }

  const routeId = st.transport_route_id ? String(st.transport_route_id) : null;
  const feeAmt = st.transport_fee != null && st.transport_fee !== '' ? Number(st.transport_fee) : 0;
  const hasTransport = !!routeId && Number.isFinite(feeAmt) && feeAmt > 0;

  if (!hasTransport) {
    await deleteStudentTransportFeeRows(supabase, code, studentId);
    return { ok: true };
  }

  const fsId = await ensureSystemTransportFeeStructure(supabase, code);
  if (!fsId) {
    return { ok: false, error: 'Could not ensure transport fee structure (need at least one fee head).' };
  }

  const puId = st.transport_pickup_stop_id ? String(st.transport_pickup_stop_id) : null;
  const drId = st.transport_dropoff_stop_id ? String(st.transport_dropoff_stop_id) : null;
  const ids = [puId, drId].filter(Boolean) as string[];

  const names = new Map<string, { name: string; pickup_fare: number; drop_fare: number }>();
  if (ids.length > 0) {
    const { data: stops } = await supabase
      .from('transport_stops')
      .select('id, name, pickup_fare, drop_fare')
      .in('id', ids)
      .eq('school_code', code);
    for (const r of stops || []) {
      names.set(String(r.id), {
        name: String(r.name || 'Stop'),
        pickup_fare: Number(r.pickup_fare ?? 0),
        drop_fare: Number(r.drop_fare ?? 0),
      });
    }
  }

  const custom =
    st.transport_custom_fare != null && st.transport_custom_fare !== ''
      ? Number(st.transport_custom_fare)
      : null;

  const pu = puId ? names.get(puId) : undefined;
  const dr = drId ? names.get(drId) : undefined;

  const snapshot: TransportSnapshot = {
    amount: Math.round(feeAmt * 100) / 100,
    custom_fare: custom != null && Number.isFinite(custom) ? custom : null,
    pickup_stop_id: puId,
    drop_stop_id: drId,
    pickup_name: pu?.name ?? null,
    drop_name: dr?.name ?? null,
    pickup_fare: puId ? (pu ? pu.pickup_fare : null) : null,
    drop_fare: drId ? (dr ? dr.drop_fare : null) : null,
    route_id: routeId,
    synced_at: new Date().toISOString(),
  };

  const { due_month, due_date } = rollingDueDates();
  const paid = 0;
  const base = Math.round(feeAmt * 100) / 100;
  const status = base - paid <= 0.009 ? 'paid' : 'pending';

  let schoolIdRow = (st.school_id as string | null | undefined) ?? null;
  if (!schoolIdRow) {
    const { data: sch } = await supabase.from('accepted_schools').select('id').eq('school_code', code).single();
    schoolIdRow = sch?.id ? String(sch.id) : null;
  }

  const { data: existing } = await supabase
    .from('student_fees')
    .select('id, paid_amount')
    .eq('school_code', code)
    .eq('student_id', studentId)
    .eq('fee_source', 'transport')
    .maybeSingle();

  if (existing?.id) {
    const paidAmount = Number(existing.paid_amount || 0);
    const newStatus =
      paidAmount >= base - 0.009 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
    const { error: upErr } = await supabase
      .from('student_fees')
      .update({
        fee_structure_id: fsId,
        base_amount: base,
        transport_snapshot: snapshot,
        due_month,
        due_date,
        status: newStatus,
      })
      .eq('id', existing.id);

    if (upErr) {
      if (upErr.code === '42703' || String(upErr.message).includes('fee_source')) {
        return { ok: false, error: 'Run migration 20260331130000_transport_fee_integration.sql' };
      }
      return { ok: false, error: upErr.message };
    }
    void scheduleTransportFeeSyncForStudent(code, studentId);
    return { ok: true, student_fee_id: String(existing.id) };
  }

  const insertRow: Record<string, unknown> = {
    school_id: schoolIdRow,
    school_code: code,
    student_id: studentId,
    fee_structure_id: fsId,
    fee_source: 'transport',
    transport_snapshot: snapshot,
    base_amount: base,
    paid_amount: 0,
    adjustment_amount: 0,
    due_month,
    due_date,
    status,
  };

  const { data: inserted, error: insErr } = await supabase
    .from('student_fees')
    .insert(insertRow)
    .select('id')
    .single();

  if (insErr) {
    if (insErr.code === '42703' || String(insErr.message).includes('fee_source')) {
      return { ok: false, error: 'Run migration 20260331130000_transport_fee_integration.sql' };
    }
    return { ok: false, error: insErr.message };
  }

  void scheduleTransportFeeSyncForStudent(code, studentId);
  return { ok: true, student_fee_id: inserted?.id ? String(inserted.id) : undefined };
}
