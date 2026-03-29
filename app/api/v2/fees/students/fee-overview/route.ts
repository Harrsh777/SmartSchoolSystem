import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import { academicYearMatchesStructure } from '@/lib/fees/fee-structure-class-match';
import {
  fetchActiveAdjustmentRules,
  fetchRuleTargetsMap,
  fetchStructureItemsMap,
} from '@/lib/fees/load-adjustment-context';
import { fetchLineAdjustmentsGroupedByFeeIds } from '@/lib/fees/student-fee-line-adjustments';

function escapeIlike(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * GET /api/v2/fees/students/fee-overview
 * Student-wise fee list: aggregates per student for filters (class, section, academic year, search).
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const sp = request.nextUrl.searchParams;
    const schoolCode = sp.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const classFilter = sp.get('class')?.trim() || '';
    const sectionFilter = sp.get('section')?.trim() || '';
    const academicYear = sp.get('academic_year')?.trim() || '';
    const allYears = sp.get('all_years') === '1';
    const search = sp.get('q')?.trim() || '';
    const limit = Math.min(parseInt(sp.get('limit') || '80', 10), 200);

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();

    let stQuery = supabase
      .from('students')
      .select('id, student_name, admission_no, class, section, father_name, school_code')
      .eq('school_code', code)
      .order('student_name', { ascending: true })
      .limit(limit);

    if (classFilter) {
      stQuery = stQuery.ilike('class', escapeIlike(classFilter));
    }
    if (sectionFilter) {
      stQuery = stQuery.ilike('section', escapeIlike(sectionFilter));
    }
    if (search.length >= 3) {
      const safe = escapeIlike(search);
      stQuery = stQuery.or(`student_name.ilike.%${safe}%,admission_no.ilike.%${safe}%`);
    }

    const { data: students, error: stErr } = await stQuery;
    if (stErr) {
      return NextResponse.json({ error: stErr.message }, { status: 500 });
    }

    const studentList = students || [];
    if (studentList.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const studentIds = studentList.map((s) => s.id);

    const { data: rawFees, error: feeErr } = await supabase
      .from('student_fees')
      .select(`
        id,
        student_id,
        fee_structure_id,
        due_month,
        due_date,
        base_amount,
        paid_amount,
        adjustment_amount,
        status,
        fee_structure:fee_structure_id (
          id,
          name,
          is_active,
          academic_year,
          late_fee_type,
          late_fee_value,
          grace_period_days
        )
      `)
      .eq('school_code', code)
      .in('student_id', studentIds);

    if (feeErr) {
      return NextResponse.json({ error: feeErr.message }, { status: 500 });
    }

    const feesByStudent = new Map<string, typeof rawFees>();
    for (const f of rawFees || []) {
      const sid = String(f.student_id);
      if (!feesByStudent.has(sid)) feesByStudent.set(sid, []);
      feesByStudent.get(sid)!.push(f);
    }

    const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(supabase, code);

    const allFeeRows = rawFees || [];
    const allFeeIds = allFeeRows.map((f) => String(f.id));
    const allStructureIds = [
      ...new Set(allFeeRows.map((f) => String(f.fee_structure_id)).filter(Boolean)),
    ];

    const [lineGroups, rules, structureItemsByStructureId] = await Promise.all([
      fetchLineAdjustmentsGroupedByFeeIds(supabase, allFeeIds),
      fetchActiveAdjustmentRules(supabase, code),
      fetchStructureItemsMap(supabase, allStructureIds),
    ]);
    const targetByRuleId = await fetchRuleTargetsMap(
      supabase,
      rules.map((r) => r.id)
    );

    const prefetched = {
      lineGroups,
      rules,
      targetByRuleId,
      structureItemsByStructureId,
    };

    const rows: Array<{
      student: (typeof studentList)[0];
      has_generated_fees: boolean;
      fee_structure_names: string[];
      receivable_after_discount: number;
      paid_till_date: number;
      fee_due: number;
    }> = [];

    for (const st of studentList) {
      let fees = feesByStudent.get(st.id) || [];

      fees = fees.filter((fee) => {
        const structure = fee.fee_structure as { is_active?: boolean } | null;
        if (structure?.is_active === false) {
          const paid = Number(fee.paid_amount || 0);
          if (paid <= 0) return false;
        }
        if (!allYears && academicYear) {
          const ay = (fee.fee_structure as { academic_year?: string | null } | null)?.academic_year;
          if (!academicYearMatchesStructure(ay, academicYear)) return false;
        }
        return true;
      });

      if (fees.length === 0) {
        rows.push({
          student: st,
          has_generated_fees: false,
          fee_structure_names: [],
          receivable_after_discount: 0,
          paid_till_date: 0,
          fee_due: 0,
        });
        continue;
      }

      const studentCtx = {
        id: String(st.id),
        class: String(st.class ?? ''),
        section: st.section ?? null,
      };

      const enriched = await enrichStudentFeesWithAdjustments(supabase, code, studentCtx, fees as never, {
        classLinesBySectionKey,
        prefetched,
      });

      const names = new Set<string>();
      let receivable = 0;
      let paid = 0;
      let due = 0;

      for (const ef of enriched) {
        const fs = ef.fee_structure as { name?: string } | null;
        if (fs?.name) names.add(String(fs.name));
        receivable += Number(ef.final_amount || 0);
        paid += Number(ef.paid_amount || 0);
        due += Number(ef.total_due || 0);
      }

      rows.push({
        student: st,
        has_generated_fees: true,
        fee_structure_names: Array.from(names),
        receivable_after_discount: Math.round(receivable * 100) / 100,
        paid_till_date: Math.round(paid * 100) / 100,
        fee_due: Math.round(due * 100) / 100,
      });
    }

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (e) {
    console.error('fee-overview', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
