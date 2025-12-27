import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');

    if (!schoolCode || !classId) {
      return NextResponse.json(
        { error: 'school_code and class_id are required' },
        { status: 400 }
      );
    }

    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch attendance for the class in the current month
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('status, attendance_date')
      .eq('school_code', schoolCode)
      .eq('class_id', classId)
      .gte('attendance_date', startOfMonth)
      .lte('attendance_date', endOfMonth);

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance statistics', details: attendanceError.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const total = attendance?.length || 0;
    const present = attendance?.filter(a => a.status === 'present').length || 0;
    const absent = attendance?.filter(a => a.status === 'absent').length || 0;
    const late = attendance?.filter(a => a.status === 'late').length || 0;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Get unique dates to count days with attendance
    const uniqueDates = new Set(attendance?.map(a => a.attendance_date) || []);
    const daysWithAttendance = uniqueDates.size;

    return NextResponse.json({
      data: {
        total,
        present,
        absent,
        late,
        percentage,
        daysWithAttendance,
        period: {
          start: startOfMonth,
          end: endOfMonth,
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class attendance statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

