import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/students/attendance-report
 * Returns student attendance data for a date range.
 * Query params: school_code (required), from_date, to_date (optional - default last 30 days)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    let fromDate = searchParams.get('from_date');
    let toDate = searchParams.get('to_date');
    const classParam = searchParams.get('class');
    const sectionParam = searchParams.get('section');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    // Default to last 30 days if dates not provided
    if (!fromDate || !toDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      fromDate = startDate.toISOString().split('T')[0];
      toDate = endDate.toISOString().split('T')[0];
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('student_attendance')
      .select(`
        id,
        attendance_date,
        status,
        marked_by,
        student:students!inner(
          id,
          student_name,
          admission_no,
          class,
          section
        ),
        staff:staff(
          id,
          full_name
        )
      `)
      .eq('school_code', schoolCode)
      .gte('attendance_date', fromDate)
      .lte('attendance_date', toDate)
      .order('attendance_date', { ascending: true });

    const { data: attendanceRecords, error: attendanceError } = await query;

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    let formattedData = (attendanceRecords || []).map((record) => {
      const student = record.student as {
        student_name?: string;
        admission_no?: string;
        class?: string;
        section?: string;
      };
      const staff = record.staff as { full_name?: string } | null;

      return {
        attendance_date: record.attendance_date,
        student_name: student?.student_name || 'Unknown',
        admission_no: student?.admission_no || '',
        class: student?.class || '',
        section: student?.section || '',
        status: record.status || 'Unknown',
        marked_by_name: staff?.full_name || 'N/A',
      };
    });

    if (classParam?.trim()) {
      formattedData = formattedData.filter((row) => row.class === classParam.trim());
    }
    if (sectionParam?.trim()) {
      formattedData = formattedData.filter((row) => row.section === sectionParam.trim());
    }

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error in student attendance report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
