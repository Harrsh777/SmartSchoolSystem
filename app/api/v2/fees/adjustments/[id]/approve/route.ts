import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST /api/v2/fees/adjustments/[id]/approve
 * Approve an adjustment and apply it to student_fee
 */
export async function POST(
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

    // Get adjustment
    const { data: adjustment, error: adjError } = await supabase
      .from('fee_adjustments')
      .select('*, student_fee:student_fee_id (*)')
      .eq('id', id)
      .single();

    if (adjError || !adjustment) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      );
    }

    if (adjustment.status !== 'pending') {
      return NextResponse.json(
        { error: `Adjustment is already ${adjustment.status}` },
        { status: 400 }
      );
    }

    // Get approver info
    const staffId = request.headers.get('x-staff-id');
    let approvedBy: string | null = null;
    let approverName = 'Staff';
    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id, full_name')
        .eq('school_code', adjustment.school_code)
        .eq('staff_id', staffId)
        .single();
      approvedBy = staff?.id || null;
      approverName = (staff as { full_name?: string } | null)?.full_name || staffId || 'Staff';
    }

    if (!approvedBy) {
      return NextResponse.json(
        { error: 'Approver information is required' },
        { status: 400 }
      );
    }

    // Update adjustment status
    const { error: updateError } = await supabase
      .from('fee_adjustments')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error approving adjustment:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve adjustment', details: updateError.message },
        { status: 500 }
      );
    }

    // Apply adjustment to student_fee
    const studentFee = adjustment.student_fee;
    if (studentFee) {
      const newAdjustmentAmount = (studentFee.adjustment_amount || 0) + parseFloat(adjustment.amount);

      const { error: feeUpdateError } = await supabase
        .from('student_fees')
        .update({ adjustment_amount: newAdjustmentAmount })
        .eq('id', adjustment.student_fee_id);

      if (feeUpdateError) {
        console.error('Error applying adjustment to student fee:', feeUpdateError);
        // Rollback adjustment status
        await supabase
          .from('fee_adjustments')
          .update({ status: 'pending', approved_by: null, approved_at: null })
          .eq('id', id);
        
        return NextResponse.json(
          { error: 'Failed to apply adjustment to student fee', details: feeUpdateError.message },
          { status: 500 }
        );
      }
    }

    // Audit log (Security & Action Audit dashboard)
    logAudit(request, {
      userId: approvedBy ?? undefined,
      userName: approverName,
      role: 'Accountant',
      actionType: 'APPROVED',
      entityType: 'FEE',
      entityId: id,
      severity: 'MEDIUM',
      metadata: { adjustment_amount: adjustment.amount },
    });

    return NextResponse.json({
      message: 'Adjustment approved and applied successfully',
      data: { adjustment_id: id },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/v2/fees/adjustments/[id]/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
