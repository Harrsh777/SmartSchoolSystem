import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update a leave type
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { abbreviation, name, max_days, carry_forward, is_active } = body;

    const updateData: any = {};
    if (abbreviation !== undefined) updateData.abbreviation = abbreviation.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (max_days !== undefined) updateData.max_days = max_days ? parseInt(max_days) : null;
    if (carry_forward !== undefined) updateData.carry_forward = carry_forward;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('leave_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating leave type:', error);
      return NextResponse.json({ error: 'Failed to update leave type' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PATCH /api/leave/types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a leave type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting leave type:', error);
      return NextResponse.json({ error: 'Failed to delete leave type' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/leave/types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

