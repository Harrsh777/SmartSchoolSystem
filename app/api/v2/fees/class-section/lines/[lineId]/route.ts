import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * DELETE /api/v2/fees/class-section/lines/[lineId]?school_code=
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lineId: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'manage_fees');
    if (permissionCheck) return permissionCheck;

    const { lineId } = await params;
    const schoolCode = request.nextUrl.searchParams.get('school_code');
    if (!schoolCode) {
      return NextResponse.json({ error: 'school_code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    const code = schoolCode.toUpperCase();

    const { error } = await supabase
      .from('class_fee_line_adjustments')
      .delete()
      .eq('id', lineId)
      .ilike('school_code', code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Removed' });
  } catch (e) {
    console.error('DELETE class-section line', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
