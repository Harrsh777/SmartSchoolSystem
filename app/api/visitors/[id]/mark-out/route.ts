import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

/**
 * PATCH /api/visitors/[id]/mark-out
 * Mark visitor as OUT (left campus)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { time_out } = body;

    const supabase = getServiceRoleClient();

    // Get current user (who marks out)
    const staffId = request.headers.get('x-staff-id');
    let markedOutBy: string | null = null;

    if (staffId) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('id', staffId)
        .single();
      if (staff) {
        markedOutBy = staff.id;
      }
    }

    // Get existing visitor
    const { data: visitor, error: fetchError } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !visitor) {
      return NextResponse.json(
        { error: 'Visitor not found' },
        { status: 404 }
      );
    }

    if (visitor.status === 'OUT') {
      return NextResponse.json(
        { error: 'Visitor is already marked as OUT' },
        { status: 400 }
      );
    }

    // Update visitor
    interface VisitorUpdateData {
      status: string;
      time_out: string;
      marked_out_by: string | null;
      marked_out_at: string;
      updated_at: string;
    }

    const updateData: VisitorUpdateData = {
      status: 'OUT',
      time_out: time_out || new Date().toTimeString().split(' ')[0].substring(0, 5),
      marked_out_by: markedOutBy,
      marked_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedVisitor, error: updateError } = await supabase
      .from('visitors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error marking visitor out:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark visitor out', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedVisitor }, { status: 200 });
  } catch (error) {
    console.error('Error in PATCH /api/visitors/[id]/mark-out:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
