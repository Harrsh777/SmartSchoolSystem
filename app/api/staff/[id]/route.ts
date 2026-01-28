import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch staff filtered by school_code
    const { data: staffMember, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (staffError || !staffMember) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: staffMember }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, ...updateData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify staff belongs to this school
    const { data: existingStaff, error: fetchError } = await supabase
      .from('staff')
      .select('id, school_code, staff_id')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (fetchError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found or access denied' },
        { status: 404 }
      );
    }

    // Check for duplicate staff_id if being updated
    if (updateData.staff_id && updateData.staff_id !== existingStaff.staff_id) {
      const { data: duplicate } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', school_code)
        .eq('staff_id', updateData.staff_id)
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Staff ID already exists' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateFields: Record<string, unknown> = {};
    
    if (updateData.staff_id !== undefined) updateFields.staff_id = updateData.staff_id;
    if (updateData.full_name !== undefined) updateFields.full_name = updateData.full_name;
    if (updateData.role !== undefined) updateFields.role = updateData.role;
    if (updateData.department !== undefined) updateFields.department = updateData.department || null;
    if (updateData.designation !== undefined) updateFields.designation = updateData.designation || null;
    if (updateData.email !== undefined) updateFields.email = updateData.email || null;
    if (updateData.phone !== undefined) updateFields.phone = updateData.phone || null;
    if (updateData.date_of_joining !== undefined) updateFields.date_of_joining = updateData.date_of_joining;
    if (updateData.employment_type !== undefined) updateFields.employment_type = updateData.employment_type || null;
    if (updateData.qualification !== undefined) updateFields.qualification = updateData.qualification || null;
    if (updateData.experience_years !== undefined) updateFields.experience_years = updateData.experience_years !== null && updateData.experience_years !== '' ? Number(updateData.experience_years) : null;
    if (updateData.gender !== undefined) updateFields.gender = updateData.gender || null;
    if (updateData.address !== undefined) updateFields.address = updateData.address || null;

    // Update staff (don't allow updating school_code)
    const { data: updatedStaff, error: updateError } = await supabase
      .from('staff')
      .update(updateFields)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update staff', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedStaff }, { status: 200 });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

