import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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
    let feesQuery = supabase
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

    // Filter by academic year if provided (based on due_month)
    if (academicYear) {
      const [startYear, endYear] = academicYear.split('-');
      const startDate = `${startYear}-04-01`; // April 1st
      const endDate = `${endYear}-03-31`; // March 31st
      feesQuery = feesQuery.gte('due_month', startDate).lte('due_month', endDate);
    }

    const { data: studentFees, error: feesError } = await feesQuery;

    if (feesError) {
      console.error('Error fetching student fees:', feesError);
      return NextResponse.json(
        { error: 'Failed to fetch student fees', details: feesError.message },
        { status: 500 }
      );
    }

    // Calculate late fee and process fees
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueAmount = 0;

    const processedFees = ((studentFees || []) as Record<string, unknown>[]).map((fee: Record<string, unknown>) => {
      const baseAmount = Number(fee.base_amount || 0);
      const paidAmount = Number(fee.paid_amount || 0);
      const adjustmentAmount = Number(fee.adjustment_amount || 0);
      
      // Calculate late fee
      let lateFee = 0;
      const structure = fee.fee_structure as Record<string, unknown> | null | undefined;
      if (structure && structure.late_fee_type) {
        const dueDateStr = String(fee.due_date || '');
        const dueDate = new Date(dueDateStr);
        dueDate.setHours(0, 0, 0, 0);
        const gracePeriod = Number(structure.grace_period_days || 0);
        const effectiveDueDate = new Date(dueDate);
        effectiveDueDate.setDate(effectiveDueDate.getDate() + gracePeriod);

        if (today > effectiveDueDate) {
          const daysLate = Math.floor((today.getTime() - effectiveDueDate.getTime()) / (1000 * 60 * 60 * 24));
          const lateFeeType = String(structure.late_fee_type || '');
          const lateFeeValue = Number(structure.late_fee_value || 0);

          if (lateFeeType === 'flat') {
            lateFee = lateFeeValue;
          } else if (lateFeeType === 'per_day') {
            lateFee = lateFeeValue * daysLate;
          } else if (lateFeeType === 'percentage') {
            lateFee = (baseAmount * lateFeeValue / 100) * daysLate;
          }
        }
      }

      const totalDueAmount = baseAmount + adjustmentAmount + lateFee;
      const balanceDue = totalDueAmount - paidAmount;
      const dueDateStr = String(fee.due_date || '');
      const isOverdue = balanceDue > 0 && today > new Date(dueDateStr);
      const daysOverdue = isOverdue 
        ? Math.floor((today.getTime() - new Date(dueDateStr).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      totalDue += totalDueAmount;
      totalPaid += paidAmount;
      totalPending += balanceDue;
      if (isOverdue) {
        overdueAmount += balanceDue;
      }

      return {
        id: fee.id,
        due_month: fee.due_month,
        due_date: fee.due_date,
        base_amount: baseAmount,
        paid_amount: paidAmount,
        adjustment_amount: adjustmentAmount,
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
