import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import {
  anchorYearFromAcademicYearLabel,
  computeInstallmentMonthsFromStructure,
} from '@/lib/fees/structure-installment-months';
import { feeStructureMatchesSelection } from '@/lib/fees/fee-structure-class-match';
import { installmentDisplayLabel } from '@/lib/fees/installment-display-label';

type InstallmentKey = string;

type InstallmentRow = {
  fee_structure_id: string;
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

    if (studentIds.length > 0) {
      const { data: rawFees, error: feeErr } = await supabase
        .from('student_fees')
        .select(
          `
        id,
        fee_structure_id,
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
        const dm = String(f.due_month ?? '');
        const key = `${fsid}::${dm}`;
        const isPaidStatus = String(f.status || '').toLowerCase() === 'paid';
        const existing = byKey.get(key);
        if (!existing) {
          const sm = Number(structure.start_month);
          const em = Number(structure.end_month);
          const startMonth = Number.isFinite(sm) && sm >= 1 && sm <= 12 ? sm : 1;
          const endMonth = Number.isFinite(em) && em >= 1 && em <= 12 ? em : 12;
          const displayName = installmentDisplayLabel({
            structureName: String(structure.name || 'Fee structure'),
            frequency: structure.frequency,
            startMonth,
            endMonth,
            dueMonth: dm,
          });
          byKey.set(key, {
            fee_structure_id: fsid,
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

    const { data: structures, error: fsErr } = await supabase
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

    if (fsErr) {
      return NextResponse.json({ error: fsErr.message }, { status: 500 });
    }

    const anchorYear = anchorYearFromAcademicYearLabel(academicYear);

    for (const st of structures || []) {
      if (
        !feeStructureMatchesSelection(
          {
            academic_year: st.academic_year as string | null,
            class_name: st.class_name as string | null,
            section: st.section as string | null,
          },
          { className, section, academicYear }
        )
      ) {
        continue;
      }

      const isActive = st.is_active !== false;
      if (!isActive) continue;

      const items = (st.items as Array<{ amount?: number }> | null) || [];
      const baseFromItems = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

      const months = computeInstallmentMonthsFromStructure(
        {
          start_month: Number(st.start_month),
          end_month: Number(st.end_month),
          frequency: String(st.frequency || 'monthly'),
          payment_due_day: st.payment_due_day as number | null | undefined,
        },
        anchorYear
      );

      const fsid = String(st.id);
      const ay = (st.academic_year ?? '').toString().trim();

      const smSt = Number(st.start_month);
      const emSt = Number(st.end_month);
      const startMonthSt = Number.isFinite(smSt) && smSt >= 1 && smSt <= 12 ? smSt : 1;
      const endMonthSt = Number.isFinite(emSt) && emSt >= 1 && emSt <= 12 ? emSt : 12;

      for (const { due_month, due_date } of months) {
        const key = `${fsid}::${due_month}`;
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

    const installments = Array.from(byKey.values()).sort((a, b) => {
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
