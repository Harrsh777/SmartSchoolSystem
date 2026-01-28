import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/student/fees
 * Student-facing fees endpoint (no RBAC header required).
 * Query params: school_code, student_id
 *
 * Returns: student_fees rows with computed late_fee, balance_due, total_due and fee_structure info.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase().trim();

    // Verify student belongs to this school
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_code')
      .eq('id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: fees, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        fee_structure:fee_structure_id (
          id,
          name,
          class_name,
          section,
          late_fee_type,
          late_fee_value,
          grace_period_days
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .order('due_month', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch student fees', details: error.message },
        { status: 500 }
      );
    }

    const now = new Date();

    const feesWithComputed = (fees || []).map((fee: { due_date?: string; fee_structure?: { late_fee_type?: string; grace_period_days?: number; late_fee_value?: number }; [key: string]: unknown }) => {
      const structure = fee.fee_structure;
      let lateFee = 0;

      try {
        if (structure?.late_fee_type && fee.due_date) {
          const dueDate = new Date(fee.due_date);
          const graceDays = Number(structure.grace_period_days || 0);
          const effectiveDue = new Date(dueDate);
          effectiveDue.setDate(effectiveDue.getDate() + graceDays);

          if (!isNaN(effectiveDue.getTime()) && now > effectiveDue) {
            const daysLate = Math.floor((now.getTime() - effectiveDue.getTime()) / (1000 * 60 * 60 * 24));
            const value = Number(structure.late_fee_value || 0);

            if (structure.late_fee_type === 'flat') {
              lateFee = value;
            } else if (structure.late_fee_type === 'per_day') {
              lateFee = value * daysLate;
            } else if (structure.late_fee_type === 'percentage') {
              lateFee = (Number(fee.base_amount || 0) * value / 100) * daysLate;
            }
          }
        }
      } catch {
        // ignore late fee calculation errors
      }

      const balanceDue = Number(fee.base_amount || 0) + Number(fee.adjustment_amount || 0) - Number(fee.paid_amount || 0);
      const totalDue = balanceDue + Math.max(0, lateFee);

      return {
        ...fee,
        late_fee: Math.max(0, lateFee),
        balance_due: balanceDue,
        total_due: totalDue,
      };
    });

    return NextResponse.json({ data: feesWithComputed }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/student/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

