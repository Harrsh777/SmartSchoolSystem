import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';
import { academicYearMatchesStructure } from '@/lib/fees/fee-structure-class-match';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase().trim();

    // Fetch student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, class, section')
      .eq('id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch student fees with fee structure details
    const feesQuery = supabase
      .from('student_fees')
      .select(`
        *,
        fee_structure:fee_structure_id (
          id,
          name,
          class_name,
          section,
          academic_year,
          late_fee_type,
          late_fee_value,
          grace_period_days
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .order('due_month', { ascending: true });

    const { data: studentFeesRaw, error: feesError } = await feesQuery;

    if (feesError) {
      console.error('Error fetching student fees:', feesError);
      return NextResponse.json(
        { error: 'Failed to fetch student fees', details: feesError.message },
        { status: 500 }
      );
    }

    // Filter by academic year via shared matcher used in other fee flows.
    const studentFeesFiltered = (studentFeesRaw || []).filter((fee: any) =>
      academicYearMatchesStructure(
        String(fee?.fee_structure?.academic_year ?? ''),
        academicYear
      )
    );

    const studentCtx = {
      id: String(student.id),
      class: String(student.class ?? ''),
      section: student.section != null ? String(student.section) : null,
    };
    const enrichedFees = await enrichStudentFeesWithAdjustments(
      supabase,
      normalizedSchoolCode,
      studentCtx,
      studentFeesFiltered as never
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueAmount = 0;

    const processedFees = (enrichedFees as Record<string, unknown>[]).map((fee: Record<string, unknown>) => {
      const baseAmount = Number(fee.base_amount || 0);
      const paidAmount = Number(fee.paid_amount || 0);
      const adjustmentAmount = Number(fee.adjustment_amount || 0);
      const lateFee = Number(fee.late_fee || 0);
      const totalDueAmount = Number(fee.final_amount || baseAmount) + lateFee;
      const balanceDue = Number(fee.total_due || 0);
      const dueDateStr = String(fee.due_date || '');
      const isOverdue = balanceDue > 0.01 && today > new Date(dueDateStr);
      const daysOverdue = isOverdue
        ? Math.floor((today.getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const structure = fee.fee_structure as Record<string, unknown> | null | undefined;

      totalDue += totalDueAmount;
      totalPaid += paidAmount;
      totalPending += balanceDue;
      if (isOverdue) overdueAmount += balanceDue;

      return {
        id: fee.id,
        due_month: fee.due_month,
        due_date: fee.due_date,
        base_amount: baseAmount,
        paid_amount: paidAmount,
        adjustment_amount: adjustmentAmount,
        line_adjustments_sum: Number(fee.line_adjustments_sum || 0),
        late_fee: lateFee,
        total_due: totalDueAmount,
        balance_due: balanceDue,
        status: fee.status,
        days_overdue: daysOverdue,
        is_overdue: isOverdue,
        fee_structure: {
          id: structure?.id as string | number | undefined,
          name: (structure?.name as string | undefined) || 'Unknown',
          class_name: structure?.class_name as string | undefined,
          section: structure?.section as string | undefined,
        },
      };
    });

    // Fetch payment history with allocations
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        receipt:receipts (
          id,
          receipt_no,
          issued_at
        ),
        allocations:payment_allocations (
          *,
          student_fee:student_fee_id (
            id,
            due_month,
            due_date,
            fee_structure:fee_structure_id (name)
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .eq('is_reversed', false)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Format payment history
    const paymentHistory = ((payments || []) as Record<string, unknown>[]).map((payment: Record<string, unknown>) => {
      const paymentId = String(payment.id || '');
      const receipt = payment.receipt as Record<string, unknown> | null | undefined;
      const receiptNo = receipt?.receipt_no as string | undefined;
      
      return {
        id: payment.id,
        receipt_no: receiptNo || `REC-${paymentId.slice(0, 8)}`,
        payment_date: payment.payment_date,
        amount: Number(payment.amount || 0),
        payment_mode: payment.payment_mode || 'cash',
        reference_no: payment.reference_no,
        remarks: payment.remarks,
        allocations: ((payment.allocations as Record<string, unknown>[]) || []).map((alloc: Record<string, unknown>) => {
          const studentFee = alloc.student_fee as Record<string, unknown> | null | undefined;
          const feeStructure = studentFee?.fee_structure as Record<string, unknown> | null | undefined;
          const feeName = feeStructure?.name as string | undefined;
          
          return {
            student_fee_id: alloc.student_fee_id,
            allocated_amount: Number(alloc.allocated_amount || 0),
            fee_name: feeName || 'Unknown',
            due_month: studentFee?.due_month,
            due_date: studentFee?.due_date,
          };
        }),
      };
    });

    return NextResponse.json({
      data: {
        student: {
          id: student.id,
          student_name: student.student_name,
          admission_no: student.admission_no,
          class: student.class,
          section: student.section,
        },
        summary: {
          total_due: totalDue,
          total_paid: totalPaid,
          total_pending: totalPending,
          overdue_amount: overdueAmount,
        },
        fees: processedFees,
        payment_history: paymentHistory,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student fee statement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
