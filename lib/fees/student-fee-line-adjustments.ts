import type { SupabaseClient } from '@supabase/supabase-js';

export type LineAdjustmentRow = {
  id: string;
  label: string;
  amount: number;
  kind: 'misc' | 'discount';
  created_at: string;
};

export async function fetchLineAdjustmentSumByFeeIds(
  supabase: SupabaseClient,
  studentFeeIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (studentFeeIds.length === 0) return map;

  const { data, error } = await supabase
    .from('student_fee_line_adjustments')
    .select('student_fee_id, amount')
    .in('student_fee_id', studentFeeIds);

  if (error || !data) {
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) return map;
    console.warn('fetchLineAdjustmentSumByFeeIds:', error?.message);
    return map;
  }

  for (const row of data) {
    const fid = String(row.student_fee_id);
    const amt = Number(row.amount || 0);
    map.set(fid, (map.get(fid) || 0) + amt);
  }
  return map;
}

export async function fetchLineAdjustmentsGroupedByFeeIds(
  supabase: SupabaseClient,
  studentFeeIds: string[]
): Promise<Map<string, LineAdjustmentRow[]>> {
  const map = new Map<string, LineAdjustmentRow[]>();
  if (studentFeeIds.length === 0) return map;

  const { data, error } = await supabase
    .from('student_fee_line_adjustments')
    .select('id, student_fee_id, label, amount, kind, created_at')
    .in('student_fee_id', studentFeeIds)
    .order('created_at', { ascending: true });

  if (error || !data) return map;

  for (const row of data) {
    const fid = String(row.student_fee_id);
    if (!map.has(fid)) map.set(fid, []);
    map.get(fid)!.push({
      id: String(row.id),
      label: String(row.label),
      amount: Number(row.amount),
      kind: row.kind as 'misc' | 'discount',
      created_at: String(row.created_at),
    });
  }
  return map;
}

export async function fetchLineAdjustmentsForFee(
  supabase: SupabaseClient,
  studentFeeId: string
): Promise<LineAdjustmentRow[]> {
  const { data, error } = await supabase
    .from('student_fee_line_adjustments')
    .select('id, label, amount, kind, created_at')
    .eq('student_fee_id', studentFeeId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((r) => ({
    id: String(r.id),
    label: String(r.label),
    amount: Number(r.amount),
    kind: r.kind as 'misc' | 'discount',
    created_at: String(r.created_at),
  }));
}
