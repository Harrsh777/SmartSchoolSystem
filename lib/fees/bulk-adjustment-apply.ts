import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeFeeDueMonthKey } from '@/lib/fees/due-month-key';
import {
  filterClassLinesForFee,
  mergeStudentAndClassManualLines,
  type MergedManualLine,
} from '@/lib/fees/class-fee-line-adjustments';
import { enrichStudentFeesWithAdjustments, type FeeWithStructure } from '@/lib/fees/enrich-student-fees';
import { fetchLineAdjustmentsGroupedByFeeIds } from '@/lib/fees/student-fee-line-adjustments';
import {
  computeBulkLineAmount,
  defaultBulkLabel,
  mapChargeTypeToKind,
  projectedPayableBeforeLate,
  validateProjectedPayable,
  type BulkAdjustmentInput,
} from '@/lib/fees/bulk-adjustment-math';

export type BulkApplyBody = {
  school_code: string;
  student_ids: string[];
  fee_structure_id: string;
  due_months: string[];
  charge_type: BulkAdjustmentInput['charge_type'];
  value_mode: BulkAdjustmentInput['value_mode'];
  value: number;
  label?: string;
};

export type BulkPreviewRow = {
  student_id: string;
  student_name: string;
  admission_no: string;
  roll_number: string;
  due_month: string;
  installment_label?: string;
  student_fee_id: string | null;
  status: string | null;
  base_amount: number;
  rules_adjustment_delta: number;
  existing_line_count: number;
  proposed_line_amount: number;
  proposed_label: string;
  projected_payable: number;
  projected_balance_due: number;
  ok: boolean;
  error: string | null;
};

