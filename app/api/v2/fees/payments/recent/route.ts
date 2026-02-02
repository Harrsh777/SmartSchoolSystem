import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextResponse, NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Get recent payments with student information
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_mode,
        payment_date,
        receipt_no,
        student:students!inner(
          id,
          student_name,
          admission_no,
          school_code
        )
      `)
      .eq('student.school_code', schoolCode)
      .order('payment_date', { ascending: false })
      .limit(limit);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Format the response
    const recentPayments = (payments || []).map((payment) => ({
      id: payment.id,
      student_name: (payment.student as { student_name?: string })?.student_name || 'Unknown',
      admission_no: (payment.student as { admission_no?: string })?.admission_no || '',
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_mode: payment.payment_mode,
      receipt_no: payment.receipt_no || '',
    }));

    return NextResponse.json({ data: recentPayments });
  } catch (error) {
    console.error('Error in recent payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
