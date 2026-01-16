import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/fee-structures/[id]
 * Get a specific fee structure with items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get structure first to get school_code for permission check
    const { data: structure, error } = await supabase
      .from('fee_structures')
      .select(`
        *,
        created_by_staff:created_by (id, full_name, staff_id),
        activated_by_staff:activated_by (id, full_name, staff_id)
      `)
      .eq('id', id)
      .single();

    if (error || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Now check permissions
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    // Fetch items
    const { data: items, error: itemsError } = await supabase
      .from('fee_structure_items')
      .select(`
        *,
        fee_head:fee_head_id (id, name, description, is_optional)
      `)
      .eq('fee_structure_id', id);

    if (itemsError) {
      console.error('Error fetching fee structure items:', itemsError);
    }

    return NextResponse.json({
      data: {
        ...structure,
        items: items || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/v2/fees/fee-structures/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v2/fees/fee-structures/[id]
 * Update a fee structure (only if not active)
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
    const supabase = getServiceRoleClient();

    // Check if structure exists and is active
    const { data: existing, error: fetchError } = await supabase
      .from('fee_structures')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    if (existing.is_active) {
      return NextResponse.json(
        { error: 'Cannot update an active fee structure. Deactivate it first.' },
        { status: 400 }
      );
    }

    // Update structure
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.class_name !== undefined) updateData.class_name = body.class_name.trim();
    if (body.section !== undefined) updateData.section = body.section?.trim() || null;
    if (body.academic_year !== undefined) updateData.academic_year = body.academic_year?.trim() || null;
    if (body.start_month !== undefined) updateData.start_month = typeof body.start_month === 'string' ? parseInt(body.start_month) : (Number(body.start_month) || 0);
    if (body.end_month !== undefined) updateData.end_month = typeof body.end_month === 'string' ? parseInt(body.end_month) : (Number(body.end_month) || 0);
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.late_fee_type !== undefined) updateData.late_fee_type = body.late_fee_type || null;
    if (body.late_fee_value !== undefined) updateData.late_fee_value = typeof body.late_fee_value === 'string' ? parseFloat(body.late_fee_value) : (Number(body.late_fee_value) || 0);
    if (body.grace_period_days !== undefined) updateData.grace_period_days = typeof body.grace_period_days === 'string' ? parseInt(body.grace_period_days) : (Number(body.grace_period_days) || 0);

    const { data: updated, error: updateError } = await supabase
      .from('fee_structures')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating fee structure:', updateError);
      return NextResponse.json(
        { error: 'Failed to update fee structure', details: updateError.message },
        { status: 500 }
      );
    }

    // Update items if provided
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      await supabase.from('fee_structure_items').delete().eq('fee_structure_id', id);

      // Insert new items
      if (body.items.length > 0) {
        const structureItems = body.items.map((item: { fee_head_id: string; amount: number }) => ({
          fee_structure_id: id,
          fee_head_id: item.fee_head_id,
          amount: Number(item.amount),
        }));

        const { error: itemsError } = await supabase
          .from('fee_structure_items')
          .insert(structureItems);

        if (itemsError) {
          console.error('Error updating fee structure items:', itemsError);
          return NextResponse.json(
            { error: 'Failed to update fee structure items', details: itemsError.message },
            { status: 500 }
          );
        }
      }
    }

    // Fetch updated structure with items
    const { data: items } = await supabase
      .from('fee_structure_items')
      .select(`
        *,
        fee_head:fee_head_id (id, name, description, is_optional)
      `)
      .eq('fee_structure_id', id);

    return NextResponse.json({
      data: {
        ...updated,
        items: items || [],
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/v2/fees/fee-structures/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
