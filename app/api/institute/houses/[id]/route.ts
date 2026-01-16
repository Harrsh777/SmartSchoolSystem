import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// PATCH - Update a house
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { house_name, house_color, description, is_active } = body;

    interface HouseUpdateData {
      updated_at: string;
      house_name?: string;
      house_color?: string;
      description?: string;
      is_active?: boolean;
    }

    const supabase = getServiceRoleClient();
    const updateData: HouseUpdateData = {
      updated_at: new Date().toISOString(),
    };

    if (house_name !== undefined) updateData.house_name = house_name.trim();
    if (house_color !== undefined) updateData.house_color = house_color;
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('institute_houses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating house:', error);
      return NextResponse.json(
        { error: 'Failed to update house' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'House not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, message: 'House updated successfully' });
  } catch (error) {
    console.error('Error in PATCH /api/institute/houses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a house (set is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('institute_houses')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting house:', error);
      return NextResponse.json(
        { error: 'Failed to delete house' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'House not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, message: 'House deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/institute/houses/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

