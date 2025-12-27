import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * PATCH /api/library/sections/[id]
 * Update a library section
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, name, material_type } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const updateData: { name?: string; material_type?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (name) updateData.name = name;
    if (material_type) updateData.material_type = material_type;

    const { data: section, error } = await supabase
      .from('library_sections')
      .update(updateData)
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update section', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: section }, { status: 200 });
  } catch (error) {
    console.error('Error updating library section:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/library/sections/[id]
 * Delete a library section (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_library');
  if (permissionCheck) {
    return permissionCheck;
  }

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

    const { error } = await supabase
      .from('library_sections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete section', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Section deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting library section:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

