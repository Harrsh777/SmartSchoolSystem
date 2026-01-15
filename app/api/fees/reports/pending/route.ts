import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

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
              total_pending: 0,
              total_count: 0,
              students_count: 0,
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
          section
        ),
        fee_component:fee_component_id (
          id,
          component_name
        )
      `)
      .eq('school_code', schoolCode)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true });

    if (studentIds && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    }

    if (startDate) {
      query = query.gte('due_date', startDate);
    }

    if (endDate) {
      query = query.lte('due_date', endDate);
    }

    const { data: installments, error } = await query;

    if (error) {
      console.error('Error fetching pending fees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending fees', details: error.message },
        { status: 500 }
      );
    }

    // Calculate totals
    const summary = {
      total_pending: installments?.reduce((sum, inst) => {
        const amount = parseFloat(inst.amount?.toString() || '0');
        const discount = parseFloat(inst.discount_amount?.toString() || '0');
        const fine = parseFloat(inst.fine_amount?.toString() || '0');
        const paid = parseFloat(inst.paid_amount?.toString() || '0');
        return sum + (amount - discount + fine - paid);
      }, 0) || 0,
      total_count: installments?.length || 0,
      students_count: new Set(installments?.map(inst => inst.student_id)).size || 0,
    };

    // Process installments to add calculated fields
    const processedInstallments = (installments || []).map(inst => {
      const amount = parseFloat(inst.amount?.toString() || '0');
      const discount = parseFloat(inst.discount_amount?.toString() || '0');
      const fine = parseFloat(inst.fine_amount?.toString() || '0');
      const paid = parseFloat(inst.paid_amount?.toString() || '0');
      const pending = amount - discount + fine - paid;
      const dueDate = new Date(inst.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = today > dueDate ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...inst,
        pending_amount: pending,
        days_overdue: daysOverdue,
        is_overdue: daysOverdue > 0,
      };
    });

    return NextResponse.json({
      data: {
        installments: processedInstallments,
        summary,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating pending fees report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
