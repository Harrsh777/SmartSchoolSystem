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
    const { fine_name, fine_type, fine_amount, fine_percentage, daily_fine_amount, is_active } = body;

    const updateData: Record<string, unknown> = {};
    if (fine_name !== undefined) updateData.fine_name = fine_name;
    if (fine_type !== undefined) updateData.fine_type = fine_type;
    if (fine_amount !== undefined) updateData.fine_amount = fine_amount ? parseFloat(fine_amount) : null;
    if (fine_percentage !== undefined) updateData.fine_percentage = fine_percentage ? parseFloat(fine_percentage) : null;
    if (daily_fine_amount !== undefined) updateData.daily_fine_amount = daily_fine_amount ? parseFloat(daily_fine_amount) : null;
    if (is_active !== undefined) updateData.is_active = is_active;

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

