import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * POST /api/leave/requests/[id]/withdraw
 * Withdraw a leave request (only if status is pending)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleClient();

    // Get the leave request first
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('staff_leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json(
        { error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Only allow withdrawal if status is pending
    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot withdraw leave request. Current status: ${leaveRequest.status}. Only pending requests can be withdrawn.` },
        { status: 400 }
      );
    }

    // Update status to 'withdrawn'
    const { error: updateError } = await supabase
      .from('staff_leave_requests')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error withdrawing leave request:', updateError);
      return NextResponse.json(
        { error: 'Failed to withdraw leave request', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Leave request withdrawn successfully',
      data: {
        id,
        status: 'withdrawn',
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in POST /api/leave/requests/[id]/withdraw:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
