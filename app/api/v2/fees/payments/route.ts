import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';
import { formatTransportFeeLabel, type TransportSnapshot } from '@/lib/fees/transport-fee-sync';

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
    const selectStudentWithRte = () =>
      supabase
        .from('students')
        .select('id, admission_no, student_name, school_code, class, section, is_rte')
        .eq('id', student_id)
        .eq('school_code', normalizedSchoolCode)
        .single();
    const selectStudentLegacy = () =>
      supabase
        .from('students')
        .select('id, admission_no, student_name, school_code, class, section')
        .eq('id', student_id)
        .eq('school_code', normalizedSchoolCode)
        .single();

    let { data: student, error: studentError }: { data: Record<string, unknown> | null; error: { code?: string; message?: string } | null } =
      await selectStudentWithRte();
    const missingIsRte =
      studentError &&
      (
        studentError.code === '42703' ||
        /column.*is_rte.*does not exist|Could not find the 'is_rte' column/i.test(studentError.message || '')
      );
    if (missingIsRte) {
      ({ data: student, error: studentError } = await selectStudentLegacy() as unknown as { data: Record<string, unknown> | null; error: { code?: string; message?: string } | null });
    }

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    if (Boolean((student as { is_rte?: boolean }).is_rte)) {
      return NextResponse.json(
        { error: 'Payment collection is not allowed for RTE students. Their payable amount is always ₹0.' },
        { status: 400 }
      );
    }

    // Get collector info
    const staffId = request.headers.get('x-staff-id');
    let collectedBy: string | null = null;
    let collectedByStaffId: string | null = null;
    let collectorName = 'Staff';

    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, staff_id, full_name')
        .eq('school_code', normalizedSchoolCode)
        .eq('staff_id', staffId)
        .single();
      collectedBy = staff?.id || null;
      collectedByStaffId = (staff as { staff_id?: string } | null)?.staff_id || null;
      collectorName = (staff as { full_name?: string } | null)?.full_name || collectedByStaffId || 'Staff';
    }

    if (!collectedBy) {
      return NextResponse.json(
        { error: 'Collector information is required' },
        { status: 400 }
      );
    }

    // Validate all student_fee_ids belong to the student and have sufficient balance
    const studentFeeIds = allocations.map((a: { student_fee_id: string }) => a.student_fee_id);
    const { data: studentFeesRaw, error: feesError } = await supabase
      .from('student_fees')
      .select(`
        id,
        student_id,
        fee_structure_id,
        base_amount,
        paid_amount,
        adjustment_amount,
        due_date,
        due_month,
        status,
        fee_source,
        transport_snapshot,
        fee_structure:fee_structure_id (
          name,
          academic_year,
          late_fee_type,
          late_fee_value,
          grace_period_days
        )
      `)
      .eq('student_id', student_id)
      .in('id', studentFeeIds);

    if (feesError || !studentFeesRaw || studentFeesRaw.length !== allocations.length) {
      return NextResponse.json(
        { error: 'Invalid student fee IDs or fees not found' },
        { status: 400 }
      );
    }

    const studentCtx = {
      id: String(student.id),
      class: String(student.class ?? ''),
      section: student.section != null ? String(student.section) : null,
    };

    const studentFeesEnriched = await enrichStudentFeesWithAdjustments(
      supabase,
      normalizedSchoolCode,
      studentCtx,
      studentFeesRaw as never
    );

    // Validate allocations don't exceed enriched total still due (base + adj + late − paid)
    const PAY_EPS = 0.02;
    for (const allocation of allocations) {
      const fee = studentFeesEnriched.find((f) => f.id === allocation.student_fee_id);
      if (!fee) continue;

      const maxForRow = Math.round(Number(fee.total_due || 0) * 100) / 100;
      const allocAmt = Number(allocation.allocated_amount);
      if (!Number.isFinite(allocAmt) || allocAmt <= 0) {
        return NextResponse.json({ error: 'Each allocation must be a positive amount' }, { status: 400 });
      }
      if (allocAmt > maxForRow + PAY_EPS) {
        return NextResponse.json(
          {
            error: `Allocation (${allocAmt}) exceeds amount due (${maxForRow}) for this installment`,
          },
          { status: 400 }
        );
      }
    }

    const studentFees = studentFeesRaw;

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

    // 3. Update student_fees paid_amount (numeric coercion — DB may return strings)
    for (const allocation of allocations) {
      const fee = studentFees.find(f => f.id === allocation.student_fee_id);
      if (!fee) continue;

      const prevPaid = Number(fee.paid_amount || 0);
      const allocAmt = Number(allocation.allocated_amount);
      const newPaidAmount = Math.round((prevPaid + allocAmt) * 100) / 100;

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

    // 3b. Sync installment status (paid / partial / pending / overdue) from enriched balances
    try {
      const { data: refreshedFees } = await supabase
        .from('student_fees')
        .select(`
          id,
          student_id,
          fee_structure_id,
          base_amount,
          paid_amount,
          adjustment_amount,
          due_date,
          due_month,
          status,
          fee_source,
          transport_snapshot,
          fee_structure:fee_structure_id (
            name,
            academic_year,
            late_fee_type,
            late_fee_value,
            grace_period_days
          )
        `)
        .eq('student_id', student_id)
        .in('id', studentFeeIds);

      if (refreshedFees && refreshedFees.length > 0) {
        const enrichedRefreshed = await enrichStudentFeesWithAdjustments(
          supabase,
          normalizedSchoolCode,
          studentCtx,
          refreshedFees as never
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const ef of enrichedRefreshed) {
          const due = Number(ef.total_due || 0);
          const paidNum = Number(ef.paid_amount || 0);
          let nextStatus: string;
          if (due <= 0.02) {
            nextStatus = 'paid';
          } else if (paidNum > 0) {
            nextStatus = 'partial';
          } else {
            const d = ef.due_date ? new Date(String(ef.due_date)) : null;
            if (d) {
              d.setHours(0, 0, 0, 0);
              nextStatus = d < today ? 'overdue' : 'pending';
            } else {
              nextStatus = 'pending';
            }
          }
          await supabase.from('student_fees').update({ status: nextStatus }).eq('id', ef.id);
        }
      }
    } catch (statusSyncErr) {
      console.warn('Fee status sync after payment (non-fatal):', statusSyncErr);
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
        const fee = studentFees.find(f => f.id === alloc.student_fee_id) as {
          due_date?: string;
          fee_source?: string;
          transport_snapshot?: TransportSnapshot;
          fee_structure?: { name?: string } | null;
        } | undefined;
        const feeLabel =
          fee?.fee_source === 'transport'
            ? formatTransportFeeLabel(fee.transport_snapshot ?? null)
            : String(fee?.fee_structure?.name || 'Fee');
        return {
          student_fee_id: alloc.student_fee_id,
          allocated_amount: alloc.allocated_amount,
          due_month: fee?.due_date || null,
          fee_name: feeLabel,
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

    // 6. Audit log (Security & Action Audit dashboard)
    logAudit(request, {
      userId: collectedBy,
      userName: collectorName,
      role: 'Accountant',
      actionType: 'FEE_PAID',
      entityType: 'PAYMENT',
      entityId: payment.id,
      severity: 'CRITICAL',
      metadata: { amount: Number(amount), receipt_id: receipt?.id ?? null },
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
