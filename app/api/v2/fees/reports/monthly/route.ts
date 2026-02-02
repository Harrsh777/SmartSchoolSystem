import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Get student fees with their payment information grouped by month
    const { data: studentFees, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        id,
        due_month,
        base_amount,
        paid_amount,
        balance_due,
        status,
        student:students!inner(school_code)
      `)
      .eq('student.school_code', schoolCode);

    if (feesError) {
      console.error('Error fetching student fees:', feesError);
      return NextResponse.json({ error: feesError.message }, { status: 500 });
    }

    // Group by month
    const monthlyMap = new Map<string, {
      month: string;
      year: number;
      collected: number;
      pending: number;
      students_paid: number;
      students_pending: number;
    }>();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    (studentFees || []).forEach((fee) => {
      if (!fee.due_month) return;
      
      const dueDate = new Date(fee.due_month);
      const month = monthNames[dueDate.getMonth()];
      const year = dueDate.getFullYear();
      const key = `${month}-${year}`;

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month,
          year,
          collected: 0,
          pending: 0,
          students_paid: 0,
          students_pending: 0,
        });
      }

      const data = monthlyMap.get(key)!;
      data.collected += fee.paid_amount || 0;
      data.pending += fee.balance_due || 0;

      if (fee.status === 'paid') {
        data.students_paid += 1;
      } else {
        data.students_pending += 1;
      }
    });

    // Convert to array and sort by date (most recent first)
    const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => {
      const dateA = new Date(`${a.month} 1, ${a.year}`);
      const dateB = new Date(`${b.month} 1, ${b.year}`);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ data: monthlyData });
  } catch (error) {
    console.error('Error in monthly report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
