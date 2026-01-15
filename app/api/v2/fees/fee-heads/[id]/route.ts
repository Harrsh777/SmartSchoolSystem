import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/fee-heads/[id]
 * Get a specific fee head
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const supabase = getServiceRoleClient();

    const { data: feeHead, error } = await supabase
      .from('fee_heads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !feeHead) {
      return NextResponse.json(
        { error: 'Fee head not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: feeHead }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/fee-heads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v2/fees/fee-heads/[id]
 * Update a fee head (only if not used in any structure)
 * Body: { name, description, is_optional, is_active }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, is_optional, is_active } = body;

    const supabase = getServiceRoleClient();

    // Check if fee head is used in any active structure
    const { data: usedInStructures, error: checkError } = await supabase
      .from('fee_structure_items')
      .select('fee_structure_id')
      .eq('fee_head_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking fee head usage:', checkError);
    }

    if (usedInStructures && usedInStructures.length > 0) {
      // Allow updates but prevent deletion/name changes
      const updateData: Record<string, unknown> = {};
      
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (is_optional !== undefined) updateData.is_optional = is_optional;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      // Don't allow name change if used
      if (name !== undefined && usedInStructures.length > 0) {
        return NextResponse.json(
          { error: 'Cannot change name of fee head that is used in fee structures' },
          { status: 400 }
        );
      }
      
      if (name !== undefined) updateData.name = name.trim();
      
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No valid fields to update' },
          { status: 400 }
        );
      }

      const { data: feeHead, error: updateError } = await supabase
        .from('fee_heads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating fee head:', updateError);
        return NextResponse.json(
          { error: 'Failed to update fee head', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: feeHead }, { status: 200 });
    } else {
      // Not used, allow all updates
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description?.trim() || null;
      if (is_optional !== undefined) updateData.is_optional = is_optional;
      if (is_active !== undefined) updateData.is_active = is_active;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      const { data: feeHead, error: updateError } = await supabase
        .from('fee_heads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating fee head:', updateError);
        return NextResponse.json(
          { error: 'Failed to update fee head', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: feeHead }, { status: 200 });
    }
  } catch (error) {
    console.error('Error in PATCH /api/v2/fees/fee-heads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/fees/fee-heads/[id]
 * Delete a fee head (only if not used in any structure)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Check if fee head is used in any structure
    const { data: usedInStructures, error: checkError } = await supabase
      .from('fee_structure_items')
      .select('fee_structure_id')
      .eq('fee_head_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking fee head usage:', checkError);
      return NextResponse.json(
        { error: 'Failed to check fee head usage', details: checkError.message },
        { status: 500 }
      );
    }

    if (usedInStructures && usedInStructures.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete fee head that is used in fee structures. Deactivate it instead.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('fee_heads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting fee head:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete fee head', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Fee head deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/v2/fees/fee-heads/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
