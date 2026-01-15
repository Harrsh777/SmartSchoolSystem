import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * PATCH /api/gate-pass/[id]
 * Update gate pass (approve, reject, mark returned)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, actual_return_time } = body;

    if (!status || !['pending', 'approved', 'rejected', 'active', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be pending, approved, rejected, active, or closed' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get current user (approver)
    const staffId = request.headers.get('x-staff-id');
    let approvedBy: string | null = null;
    let approvedByName: string | null = null;

    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('id', staffId)
        .single();
      if (staff) {
        approvedBy = staff.id;
        approvedByName = staff.full_name;
      }
    }

    // Get existing gate pass
    const { data: gatePass, error: fetchError } = await supabase
      .from('gate_passes')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !gatePass) {
      return NextResponse.json(
        { error: 'Gate pass not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved' && approvedBy) {
      updateData.approved_by = approvedBy;
      updateData.approved_by_name = approvedByName || gatePass.approved_by_name;
      updateData.approved_at = new Date().toISOString();
    }

    if (status === 'closed' && actual_return_time) {
      updateData.actual_return_time = actual_return_time;
      updateData.marked_returned_at = new Date().toISOString();
    }

    // Update gate pass
    const { data: updatedGatePass, error: updateError } = await supabase
      .from('gate_passes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating gate pass:', updateError);
      return NextResponse.json(
        { error: 'Failed to update gate pass', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedGatePass }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/gate-pass/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