export async function runBulkAdjustmentPreview(
  supabase: SupabaseClient,
  body: BulkApplyBody,
  classLinesForSection: Parameters<typeof filterClassLinesForFee>[0]
): Promise<{ rows: BulkPreviewRow[]; structure_name: string; errors: string[] }> {
  const code = body.school_code.toUpperCase();
  const errors: string[] = [];
  const studentIds = [...new Set(body.student_ids.map(String))].filter(Boolean);
  const dueMonths = [...new Set(body.due_months.map((m) => normalizeFeeDueMonthKey(m)))].filter(Boolean);

  if (!code || studentIds.length === 0) errors.push('Select at least one student');
  if (!body.fee_structure_id) errors.push('fee_structure_id is required');
  if (dueMonths.length === 0) errors.push('Select at least one installment');

  const { data: structure } = await supabase
    .from('fee_structures')
    .select('id, name, academic_year')
    .eq('id', body.fee_structure_id)
    .ilike('school_code', code)
    .single();

  if (!structure) {
    return { rows: [], structure_name: '', errors: ['Fee structure not found'] };
  }

  const structureName = String(structure.name || 'Fee structure');
  const structureAy =
    structure.academic_year != null ? String(structure.academic_year).trim() : '';

  if (errors.length > 0) {
    return { rows: [], structure_name: structureName, errors };
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, student_name, admission_no, roll_number, class, section')
    .eq('school_code', code)
    .in('id', studentIds);

  const studentMap = new Map((students || []).map((s) => [String(s.id), s]));

  const { data: rawFees, error: feeErr } = await supabase
    .from('student_fees')
    .select(
      `
      id,
      student_id,
      fee_structure_id,
      due_month,
      due_date,
      base_amount,
      paid_amount,
      adjustment_amount,
      status,
      fee_source,
      fee_structure:fee_structure_id (
        academic_year,
        late_fee_type,
        late_fee_value,
        grace_period_days
      )
    `
    )
    .eq('school_code', code)
    .eq('fee_structure_id', body.fee_structure_id)
    .in('student_id', studentIds)
    .in('due_month', dueMonths);

  if (feeErr) {
    return { rows: [], structure_name: structureName, errors: [feeErr.message] };
  }

  const feesByStudentMonth = new Map<string, (typeof rawFees)[number]>();
  for (const f of rawFees || []) {
    const key = `${f.student_id}::${normalizeFeeDueMonthKey(f.due_month)}`;
    feesByStudentMonth.set(key, f);
  }

  const feeIds = (rawFees || []).map((f) => String(f.id));
  const lineGroups = await fetchLineAdjustmentsGroupedByFeeIds(supabase, feeIds);

  const input: BulkAdjustmentInput = {
    charge_type: body.charge_type,
    value_mode: body.value_mode,
    value: Number(body.value),
    label: body.label,
  };
  const proposedLabel = defaultBulkLabel(body.charge_type, body.label);

  const rows: BulkPreviewRow[] = [];

  for (const sid of studentIds) {
    const stu = studentMap.get(sid);
    const studentName = stu ? String(stu.student_name || '') : 'Unknown';
    const admissionNo = stu ? String(stu.admission_no || '') : '';
    const rollNumber = stu ? String(stu.roll_number || '') : '';

    for (const dm of dueMonths) {
      const fee = feesByStudentMonth.get(`${sid}::${dm}`);
      if (!fee) {
        rows.push({
          student_id: sid,
          student_name: studentName,
          admission_no: admissionNo,
          roll_number: rollNumber,
          due_month: dm,
          student_fee_id: null,
          status: null,
          base_amount: 0,
          rules_adjustment_delta: 0,
          existing_line_count: 0,
          proposed_line_amount: 0,
          proposed_label: proposedLabel,
          projected_payable: 0,
          projected_balance_due: 0,
          ok: false,
          error: 'Student fee not generated for this installment. Generate fees first.',
        });
        continue;
      }

      if (String(fee.status).toLowerCase() === 'paid') {
        rows.push({
          student_id: sid,
          student_name: studentName,
          admission_no: admissionNo,
          roll_number: rollNumber,
          due_month: dm,
          student_fee_id: String(fee.id),
          status: String(fee.status),
          base_amount: Number(fee.base_amount || 0),
          rules_adjustment_delta: 0,
          existing_line_count: 0,
          proposed_line_amount: 0,
          proposed_label: proposedLabel,
          projected_payable: 0,
          projected_balance_due: 0,
          ok: false,
          error: 'Installment is already fully paid',
        });
        continue;
      }

      const studentManual = lineGroups.get(String(fee.id)) ?? [];
      const matchingClass = filterClassLinesForFee(
        classLinesForSection,
        String(fee.fee_structure_id),
        fee.due_month,
        structureAy || null
      );
      const existingLines: MergedManualLine[] = mergeStudentAndClassManualLines(
        studentManual,
        matchingClass
      );

      const enriched = await enrichStudentFeesWithAdjustments(
        supabase,
        code,
        {
          id: sid,
          class: String(stu?.class ?? ''),
          section: stu?.section ?? null,
        },
        [fee as FeeWithStructure]
      );
      const row = enriched[0];
      const rulesDelta = Number(row?.rules_adjustment_delta ?? 0);
      const baseAmount = Number(fee.base_amount || 0);
      const paidAmount = Number(fee.paid_amount || 0);

      const { signedAmount, error: calcErr } = computeBulkLineAmount(input, {
        base_amount: baseAmount,
        rules_adjustment_delta: rulesDelta,
        existing_lines: existingLines,
      });

      if (calcErr) {
        rows.push({
          student_id: sid,
          student_name: studentName,
          admission_no: admissionNo,
          roll_number: rollNumber,
          due_month: dm,
          student_fee_id: String(fee.id),
          status: String(fee.status),
          base_amount: baseAmount,
          rules_adjustment_delta: rulesDelta,
          existing_line_count: existingLines.length,
          proposed_line_amount: 0,
          proposed_label: proposedLabel,
          projected_payable: 0,
          projected_balance_due: 0,
          ok: false,
          error: calcErr,
        });
        continue;
      }

      const projected = projectedPayableBeforeLate(
        baseAmount,
        rulesDelta,
        existingLines,
        signedAmount
      );
      const payableErr = validateProjectedPayable(projected, paidAmount);
      const projectedBalance = Math.round((projected - paidAmount) * 100) / 100;

      rows.push({
        student_id: sid,
        student_name: studentName,
        admission_no: admissionNo,
        roll_number: rollNumber,
        due_month: dm,
        student_fee_id: String(fee.id),
        status: String(fee.status),
        base_amount: baseAmount,
        rules_adjustment_delta: rulesDelta,
        existing_line_count: existingLines.length,
        proposed_line_amount: signedAmount,
        proposed_label: proposedLabel,
        projected_payable: projected,
        projected_balance_due: projectedBalance,
        ok: !payableErr,
        error: payableErr,
      });
    }
  }

  return { rows, structure_name: structureName, errors };
}

export async function applyBulkAdjustments(
  supabase: SupabaseClient,
  body: BulkApplyBody,
  createdBy: string | null,
  classLinesForSection: Parameters<typeof filterClassLinesForFee>[0]
): Promise<{
  applied: number;
  skipped: number;
  rows: BulkPreviewRow[];
  structure_name: string;
  errors: string[];
}> {
  const preview = await runBulkAdjustmentPreview(supabase, body, classLinesForSection);
  if (preview.errors.length > 0) {
    return { applied: 0, skipped: 0, rows: preview.rows, structure_name: preview.structure_name, errors: preview.errors };
  }

  const okRows = preview.rows.filter((r) => r.ok && r.student_fee_id);
  const code = body.school_code.toUpperCase();
  const kind = mapChargeTypeToKind(body.charge_type);
  const label = defaultBulkLabel(body.charge_type, body.label);

  let applied = 0;
  let skipped = 0;

  for (const row of preview.rows) {
    if (!row.ok || !row.student_fee_id) {
      skipped += 1;
      continue;
    }

    const insertPayload: Record<string, unknown> = {
      school_code: code,
      student_fee_id: row.student_fee_id,
      label,
      amount: row.proposed_line_amount,
      kind,
    };
    if (createdBy) insertPayload.created_by = createdBy;

    const { error } = await supabase.from('student_fee_line_adjustments').insert([insertPayload]);
    if (error) {
      row.ok = false;
      row.error = error.message;
      skipped += 1;
    } else {
      applied += 1;
    }
  }

  return {
    applied,
    skipped,
    rows: preview.rows,
    structure_name: preview.structure_name,
    errors: applied === 0 && okRows.length > 0 ? ['Failed to save adjustments'] : [],
  };
}
