import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PATCH /api/fees/components/[id]
 * Update a fee component
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { head_name, component_name, admission_type, gender, display_order } = body;

    const updateData: Record<string, unknown> = {};
    if (head_name !== undefined) updateData.head_name = head_name;
    if (component_name !== undefined) updateData.component_name = component_name;
    if (admission_type !== undefined) updateData.admission_type = admission_type;
    if (gender !== undefined) updateData.gender = gender;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: component, error } = await supabase
      .from('fee_components')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update fee component', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: component }, { status: 200 });
  } catch (error) {
    console.error('Error updating fee component:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fees/components/[id]
 * Delete a fee component
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('fee_components')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete fee component', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee component deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting fee component:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

