import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/finance/income/[id]
 * Update an income entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { source, amount, entry_date, reference_number, notes, updated_by } = body;

    // Get existing record for audit
    const { data: existing, error: fetchError } = await supabase
      .from('income_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Income entry not found' },
        { status: 404 }
      );
    }

    // Validation
    if (source && !['Fees', 'Donation', 'Grant', 'Other'].includes(source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be one of: Fees, Donation, Grant, Other' },
        { status: 400 }
      );
    }

    if (amount !== undefined && parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Update income entry
    const updateData: Record<string, unknown> = {};
    if (source !== undefined) updateData.source = source;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (entry_date !== undefined) updateData.entry_date = entry_date;
    if (reference_number !== undefined) updateData.reference_number = reference_number;
    if (notes !== undefined) updateData.notes = notes;
    if (updated_by !== undefined) updateData.updated_by = updated_by;

    const { data: updatedEntry, error: updateError } = await supabase
      .from('income_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update income entry', details: updateError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code: existing.school_code,
      table_name: 'income_entries',
      record_id: id,
      action: 'UPDATE',
      old_values: existing,
      new_values: updatedEntry,
      changed_by: updated_by || null,
    }]);

    return NextResponse.json({ data: updatedEntry }, { status: 200 });
  } catch (error) {
    console.error('Error updating income entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/finance/income/[id]
 * Soft delete an income entry
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
      .from('income_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Income entry not found' },
        { status: 404 }
      );
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('income_entries')
      .update({
        is_active: false,
        updated_by: updatedBy || null,
      })
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete income entry', details: deleteError.message },
        { status: 500 }
      );
    }

    // Create audit log
    await supabase.from('finance_audit_logs').insert([{
      school_code: existing.school_code,
      table_name: 'income_entries',
      record_id: id,
      action: 'DELETE',
      old_values: existing,
      changed_by: updatedBy || null,
    }]);

    return NextResponse.json({ message: 'Income entry deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting income entry:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



