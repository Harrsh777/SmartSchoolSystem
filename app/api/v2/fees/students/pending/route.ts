import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';
import { enrichPendingFeeRows } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import {
  academicYearMatchesStructure,
  studentMatchesCollectPaymentFilters,
} from '@/lib/fees/fee-structure-class-match';

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

    const { data: pendingFeesRaw, error: feesError } = await supabase
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
          class,
          section,
          school_code
        )
      `)
      .eq('school_code', normalizedSchoolCode)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(1000);

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

    const studentMap = new Map<
      string,
      {
        id: string;
        student_name: string;
        admission_no: string;
        class: string;
        section: string;
        pending_amount: number;
        late_fee_amount: number;
        due_date: string;
        latest_due_date: string;
      }
    >();

    enriched.forEach((fee) => {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };

      if (!student?.id) return;

      const totalDue = fee.total_due;
      if (totalDue <= 0) return;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          class: student.class || '',
          section: student.section || '',
          pending_amount: 0,
          late_fee_amount: 0,
          due_date: String(fee.due_date),
          latest_due_date: String(fee.due_date || ''),
        });
      }

      const data = studentMap.get(student.id)!;
      const feeDueDate = fee.due_date || '';
      const prevLatest = data.latest_due_date ? new Date(data.latest_due_date) : null;
      const currentDue = feeDueDate ? new Date(feeDueDate) : null;

      if (!prevLatest || (currentDue && currentDue > prevLatest)) {
        data.latest_due_date = feeDueDate;
        data.pending_amount = totalDue;
        data.late_fee_amount = fee.late_fee;
        data.due_date = feeDueDate;
      } else if (currentDue && prevLatest && currentDue.getTime() === prevLatest.getTime()) {
        data.pending_amount += totalDue;
        data.late_fee_amount += fee.late_fee;
      }
    });

    const pendingStudents = Array.from(studentMap.values())
      .sort((a, b) => b.pending_amount - a.pending_amount)
      .slice(0, limit);

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error('Error in pending students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
