import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';
import { enrichStudentFeesWithAdjustments } from '@/lib/fees/enrich-student-fees';

/**
 * GET /api/student/fees
 * Student-facing fees endpoint (no RBAC header required).
 * Query params: school_code, student_id
 *
 * Returns: student_fees rows with computed late_fee, balance_due, total_due and fee_structure info.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');

    if (!schoolCode || !studentId) {
      return NextResponse.json(
        { error: 'school_code and student_id are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    const normalizedSchoolCode = schoolCode.toUpperCase().trim();

    // Verify student belongs to this school
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, school_code, class, section')
      .eq('id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: fees, error } = await supabase
      .from('student_fees')
      .select(`
        *,
        fee_structure:fee_structure_id (
          id,
          name,
          class_name,
          section,
          academic_year,
          late_fee_type,
          late_fee_value,
          grace_period_days
        )
      `)
      .eq('student_id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .order('due_month', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch student fees', details: error.message },
        { status: 500 }
      );
    }

    const studentCtx = {
      id: String(student.id),
      class: String(student.class ?? ''),
      section: student.section ?? null,
    };

    const feesWithComputed = await enrichStudentFeesWithAdjustments(
      supabase,
      normalizedSchoolCode,
      studentCtx,
      (fees || []) as never
    );

    return NextResponse.json({ data: feesWithComputed }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/student/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

