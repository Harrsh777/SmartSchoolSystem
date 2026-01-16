import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch student details
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, class, section, class_id')
      .eq('id', studentId)
      .eq('school_code', schoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Build query for installments
    // First, get fee_assignment_ids for the academic year if provided
    let assignmentIds: string[] | null = null;
    if (academicYear) {
      const { data: assignments } = await supabase
        .from('fee_assignments')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('academic_year', academicYear);
      
      if (assignments && assignments.length > 0) {
        assignmentIds = assignments.map(a => a.id);
      } else {
        // No assignments for this academic year, return empty
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
              total_due: 0,
              total_paid: 0,
              total_pending: 0,
              overdue_amount: 0,
            },
            installments: [],
            payment_history: [],
          },
        }, { status: 200 });
      }
    }

    let installmentsQuery = supabase
      .from('fee_installments')
      .select(`
        *,
        fee_component:fee_component_id (
          id,
          component_name,
          fee_type
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', schoolCode);

    // Filter by assignment IDs if academic year is provided
    if (assignmentIds && assignmentIds.length > 0) {
      installmentsQuery = installmentsQuery.in('fee_assignment_id', assignmentIds);
    }

    const { data: installments, error: installmentsError } = await installmentsQuery.order('due_date', { ascending: true });

    if (installmentsError) {
      console.error('Error fetching installments:', installmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch fee installments', details: installmentsError.message },
        { status: 500 }
      );
    }

    // Calculate summary
    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueAmount = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Note: Fine calculation for overdue installments is handled by the database function
    // Fines can be calculated on-demand when viewing statements or during collection
    // For performance, we'll use the fine_amount already stored in installments

    interface Installment {
      amount?: string | number;
      discount_amount?: string | number;
      fine_amount?: string | number;
      paid_amount?: string | number;
      due_date: string;
      [key: string]: unknown;
    }

    const processedInstallments = (installments || []).map((inst: Installment) => {
      const amount = parseFloat(inst.amount?.toString() || '0');
      const discount = parseFloat(inst.discount_amount?.toString() || '0');
      const fine = parseFloat(inst.fine_amount?.toString() || '0');
      const paid = parseFloat(inst.paid_amount?.toString() || '0');
      
      const installmentDue = amount - discount + fine;
      const pending = installmentDue - paid;
      const dueDate = new Date(inst.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const daysOverdue = todayDate > dueDate ? Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const isOverdue = daysOverdue > 0 && pending > 0;

      totalDue += installmentDue;
      totalPaid += paid;
      totalPending += pending;
      if (isOverdue) {
        overdueAmount += pending;
      }

      return {
        ...inst,
        total_due: installmentDue,
        pending_amount: pending,
        days_overdue: daysOverdue,
        is_overdue: isOverdue,
      };
    });

    // Fetch payment history
    const { data: collections, error: collectionsError } = await supabase
      .from('fee_collections')
      .select('id, receipt_no, payment_date, total_amount, payment_mode, cancelled')
      .eq('student_id', studentId)
      .eq('school_code', schoolCode)
      .eq('cancelled', false)
      .order('payment_date', { ascending: false })
      .limit(10);

    if (collectionsError) {
      console.error('Error fetching payment history:', collectionsError);
    }

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
        installments: processedInstallments,
        payment_history: collections || [],
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
