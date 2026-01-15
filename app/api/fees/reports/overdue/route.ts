import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // First, get student IDs if filtering by class
    let studentIds: string[] | null = null;
    if (classId) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('class_id', classId);
      
      if (students && students.length > 0) {
        studentIds = students.map(s => s.id);
      } else {
        // No students in this class
        return NextResponse.json({
          data: {
            installments: [],
            summary: {
              total_overdue: 0,
              total_count: 0,
              students_count: 0,
              average_days_overdue: 0,
            },
          },
        }, { status: 200 });
      }
    }

    let query = supabase
      .from('fee_installments')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section,
          parent_contact,
          parent_email
        ),
        fee_component:fee_component_id (
          id,
          component_name
        )
      `)
      .eq('school_code', schoolCode)
      .lt('due_date', todayStr)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true });

    if (studentIds && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    }

    const { data: installments, error } = await query;

    if (error) {
      console.error('Error fetching overdue fees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch overdue fees', details: error.message },
        { status: 500 }
      );
    }

    // Calculate totals and process installments
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const processedInstallments = (installments || []).map(inst => {
      const amount = parseFloat(inst.amount?.toString() || '0');
      const discount = parseFloat(inst.discount_amount?.toString() || '0');
      const fine = parseFloat(inst.fine_amount?.toString() || '0');
      const paid = parseFloat(inst.paid_amount?.toString() || '0');
      const pending = amount - discount + fine - paid;
      
      const dueDate = new Date(inst.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...inst,
        pending_amount: pending,
        days_overdue: daysOverdue,
        is_overdue: true,
      };
    }).filter(inst => inst.pending_amount > 0); // Only include those with pending amount

    const summary = {
      total_overdue: processedInstallments.reduce((sum, inst) => sum + inst.pending_amount, 0),
      total_count: processedInstallments.length,
      students_count: new Set(processedInstallments.map(inst => inst.student_id)).size,
      average_days_overdue: processedInstallments.length > 0 
        ? Math.round(processedInstallments.reduce((sum, inst) => sum + inst.days_overdue, 0) / processedInstallments.length)
        : 0,
    };

    return NextResponse.json({
      data: {
        installments: processedInstallments,
        summary,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating overdue fees report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
