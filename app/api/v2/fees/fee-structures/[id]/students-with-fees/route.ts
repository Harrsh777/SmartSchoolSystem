import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { requirePermission } from '@/lib/api-permissions';

/**
 * GET /api/v2/fees/fee-structures/[id]/students-with-fees
 * Returns list of students who have at least one generated fee record for this fee structure.
 * Used when deactivating to show a warning.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const permissionCheck = await requirePermission(request, 'view_fees');
    if (permissionCheck) {
      return permissionCheck;
    }

    const { id: structureId } = await params;
    const supabase = getServiceRoleClient();

    const { data: structure, error: structureError } = await supabase
      .from('fee_structures')
      .select('id, school_code')
      .eq('id', structureId)
      .single();

    if (structureError || !structure) {
      return NextResponse.json(
        { error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    const { data: feeRows, error } = await supabase
      .from('student_fees')
      .select('student_id')
      .eq('fee_structure_id', structureId)
      .eq('school_code', (structure.school_code || '').toUpperCase());

    if (error) {
      console.error('Error fetching students with fees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch students with fees' },
        { status: 500 }
      );
    }

    const uniqueStudentIds = Array.from(new Set((feeRows || []).map((r) => r.student_id).filter(Boolean)));
    if (uniqueStudentIds.length === 0) {
      return NextResponse.json({
        data: { students: [], count: 0 },
      });
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, student_name, admission_no, class, section')
      .in('id', uniqueStudentIds)
      .order('student_name');

    if (studentsError) {
      console.error('Error fetching student names:', studentsError);
      return NextResponse.json({
        data: { students: [], count: uniqueStudentIds.length },
      });
    }

    return NextResponse.json({
      data: {
        students: students || [],
        count: (students || []).length,
      },
    });
  } catch (error) {
    console.error('Error in GET fee-structures/[id]/students-with-fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
