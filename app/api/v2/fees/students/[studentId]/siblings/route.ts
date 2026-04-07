import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { academicYearMatchesStructure } from '@/lib/fees/fee-structure-class-match';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';

const DUE_EPS = 0.01;

function normalizePhone(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) return permissionCheck;

    const { studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = String(searchParams.get('school_code') || '').trim().toUpperCase();
    const dueMonth = String(searchParams.get('due_month') || '').trim();
    const academicYear = String(searchParams.get('academic_year') || '').trim();

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const { data: selectedStudent, error: studentError } = await supabase
      .from('students')
      .select('id, school_code, father_contact')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !selectedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const selectedFatherMobile = normalizePhone(selectedStudent.father_contact);
    if (!selectedFatherMobile) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: students, error: siblingsError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, roll_number, class, section, father_contact')
      .eq('school_code', schoolCode)
      .neq('id', studentId);

    if (siblingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch siblings', details: siblingsError.message },
        { status: 500 }
      );
    }

    const siblings = (students || []).filter(
      (row) => normalizePhone(row.father_contact) === selectedFatherMobile
    );

    if (siblings.length === 0) return NextResponse.json({ data: [] }, { status: 200 });

    const siblingIds = siblings.map((s) => String(s.id));
    const feeQuery = supabase
      .from('student_fees')
      .select(`
        student_id,
        due_month,
        due_date,
        fee_structure:fee_structure_id (
          academic_year
        )
      `)
      .eq('school_code', schoolCode)
      .in('student_id', siblingIds)
      .in('status', ['pending', 'partial', 'overdue']);

    const { data: feesRaw, error: feesError } = dueMonth
      ? await feeQuery.eq('due_month', dueMonth)
      : await feeQuery;
    if (feesError) {
      return NextResponse.json(
        { error: 'Failed to load sibling fee rows', details: feesError.message },
        { status: 500 }
      );
    }

    const feeRows = (feesRaw || []).filter((row) => {
      if (!academicYear) return true;
      const structure = row.fee_structure as { academic_year?: string | null } | null;
      return academicYearMatchesStructure(structure?.academic_year, academicYear);
    });

    const feesBySibling = new Map<string, number>();
    for (const sid of siblingIds) feesBySibling.set(sid, 0);

    for (const sibling of siblings) {
      const sid = String(sibling.id);
      const rawForSibling = feeRows.filter((row) => String(row.student_id) === sid);
      if (rawForSibling.length === 0) continue;

      const enriched = await enrichStudentFeesWithAdjustments(
        supabase,
        schoolCode,
        {
          id: sid,
          class: String(sibling.class || ''),
          section: sibling.section ?? null,
        },
        rawForSibling as never
      );
      const due = enriched.reduce((sum, row) => sum + Math.max(0, Number(row.total_due || 0)), 0);
      feesBySibling.set(sid, Math.round(due * 100) / 100);
    }

    const data = siblings
      .map((s) => ({
        id: String(s.id),
        student_name: String(s.student_name || 'Unknown'),
        admission_no: String(s.admission_no || ''),
        roll_number: s.roll_number != null ? String(s.roll_number) : '',
        class: String(s.class || ''),
        section: String(s.section || ''),
        due_for_selected_period: Math.round((feesBySibling.get(String(s.id)) || 0) * 100) / 100,
      }))
      .sort((a, b) => {
        const byClass = a.class.localeCompare(b.class, undefined, { numeric: true, sensitivity: 'base' });
        if (byClass !== 0) return byClass;
        const bySection = a.section.localeCompare(b.section, undefined, { sensitivity: 'base' });
        if (bySection !== 0) return bySection;
        const ra = String(a.roll_number || '').trim();
        const rb = String(b.roll_number || '').trim();
        if (ra && rb) {
          const byRoll = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
          if (byRoll !== 0) return byRoll;
        }
        return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
      });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
