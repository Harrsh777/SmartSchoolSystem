import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// PATCH - Update student leave request status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, rejected_reason, updated_by } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be approved or rejected' }, { status: 400 });
    }

    interface StudentLeaveRequestUpdateData {
      status: string;
      updated_at: string;
      updated_by?: string;
      rejected_reason?: string | null;
    }

    const updateData: StudentLeaveRequestUpdateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (updated_by) {
      updateData.updated_by = updated_by;
    }

    if (status === 'rejected' && rejected_reason) {
      updateData.rejected_reason = rejected_reason;
    } else if (status === 'approved') {
      updateData.rejected_reason = null;
    }

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from('student_leave_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating student leave request:', error);
      return NextResponse.json({ error: 'Failed to update student leave request' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in PATCH /api/leave/student-requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

