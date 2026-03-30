import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

type PlanPeriod = {
  id: string;
  due_month: string;
  due_date: string;
};

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const body = await request.json();
    const schoolCode = String(body.school_code || '').trim().toUpperCase();
    const className = String(body.class_name || '').trim();
    const section = String(body.section || '').trim();
    const academicYear = String(body.academic_year || '').trim();
    const feeStructureId = String(body.fee_structure_id || '').trim();
    if (!schoolCode || !className || !section || !academicYear || !feeStructureId) {
      return NextResponse.json(
        { error: 'school_code, class_name, section, academic_year, fee_structure_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const { data: structure, error: structureErr } = await supabase
      .from('fee_structures')
      .select('id, school_id, frequency_mode')
      .eq('id', feeStructureId)
      .ilike('school_code', schoolCode)
      .single();
    if (structureErr || !structure) {
      return NextResponse.json({ error: 'Fee structure not found for selected class-section' }, { status: 404 });
    }

    const { data: students, error: studentsErr } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', schoolCode)
      .ilike('class', className)
      .ilike('section', section);
    if (studentsErr) return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    const studentIds = (students || []).map((s) => String(s.id));
    if (studentIds.length === 0) {
      return NextResponse.json({ error: 'No students found for selected class-section' }, { status: 400 });
    }

    const { data: plans, error: plansErr } = await supabase
      .from('fee_structure_frequency_plans')
      .select('id, frequency')
      .eq('fee_structure_id', feeStructureId)
      .eq('is_active', true);
    if (plansErr) return NextResponse.json({ error: plansErr.message }, { status: 500 });
    if (!plans || plans.length === 0) {
      return NextResponse.json({ error: 'No active frequency plans found for this structure' }, { status: 400 });
    }

    const frequencyMode = String(structure.frequency_mode || 'single');
    const planById = new Map((plans || []).map((p) => [String(p.id), p]));
    let selectedByStudent = new Map<string, string>();

    if (frequencyMode === 'multiple') {
      const { data: assigned } = await supabase
        .from('student_payment_plans')
        .select('student_id, fee_plan_id')
        .eq('fee_structure_id', feeStructureId)
        .in('student_id', studentIds);
      selectedByStudent = new Map((assigned || []).map((r) => [String(r.student_id), String(r.fee_plan_id)]));
      if (selectedByStudent.size !== studentIds.length) {
        return NextResponse.json(
          { error: 'All students must have frequency assignment before generation.' },
          { status: 400 }
        );
      }
    } else {
      const onlyPlan = plans[0];
      selectedByStudent = new Map(studentIds.map((id) => [id, String(onlyPlan.id)]));
    }

    const uniquePlanIds = Array.from(new Set(Array.from(selectedByStudent.values())));
    const { data: periodsRows, error: periodsErr } = await supabase
      .from('fee_plan_periods')
      .select('id, fee_plan_id, due_month, due_date')
      .in('fee_plan_id', uniquePlanIds)
      .order('sequence_no', { ascending: true });
    if (periodsErr) return NextResponse.json({ error: periodsErr.message }, { status: 500 });
    const periodsByPlan = new Map<string, PlanPeriod[]>();
    for (const row of periodsRows || []) {
      const planId = String(row.fee_plan_id);
      const arr = periodsByPlan.get(planId) || [];
      arr.push({
        id: String(row.id),
        due_month: String(row.due_month),
        due_date: String(row.due_date),
      });
      periodsByPlan.set(planId, arr);
    }

    const periodIds = (periodsRows || []).map((p) => String(p.id));
    const { data: componentsRows, error: compErr } = await supabase
      .from('fee_plan_period_components')
      .select('fee_plan_period_id, amount, is_enabled')
      .in('fee_plan_period_id', periodIds);
    if (compErr) return NextResponse.json({ error: compErr.message }, { status: 500 });
    const amountByPeriodId = new Map<string, number>();
    for (const c of componentsRows || []) {
      if (c.is_enabled === false) continue;
      const periodId = String(c.fee_plan_period_id);
      amountByPeriodId.set(periodId, (amountByPeriodId.get(periodId) || 0) + Number(c.amount || 0));
    }

    const { data: classLines } = await supabase
      .from('class_installment_adjustments')
      .select('id, fee_plan_period_id, line_type, label, amount')
      .eq('fee_structure_id', feeStructureId);
    const classLinesByPeriod = new Map<string, Array<{ id: string; line_type: string; label: string; amount: number }>>();
    for (const l of classLines || []) {
      const k = String(l.fee_plan_period_id);
      const arr = classLinesByPeriod.get(k) || [];
      arr.push({
        id: String(l.id),
        line_type: String(l.line_type),
        label: String(l.label || ''),
        amount: Number(l.amount || 0),
      });
      classLinesByPeriod.set(k, arr);
    }

    // Backward compatibility: also apply legacy class_fee_line_adjustments keyed by due_month.
    const { data: legacyLines } = await supabase
      .from('class_fee_line_adjustments')
      .select('id, due_month, kind, label, amount')
      .eq('fee_structure_id', feeStructureId)
      .eq('school_code', schoolCode)
      .eq('class_name', className)
      .eq('section', section);
    const legacyByDueMonth = new Map<string, Array<{ id: string; kind: string; label: string; amount: number }>>();
    for (const l of legacyLines || []) {
      const k = String(l.due_month || '');
      const arr = legacyByDueMonth.get(k) || [];
      arr.push({
        id: String(l.id),
        kind: String(l.kind || 'misc'),
        label: String(l.label || ''),
        amount: Number(l.amount || 0),
      });
      legacyByDueMonth.set(k, arr);
    }

    const insertFees: Array<Record<string, unknown>> = [];
    for (const sid of studentIds) {
      const planId = selectedByStudent.get(sid);
      if (!planId || !planById.has(planId)) continue;
      const periods = periodsByPlan.get(planId) || [];
      for (const period of periods) {
        insertFees.push({
          school_id: structure.school_id,
          school_code: schoolCode,
          student_id: sid,
          fee_structure_id: feeStructureId,
          fee_plan_id: planId,
          fee_plan_period_id: period.id,
          due_month: period.due_month,
          due_date: period.due_date,
          base_amount: Number(amountByPeriodId.get(period.id) || 0),
          paid_amount: 0,
          adjustment_amount: 0,
          status: 'pending',
        });
      }
    }

    let generated = 0;
    if (insertFees.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from('student_fees')
        .upsert(insertFees, { onConflict: 'student_id,fee_structure_id,due_month' })
        .select('id, fee_plan_period_id, due_month');
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      generated = (inserted || []).length;

      if (inserted && inserted.length > 0) {
        const lineRows: Array<Record<string, unknown>> = [];
        for (const sf of inserted) {
          const periodId = String(sf.fee_plan_period_id || '');
          const lines = classLinesByPeriod.get(periodId) || [];
          for (const l of lines) {
            lineRows.push({
              school_code: schoolCode,
              student_fee_id: String(sf.id),
              label: l.label,
              kind: l.line_type === 'discount' ? 'discount' : 'misc',
              amount: l.line_type === 'discount' ? -Math.abs(Number(l.amount || 0)) : Math.abs(Number(l.amount || 0)),
              source_class_adjustment_id: l.id,
            });
          }
          const legacy = legacyByDueMonth.get(String(sf.due_month || '')) || [];
          for (const l of legacy) {
            lineRows.push({
              school_code: schoolCode,
              student_fee_id: String(sf.id),
              label: l.label,
              kind: l.kind === 'discount' ? 'discount' : 'misc',
              amount: l.kind === 'discount' ? -Math.abs(Number(l.amount || 0)) : Math.abs(Number(l.amount || 0)),
            });
          }
        }
        if (lineRows.length > 0) {
          await supabase.from('student_fee_line_adjustments').insert(lineRows);
        }
      }
    }

    return NextResponse.json({ data: { generated_installments: generated } });
  } catch (e) {
    console.error('POST class-section/generate', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
