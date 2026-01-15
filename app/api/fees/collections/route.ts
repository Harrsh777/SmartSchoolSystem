import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get fee collections
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const paymentMode = searchParams.get('payment_mode');
    const collectedBy = searchParams.get('collected_by');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('fee_collections')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode)
      .eq('cancelled', false)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (startDate) {
      query = query.gte('payment_date', startDate);
    }
    if (endDate) {
      query = query.lte('payment_date', endDate);
    }
    if (paymentMode) {
      query = query.eq('payment_mode', paymentMode);
    }
    if (collectedBy) {
      query = query.eq('collected_by', collectedBy);
    }

    const { data: collections, error } = await query;

    if (error) {
      console.error('Error fetching fee collections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch fee collections', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: collections || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching fee collections:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

// Create fee collection (payment)
export async function POST(request: NextRequest) {
  try {
      const body = await request.json();
    const {
      school_code,
      student_id,
      installment_ids, // Array of installment IDs to pay
      payment_mode,
      payment_date,
      discount_id,
      discount_amount = 0,
      fine_amount = 0,
      cheque_number,
      cheque_date,
      bank_name,
      remarks,
      collected_by,
    } = body;

    if (!school_code || !student_id || !installment_ids || !Array.isArray(installment_ids) || installment_ids.length === 0) {
      return NextResponse.json(
        { error: 'School code, student ID, and at least one installment ID are required' },
        { status: 400 }
      );
    }

    if (!payment_mode || !payment_date) {
      return NextResponse.json(
        { error: 'Payment mode and payment date are required' },
        { status: 400 }
      );
    }

    // Get staff ID from headers or body (collected_by is required in schema)
    // Try headers first (more secure), then fall back to body
    const headers = request.headers;
    const collectedBy = headers.get('x-staff-id') || collected_by;
    
    if (!collectedBy) {
      return NextResponse.json(
        { error: 'Collector information (collected_by) is required. Please ensure you are logged in as staff.' },
        { status: 400 }
      );
    }

    // Get school ID first (needed for staff verification)
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

    // Verify the staff exists and belongs to the school
    const { data: staffMember } = await supabase
      .from('staff')
      .select('id')
      .eq('id', collectedBy)
      .eq('school_code', school_code)
      .maybeSingle();
    
    if (!staffMember) {
      return NextResponse.json(
        { error: 'Invalid collector. Staff member not found or does not belong to this school.' },
        { status: 400 }
      );
    }

    // Fetch installments to calculate total amount
    // Also need to calculate fines for overdue installments
    const { data: installments, error: installmentsError } = await supabase
      .from('fee_installments')
      .select('id, amount, discount_amount, fine_amount, paid_amount, fee_component_id, due_date')
      .in('id', installment_ids)
      .eq('school_code', school_code)
      .eq('student_id', student_id);

    if (installmentsError || !installments || installments.length === 0) {
      return NextResponse.json(
        { error: 'Invalid installments or installments not found' },
        { status: 404 }
      );
    }

    // Calculate total amount
    // First, update fines for overdue installments that don't have fines
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate and update fines for overdue installments in parallel (non-blocking)
    // This ensures collection can proceed even if fine calculation fails
    const fineCalculationPromises = installments.map(async (inst) => {
      const dueDate = new Date(inst.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const isOverdue = today > dueDate;
      const hasFine = parseFloat(inst.fine_amount?.toString() || '0') > 0;
      
      if (isOverdue && !hasFine) {
        try {
          const { data: calculatedFine, error: fineError } = await supabase.rpc('calculate_fine_amount', {
            p_installment_id: inst.id,
            p_school_code: school_code,
          });
          
          if (!fineError && calculatedFine !== null && calculatedFine !== undefined && calculatedFine > 0) {
            // Update the installment with calculated fine
            await supabase
              .from('fee_installments')
              .update({ fine_amount: calculatedFine })
              .eq('id', inst.id);
            
            return { id: inst.id, fine_amount: calculatedFine };
          }
        } catch (error) {
          console.error(`Error calculating fine for installment ${inst.id}:`, error);
          // Non-blocking: continue even if fine calculation fails
        }
      }
      return null;
    });

    // Wait for fine calculations but don't block on errors
    const fineUpdates = await Promise.allSettled(fineCalculationPromises);
    
    // Update installments with calculated fines
    const fineUpdateMap = new Map<string, number>();
    fineUpdates.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        fineUpdateMap.set(result.value.id, result.value.fine_amount);
      }
    });

    // Use installments with updated fine amounts
    const finalInstallments = installments.map(inst => {
      const updatedFine = fineUpdateMap.get(inst.id);
      if (updatedFine !== undefined) {
        return { ...inst, fine_amount: updatedFine };
      }
      return inst;
    });

    // Calculate total amount from updated installments
    let totalAmount = 0;
    for (const inst of finalInstallments) {
      const installmentAmount = parseFloat(inst.amount.toString()) - parseFloat(inst.discount_amount?.toString() || '0');
      const installmentFine = parseFloat(inst.fine_amount?.toString() || '0');
      const alreadyPaid = parseFloat(inst.paid_amount?.toString() || '0');
      const pendingAmount = installmentAmount + installmentFine - alreadyPaid;
      totalAmount += Math.max(0, pendingAmount);
    }

    // Apply collection-level discount
    const discountAmt = parseFloat(discount_amount.toString()) || 0;
    totalAmount = Math.max(0, totalAmount - discountAmt);
    
    // Add collection-level fine (if any additional fine beyond installment fines)
    const collectionFineAmt = parseFloat(fine_amount.toString()) || 0;
    totalAmount = totalAmount + collectionFineAmt;

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Generate receipt number: REC-YYYY-XXXX
    const year = new Date(payment_date).getFullYear();
    const { data: lastReceipt } = await supabase
      .from('fee_collections')
      .select('receipt_no')
      .eq('school_code', school_code)
      .like('receipt_no', `REC-${year}-%`)
      .order('receipt_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    let receiptNumber: string;
    if (lastReceipt?.receipt_no) {
      const lastNumber = parseInt(lastReceipt.receipt_no.split('-')[2] || '0');
      receiptNumber = `REC-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      receiptNumber = `REC-${year}-0001`;
    }

    // Create fee collection
    const { data: collection, error: collectionError } = await supabase
      .from('fee_collections')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        student_id: student_id,
        receipt_no: receiptNumber,
        payment_date: payment_date,
        payment_mode: payment_mode,
        total_amount: totalAmount,
        discount_amount: parseFloat(discount_amount.toString()) || 0,
        fine_amount: parseFloat(fine_amount.toString()) || 0,
        cheque_number: cheque_number || null,
        cheque_date: cheque_date || null,
        bank_name: bank_name || null,
        remarks: remarks || null,
        collected_by: collectedBy, // Required field - must be provided
        cancelled: false,
      }])
      .select()
      .single();

    if (collectionError || !collection) {
      console.error('Error creating fee collection:', collectionError);
      return NextResponse.json(
        { error: 'Failed to create fee collection', details: collectionError?.message },
        { status: 500 }
      );
    }

    // Create collection items (link to installments)
    // Each installment gets its full pending amount; discount and fine are at collection level
    const collectionItems = installment_ids.map((installmentId: string) => {
      const inst = finalInstallments.find(i => i.id === installmentId);
      if (!inst) return null;
      
      const installmentAmount = parseFloat(inst.amount.toString()) - parseFloat(inst.discount_amount?.toString() || '0');
      const installmentFine = parseFloat(inst.fine_amount?.toString() || '0');
      const alreadyPaid = parseFloat(inst.paid_amount?.toString() || '0');
      const pendingAmount = Math.max(0, installmentAmount + installmentFine - alreadyPaid);

      return {
        fee_collection_id: collection.id,
        fee_installment_id: installmentId,
        amount_paid: pendingAmount, // Full pending amount is recorded for each installment
      };
    }).filter(Boolean);

    if (collectionItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('fee_collection_items')
        .insert(collectionItems);

      if (itemsError) {
        console.error('Error creating collection items:', itemsError);
        // Rollback collection
        await supabase.from('fee_collections').delete().eq('id', collection.id);
        return NextResponse.json(
          { error: 'Failed to create collection items', details: itemsError.message },
          { status: 500 }
        );
      }
    }

    // The trigger update_installment_status should automatically update installment statuses
    // But we can verify by fetching the updated collection with items

    const { data: updatedCollection } = await supabase
      .from('fee_collections')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section
        ),
        items:fee_collection_items (
          id,
          fee_installment_id,
          amount_paid,
          installment:fee_installment_id (
            id,
            installment_number,
            due_date,
            amount,
            fee_component_id,
            component:fee_component_id (
              component_name
            )
          )
        )
      `)
      .eq('id', collection.id)
      .single();

    return NextResponse.json({
      data: updatedCollection || collection,
      message: 'Fee collected successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}
