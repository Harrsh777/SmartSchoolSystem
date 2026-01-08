import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/finance/expense/[id]
 * Update an expense entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      category,
      amount,
      entry_date,
      paid_to,
      payment_mode,
      notes,
      updated_by,
    } = body;

    // Get existing record for audit
    const { data: existing, error: fetchError } = await supabase
      .from('expense_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense entry not found' },
        { status: 404 }
      );
    }

    // Prevent editing finalized salary expenses
    if (existing.is_finalized && existing.category === 'Salary') {
      return NextResponse.json(
        { error: 'Cannot edit finalized salary expense' },
        { status: 400 }
      );
    }

    // Validation
    if (category && !['Salary', 'Utility', 'Maintenance', 'Vendor', 'Other'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: Salary, Utility, Maintenance, Vendor, Other' },
        { status: 400 }
      );
    }

    if (payment_mode && !['Cash', 'Bank', 'UPI'].includes(payment_mode)) {
      return NextResponse.json(
        { error: 'Invalid payment mode. Must be one of: Cash, Bank, UPI' },
        { status: 400 }
      );
    }

    if (amount !== undefined && parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Update expense entry
    const updateData: Record<string, unknown> = {};
    if (category !== undefined) updateData.category = category;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (entry_date !== undefined) updateData.entry_date = entry_date;
    if (paid_to !== undefined) updateData.paid_to = paid_to;
    if (payment_mode !== undefined) updateData.payment_mode = payment_mode;
    if (notes !== undefined) updateData.notes = notes;
    if (updated_by !== undefined) updateData.updated_by = updated_by;

    const { data: updatedEntry, error: updateError } = await supabase
      .from('expense_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update expense entry', details: updateError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code: existing.school_code,
      table_name: 'expense_entries',
      record_id: id,
      action: 'UPDATE',
      old_values: existing,
      new_values: updatedEntry,
      changed_by: updated_by || null,
    }]);

    return NextResponse.json({ data: updatedEntry }, { status: 200 });
  } catch (error) {
    console.error('Error updating expense entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/expense/[id]
 * Soft delete an expense entry (if not finalized salary)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const updatedBy = searchParams.get('updated_by');

    // Get existing record for audit
    const { data: existing, error: fetchError } = await supabase
      .from('expense_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Expense entry not found' },
        { status: 404 }
      );
    }

    // Prevent deleting finalized salary expenses
    if (existing.is_finalized && existing.category === 'Salary') {
      return NextResponse.json(
        { error: 'Cannot delete finalized salary expense' },
        { status: 400 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('expense_entries')
      .update({
        is_active: false,
        updated_by: updatedBy || null,
      })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete expense entry', details: deleteError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code: existing.school_code,
      table_name: 'expense_entries',
      record_id: id,
      action: 'DELETE',
      old_values: existing,
      changed_by: updatedBy || null,
    }]);

    return NextResponse.json({ message: 'Expense entry deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting expense entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



