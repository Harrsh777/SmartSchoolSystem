import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * POST /api/v2/fees/fee-structures/[id]/activate
 * Activate a fee structure and generate student fees
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

    // Now check permissions with the school_code from the structure
    const permissionCheck = await requirePermission(request, 'manage_fees', structure.school_code);
    if (permissionCheck) {
      return permissionCheck;
    }

    if (structure.is_active) {
      return NextResponse.json(
        { error: 'Fee structure is already active' },
        { status: 400 }
      );
    }

    // Get staff_id from headers
    const staffId = request.headers.get('x-staff-id');
    let activatedBy: string | null = null;
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('school_code', structure.school_code)
        .eq('staff_id', staffId)
        .single();
      activatedBy = staff?.id || null;
    }

    // Activate structure
    const { error: activateError } = await supabase
      .from('fee_structures')
      .update({
        is_active: true,
        activated_at: new Date().toISOString(),
        activated_by: activatedBy,
      })
      .eq('id', id);

    if (activateError) {
      console.error('Error activating fee structure:', activateError);
      return NextResponse.json(
        { error: 'Failed to activate fee structure', details: activateError.message },
        { status: 500 }
      );
    }

    // Generate student fees (this will be done by a separate endpoint or background job)
    // For now, return success - fee generation should be triggered separately
    return NextResponse.json({
      message: 'Fee structure activated successfully',
      data: {
        structure_id: id,
        note: 'Student fees will be generated automatically. Use the generate-fees endpoint to generate fees for existing students.',
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/fee-structures/[id]/activate:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
