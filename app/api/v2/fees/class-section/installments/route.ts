import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import {
  anchorYearFromAcademicYearLabel,
  computeInstallmentMonthsFromStructure,
} from '@/lib/fees/structure-installment-months';
import { feeStructureMatchesSelection } from '@/lib/fees/fee-structure-class-match';
import { installmentDisplayLabel } from '@/lib/fees/installment-display-label';
import { isMissingFeeStructuresDeletedAtColumn } from '@/lib/fees/fee-structure-deleted-at-compat';

type InstallmentKey = string;

type InstallmentRow = {
  fee_structure_id: string;
  fee_plan_id?: string;
  frequency?: string;
  due_month: string;
  due_date: string;
  structure_name: string;
  academic_year: string;
  is_active: boolean;
  sample_student_fee_id: string;
  student_fee_ids: string[];
  base_amount: number;
  paid_installment_count: number;
  unpaid_installment_count: number;
  from_structure_only?: boolean;
};

/** Row shape from fee_structures select (with items aggregate). */
type StructureSelectRow = {
  id: string;
  name?: string | null;
  is_active?: boolean | null;
  academic_year?: string | null;
  class_name?: string | null;
  section?: string | null;
  start_month?: number | null;
  end_month?: number | null;
  frequency?: string | null;
  payment_due_day?: number | null;
  items?: Array<{ amount?: number }> | null;
};

function baseAmountFromStructureItems(st: StructureSelectRow): number {
  const items = st.items || [];
  return items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
}

/**
 * Duplicate fee structures (same class/section/year, same schedule, same structure total)
 * each produce identical installment slots — collapse to one canonical structure for listing.
 */
function structureScheduleBaseDedupeKey(st: StructureSelectRow): string {
  const ay = (st.academic_year ?? '').toString().trim().toLowerCase();
  const cls = String(st.class_name ?? '').trim().toLowerCase();
  const sec = String(st.section ?? '').trim().toLowerCase();
  const sm = Number(st.start_month);
  const em = Number(st.end_month);
  const freq = String(st.frequency ?? 'monthly').trim().toLowerCase();
  const pdd = Math.max(1, Math.min(31, Number(st.payment_due_day ?? 15)));
  const base = Math.round(baseAmountFromStructureItems(st) * 100) / 100;
  return `${ay}|${cls}|${sec}|${sm}|${em}|${freq}|${pdd}|${base}`;
}

function pickCanonicalStructure(
  group: StructureSelectRow[],
  feeCountByStructureId: Map<string, number>
): StructureSelectRow {
  const sorted = [...group].sort((a, b) => {
    const ca = feeCountByStructureId.get(String(a.id)) ?? 0;
    const cb = feeCountByStructureId.get(String(b.id)) ?? 0;
    if (cb !== ca) return cb - ca;
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted[0];
}

function dedupeMatchingStructures(
  allStructures: StructureSelectRow[],
  sel: { className: string; section: string; academicYear: string },
  feeCountByStructureId: Map<string, number>
): StructureSelectRow[] {
  const matching: StructureSelectRow[] = [];
  for (const st of allStructures) {
    if (st.is_active === false) continue;
    if (
      !feeStructureMatchesSelection(
        {
          academic_year: st.academic_year,
          class_name: st.class_name,
          section: st.section,
        },
        sel
      )
    ) {
      continue;
    }
    matching.push(st);
  }

  const groups = new Map<string, StructureSelectRow[]>();
  for (const st of matching) {
    const k = structureScheduleBaseDedupeKey(st);
    const arr = groups.get(k) ?? [];
    arr.push(st);
    groups.set(k, arr);
  }

  const out: StructureSelectRow[] = [];
  for (const group of groups.values()) {
    out.push(pickCanonicalStructure(group, feeCountByStructureId));
  }
  return out;
}

function mergeInstallmentRowsByDuplicateStructure(
  rows: InstallmentRow[],
  structById: Map<string, StructureSelectRow>,
  feeCountByStructureId: Map<string, number>
): InstallmentRow[] {
  const groups = new Map<string, InstallmentRow[]>();
  for (const row of rows) {
    const st = structById.get(row.fee_structure_id);
    const groupKey = st
      ? `${structureScheduleBaseDedupeKey(st)}::${row.frequency || ''}::${row.due_month}`
      : `${row.fee_structure_id}::${row.frequency || ''}::${row.due_month}`;
    const arr = groups.get(groupKey) ?? [];
    arr.push(row);
    groups.set(groupKey, arr);
  }

  const merged: InstallmentRow[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      const ca = feeCountByStructureId.get(a.fee_structure_id) ?? 0;
      const cb = feeCountByStructureId.get(b.fee_structure_id) ?? 0;
      if (cb !== ca) return cb - ca;
      return a.fee_structure_id.localeCompare(b.fee_structure_id);
    });
    const canonical = sorted[0];
    const canonStruct = structById.get(canonical.fee_structure_id);
    const smSt = Number(canonStruct?.start_month);
    const emSt = Number(canonStruct?.end_month);
    const startMonthSt = Number.isFinite(smSt) && smSt >= 1 && smSt <= 12 ? smSt : 1;
    const endMonthSt = Number.isFinite(emSt) && emSt >= 1 && emSt <= 12 ? emSt : 12;

    const student_fee_ids = [...new Set(group.flatMap((g) => g.student_fee_ids))];
    const sample_student_fee_id =
      group.find((g) => g.sample_student_fee_id)?.sample_student_fee_id ?? '';

    merged.push({
      fee_structure_id: canonical.fee_structure_id,
      fee_plan_id: canonical.fee_plan_id,
      frequency: canonical.frequency,
      due_month: canonical.due_month,
      due_date: canonical.due_date,
      structure_name: canonStruct
        ? installmentDisplayLabel({
            structureName: String(canonStruct.name || 'Fee structure'),
            frequency: canonStruct.frequency as string | null,
            startMonth: startMonthSt,
            endMonth: endMonthSt,
            dueMonth: canonical.due_month,
          })
        : canonical.structure_name,
      academic_year: canonical.academic_year,
      is_active: canonical.is_active,
      sample_student_fee_id,
      student_fee_ids,
      base_amount: canonical.base_amount,
      paid_installment_count: group.reduce((s, g) => s + g.paid_installment_count, 0),
      unpaid_installment_count: group.reduce((s, g) => s + g.unpaid_installment_count, 0),
      from_structure_only: group.every((g) => g.from_structure_only),
    });
  }
  return merged;
}

