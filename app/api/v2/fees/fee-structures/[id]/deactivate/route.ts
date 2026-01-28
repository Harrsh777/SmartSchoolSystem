import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/v2/fees/fee-structures/[id]/deactivate
 * Deactivate a fee structure
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get structure first to get school_code for permission check
    const { data: structure, error: structureError } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', id)
      .single();

    if (structureError || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    // Now check permissions
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    if (!structure.is_active) {
      return NextResponse.json(
        { error: 'Fee structure is already inactive' },
        { status: 400 }
      );
    }

    // Deactivate structure
    const { error: deactivateError } = await supabase
      .from('fee_structures')
      .update({
        is_active: false,
        activated_at: null,
        activated_by: null,
      })
      .eq('id', id);

    if (deactivateError) {
      console.error('Error deactivating fee structure:', deactivateError);
      return NextResponse.json(
        { error: 'Failed to deactivate fee structure', details: deactivateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Fee structure deactivated successfully',
      data: {
        structure_id: id,
        note: 'Fee structure has been deactivated. It can no longer be used for fee generation until reactivated.',
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/fee-structures/[id]/deactivate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
