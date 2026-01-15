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
    const { 
      head_name, 
      component_name, 
      default_amount,
      fee_type,
      applicable_classes,
      admission_type, 
      gender, 
      is_optional,
      is_active,
      academic_year,
      remarks,
      display_order 
    } = body;

    const updateData: Record<string, unknown> = {};
    if (head_name !== undefined) updateData.head_name = head_name;
    if (component_name !== undefined) updateData.component_name = component_name.trim();
    if (default_amount !== undefined) updateData.default_amount = parseFloat(default_amount.toString()) || 0;
    if (fee_type !== undefined) {
      if (!['annual', 'quarterly', 'monthly', 'one_time'].includes(fee_type)) {
        return NextResponse.json(
          { error: 'Invalid fee_type. Must be one of: annual, quarterly, monthly, one_time' },
          { status: 400 }
        );
      }
      updateData.fee_type = fee_type;
    }
    if (applicable_classes !== undefined) updateData.applicable_classes = Array.isArray(applicable_classes) ? applicable_classes : [];
    if (admission_type !== undefined) updateData.admission_type = admission_type;
    if (gender !== undefined) updateData.gender = gender;
    if (is_optional !== undefined) updateData.is_optional = Boolean(is_optional);
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (academic_year !== undefined) updateData.academic_year = academic_year;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (display_order !== undefined) updateData.display_order = parseInt(display_order.toString()) || 0;

    const { data: component, error } = await supabase
      .from('fee_components')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating fee component:', error);
      return NextResponse.json(
        { error: 'Failed to update fee component', details: error.message },
        { status: 500 }
      );
    }

    if (!component) {
      return NextResponse.json(
        { error: 'Fee component not found' },
        { status: 404 }
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

    // Check if component is being used in any assignments
    const { data: assignments, error: checkError } = await supabase
      .from('fee_assignments')
      .select('id')
      .eq('fee_component_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking fee assignments:', checkError);
      return NextResponse.json(
        { error: 'Failed to check fee component usage', details: checkError.message },
        { status: 500 }
      );
    }

    if (assignments && assignments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee component. It is being used in fee assignments.' },
        { status: 400 }
      );
    }

    // Safe to delete
    const { error } = await supabase
      .from('fee_components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting fee component:', error);
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

