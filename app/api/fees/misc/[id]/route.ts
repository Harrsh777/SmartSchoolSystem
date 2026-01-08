import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/fees/misc/[id]
 * Update a misc fee
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fee_name, amount, description } = body;

    const updateData: Record<string, unknown> = {};
    if (fee_name !== undefined) updateData.fee_name = fee_name;
    if (amount !== undefined) updateData.amount = amount ? parseFloat(amount) : null;
    if (description !== undefined) updateData.description = description;

    const { data: miscFee, error } = await supabase
      .from('misc_fees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update misc fee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: miscFee }, { status: 200 });
  } catch (error) {
    console.error('Error updating misc fee:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fees/misc/[id]
 * Delete a misc fee
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('misc_fees')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete misc fee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Misc fee deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting misc fee:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

