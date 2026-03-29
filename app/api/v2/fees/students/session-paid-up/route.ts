import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';
import { enrichPendingFeeRows } from '@/lib/fees/enrich-student-fees';
import { fetchAllClassFeeLinesBySectionKey } from '@/lib/fees/class-fee-line-adjustments';
import {
  academicYearMatchesStructure,
  studentMatchesCollectPaymentFilters,
} from '@/lib/fees/fee-structure-class-match';

/**
 * GET /api/v2/fees/students/session-paid-up
 * Students who have fee rows for the session (class/section/year) and no outstanding total_due
 * on any of those rows (same enrichment as pending list). For Collect Payment reference.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 400);
    const classFilter = searchParams.get('class')?.trim() || '';
    const sectionFilter = searchParams.get('section')?.trim() || '';
    const academicYear = searchParams.get('academic_year')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase();

    const { data: feesRaw, error: feesError } = await supabase
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
      .in('status', ['pending', 'partial', 'overdue', 'paid'])
      .order('due_date', { ascending: true })
      .limit(2500);

    if (feesError) {
      console.error('Error fetching fees for session-paid-up:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    let fees = (feesRaw || []).filter((fee) => {
      const structure = fee.fee_structure as unknown as { is_active?: boolean } | null;
      return structure?.is_active !== false;
    });

    if (classFilter || sectionFilter || academicYear) {
      fees = fees.filter((fee) => {
        const student = fee.student as unknown as { class?: string; section?: string };
        const structure = fee.fee_structure as unknown as { academic_year?: string | null };
        if (!studentMatchesCollectPaymentFilters(student, classFilter, sectionFilter)) return false;
        if (academicYear) {
          if (!academicYearMatchesStructure(structure?.academic_year, academicYear)) return false;
        }
        return true;
      });
    }

    if (fees.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const classLinesBySectionKey = await fetchAllClassFeeLinesBySectionKey(
      supabase,
      normalizedSchoolCode
    );
    const enriched = await enrichPendingFeeRows(supabase, normalizedSchoolCode, fees as never, {
      classLinesBySectionKey,
    });

    type Agg = {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      total_due_sum: number;
      installment_count: number;
      total_paid_sum: number;
    };

    const byStudent = new Map<string, Agg>();

    for (const fee of enriched) {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      if (!student?.id) continue;

      const td = Number(fee.total_due || 0);
      const paid = Number(fee.paid_amount || 0);

      if (!byStudent.has(student.id)) {
        byStudent.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          class: student.class || '',
          section: student.section || '',
          total_due_sum: 0,
          installment_count: 0,
          total_paid_sum: 0,
        });
      }
      const a = byStudent.get(student.id)!;
      a.total_due_sum += td;
      a.installment_count += 1;
      a.total_paid_sum += paid;
    }

    const EPS = 0.005;
    const paidUp = Array.from(byStudent.values())
      .filter((a) => a.installment_count > 0 && a.total_due_sum <= EPS)
      .map((a) => ({
        id: a.id,
        student_name: a.student_name,
        admission_no: a.admission_no,
        class: a.class,
        section: a.section,
        installment_count: a.installment_count,
        total_paid_session: Math.round(a.total_paid_sum * 100) / 100,
      }))
      .sort((x, y) => x.student_name.localeCompare(y.student_name, undefined, { sensitivity: 'base' }))
      .slice(0, limit);

    return NextResponse.json({ data: paidUp });
  } catch (error) {
    console.error('Error in session-paid-up:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
