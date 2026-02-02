import { getServiceRoleClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    if (!fromDate || !toDate) {
      return NextResponse.json({ error: 'From date and to date are required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Fetch attendance records with student and staff information
    const { data: attendanceRecords, error: attendanceError } = await supabase
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

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ error: attendanceError.message }, { status: 500 });
    }

    // Format the data for CSV
    const formattedData = (attendanceRecords || []).map((record) => {
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

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error in attendance report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
