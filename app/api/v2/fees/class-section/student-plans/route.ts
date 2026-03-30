import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { feeStructureMatchesSelection } from '@/lib/fees/fee-structure-class-match';
import { isMissingFeeStructuresDeletedAtColumn } from '@/lib/fees/fee-structure-deleted-at-compat';

type PlanRow = {
  id: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
};

function isMissingStudentsIsRteColumn(error: unknown): boolean {
  const msg = (error as { message?: string } | null)?.message || '';
  const code = (error as { code?: string } | null)?.code || '';
  return (
    code === '42703' ||
    /column.*is_rte.*does not exist|Could not find the 'is_rte' column/i.test(String(msg))
  );
}

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const schoolCode = (request.nextUrl.searchParams.get('school_code') || '').trim().toUpperCase();
    const className = (request.nextUrl.searchParams.get('class') || '').trim();
    const section = (request.nextUrl.searchParams.get('section') || '').trim();
    const academicYear = (request.nextUrl.searchParams.get('academic_year') || '').trim();
    if (!schoolCode || !className || !section || !academicYear) {
      return NextResponse.json(
        { error: 'school_code, class, section, academic_year are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    const selectStructures = () =>
      supabase
        .from('fee_structures')
        .select(
          'id, name, frequency_mode, frequency, class_name, section, academic_year, is_active, session_archived, created_at'
        )
        .ilike('school_code', schoolCode)
        .order('created_at', { ascending: false });

    let { data: allStructures, error: structureErr } = await selectStructures().is('deleted_at', null);
    if (structureErr && isMissingFeeStructuresDeletedAtColumn(structureErr)) {
      ({ data: allStructures, error: structureErr } = await selectStructures());
    }

    const structureRows = (allStructures || []).filter((row) => {
      if (row.session_archived === true) return false;
      return feeStructureMatchesSelection(
        {
          academic_year: row.academic_year,
          class_name: row.class_name,
          section: row.section,
        },
        { className, section, academicYear }
      );
    });

    const hasStructure = !structureErr && Array.isArray(structureRows) && structureRows.length > 0;

    let plansByStructure = new Map<string, PlanRow[]>();
    let structure: (typeof structureRows)[number] | null = null;
    let plans: PlanRow[] = [];
    let resolvedFrequencyMode: 'single' | 'multiple' = 'single';

    if (hasStructure) {
      const structureIds = structureRows.map((s) => String(s.id));
      const { data: allPlanRows, error: planErr } = await supabase
        .from('fee_structure_frequency_plans')
        .select('id, frequency, fee_structure_id')
        .in('fee_structure_id', structureIds)
        .eq('is_active', true)
        .order('frequency', { ascending: true });

      if (planErr) {
        return NextResponse.json({ error: planErr.message }, { status: 500 });
      }

      plansByStructure = new Map<string, PlanRow[]>();
      for (const p of allPlanRows || []) {
        const sid = String(p.fee_structure_id);
        const arr = plansByStructure.get(sid) || [];
        arr.push({
          id: String(p.id),
          frequency: String(p.frequency) as PlanRow['frequency'],
        });
        plansByStructure.set(sid, arr);
      }

      // Prefer structures that actually have active plan rows (new model),
      // and prioritize explicit multi-frequency structure.
      const sortedCandidates = [...structureRows].sort((a, b) => {
        const pa = (plansByStructure.get(String(a.id)) || []).length;
        const pb = (plansByStructure.get(String(b.id)) || []).length;
        if (pb !== pa) return pb - pa;
        const ma = String(a.frequency_mode || '') === 'multiple' ? 1 : 0;
        const mb = String(b.frequency_mode || '') === 'multiple' ? 1 : 0;
        if (mb !== ma) return mb - ma;
        const aa = a.is_active === true ? 1 : 0;
        const ab = b.is_active === true ? 1 : 0;
        return ab - aa;
      });
      structure = sortedCandidates[0];
      const selectedPlans = plansByStructure.get(String(structure.id)) || [];

      // Backward compatibility: if no frequency plans exist, derive single plan from structure.frequency.
      plans =
        selectedPlans.length > 0
          ? selectedPlans
          : [
              {
                id: `legacy-${String(structure.id)}`,
                frequency: (String(structure.frequency || 'monthly') as PlanRow['frequency']),
              },
            ];

      resolvedFrequencyMode =
        selectedPlans.length > 1 || String(structure.frequency_mode || '') === 'multiple'
          ? 'multiple'
          : 'single';
    }

    const selectStudentsWithRte = () =>
      supabase
        .from('students')
        .select('id, student_name, admission_no, roll_number, is_rte')
        .ilike('school_code', schoolCode)
        .ilike('class', className)
        .ilike('section', section)
        .order('roll_number', { ascending: true, nullsFirst: false });

    const selectStudentsLegacy = () =>
      supabase
        .from('students')
        .select('id, student_name, admission_no, roll_number')
        .ilike('school_code', schoolCode)
        .ilike('class', className)
        .ilike('section', section)
        .order('roll_number', { ascending: true, nullsFirst: false });

    let { data: students, error: studentErr } = await selectStudentsWithRte();
    if (studentErr && isMissingStudentsIsRteColumn(studentErr)) {
      ({ data: students, error: studentErr } = await selectStudentsLegacy());
    }

    if (studentErr) {
      return NextResponse.json({ error: studentErr.message }, { status: 500 });
    }

    const ids = (students || []).map((s) => String(s.id));
    let assignmentsByStudent = new Map<string, string>();
    if (ids.length > 0 && structure) {
      const { data: assignments } = await supabase
        .from('student_payment_plans')
        .select('student_id, fee_plan_id')
        .eq('fee_structure_id', String(structure.id))
        .in('student_id', ids);
      assignmentsByStudent = new Map(
        (assignments || []).map((a) => [String(a.student_id), String(a.fee_plan_id)])
      );
    }

    return NextResponse.json({
      data: {
        structure: {
          id: structure ? String(structure.id) : '',
          name: structure ? String(structure.name || '') : '',
          frequency_mode: resolvedFrequencyMode,
          frequency: structure ? String(structure.frequency || '') : '',
        },
        plans,
        students: (students || []).map((s) => ({
          id: String(s.id),
          student_name: String(s.student_name || ''),
          admission_no: s.admission_no ? String(s.admission_no) : '',
          roll_number: s.roll_number ? String(s.roll_number) : '',
          is_rte: Boolean((s as { is_rte?: boolean }).is_rte),
          fee_plan_id: assignmentsByStudent.get(String(s.id)) || null,
        })),
      },
    });
  } catch (e) {
    console.error('GET class-section student-plans', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const assignments = Array.isArray(body.assignments)
      ? body.assignments as Array<{ student_id: string; fee_plan_id: string }>
      : [];

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
      .eq('school_code', schoolCode)
      .single();
    if (structureErr || !structure) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 });
    }

    const { data: students, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .ilike('school_code', schoolCode)
      .ilike('class', className)
      .ilike('section', section);
    if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 500 });

    const validStudentIds = new Set((students || []).map((s) => String(s.id)));
    const cleaned = assignments.filter(
      (a) => a?.student_id && a?.fee_plan_id && validStudentIds.has(String(a.student_id))
    );

    const { data: plans, error: planErr } = await supabase
      .from('fee_structure_frequency_plans')
      .select('id')
      .eq('fee_structure_id', feeStructureId)
      .eq('is_active', true);
    if (planErr) return NextResponse.json({ error: planErr.message }, { status: 500 });
    const validPlanIds = new Set((plans || []).map((p) => String(p.id)));

    const rows = cleaned
      .filter((a) => validPlanIds.has(String(a.fee_plan_id)))
      .map((a) => ({
        school_id: structure.school_id,
        school_code: schoolCode,
        student_id: String(a.student_id),
        fee_structure_id: feeStructureId,
        fee_plan_id: String(a.fee_plan_id),
        assigned_at: new Date().toISOString(),
      }));

    if (String(structure.frequency_mode) === 'multiple') {
      if (rows.length !== validStudentIds.size) {
        return NextResponse.json(
          { error: 'All students must have a selected frequency before proceeding.' },
          { status: 400 }
        );
      }
    }

    const studentIdList = Array.from(validStudentIds);
    if (studentIdList.length > 0) {
      const { error: deleteScopedErr } = await supabase
        .from('student_payment_plans')
        .delete()
        .eq('fee_structure_id', feeStructureId)
        .in('student_id', studentIdList);
      if (deleteScopedErr) {
        return NextResponse.json({ error: deleteScopedErr.message }, { status: 500 });
      }

      // Legacy compatibility: some databases may have a broader uniqueness on student_id.
      // Clear previous plan bindings for these students before inserting new structure plans.
      const { error: deleteLegacyErr } = await supabase
        .from('student_payment_plans')
        .delete()
        .in('student_id', studentIdList);
      if (deleteLegacyErr) {
        return NextResponse.json({ error: deleteLegacyErr.message }, { status: 500 });
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('student_payment_plans').insert(rows);
      if (insErr) {
        const isMissingColumnErr =
          insErr.code === 'PGRST204' ||
          /Could not find the 'school_id' column|column.*school_id.*does not exist/i.test(insErr.message || '');
        if (!isMissingColumnErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }

        // Backward compatibility: older schemas may not have student_payment_plans.school_id
        const fallbackRows = rows.map(({ school_id: _drop, ...rest }) => {
          void _drop;
          return rest;
        });
        const { error: fallbackErr } = await supabase.from('student_payment_plans').insert(fallbackRows);
        if (fallbackErr) return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ data: { saved_count: rows.length } });
  } catch (e) {
    console.error('POST class-section student-plans', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
