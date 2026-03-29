import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * DELETE /api/v2/fees/student-fees/[studentFeeId]/lines/[lineId]?school_code=
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ studentFeeId: string; lineId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const { studentFeeId, lineId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();

    const { data: fee } = await supabase
      .from('student_fees')
      .select('id, status')
      .eq('id', studentFeeId)
      .eq('school_code', code)
      .single();

    if (!fee) {
      return NextResponse.json({ error: 'Student fee not found' }, { status: 404 });
    }

    if (String(fee.status).toLowerCase() === 'paid') {
      return NextResponse.json({ error: 'Cannot modify a fully paid installment' }, { status: 400 });
    }

    const { error } = await supabase
      .from('student_fee_line_adjustments')
      .delete()
      .eq('id', lineId)
      .eq('student_fee_id', studentFeeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Removed' });
  } catch (e) {
    console.error('DELETE student-fee line', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
