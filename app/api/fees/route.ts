import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

// Helper function to fetch fee with related data
async function fetchFeeWithRelations(feeId: string, schoolCode: string) {
  try {
    // Fetch the fee
    const { data: fee, error: feeError } = await supabase
      .from('fees')
      .select('*')
      .eq('id', feeId)
      .eq('school_code', schoolCode)
      .single();

    if (feeError || !fee) {
      return null;
    }

    // Fetch student data separately
    const { data: student } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section')
      .eq('id', fee.student_id)
      .eq('school_code', schoolCode)
      .single();

    // Fetch accountant data separately
    const { data: accountant } = await supabase
      .from('staff')
      .select('id, full_name, staff_id')
      .eq('id', fee.collected_by)
      .eq('school_code', schoolCode)
      .single();

    return {
      ...fee,
      student: student || null,
      accountant: accountant || null,
    };
  } catch (error) {
    console.error('Error fetching fee relations:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const admissionNo = searchParams.get('admission_no');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const classFilter = searchParams.get('class');
    const collectedBy = searchParams.get('collected_by');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Build query (fetch fees first, then enrich with related data)
    let query = supabase
      .from('fees')
      .select('*')
      .eq('school_code', schoolCode)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    // Apply filters
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (admissionNo) {
      query = query.eq('admission_no', admissionNo);
    }
    if (startDate) {
      query = query.gte('payment_date', startDate);
    }
    if (endDate) {
      query = query.lte('payment_date', endDate);
    }
    if (collectedBy) {
      query = query.eq('collected_by', collectedBy);
    }

    const { data: fees, error: feesError } = await query;

    if (feesError) {
      return NextResponse.json(
        { error: 'Failed to fetch fees', details: feesError.message },
        { status: 500 }
      );
    }

    // Fetch related data for all fees
    interface FeeData {
      student_id?: string;
      amount?: string | number;
      payment_date?: string;
      student?: { class?: string; [key: string]: unknown };
      [key: string]: unknown;
    }
    const feesWithRelations = await Promise.all(
      (fees || []).map(async (fee: FeeData) => {
        // Fetch student data
        const { data: student } = await supabase
          .from('students')
          .select('id, admission_no, student_name, class, section')
          .eq('id', fee.student_id)
          .eq('school_code', schoolCode)
          .single();

        // Fetch accountant data
        const { data: accountant } = await supabase
          .from('staff')
          .select('id, full_name, staff_id')
          .eq('id', fee.collected_by)
          .eq('school_code', schoolCode)
          .single();

        return {
          ...fee,
          student: student || null,
          accountant: accountant || null,
        };
      })
    );

    // If class filter is provided, filter by student class
    let filteredFees = feesWithRelations;
    if (classFilter && feesWithRelations) {
      filteredFees = feesWithRelations.filter((fee) => {
        const student = fee.student as { class?: string } | null | undefined;
        return student?.class === classFilter;
      });
    }

    // Calculate statistics
    const totalAmount = filteredFees.reduce((sum: number, fee) => sum + Number((fee as { amount?: string | number }).amount || 0), 0);
    const totalTransactions = filteredFees.length;
    const today = new Date().toISOString().split('T')[0];
    const todayCollection = filteredFees
      .filter((fee) => (fee as { payment_date?: string }).payment_date === today)
      .reduce((sum: number, fee) => sum + Number((fee as { amount?: string | number }).amount || 0), 0);
    
    // Calculate monthly collection (this month)
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthlyCollection = filteredFees
      .filter((fee) => {
        const paymentDate = (fee as { payment_date?: string }).payment_date;
        return paymentDate && paymentDate >= firstDayOfMonth && paymentDate <= lastDayOfMonth;
      })
      .reduce((sum: number, fee) => sum + Number((fee as { amount?: string | number }).amount || 0), 0);

    return NextResponse.json({
      data: filteredFees,
      statistics: {
        totalAmount,
        totalTransactions,
        todayCollection,
        monthlyCollection,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Check permission for managing fees
  const permissionCheck = await requirePermission(request, 'manage_fees');
  if (permissionCheck) {
    return permissionCheck; // Returns 403 if unauthorized
  }

  try {
    const body = await request.json();
    const {
      school_code,
      student_id,
      admission_no,
      amount,
      transport_fee,
      total_amount,
      payment_mode,
      receipt_no,
      payment_date,
      collected_by,
      remarks,
    } = body;

    // Validation
    if (!school_code || !student_id || !admission_no || !amount || !payment_mode || !receipt_no || !collected_by) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify student exists
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, admission_no, school_code')
      .eq('id', student_id)
      .eq('school_code', school_code)
      .single();

    if (studentError || !studentData) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Verify accountant exists and has correct role
    const { data: accountantData, error: accountantError } = await supabase
      .from('staff')
      .select('id, full_name, role, school_code')
      .eq('id', collected_by)
      .eq('school_code', school_code)
      .single();

    if (accountantError || !accountantData) {
      return NextResponse.json(
        { error: 'Accountant not found' },
        { status: 404 }
      );
    }

    if (!accountantData.role.toLowerCase().includes('accountant')) {
      return NextResponse.json(
        { error: 'Only accountants can collect fees' },
        { status: 403 }
      );
    }

    // Check for duplicate receipt number
    const { data: existingReceipt } = await supabase
      .from('fees')
      .select('id')
      .eq('school_code', school_code)
      .eq('receipt_no', receipt_no)
      .single();

    if (existingReceipt) {
      return NextResponse.json(
        { error: 'Receipt number already exists' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const finalAmount = total_amount || (Number(amount) + (transport_fee ? Number(transport_fee) : 0));

    // Prepare insert data
    interface FeeInsertData {
      school_id: string;
      school_code: string;
      student_id: string;
      amount: number;
      payment_date: string;
      collected_by?: string;
      [key: string]: unknown;
    }
    const insertData: FeeInsertData = {
      school_id: schoolData.id,
      school_code: school_code,
      student_id: student_id,
      admission_no: admission_no,
      amount: Number(amount),
      payment_mode: payment_mode,
      receipt_no: receipt_no,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      collected_by: collected_by,
      collected_by_name: accountantData.full_name,
      remarks: remarks || null,
    };

    // Add transport_fee and total_amount if they exist (columns may not exist in older schemas)
    // Try to include them, but if the insert fails, we'll try without them
    if (transport_fee !== null && transport_fee !== undefined) {
      insertData.transport_fee = Number(transport_fee);
    }
    if (finalAmount !== null && finalAmount !== undefined) {
      insertData.total_amount = Number(finalAmount);
    }

    // Insert fee record (without relationship query to avoid schema cache issues)
    const { data: newFee, error: insertError } = await supabase
      .from('fees')
      .insert([insertData])
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting fee:', insertError);
      console.error('Insert data:', JSON.stringify(insertData, null, 2));
      
      // If error is about missing columns, try without transport_fee and total_amount
      if (insertError.message.includes('transport_fee') || insertError.message.includes('total_amount') || insertError.code === '42703') {
        // Remove the new columns and try again
        delete insertData.transport_fee;
        delete insertData.total_amount;
        
        const { data: retryFee, error: retryError } = await supabase
          .from('fees')
          .insert([insertData])
          .select('*')
          .single();

        if (retryError) {
          console.error('Error on retry:', retryError);
          return NextResponse.json(
            { 
              error: 'Failed to record fee payment', 
              details: retryError.message,
              hint: 'Please run the migration: supabase-fees-transport-fee-migration.sql'
            },
            { status: 500 }
          );
        }

        // Fetch related data separately
        const feeWithRelations = await fetchFeeWithRelations(retryFee.id, school_code);
        return NextResponse.json({
          message: 'Fee payment recorded successfully (without transport fee columns)',
          data: feeWithRelations || retryFee,
        }, { status: 201 });
      }

      return NextResponse.json(
        { 
          error: 'Failed to record fee payment', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        },
        { status: 500 }
      );
    }

    // Fetch related data separately to avoid relationship issues
    const feeWithRelations = await fetchFeeWithRelations(newFee.id, school_code);

    return NextResponse.json({
      message: 'Fee payment recorded successfully',
      data: feeWithRelations || newFee,
    }, { status: 201 });
  } catch (error) {
    console.error('Error recording fee:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

