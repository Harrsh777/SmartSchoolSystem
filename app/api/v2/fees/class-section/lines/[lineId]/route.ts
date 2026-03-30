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

    const { data: classLine, error: classLineErr } = await supabase
      .from('class_fee_line_adjustments')
      .select('id, fee_structure_id, class_name, section, due_month')
      .eq('id', lineId)
      .ilike('school_code', code)
      .maybeSingle();
    if (classLineErr) {
      return NextResponse.json({ error: classLineErr.message }, { status: 500 });
    }

    if (classLine) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .ilike('school_code', code)
        .ilike('class', String(classLine.class_name || ''))
        .ilike('section', String(classLine.section || ''))
        .limit(1000);
      const studentIds = (students || []).map((s) => String(s.id));
      if (studentIds.length > 0) {
        const { data: fees } = await supabase
          .from('student_fees')
          .select('id')
          .ilike('school_code', code)
          .eq('fee_structure_id', String(classLine.fee_structure_id))
          .eq('due_month', String(classLine.due_month || ''))
          .in('student_id', studentIds);
        const feeIds = (fees || []).map((f) => String(f.id));
        if (feeIds.length > 0) {
          const delSource = await supabase
            .from('student_fee_line_adjustments')
            .delete()
            .in('student_fee_id', feeIds)
            .eq('source_class_adjustment_id', String(lineId));
          if (
            delSource.error &&
            !/source_class_adjustment_id|does not exist|Could not find the 'source_class_adjustment_id' column/i.test(
              delSource.error.message || ''
            )
          ) {
            return NextResponse.json({ error: delSource.error.message }, { status: 500 });
          }
        }
      }
    }

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
