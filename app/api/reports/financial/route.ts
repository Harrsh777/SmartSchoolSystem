import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Fetch payments from new system first, fallback to old fees table
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        student:students!payments_student_id_fkey(
          student_name,
          admission_no,
          class,
          section
        ),
        collected_by_staff:staff!payments_collected_by_fkey(
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('is_reversed', false)
      .order('payment_date', { ascending: false });

    // Also fetch from old fees table as fallback
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select(`
        *,
        student:students!fees_student_id_fkey(
          student_name,
          admission_no,
          class,
          section
        ),
        accountant:staff!fees_collected_by_fkey(
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .order('payment_date', { ascending: false });

    if (paymentsError && feesError) {
      return NextResponse.json(
        { error: 'Failed to fetch financial data', details: paymentsError.message || feesError.message },
        { status: 500 }
      );
    }

    // Use payments if available, otherwise use fees
    const hasPayments = payments && payments.length > 0;
    const hasFees = fees && fees.length > 0;

    if (!hasPayments && !hasFees) {
      return new NextResponse('No financial data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="financial_report_${schoolCode}.csv"`,
        },
      });
    }

    // Create CSV with relevant columns
    const csvHeader = [
      'Receipt Number',
      'Payment Date',
      'Student Name',
      'Admission Number',
      'Class',
      'Section',
      'Amount',
      'Payment Mode',
      'Collected By',
      'Accountant ID',
      'Remarks',
      'Created At',
    ].join(',') + '\n';

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    let csvRows = '';

    if (hasPayments) {
      // Process payments (new system)
      csvRows = payments.map((payment: {
        receipt_number?: string;
        payment_date?: string;
        amount?: number;
        payment_mode?: string;
        remarks?: string;
        created_at?: string;
        student?: { student_name?: string; admission_no?: string; class?: string; section?: string };
        collected_by_staff?: { full_name?: string; staff_id?: string };
        [key: string]: unknown;
      }) => {
        const student = payment.student as { student_name?: string; admission_no?: string; class?: string; section?: string } | undefined;
        const staff = payment.collected_by_staff as { full_name?: string; staff_id?: string } | undefined;
        
        return [
          payment.receipt_number || '',
          payment.payment_date || '',
          student?.student_name || '',
          student?.admission_no || '',
          student?.class || '',
          student?.section || '',
          payment.amount || 0,
          payment.payment_mode || '',
          staff?.full_name || '',
          staff?.staff_id || '',
          payment.remarks || '',
          payment.created_at || '',
        ].map(escapeCsvValue).join(',');
      }).join('\n');
    } else if (hasFees) {
      // Process fees (old system)
      csvRows = fees.map((fee: {
        receipt_no?: string;
        payment_date?: string;
        amount?: number;
        transport_fee?: number;
        total_amount?: number;
        payment_mode?: string;
        remarks?: string;
        created_at?: string;
        collected_by_name?: string;
        student?: { student_name?: string; admission_no?: string; class?: string; section?: string };
        accountant?: { full_name?: string; staff_id?: string };
        [key: string]: unknown;
      }) => {
        const student = fee.student as { student_name?: string; admission_no?: string; class?: string; section?: string } | undefined;
        const accountant = fee.accountant as { full_name?: string; staff_id?: string } | undefined;
        
        return [
          fee.receipt_no || '',
          fee.payment_date || '',
          student?.student_name || '',
          student?.admission_no || '',
          student?.class || '',
          student?.section || '',
          fee.total_amount || fee.amount || 0,
          fee.payment_mode || '',
          accountant?.full_name || fee.collected_by_name || '',
          accountant?.staff_id || '',
          fee.remarks || '',
          fee.created_at || '',
        ].map(escapeCsvValue).join(',');
      }).join('\n');
    }

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="financial_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

