import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdjustmentRuleRow, StructureItemRow } from '@/lib/fees/adjustment-rules-engine';

export async function fetchActiveAdjustmentRules(
  supabase: SupabaseClient,
  schoolCode: string
): Promise<AdjustmentRuleRow[]> {
  const { data, error } = await supabase
    .from('fee_adjustment_rules')
    .select(
      'id, scope, class_name, section, apply_to_all_students_in_class, student_id, adjustment_type, value_type, value_numeric, apply_on, fee_head_id, valid_from, valid_to, academic_year, stack_order, is_active, reason'
    )
    .eq('school_code', schoolCode.toUpperCase())
    .eq('is_active', true)
    .order('stack_order', { ascending: true });

  if (error || !data) {
    if (error?.code === '42P01' || error?.message?.includes('fee_adjustment_rules')) {
      return [];
    }
    console.warn('fetchActiveAdjustmentRules:', error?.message);
    return [];
  }

  return data.map((r) => ({
    id: String(r.id),
    scope: r.scope as AdjustmentRuleRow['scope'],
    class_name: r.class_name ?? null,
    section: r.section ?? null,
    apply_to_all_students_in_class: Boolean(r.apply_to_all_students_in_class),
    student_id: r.student_id ?? null,
    adjustment_type: r.adjustment_type as AdjustmentRuleRow['adjustment_type'],
    value_type: r.value_type as AdjustmentRuleRow['value_type'],
    value_numeric: Number(r.value_numeric || 0),
    apply_on: (r.apply_on || 'total') as AdjustmentRuleRow['apply_on'],
    fee_head_id: r.fee_head_id ?? null,
    valid_from: String(r.valid_from),
    valid_to: String(r.valid_to),
    academic_year: r.academic_year ?? null,
    stack_order: Number(r.stack_order ?? 100),
    is_active: Boolean(r.is_active),
    reason: r.reason ?? null,
  }));
}

export async function fetchRuleTargetsMap(
  supabase: SupabaseClient,
  ruleIds: string[]
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (ruleIds.length === 0) return map;

  const { data, error } = await supabase
    .from('fee_adjustment_rule_targets')
    .select('rule_id, student_id')
    .in('rule_id', ruleIds);

  if (error || !data) {
    if (error?.code === '42P01') return map;
    return map;
  }

  for (const row of data) {
    const rid = String(row.rule_id);
    const sid = String(row.student_id);
    if (!map.has(rid)) map.set(rid, new Set());
    map.get(rid)!.add(sid);
  }
  return map;
}

export async function fetchStructureItemsMap(
  supabase: SupabaseClient,
  structureIds: string[]
): Promise<Map<string, StructureItemRow[]>> {
  const map = new Map<string, StructureItemRow[]>();
  if (structureIds.length === 0) return map;

  const { data, error } = await supabase
    .from('fee_structure_items')
    .select('fee_structure_id, fee_head_id, amount')
    .in('fee_structure_id', structureIds);

  if (error || !data) return map;

  for (const row of data) {
    const sid = String(row.fee_structure_id);
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push({
      fee_head_id: String(row.fee_head_id),
      amount: Number(row.amount || 0),
    });
  }
  return map;
}
