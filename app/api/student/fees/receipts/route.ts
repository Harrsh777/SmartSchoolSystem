import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/student/fees/receipts
 * Student-facing receipts list (no RBAC header required).
 * Query params: school_code, student_id
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
      .select('id')
      .eq('id', studentId)
      .eq('school_code', normalizedSchoolCode)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const { data: receipts, error } = await supabase
      .from('receipts')
      .select(`
        id,
        receipt_no,
        issued_at,
        school_code,
        student_id,
        payment:payment_id (
          id,
          amount,
          payment_mode,
          payment_date
        )
      `)
      .eq('school_code', normalizedSchoolCode)
      .eq('student_id', studentId)
      .eq('is_cancelled', false)
      .order('issued_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch receipts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: receipts || [] }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/student/fees/receipts:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

