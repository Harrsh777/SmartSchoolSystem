import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';
import { enrichPendingFeeRows } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import {
  academicYearMatchesStructure,
  studentMatchesCollectPaymentFilters,
} from '@/lib/fees/fee-structure-class-match';
import { getTransportFeeMode, includeTransportStudentFeeRowForMainFeesUi } from '@/lib/fees/transport-fee-mode';

function comparePendingStudentsByRoll(
  a: { roll_number: string; student_name: string },
  b: { roll_number: string; student_name: string }
): number {
  const ra = String(a.roll_number || '').trim();
  const rb = String(b.roll_number || '').trim();
  if (!ra && !rb) {
    return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
  }
  if (!ra) return 1;
  if (!rb) return -1;
  const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return cmp;
  return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
}

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
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);
    const classFilter = searchParams.get('class')?.trim() || '';
    const sectionFilter = searchParams.get('section')?.trim() || '';
    const academicYear = searchParams.get('academic_year')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();

    const selectPendingWithRte = () =>
      supabase
        .from('student_fees')
        .select(`
        id,
        student_id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        due_month,
        status,
        fee_structure_id,
        fee_source,
        transport_snapshot,
        fee_structure:fee_structure_id (
          is_active,
          late_fee_type,
          late_fee_value,
          grace_period_days,
          academic_year
        ),
        student:students!inner(
          id,
          student_name,
          admission_no,
          roll_number,
          class,
          section,
          school_code,
          is_rte
        )
      `)
        .eq('school_code', normalizedSchoolCode)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1000);

    const selectPendingLegacy = () =>
      supabase
        .from('student_fees')
        .select(`
        id,
        student_id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        due_month,
        status,
        fee_structure_id,
        fee_source,
        transport_snapshot,
        fee_structure:fee_structure_id (
          is_active,
          late_fee_type,
          late_fee_value,
          grace_period_days,
          academic_year
        ),
        student:students!inner(
          id,
          student_name,
          admission_no,
          roll_number,
          class,
          section,
          school_code
        )
      `)
        .eq('school_code', normalizedSchoolCode)
        .in('status', ['pending', 'partial', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(1000);

    let { data: pendingFeesRaw, error: feesError }: {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string; code?: string } | null;
    } = await selectPendingWithRte() as unknown as {
      data: Array<Record<string, unknown>> | null;
      error: { message?: string; code?: string } | null;
    };
    if (feesError && isMissingStudentsIsRteColumn(feesError)) {
      ({ data: pendingFeesRaw, error: feesError } =
        (await selectPendingLegacy()) as unknown as {
          data: Array<Record<string, unknown>> | null;
          error: { message?: string; code?: string } | null;
        });
    }

    if (feesError) {
      console.error('Error fetching pending fees:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    // Do not hide rows when the fee structure was deactivated — staff still need to collect outstanding dues.
    let pendingFees = pendingFeesRaw || [];
    if (classFilter || sectionFilter || academicYear) {
      pendingFees = pendingFees.filter((fee) => {
        const student = fee.student as unknown as { class?: string; section?: string };
        const structure = fee.fee_structure as unknown as { academic_year?: string | null };
        if (!studentMatchesCollectPaymentFilters(student, classFilter, sectionFilter)) return false;
        if (academicYear) {
          if (!academicYearMatchesStructure(structure?.academic_year, academicYear)) return false;
        }
        return true;
      });
    }

    const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(
      supabase,
      normalizedSchoolCode
    );
    const enriched = await enrichPendingFeeRows(supabase, normalizedSchoolCode, pendingFees as never, {
      classLinesBySectionKey,
    });

    const transportMode = await getTransportFeeMode(supabase, normalizedSchoolCode);

    const studentMap = new Map<
      string,
      {
        id: string;
        student_name: string;
        admission_no: string;
        roll_number: string;
        class: string;
        section: string;
        pending_amount: number;
        late_fee_amount: number;
        due_date: string;
        latest_due_date: string;
      }
    >();

    const DUE_EPS = 0.01;

    enriched.forEach((fee) => {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        roll_number?: string | null;
        class?: string;
        section?: string;
        is_rte?: boolean;
      };

      if (!student?.id) return;
      if (student.is_rte === true) return;

      if (
        !includeTransportStudentFeeRowForMainFeesUi(
          transportMode,
          String((fee as { fee_source?: string }).fee_source ?? ''),
          Number((fee as { total_due?: number }).total_due || 0)
        )
      ) {
        return;
      }

      const totalDue = Number(fee.total_due || 0);
      if (totalDue <= DUE_EPS) return;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          roll_number: student.roll_number != null ? String(student.roll_number) : '',
          class: student.class || '',
          section: student.section || '',
          pending_amount: 0,
          late_fee_amount: 0,
          due_date: '',
          latest_due_date: '',
        });
      }

      const data = studentMap.get(student.id)!;
      data.pending_amount += totalDue;
      data.late_fee_amount += Number(fee.late_fee || 0);

      const feeDueDate = String(fee.due_date || '').trim();
      if (feeDueDate) {
        if (!data.due_date || feeDueDate < data.due_date) {
          data.due_date = feeDueDate;
        }
        if (!data.latest_due_date || feeDueDate > data.latest_due_date) {
          data.latest_due_date = feeDueDate;
        }
      }
    });

    const pendingStudents = Array.from(studentMap.values())
      .sort(comparePendingStudentsByRoll)
      .slice(0, limit);

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error('Error in pending students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
