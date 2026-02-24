import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

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
      .select('id, admission_no, student_name, school_code')
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
          grace_period_days
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

    let feesToUse = (fees || []).filter((fee) => {
      const structure = fee.fee_structure as { is_active?: boolean } | null;
      return structure?.is_active !== false;
    });

    if (academicYear) {
      feesToUse = feesToUse.filter((fee) => {
        const structure = fee.fee_structure as { academic_year?: string | null } | null;
        const feeYear = (structure?.academic_year ?? '').toString().trim();
        return feeYear === academicYear;
      });
    }

    // Calculate late fee for each fee record
    const feesWithLateFee = feesToUse.map(fee => {
      const structure = fee.fee_structure;
      let lateFee = 0;

      if (structure && structure.late_fee_type) {
        const currentDate = new Date();
        const dueDate = new Date(fee.due_date);
        const gracePeriod = structure.grace_period_days || 0;
        const effectiveDueDate = new Date(dueDate);
        effectiveDueDate.setDate(effectiveDueDate.getDate() + gracePeriod);

        if (currentDate > effectiveDueDate) {
          const daysLate = Math.floor((currentDate.getTime() - effectiveDueDate.getTime()) / (1000 * 60 * 60 * 24));

          if (structure.late_fee_type === 'flat') {
            lateFee = structure.late_fee_value || 0;
          } else if (structure.late_fee_type === 'per_day') {
            lateFee = (structure.late_fee_value || 0) * daysLate;
          } else if (structure.late_fee_type === 'percentage') {
            lateFee = (fee.base_amount * (structure.late_fee_value || 0) / 100) * daysLate;
          }
        }
      }

      const balanceDue = fee.base_amount + fee.adjustment_amount - fee.paid_amount;
      const totalDue = balanceDue + lateFee;

      return {
        ...fee,
        late_fee: Math.max(0, lateFee),
        balance_due: balanceDue,
        total_due: totalDue,
      };
    }) || [];

    return NextResponse.json({ data: feesWithLateFee }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/students/[studentId]/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
