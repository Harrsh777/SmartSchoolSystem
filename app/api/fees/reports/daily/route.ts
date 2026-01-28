import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const date = searchParams.get('date');

    if (!schoolCode || !date) {
      return NextResponse.json(
        { error: 'School code and date are required' },
        { status: 400 }
      );
    }

    // Fetch collections for the date from payments table (new system)
    // Try payments table first, fallback to fees table if needed
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        student:students (
          id,
          student_name,
          admission_no,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_reversed', false)
      .gte('payment_date', `${date}T00:00:00`)
      .lte('payment_date', `${date}T23:59:59`)
      .order('payment_date', { ascending: false });

    let feesWithStudents: Record<string, unknown>[] = [];

    if (paymentsError) {
      console.error('Error fetching daily collections from payments:', paymentsError);
      
      // Fallback to fees table (old system)
      const { data: fees, error: feesError } = await supabase
        .from('fees')
        .select('*')
        .eq('school_code', schoolCode)
        .eq('payment_date', date)
        .order('created_at', { ascending: false });

      if (feesError) {
        console.error('Error fetching daily collections from fees:', feesError);
        return NextResponse.json(
          { error: 'Failed to fetch daily collections', details: feesError.message },
          { status: 500 }
        );
      }

      // Fetch student data for all fees
      feesWithStudents = await Promise.all(
        ((fees || []) as Record<string, unknown>[]).map(async (fee: Record<string, unknown>) => {
          const { data: student } = await supabase
            .from('students')
            .select('id, student_name, admission_no, class, section')
            .eq('id', fee.student_id)
            .eq('school_code', schoolCode)
            .single();

          return {
            ...fee,
            student: student || null,
          };
        })
      );
    } else {
      // Transform payments data to match expected structure
      feesWithStudents = ((payments || []) as Record<string, unknown>[]).map((payment: Record<string, unknown>) => {
        const paymentId = String(payment.id || '');
        return {
          id: payment.id,
          receipt_no: payment.receipt_no || `REC-${paymentId.slice(0, 8)}`,
          total_amount: payment.amount || 0,
          amount: payment.amount || 0,
          payment_mode: payment.payment_mode || 'cash',
          payment_date: payment.payment_date,
          student_id: payment.student_id,
          student: payment.student || null,
          created_at: payment.created_at || payment.payment_date,
        };
      });
    }

    // Calculate summary
    const summary = {
      total_collected: feesWithStudents?.reduce((sum, c) => {
        const amount = c.total_amount || c.amount || 0;
        return sum + parseFloat(amount.toString());
      }, 0) || 0,
      transaction_count: feesWithStudents?.length || 0,
      by_payment_mode: {} as Record<string, number>,
      by_class: {} as Record<string, number>,
      students_count: new Set(feesWithStudents?.map(c => c.student_id)).size || 0,
    };

    feesWithStudents?.forEach((collection: Record<string, unknown>) => {
      const mode = String(collection.payment_mode || 'unknown');
      const amount = collection.total_amount || collection.amount || 0;
      summary.by_payment_mode[mode] = (summary.by_payment_mode[mode] || 0) + parseFloat(amount.toString());
      
      const student = collection.student as Record<string, unknown> | null | undefined;
      const studentClass = student?.class as string | undefined;
      const studentSection = student?.section as string | undefined;
      const className = studentClass 
        ? `${studentClass}-${studentSection || ''}` 
        : 'Unknown';
      summary.by_class[className] = (summary.by_class[className] || 0) + parseFloat(amount.toString());
    });

    // Format collections to match expected structure
    const collections = feesWithStudents?.map((fee: Record<string, unknown>) => {
      const feeId = String(fee.id || '');
      return {
        id: fee.id as string | number,
        receipt_no: fee.receipt_no || fee.receipt_number || `REC-${feeId.slice(0, 8)}`,
        total_amount: fee.total_amount || fee.amount || 0,
        payment_mode: fee.payment_mode || 'cash',
        payment_date: fee.payment_date,
        student: fee.student,
        student_id: fee.student_id,
        created_at: fee.created_at,
      };
    }) || [];

    return NextResponse.json({
      data: {
        date,
        collections: collections || [],
        summary,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error generating daily report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
