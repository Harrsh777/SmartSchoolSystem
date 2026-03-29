import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';
import { academicYearMatchesStructure } from '@/lib/fees/fee-structure-class-match';
import { installmentDisplayLabel } from '@/lib/fees/installment-display-label';

/**
 * GET /api/v2/fees/students/[studentId]/fees]
 * Get all fees for a student with late fee calculated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year')?.trim() || '';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase().trim();

    // Debug: Check if student exists
    const { data: student } = await supabase
      .from('students')
      .select('id, admission_no, student_name, school_code, class, section')
      .eq('id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .single();

    console.log('Fetching fees for student:', {
      studentId,
      school_code: normalizedSchoolCode,
      student_found: !!student,
      student_name: student?.student_name,
      student_school_code: student?.school_code,
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get student fees with structure details (only from active fee structures)
    const { data: fees, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        fee_structure:fee_structure_id (
          id,
          name,
          class_name,
          section,
          academic_year,
          is_active,
          late_fee_type,
          late_fee_value,
          grace_period_days,
          frequency,
          start_month,
          end_month
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .order('due_month', { ascending: true });

    console.log('Student fees query result:', {
      studentId,
      school_code: normalizedSchoolCode,
      fees_found: fees?.length || 0,
      error: error?.message,
    });

    if (error) {
      console.error('Error fetching student fees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch student fees', details: error.message },
        { status: 500 }
      );
    }

    // Keep showing already-paid fees even if the fee structure was deactivated.
    // (Deactivation should stop NEW unpaid dues from appearing in collection,
    // but it should not hide the student's paid history in statements.)
    let feesToUse = (fees || []).filter((fee) => {
      const structure = fee.fee_structure as { is_active?: boolean } | null;
      const isStructureActive = structure?.is_active !== false;
      const paidAmount = Number(fee.paid_amount || 0);
      return isStructureActive || paidAmount > 0;
    });

    if (academicYear) {
      feesToUse = feesToUse.filter((fee) => {
        const structure = fee.fee_structure as { academic_year?: string | null } | null;
        return academicYearMatchesStructure(structure?.academic_year, academicYear);
      });
    }

    const studentCtx = {
      id: String(student.id),
      class: String(student.class ?? ''),
      section: student.section ?? null,
    };

    const feesWithAdjustments = await enrichStudentFeesWithAdjustments(
      supabase,
      normalizedSchoolCode,
      studentCtx,
      feesToUse as never
    );

    const labeled = (feesWithAdjustments as Array<Record<string, unknown>>).map((fee) => {
      const fs = fee.fee_structure as {
        name?: string;
        frequency?: string | null;
        start_month?: number | null;
        end_month?: number | null;
      } | null;
      const sm = Number(fs?.start_month);
      const em = Number(fs?.end_month);
      const startMonth = Number.isFinite(sm) && sm >= 1 && sm <= 12 ? sm : 1;
      const endMonth = Number.isFinite(em) && em >= 1 && em <= 12 ? em : 12;
      const installment_display_label = installmentDisplayLabel({
        structureName: String(fs?.name || 'Fee'),
        frequency: fs?.frequency,
        startMonth,
        endMonth,
        dueMonth: String(fee.due_month ?? ''),
      });
      return { ...fee, installment_display_label };
    });

    return NextResponse.json({ data: labeled }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/students/[studentId]/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
