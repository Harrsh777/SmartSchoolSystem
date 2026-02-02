import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Get students with pending fees
    const { data: pendingFees, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        status,
        student:students!inner(
          id,
          student_name,
          admission_no,
          class,
          section,
          school_code
        )
      `)
      .eq('student.school_code', schoolCode)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('due_date', { ascending: true })
      .limit(limit);

    if (feesError) {
      console.error('Error fetching pending fees:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    // Format the response - aggregate by student
    const studentMap = new Map<string, {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      pending_amount: number;
      due_date: string;
    }>();

    (pendingFees || []).forEach((fee) => {
      const student = fee.student as unknown as {
        id: string;
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      
      if (!student?.id) return;

      const baseAmount = Number(fee.base_amount || 0);
      const paidAmount = Number(fee.paid_amount || 0);
      const adjustmentAmount = Number(fee.adjustment_amount || 0);
      const balanceDue = baseAmount + adjustmentAmount - paidAmount;
      if (balanceDue <= 0) return;

      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          student_name: student.student_name || 'Unknown',
          admission_no: student.admission_no || '',
          class: student.class || '',
          section: student.section || '',
          pending_amount: 0,
          due_date: fee.due_date,
        });
      }

      const data = studentMap.get(student.id)!;
      data.pending_amount += balanceDue;
      
      // Keep the earliest due date
      if (fee.due_date && new Date(fee.due_date) < new Date(data.due_date)) {
        data.due_date = fee.due_date;
      }
    });

    // Convert to array and sort by pending amount (highest first)
    const pendingStudents = Array.from(studentMap.values())
      .sort((a, b) => b.pending_amount - a.pending_amount)
      .slice(0, limit);

    return NextResponse.json({ data: pendingStudents });
  } catch (error) {
    console.error('Error in pending students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