/**
 * GET /api/v2/fees/class-section/installments?school_code=&class=&section=&academic_year=
 * Active installments from student_fees, plus fee structures for this class-section/year
 * when fees are not generated yet (so class-wise lines can be configured early).
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code')?.trim();
    const className = sp.get('class')?.trim() || '';
    const section = sp.get('section')?.trim() || '';
    const academicYear = sp.get('academic_year')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }
    if (!className || !section) {
      return NextResponse.json({ error: 'class and section are required' }, { status: 400 });
    }
    if (!academicYear) {
      return NextResponse.json({ error: 'academic_year is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();

    const { data: students, error: stErr } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', code)
      .ilike('class', className)
      .ilike('section', section)
      .limit(800);

    if (stErr) {
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }

    const studentIds = (students || []).map((s) => s.id);

    const byKey = new Map<InstallmentKey, InstallmentRow>();
    const feeCountByStructureId = new Map<string, number>();

    if (studentIds.length > 0) {
      const { data: rawFees, error: feeErr } = await supabase
        .from('student_fees')
        .select(
          `
        id,
        fee_structure_id,
        fee_plan_id,
        due_month,
        due_date,
        status,
        paid_amount,
        base_amount,
        fee_structure:fee_structure_id (
          id,
          name,
          is_active,
          academic_year,
          frequency,
          start_month,
          end_month
        )
      `
        )
        .ilike('school_code', code)
        .in('student_id', studentIds);

      if (feeErr) {
        return NextResponse.json({ error: feeErr.message }, { status: 500 });
      }

      const feePlanIds = Array.from(
        new Set((rawFees || []).map((f) => String(f.fee_plan_id || '')).filter(Boolean))
      );
      const { data: feePlans } = feePlanIds.length
        ? await supabase
            .from('fee_structure_frequency_plans')
            .select('id, frequency')
            .in('id', feePlanIds)
        : { data: [] as Array<{ id: string; frequency: string }> };
      const frequencyByPlanId = new Map<string, string>(
        (feePlans || []).map((p) => [String(p.id), String(p.frequency || '')])
      );

      for (const f of rawFees || []) {
        const structure = f.fee_structure as {
          id?: string;
          name?: string;
          is_active?: boolean;
          academic_year?: string | null;
          frequency?: string | null;
          start_month?: number | null;
          end_month?: number | null;
        } | null;
        if (!structure) continue;

        const ay = (structure.academic_year ?? '').toString().trim();
        if (ay !== academicYear) continue;

        const isActive = structure.is_active !== false;
        const paid = Number(f.paid_amount || 0);
        if (!isActive && paid <= 0) continue;

        const fsid = String(f.fee_structure_id);
        const feePlanId = String(f.fee_plan_id || '');
        const rowFrequency = frequencyByPlanId.get(feePlanId) || String(structure.frequency || 'monthly');
        feeCountByStructureId.set(fsid, (feeCountByStructureId.get(fsid) || 0) + 1);
        const dm = String(f.due_month ?? '');
        const key = `${fsid}::${rowFrequency}::${dm}`;
        const isPaidStatus = String(f.status || '').toLowerCase() === 'paid';
        const existing = byKey.get(key);
        if (!existing) {
          const sm = Number(structure.start_month);
          const em = Number(structure.end_month);
          const startMonth = Number.isFinite(sm) && sm >= 1 && sm <= 12 ? sm : 1;
          const endMonth = Number.isFinite(em) && em >= 1 && em <= 12 ? em : 12;
          const displayName = installmentDisplayLabel({
            structureName: String(structure.name || 'Fee structure'),
            frequency: rowFrequency,
            startMonth,
            endMonth,
            dueMonth: dm,
          });
          byKey.set(key, {
            fee_structure_id: fsid,
            fee_plan_id: feePlanId || undefined,
            frequency: rowFrequency,
            due_month: dm,
            due_date: String(f.due_date ?? ''),
            structure_name: displayName,
            academic_year: ay,
            is_active: isActive,
            sample_student_fee_id: String(f.id),
            student_fee_ids: [String(f.id)],
            base_amount: Number(f.base_amount || 0),
            paid_installment_count: isPaidStatus ? 1 : 0,
            unpaid_installment_count: isPaidStatus ? 0 : 1,
          });
        } else {
          existing.student_fee_ids.push(String(f.id));
          if (isPaidStatus) existing.paid_installment_count += 1;
          else existing.unpaid_installment_count += 1;
        }
      }
    }

    const selectStructures = () =>
      supabase
        .from('fee_structures')
        .select(
          `
        id,
        name,
        is_active,
        academic_year,
        class_name,
        section,
        start_month,
        end_month,
        frequency,
        payment_due_day,
        items:fee_structure_items(amount)
      `
        )
        .ilike('school_code', code);

    let { data: structures, error: fsErr } = await selectStructures().is('deleted_at', null);
    if (fsErr && isMissingFeeStructuresDeletedAtColumn(fsErr)) {
      ({ data: structures, error: fsErr } = await selectStructures());
    }

    if (fsErr) {
      return NextResponse.json({ error: fsErr.message }, { status: 500 });
    }

    const allStructureRows = (structures || []) as StructureSelectRow[];
    const structById = new Map<string, StructureSelectRow>(
      allStructureRows.map((s) => [String(s.id), s])
    );

    const structuresForInstallmentSlots = dedupeMatchingStructures(
      allStructureRows,
      { className, section, academicYear },
      feeCountByStructureId
    );

    const slotStructureIds = structuresForInstallmentSlots.map((s) => String(s.id));
    const { data: slotPlans } = slotStructureIds.length
      ? await supabase
          .from('fee_structure_frequency_plans')
          .select('id, fee_structure_id, frequency, is_active')
          .in('fee_structure_id', slotStructureIds)
          .eq('is_active', true)
      : { data: [] as Array<{ id: string; fee_structure_id: string; frequency: string; is_active: boolean }> };
    const plansByStructureId = new Map<string, Array<{ id: string; frequency: string }>>();
    for (const p of slotPlans || []) {
      const sid = String(p.fee_structure_id);
      const arr = plansByStructureId.get(sid) || [];
      arr.push({ id: String(p.id), frequency: String(p.frequency || 'monthly') });
      plansByStructureId.set(sid, arr);
    }

    const slotPlanIds = Array.from(new Set((slotPlans || []).map((p) => String(p.id))));
    const { data: slotPeriods } = slotPlanIds.length
      ? await supabase
          .from('fee_plan_periods')
          .select('id, fee_plan_id, due_month, due_date, sequence_no')
          .in('fee_plan_id', slotPlanIds)
          .order('sequence_no', { ascending: true })
      : { data: [] as Array<{ id: string; fee_plan_id: string; due_month: string; due_date: string; sequence_no: number }> };
    const periodsByPlanId = new Map<string, Array<{ id: string; due_month: string; due_date: string }>>();
    for (const p of slotPeriods || []) {
      const pid = String(p.fee_plan_id);
      const arr = periodsByPlanId.get(pid) || [];
      arr.push({
        id: String(p.id),
        due_month: String(p.due_month || ''),
        due_date: String(p.due_date || ''),
      });
      periodsByPlanId.set(pid, arr);
    }

    const slotPeriodIds = Array.from(new Set((slotPeriods || []).map((p) => String(p.id))));
    const { data: slotComponents } = slotPeriodIds.length
      ? await supabase
          .from('fee_plan_period_components')
          .select('fee_plan_period_id, amount, is_enabled')
          .in('fee_plan_period_id', slotPeriodIds)
      : { data: [] as Array<{ fee_plan_period_id: string; amount: number; is_enabled: boolean }> };
    const baseByPeriodId = new Map<string, number>();
    for (const c of slotComponents || []) {
      if (c.is_enabled === false) continue;
      const k = String(c.fee_plan_period_id);
      baseByPeriodId.set(k, (baseByPeriodId.get(k) || 0) + Number(c.amount || 0));
    }

    const anchorYear = anchorYearFromAcademicYearLabel(academicYear);

    for (const st of structuresForInstallmentSlots) {
      const items = (st.items as Array<{ amount?: number }> | null) || [];
      const baseFromItems = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

      const fsid = String(st.id);
      const ay = (st.academic_year ?? '').toString().trim();

      const smSt = Number(st.start_month);
      const emSt = Number(st.end_month);
      const startMonthSt = Number.isFinite(smSt) && smSt >= 1 && smSt <= 12 ? smSt : 1;
      const endMonthSt = Number.isFinite(emSt) && emSt >= 1 && emSt <= 12 ? emSt : 12;

      const plansForStructure = plansByStructureId.get(fsid) || [];
      if (plansForStructure.length > 0) {
        for (const pl of plansForStructure) {
          const periods = periodsByPlanId.get(pl.id) || [];
          for (const period of periods) {
            const key = `${fsid}::${pl.frequency}::${period.due_month}`;
            if (byKey.has(key)) continue;
            const displayName = installmentDisplayLabel({
              structureName: String(st.name || 'Fee structure'),
              frequency: pl.frequency,
              startMonth: startMonthSt,
              endMonth: endMonthSt,
              dueMonth: period.due_month,
            });
            byKey.set(key, {
              fee_structure_id: fsid,
              fee_plan_id: pl.id,
              frequency: pl.frequency,
              due_month: period.due_month,
              due_date: period.due_date,
              structure_name: displayName,
              academic_year: ay || academicYear,
              is_active: true,
              sample_student_fee_id: '',
              student_fee_ids: [],
              base_amount: Number(baseByPeriodId.get(period.id) || baseFromItems),
              paid_installment_count: 0,
              unpaid_installment_count: 0,
              from_structure_only: true,
            });
          }
        }
      } else {
        const months = computeInstallmentMonthsFromStructure(
          {
            start_month: Number(st.start_month),
            end_month: Number(st.end_month),
            frequency: String(st.frequency || 'monthly'),
            payment_due_day: st.payment_due_day as number | null | undefined,
          },
          anchorYear
        );
        for (const { due_month, due_date } of months) {
          const key = `${fsid}::${String(st.frequency || 'monthly')}::${due_month}`;
          if (byKey.has(key)) continue;
          const displayName = installmentDisplayLabel({
            structureName: String(st.name || 'Fee structure'),
            frequency: st.frequency as string | null,
            startMonth: startMonthSt,
            endMonth: endMonthSt,
            dueMonth: due_month,
          });
          byKey.set(key, {
            fee_structure_id: fsid,
            frequency: String(st.frequency || 'monthly'),
            due_month,
            due_date,
            structure_name: displayName,
            academic_year: ay || academicYear,
            is_active: true,
            sample_student_fee_id: '',
            student_fee_ids: [],
            base_amount: baseFromItems,
            paid_installment_count: 0,
            unpaid_installment_count: 0,
            from_structure_only: true,
          });
        }
      }
    }

    const installments = mergeInstallmentRowsByDuplicateStructure(
      Array.from(byKey.values()),
      structById,
      feeCountByStructureId
    ).sort((a, b) => {
      const ta = new Date(a.due_date || 0).getTime();
      const tb = new Date(b.due_date || 0).getTime();
      return ta - tb;
    });

    return NextResponse.json({
      data: {
        student_count: studentIds.length,
        installments,
      },
    });
  } catch (e) {
    console.error('class-section installments', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
