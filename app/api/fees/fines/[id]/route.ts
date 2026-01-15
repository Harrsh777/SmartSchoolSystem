import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/fees/fines/[id]
 * Update a fee fine
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fine_name, fine_type, fine_value, fine_amount, fine_percentage, daily_fine_amount, applicable_after_days, applicable_from_days, is_active, remarks, max_fine_amount } = body;

    const updateData: Record<string, unknown> = {};
    if (fine_name !== undefined) updateData.fine_name = fine_name;
    if (fine_type !== undefined) updateData.fine_type = fine_type;
    
    // Handle fine_value - prefer fine_value, otherwise calculate from type-specific fields
    if (fine_value !== undefined) {
      updateData.fine_value = parseFloat(fine_value);
    } else if (fine_amount !== undefined && fine_type === 'fixed') {
      updateData.fine_value = parseFloat(fine_amount);
    } else if (fine_percentage !== undefined && fine_type === 'percentage') {
      updateData.fine_value = parseFloat(fine_percentage);
    } else if (daily_fine_amount !== undefined && fine_type === 'daily') {
      updateData.fine_value = parseFloat(daily_fine_amount);
    }
    
    // Handle applicable_after_days (schema field) or applicable_from_days (UI field)
    if (applicable_after_days !== undefined) {
      updateData.applicable_after_days = parseInt(applicable_after_days) || 1;
    } else if (applicable_from_days !== undefined) {
      updateData.applicable_after_days = parseInt(applicable_from_days) || 1;
    }
    
    if (max_fine_amount !== undefined) updateData.max_fine_amount = max_fine_amount ? parseFloat(max_fine_amount) : null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (remarks !== undefined) updateData.remarks = remarks;
    updateData.updated_at = new Date().toISOString();

    const { data: fine, error } = await supabase
      .from('fee_fines')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update fee fine', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: fine }, { status: 200 });
  } catch (error) {
    console.error('Error updating fee fine:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fees/fines/[id]
 * Delete a fee fine
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('fee_fines')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete fee fine', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee fine deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee fine:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

