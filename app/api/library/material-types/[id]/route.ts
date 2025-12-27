import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePermission } from '@/lib/api-permissions';

/**
 * PATCH /api/library/material-types/[id]
 * Update a material type
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
    const { school_code, name } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const { data: materialType, error } = await supabase
      .from('library_material_types')
      .update({
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', school_code)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update material type', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: materialType }, { status: 200 });
  } catch (error) {
    console.error('Error updating material type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/library/material-types/[id]
 * Delete a material type (soft delete)
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
      .from('library_material_types')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_code', schoolCode);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete material type', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Material type deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting material type:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

