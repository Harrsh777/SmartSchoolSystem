import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeRuleAdjustmentForFee,
  effectiveAdjustmentAmount,
  type FeeRowContext,
  type StudentContext,
} from '@/lib/fees/adjustment-rules-engine';
import { computeLateFee } from '@/lib/fees/late-fee';
import {
  fetchActiveAdjustmentRules,
  fetchRuleTargetsMap,
  fetchStructureItemsMap,
} from '@/lib/fees/load-adjustment-context';
import { fetchLineAdjustmentsGroupedByFeeIds } from '@/lib/fees/student-fee-line-adjustments';
import {
  classSectionCacheKey,
  fetchAllClassFeeLinesBySectionKey,
  filterClassLinesForFee,
  mergeStudentAndClassManualLines,
  sumMergedManualLines,
  type ClassFeeLineRow,
  type MergedManualLine,
} from '@/lib/fees/class-fee-line-adjustments';

export type FeeWithStructure = Record<string, unknown> & {
  id: string;
  student_id: string;
  fee_structure_id: string;
  due_date: string;
  due_month?: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  status: string;
  student?: { id: string; class?: string; section?: string };
  fee_structure: {
    academic_year?: string | null;
    late_fee_type?: string | null;
    late_fee_value?: number;
    grace_period_days?: number;
  } | null;
};

/**
 * Applies adjustment rules (lazy), legacy adjustment_amount, and late fee.
 * Paid rows: rules are not applied; only stored adjustment_amount counts.
 */
export type EnrichStudentFeesOptions = {
  /** When set (e.g. fee overview), one DB read for all class-section keys. */
  classLinesBySectionKey?: Map<string, ClassFeeLineRow[]>;
};

export async function enrichStudentFeesWithAdjustments(
  supabase: SupabaseClient,
  schoolCode: string,
  student: StudentContext,
  fees: FeeWithStructure[],
  opts?: EnrichStudentFeesOptions
): Promise<
  Array<
    FeeWithStructure & {
      late_fee: number;
      rules_adjustment_delta: number;
      adjustment_lines: { rule_id: string; label: string; adjustment_type: string; delta: number; reason: string | null }[];
      effective_adjustment_amount: number;
      final_amount: number;
      balance_due: number;
      total_due: number;
      line_adjustments_sum: number;
      installment_manual_lines: MergedManualLine[];
    }
  >
> {
  const normalized = schoolCode.toUpperCase();
  const feeIds = fees.map((f) => String(f.id));
  const lineGroups = await fetchLineAdjustmentsGroupedByFeeIds(supabase, feeIds);
  const sectionKey = classSectionCacheKey(student.class, student.section);
  let classLinesForSection: ClassFeeLineRow[] = [];
  if (opts?.classLinesBySectionKey) {
    classLinesForSection = opts.classLinesBySectionKey.get(sectionKey) ?? [];
  } else {
    const map = await fetchAllClassFeeLinesBySectionKey(supabase, normalized);
    classLinesForSection = map.get(sectionKey) ?? [];
  }
  const rules = await fetchActiveAdjustmentRules(supabase, normalized);
  const ruleIds = rules.map((r) => r.id);
  const targetByRuleId = await fetchRuleTargetsMap(supabase, ruleIds);
  const structureIds = [...new Set(fees.map((f) => String(f.fee_structure_id)).filter(Boolean))];
  const structureItemsByStructureId = await fetchStructureItemsMap(supabase, structureIds);

  return fees.map((fee) => {
    const structure = fee.fee_structure;
    const ctx: FeeRowContext = {
      id: String(fee.id),
      student_id: String(fee.student_id),
      fee_structure_id: String(fee.fee_structure_id),
      due_date: String(fee.due_date),
      base_amount: Number(fee.base_amount || 0),
      status: String(fee.status || ''),
      paid_amount: Number(fee.paid_amount || 0),
      adjustment_amount: Number(fee.adjustment_amount || 0),
      structure_academic_year:
        structure?.academic_year != null ? String(structure.academic_year) : null,
    };

    const { rules_delta, lines } = computeRuleAdjustmentForFee(
      ctx,
      student,
      rules,
      structureItemsByStructureId,
      targetByRuleId
    );

    const studentManual = lineGroups.get(String(fee.id)) ?? [];
    const structureAy =
      structure?.academic_year != null ? String(structure.academic_year).trim() : '';
    const matchingClass = filterClassLinesForFee(
      classLinesForSection,
      String(fee.fee_structure_id),
      fee.due_month,
      structureAy || null
    );
    const manualLines = mergeStudentAndClassManualLines(studentManual, matchingClass);
    const lineSum = sumMergedManualLines(manualLines);
    const effectiveAdj = effectiveAdjustmentAmount(ctx, rules_delta, lineSum);
    const base = Number(fee.base_amount || 0);
    const baseForLate =
      structure?.late_fee_type === 'percentage' ? base + effectiveAdj : base;

    const late = computeLateFee(
      fee.due_date,
      baseForLate,
      structure?.late_fee_type ?? null,
      Number(structure?.late_fee_value ?? 0),
      Number(structure?.grace_period_days ?? 0)
    );

    const balanceDue = base + effectiveAdj - Number(fee.paid_amount || 0);
    const totalDue = balanceDue + late;

    return {
      ...fee,
      late_fee: Math.max(0, late),
      rules_adjustment_delta: rules_delta,
      adjustment_lines: lines,
      line_adjustments_sum: Math.round(lineSum * 100) / 100,
      installment_manual_lines: manualLines,
      effective_adjustment_amount: Math.round(effectiveAdj * 100) / 100,
      final_amount: Math.round((base + effectiveAdj) * 100) / 100,
      balance_due: Math.round(balanceDue * 100) / 100,
      total_due: Math.round(totalDue * 100) / 100,
    };
  });
}

