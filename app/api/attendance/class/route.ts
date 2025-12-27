import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');
    const date = searchParams.get('date');

    if (!schoolCode || !classId || !date) {
      return NextResponse.json(
        { error: 'school_code, class_id, and date are required' },
        { status: 400 }
      );
    }

    // Fetch attendance for the class on the specified date
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .select(`
        *,
        student:students!student_attendance_student_id_fkey(
          id,
          admission_no,
          student_name,
          first_name,
          last_name,
          class,
          section
        ),
        marked_by_staff:staff!student_attendance_marked_by_fkey(
          id,
          full_name,
          staff_id
        )
      `)
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .eq('attendance_date', date)
      .order('created_at', { ascending: true });

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: attendance || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

