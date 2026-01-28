import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// PATCH - Update a leave type
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { abbreviation, name, max_days, carry_forward, is_active } = body;

    interface LeaveTypeUpdateData {
      abbreviation?: string;
      name?: string;
      max_days?: number | null;
      carry_forward?: boolean;
      is_active?: boolean;
    }

    const updateData: LeaveTypeUpdateData = {};
    if (abbreviation !== undefined) updateData.abbreviation = abbreviation.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (max_days !== undefined) updateData.max_days = max_days ? parseInt(max_days) : null;
    if (carry_forward !== undefined) updateData.carry_forward = carry_forward;
    if (is_active !== undefined) updateData.is_active = is_active;

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('leave_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating leave type:', error);
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Leave types table does not exist',
          details: 'Please run the leave_types_schema.sql file in your database to create the required table.',
          code: error.code,
          hint: 'The leave_types table needs to be created. Check leave_types_schema.sql in the project root.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to update leave type',
        details: error.message,
        code: error.code
      }, { status: 500 });
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

    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting leave type:', error);
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Leave types table does not exist',
          details: 'Please run the leave_types_schema.sql file in your database to create the required table.',
          code: error.code,
          hint: 'The leave_types table needs to be created. Check leave_types_schema.sql in the project root.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to delete leave type',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/leave/types/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

