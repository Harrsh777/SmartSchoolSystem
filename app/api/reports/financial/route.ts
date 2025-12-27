import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch all fees with student and accountant information
    const { data: fees, error } = await supabase
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

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch financial data', details: error.message },
        { status: 500 }
      );
    }

    // Convert to CSV
    if (!fees || fees.length === 0) {
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
      'Fee Amount',
      'Transport Fee',
      'Total Amount',
      'Payment Mode',
      'Collected By',
      'Accountant ID',
      'Remarks',
      'Created At',
    ].join(',') + '\n';

    interface FeeWithRelations {
      student?: { admission_no?: string; student_name?: string; [key: string]: unknown };
      accountant?: { name?: string; [key: string]: unknown };
      amount?: number;
      payment_date?: string;
      [key: string]: unknown;
    }
    const csvRows = fees.map((fee: FeeWithRelations) => {
      const student = fee.student as { admission_no?: string; student_name?: string; [key: string]: unknown };
      const accountant = fee.accountant as { name?: string; [key: string]: unknown };
      
      return [
        fee.receipt_no || '',
        fee.payment_date || '',
        student?.student_name || '',
        student?.admission_no || '',
        student?.class || '',
        student?.section || '',
        fee.amount || 0,
        fee.transport_fee || 0,
        fee.total_amount || fee.amount || 0,
        fee.payment_mode || '',
        accountant?.full_name || fee.collected_by_name || '',
        accountant?.staff_id || '',
        fee.remarks || '',
        fee.created_at || '',
      ].map(val => {
        const stringVal = String(val);
        if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
          return `"${stringVal.replace(/"/g, '""')}"`;
        }
        return stringVal;
      }).join(',');
    }).join('\n');

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

