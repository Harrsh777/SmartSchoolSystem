/**
 * Lazy evaluation of fee_adjustment_rules against student_fees rows.
 * Stacking: rules sorted by stack_order ASC; each step updates a running payable total.
 * Discounts reduce running total; fines and misc increase it (misc treated like fine unless type discount).
 */

export type AdjustmentRuleRow = {
  id: string;
  scope: 'class' | 'student';
  class_name: string | null;
  section: string | null;
  apply_to_all_students_in_class: boolean;
  student_id: string | null;
  adjustment_type: 'discount' | 'fine' | 'misc';
  value_type: 'fixed' | 'percent';
  value_numeric: number;
  apply_on: 'total' | 'fee_head';
  fee_head_id: string | null;
  valid_from: string;
  valid_to: string;
  academic_year: string | null;
  stack_order: number;
  is_active: boolean;
  reason: string | null;
};

export type StructureItemRow = {
  fee_head_id: string;
  amount: number;
};

export type StudentContext = {
  id: string;
  class: string;
  section: string | null;
};

export type FeeRowContext = {
  id: string;
  student_id: string;
  fee_structure_id: string;
  due_date: string;
  base_amount: number;
  status: string;
  paid_amount: number;
  adjustment_amount: number;
  structure_academic_year: string | null;
};

export type AdjustmentLine = {
  rule_id: string;
  label: string;
  adjustment_type: string;
  delta: number;
  reason: string | null;
};

function norm(s: string | null | undefined): string {
  return (s ?? '').trim();
}

function datesOverlapRule(dueDate: string, from: string, to: string): boolean {
  const d = norm(dueDate).slice(0, 10);
  const f = norm(from).slice(0, 10);
  const t = norm(to).slice(0, 10);
  if (!d || !f || !t) return false;
  return d >= f && d <= t;
}

function classMatches(rule: AdjustmentRuleRow, student: StudentContext): boolean {
  const rc = norm(rule.class_name).toLowerCase();
  const sc = norm(student.class).toLowerCase();
  if (rc !== sc) return false;
  const rs = norm(rule.section);
  if (!rs) return true;
  return norm(student.section).toLowerCase() === rs.toLowerCase();
}

function ruleAppliesToStudent(
  rule: AdjustmentRuleRow,
  student: StudentContext,
  targetStudentIds: Set<string>
): boolean {
  if (!rule.is_active) return false;
  if (rule.scope === 'student') {
    return norm(rule.student_id) === norm(student.id);
  }
  if (rule.scope === 'class') {
    if (!classMatches(rule, student)) return false;
    if (rule.apply_to_all_students_in_class) return true;
    return targetStudentIds.has(norm(student.id));
  }
  return false;
}

function headPortion(
  baseAmount: number,
  feeHeadId: string,
  items: StructureItemRow[] | undefined
): number {
  if (!items?.length) return baseAmount;
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  if (total <= 0) return baseAmount;
  const row = items.find((i) => norm(i.fee_head_id) === norm(feeHeadId));
  if (!row) return 0;
  const share = Number(row.amount || 0) / total;
  return Math.round(baseAmount * share * 100) / 100;
}

function signedDelta(
  adjustmentType: AdjustmentRuleRow['adjustment_type'],
  rawDelta: number
): number {
  if (adjustmentType === 'discount') return -Math.abs(rawDelta);
  return Math.abs(rawDelta);
}

function applyRuleOnce(
  rule: AdjustmentRuleRow,
  running: number,
  baseAmount: number,
  structureItems: StructureItemRow[] | undefined
): number {
  const basis =
    rule.apply_on === 'fee_head' && rule.fee_head_id
      ? headPortion(baseAmount, rule.fee_head_id, structureItems)
      : running;

  let raw = 0;
  if (rule.value_type === 'fixed') {
    raw = Number(rule.value_numeric || 0);
  } else {
    raw = (basis * Number(rule.value_numeric || 0)) / 100;
  }
  return signedDelta(rule.adjustment_type, raw);
}

export function computeRuleAdjustmentForFee(
  fee: FeeRowContext,
  student: StudentContext,
  rules: AdjustmentRuleRow[],
  structureItemsByStructureId: Map<string, StructureItemRow[]>,
  targetStudentIdsByRuleId: Map<string, Set<string>>
): { rules_delta: number; lines: AdjustmentLine[] } {
  const isPaidClosed = norm(fee.status).toLowerCase() === 'paid';
  if (isPaidClosed) {
    return { rules_delta: 0, lines: [] };
  }

  const items = structureItemsByStructureId.get(fee.fee_structure_id);
  const sorted = [...rules].filter((r) => r.is_active).sort((a, b) => a.stack_order - b.stack_order);

  let running = Number(fee.base_amount || 0);
  const lines: AdjustmentLine[] = [];

  for (const rule of sorted) {
    if (rule.academic_year) {
      const fy = norm(fee.structure_academic_year);
      if (fy && norm(rule.academic_year) !== fy) continue;
    }
    if (!datesOverlapRule(fee.due_date, rule.valid_from, rule.valid_to)) continue;

    const targets = targetStudentIdsByRuleId.get(rule.id) ?? new Set<string>();
    if (!ruleAppliesToStudent(rule, student, targets)) continue;

    const delta = applyRuleOnce(rule, running, Number(fee.base_amount || 0), items);
    if (Math.abs(delta) < 0.0001) continue;

    running += delta;
    lines.push({
      rule_id: rule.id,
      label:
        rule.adjustment_type === 'discount'
          ? 'Discount'
          : rule.adjustment_type === 'fine'
            ? 'Fine'
            : 'Misc',
      adjustment_type: rule.adjustment_type,
      delta,
      reason: rule.reason,
    });
  }

  const rulesDelta = lines.reduce((s, l) => s + l.delta, 0);
  return { rules_delta: Math.round(rulesDelta * 100) / 100, lines };
}

export function effectiveAdjustmentAmount(
  fee: Pick<FeeRowContext, 'status' | 'adjustment_amount'>,
  rulesDelta: number,
  lineAdjustmentsSum = 0
): number {
  const manual = Number(fee.adjustment_amount || 0);
  const lines = Number(lineAdjustmentsSum || 0);
  const isPaidClosed = norm(fee.status).toLowerCase() === 'paid';
  if (isPaidClosed) return Math.round((manual + lines) * 100) / 100;
  return Math.round((manual + lines + rulesDelta) * 100) / 100;
}