/** Pending list: each row includes nested `student` from Supabase join. */
export async function enrichPendingFeeRows(
  supabase: SupabaseClient,
  schoolCode: string,
  rows: FeeWithStructure[],
  opts?: EnrichStudentFeesOptions
): Promise<
  Array<
    FeeWithStructure & {
      late_fee: number;
      rules_adjustment_delta: number;
      adjustment_lines: { rule_id: string; label: string; adjustment_type: string; delta: number; reason: string | null }[];
      effective_adjustment_amount: number;
      final_amount: number;
      balance_due: number;
      total_due: number;
      line_adjustments_sum: number;
      installment_manual_lines: MergedManualLine[];
    }
  >
> {
  const normalized = schoolCode.toUpperCase();
  const feeIds = rows.map((f) => String(f.id));
  const lineGroups = await fetchLineAdjustmentsGroupedByFeeIds(supabase, feeIds);
  const classLinesMap =
    opts?.classLinesBySectionKey ??
    (await fetchAllClassFeeLinesBySectionKey(supabase, normalized));
  const rules = await fetchActiveAdjustmentRules(supabase, normalized);
  const ruleIds = rules.map((r) => r.id);
  const targetByRuleId = await fetchRuleTargetsMap(supabase, ruleIds);
  const structureIds = [...new Set(rows.map((f) => String(f.fee_structure_id)).filter(Boolean))];
  const structureItemsByStructureId = await fetchStructureItemsMap(supabase, structureIds);

  return rows.map((fee) => {
    const st = fee.student as { id?: string; class?: string; section?: string } | undefined;
    const student: StudentContext = {
      id: String(st?.id ?? fee.student_id),
      class: String(st?.class ?? ''),
      section: st?.section ?? null,
    };
    const sectionKey = classSectionCacheKey(student.class, student.section);
    const classLinesForSection = classLinesMap.get(sectionKey) ?? [];

    const structure = fee.fee_structure;
    const ctx: FeeRowContext = {
      id: String(fee.id),
      student_id: String(fee.student_id),
      fee_structure_id: String(fee.fee_structure_id),
      due_date: String(fee.due_date),
      base_amount: Number(fee.base_amount || 0),
      status: String(fee.status || ''),
      paid_amount: Number(fee.paid_amount || 0),
      adjustment_amount: Number(fee.adjustment_amount || 0),
      structure_academic_year:
        structure?.academic_year != null ? String(structure.academic_year) : null,
    };

    const { rules_delta, lines } = computeRuleAdjustmentForFee(
      ctx,
      student,
      rules,
      structureItemsByStructureId,
      targetByRuleId
    );

    const studentManual = lineGroups.get(String(fee.id)) ?? [];
    const structureAy =
      structure?.academic_year != null ? String(structure.academic_year).trim() : '';
    const matchingClass = filterClassLinesForFee(
      classLinesForSection,
      String(fee.fee_structure_id),
      fee.due_month,
      structureAy || null
    );
    const manualLines = mergeStudentAndClassManualLines(studentManual, matchingClass);
    const lineSum = sumMergedManualLines(manualLines);
    const effectiveAdj = effectiveAdjustmentAmount(ctx, rules_delta, lineSum);
    const base = Number(fee.base_amount || 0);
    const baseForLate =
      structure?.late_fee_type === 'percentage' ? base + effectiveAdj : base;

    const late = computeLateFee(
      fee.due_date,
      baseForLate,
      structure?.late_fee_type ?? null,
      Number(structure?.late_fee_value ?? 0),
      Number(structure?.grace_period_days ?? 0)
    );

    const balanceDue = base + effectiveAdj - Number(fee.paid_amount || 0);
    const totalDue = balanceDue + late;

    return {
      ...fee,
      late_fee: Math.max(0, late),
      rules_adjustment_delta: rules_delta,
      adjustment_lines: lines,
      line_adjustments_sum: Math.round(lineSum * 100) / 100,
      installment_manual_lines: manualLines,
      effective_adjustment_amount: Math.round(effectiveAdj * 100) / 100,
      final_amount: Math.round((base + effectiveAdj) * 100) / 100,
      balance_due: Math.round(balanceDue * 100) / 100,
      total_due: Math.round(totalDue * 100) / 100,
    };
  });
}
