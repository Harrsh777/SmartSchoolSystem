import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/fees/discounts/[id]
 * Update a fee discount
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { discount_name, remarks } = body;

    const updateData: Record<string, unknown> = {};
    if (discount_name !== undefined) updateData.discount_name = discount_name;
    if (remarks !== undefined) updateData.remarks = remarks;

    const { data: discount, error } = await supabase
      .from('fee_discounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update fee discount', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: discount }, { status: 200 });
  } catch (error) {
    console.error('Error updating fee discount:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fees/discounts/[id]
 * Delete a fee discount
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('fee_discounts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete fee discount', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee discount deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee discount:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

