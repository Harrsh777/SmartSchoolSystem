import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/payments
 * Get all payments for a school
 * Query params: school_code, student_id (optional), start_date, end_date
 */
export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('payments')
      .select(`
        *,
        student:student_id (id, admission_no, student_name, class, section),
        collector:collected_by (id, full_name, staff_id),
        allocations:payment_allocations (
          *,
          student_fee:student_fee_id (id, due_month, due_date, base_amount, status)
        ),
        receipt:receipts (id, receipt_no, issued_at)
      `)
      .eq('school_code', schoolCode.toUpperCase())
      .eq('is_reversed', false)
      .order('payment_date', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (startDate) {
      query = query.gte('payment_date', startDate);
    }

    if (endDate) {
      query = query.lte('payment_date', endDate);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch payments', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: payments || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/fees/payments
 * Collect payment (TRANSACTIONAL - CRITICAL)
 * Body: { school_code, student_id, amount, payment_mode, reference_no, allocations: [{ student_fee_id, allocated_amount }], remarks }
 */
export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const body = await request.json();
    const {
      school_code,
      student_id,
      amount,
      payment_mode,
      reference_no,
      allocations,
      remarks,
    } = body;

    // Validation
    if (!school_code || !student_id || !amount || !payment_mode) {
      return NextResponse.json(
        { error: 'School code, student ID, amount, and payment mode are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: 'At least one payment allocation is required' },
        { status: 400 }
      );
    }

    // Validate allocations sum equals payment amount
    const totalAllocated = allocations.reduce((sum: number, alloc: { allocated_amount: number }) => 
      sum + Number(alloc.allocated_amount || 0), 0
    );

    if (Math.abs(totalAllocated - amount) > 0.01) { // Allow small floating point differences
      return NextResponse.json(
        { error: `Total allocated amount (${totalAllocated}) must equal payment amount (${amount})` },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = school_code.toUpperCase();

    // Get school_id
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Verify student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, admission_no, student_name, school_code')
      .eq('id', student_id)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get collector info
    const staffId = request.headers.get('x-staff-id');
    let collectedBy: string | null = null;
    let collectedByStaffId: string | null = null;

    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, staff_id, full_name')
        .eq('school_code', normalizedSchoolCode)
        .eq('staff_id', staffId)
        .single();
      collectedBy = staff?.id || null;
      collectedByStaffId = staff?.staff_id || null;
    }

    if (!collectedBy) {
      return NextResponse.json(
        { error: 'Collector information is required' },
        { status: 400 }
      );
    }

    // Validate all student_fee_ids belong to the student and have sufficient balance
    const studentFeeIds = allocations.map((a: { student_fee_id: string }) => a.student_fee_id);
    const { data: studentFees, error: feesError } = await supabase
      .from('student_fees')
      .select('id, student_id, base_amount, paid_amount, adjustment_amount, due_date, status')
      .eq('student_id', student_id)
      .in('id', studentFeeIds);

    if (feesError || !studentFees || studentFees.length !== allocations.length) {
      return NextResponse.json(
        { error: 'Invalid student fee IDs or fees not found' },
        { status: 400 }
      );
    }

    // Validate allocations don't exceed balance due
    for (const allocation of allocations) {
      const fee = studentFees.find(f => f.id === allocation.student_fee_id);
      if (!fee) continue;

      const balanceDue = fee.base_amount + fee.adjustment_amount - fee.paid_amount;
      if (parseFloat(allocation.allocated_amount) > balanceDue + 0.01) { // Allow small floating point differences
        return NextResponse.json(
          { error: `Allocation amount exceeds balance due for fee ${fee.id}` },
          { status: 400 }
        );
      }
    }

    // BEGIN TRANSACTION (using Supabase RPC or multiple operations)
    // Note: Supabase doesn't support explicit transactions in the JS client,
    // so we'll use a database function or ensure atomicity through careful ordering

    // 1. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        student_id: student_id,
        amount: typeof amount === 'string' ? parseFloat(amount) : Number(amount),
        payment_mode: payment_mode,
        reference_no: reference_no?.trim() || null,
        payment_date: new Date().toISOString(),
        collected_by: collectedBy,
        collected_by_staff_id: collectedByStaffId,
        remarks: remarks?.trim() || null,
        is_reversed: false,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record', details: paymentError?.message },
        { status: 500 }
      );
    }

    // 2. Create payment allocations
    const allocationRecords = allocations.map((alloc: { student_fee_id: string; allocated_amount: number }) => ({
      payment_id: payment.id,
      student_fee_id: alloc.student_fee_id,
      allocated_amount: Number(alloc.allocated_amount),
    }));

    const { error: allocationsError } = await supabase
      .from('payment_allocations')
      .insert(allocationRecords);

    if (allocationsError) {
      // Rollback: delete payment
      await supabase.from('payments').delete().eq('id', payment.id);
      console.error('Error creating payment allocations:', allocationsError);
      return NextResponse.json(
        { error: 'Failed to create payment allocations', details: allocationsError.message },
        { status: 500 }
      );
    }

    // 3. Update student_fees paid_amount
    for (const allocation of allocations) {
      const fee = studentFees.find(f => f.id === allocation.student_fee_id);
      if (!fee) continue;

      const newPaidAmount = fee.paid_amount + parseFloat(allocation.allocated_amount);

      const { error: updateError } = await supabase
        .from('student_fees')
        .update({ paid_amount: newPaidAmount })
        .eq('id', allocation.student_fee_id);

      if (updateError) {
        // Rollback: delete payment and allocations
        await supabase.from('payment_allocations').delete().eq('payment_id', payment.id);
        await supabase.from('payments').delete().eq('id', payment.id);
        console.error('Error updating student fee:', updateError);
        return NextResponse.json(
          { error: 'Failed to update student fee', details: updateError.message },
          { status: 500 }
        );
      }
    }

    // 4. Generate receipt
    const currentYear = new Date().getFullYear();
    const { data: receiptNoData, error: receiptNoError } = await supabase
      .rpc('generate_receipt_number', {
        p_school_code: normalizedSchoolCode,
        p_year: currentYear,
      });

    if (receiptNoError) {
      console.error('Error generating receipt number:', receiptNoError);
      // Continue without receipt number for now, or use a fallback
    }

    const receiptNo = receiptNoData || `${normalizedSchoolCode}/REC/${currentYear}/${Date.now()}`;

    // Get receipt data snapshot
    const receiptData = {
      student: {
        id: student.id,
        admission_no: student.admission_no,
        name: student.student_name,
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        mode: payment.payment_mode,
        date: payment.payment_date,
      },
      allocations: allocations.map((alloc: { student_fee_id: string; allocated_amount: number }) => {
        const fee = studentFees.find(f => f.id === alloc.student_fee_id);
        return {
          student_fee_id: alloc.student_fee_id,
          allocated_amount: alloc.allocated_amount,
          due_month: fee?.due_date || null,
        };
      }),
      collector: {
        id: collectedBy,
        staff_id: collectedByStaffId,
      },
    };

    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .insert({
        school_id: school.id,
        school_code: normalizedSchoolCode,
        receipt_no: receiptNo,
        student_id: student_id,
        payment_id: payment.id,
        issued_by: collectedBy,
        issued_by_staff_id: collectedByStaffId,
        receipt_data: receiptData,
        is_cancelled: false,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error creating receipt:', receiptError);
      // Payment is already recorded, receipt failure is non-critical but should be logged
    }

    // 5. Create income entry automatically (Integration with Income Management)
    let incomeEntryId: string | null = null;
    try {
      // Try using database function first (recommended for atomicity)
      const { data: incomeFunctionResult, error: incomeFunctionError } = await supabase
        .rpc('create_income_from_payment', {
          p_payment_id: payment.id,
        });

      if (!incomeFunctionError && incomeFunctionResult) {
        incomeEntryId = incomeFunctionResult;
      } else {
        // Fallback: Create income entry directly if function doesn't exist
        console.warn('Income function not available, using direct insertion:', incomeFunctionError?.message);
        
        // Get financial year ID (if financial_years table exists)
        const paymentDate = new Date(payment.payment_date);
        const paymentDateStr = paymentDate.toISOString().split('T')[0];
        
        // Calculate financial year (April to March)
        let financialYearId: string | null = null;
        try {
          const { data: fyData } = await supabase
            .from('financial_years')
            .select('id, start_date')
            .eq('school_code', normalizedSchoolCode)
            .eq('is_active', true)
            .order('start_date', { ascending: false })
            .limit(1);
          
          if (fyData && fyData.length > 0) {
            financialYearId = fyData[0].id;
          }
        } catch (fyError) {
          // Financial year lookup failed, continue without it
          console.warn('Could not determine financial year:', fyError);
        }

        // Generate reference number
        const referenceNumber = payment.reference_no || `PAY-${payment.id.substring(0, 8).toUpperCase()}`;
        
        // Build notes
        const receiptInfo = receipt?.receipt_no ? ` | Receipt: ${receipt.receipt_no}` : '';
        const remarksInfo = payment.remarks ? ` | ${payment.remarks}` : '';
        const notes = `Fee payment - Student: ${student.admission_no}${receiptInfo}${remarksInfo}`;

        // Create income entry
        const { data: incomeEntry, error: incomeError } = await supabase
          .from('income_entries')
          .insert([{
            school_id: school.id,
            school_code: normalizedSchoolCode,
            financial_year_id: financialYearId,
            source: 'Fees',
            amount: parseFloat(payment.amount.toString()),
            entry_date: paymentDateStr,
            reference_number: referenceNumber,
            notes: notes,
            created_by: collectedBy,
            payment_id: payment.id,
            is_active: true,
          }])
          .select('id')
          .single();

        if (incomeError) {
          console.error('Error creating income entry:', incomeError);
          // Log error but don't fail payment (income can be created manually later)
        } else if (incomeEntry) {
          incomeEntryId = incomeEntry.id;
        }
      }
    } catch (incomeCreationError) {
      // Log error but don't fail payment
      console.error('Error in income entry creation:', incomeCreationError);
    }

    // 6. Audit log
    await supabase.from('audit_logs').insert({
      school_id: school.id,
      school_code: normalizedSchoolCode,
      action: 'payment_collected',
      entity_type: 'payment',
      entity_id: payment.id,
      performed_by: collectedBy,
      performed_by_staff_id: collectedByStaffId,
      changes: {
        amount,
        payment_mode,
        student_id,
        allocations,
      },
      metadata: {
        receipt_id: receipt?.id || null,
      },
    });

    return NextResponse.json({
      message: 'Payment collected successfully',
      data: {
        payment,
        receipt: receipt || null,
        allocations: allocationRecords,
        income_entry_id: incomeEntryId || null,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/payments:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
