import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/attendance/staff-monthly
 * Get staff attendance for a month (calendar view)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const department = searchParams.get('department'); // Optional filter
    const month = searchParams.get('month'); // Format: YYYY-MM (e.g., 2024-09)

    if (!schoolCode || !month) {
      return NextResponse.json(
        { error: 'school_code and month are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Parse month to get start and end dates
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get all staff members
    let staffQuery = supabase
      .from('staff')
      .select('id, staff_id, full_name, department')
      .eq('school_code', schoolCode)
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (department && department !== 'all') {
      staffQuery = staffQuery.eq('department', department);
    }

    const { data: staff, error: staffError } = await staffQuery;

    if (staffError) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    // Get attendance records for the month
    const staffIds = (staff || []).map(s => s.id);
    const attendanceQuery = supabase
      .from('staff_attendance')
      .select('staff_id, attendance_date, status')
      .eq('school_code', schoolCode)
      .in('staff_id', staffIds)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    const { data: attendance, error: attendanceError } = await attendanceQuery;

    if (attendanceError) {
      return NextResponse.json(
        { error: 'Failed to fetch attendance', details: attendanceError.message },
        { status: 500 }
      );
    }

    // Create a map of attendance by staff_id and date
    const attendanceMap = new Map<string, Map<string, string>>();
    (attendance || []).forEach((record: { staff_id: string; attendance_date: string; status: string }) => {
      if (!attendanceMap.has(record.staff_id)) {
        attendanceMap.set(record.staff_id, new Map());
      }
      const date = record.attendance_date.split('T')[0];
      attendanceMap.get(record.staff_id)!.set(date, record.status);
    });

    // Generate all dates in the month
    const dates: string[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(date);
    }

    // Build response with staff attendance matrix
    const staffAttendance = (staff || []).map((member) => {
      const memberAttendanceMap = attendanceMap.get(member.id) || new Map();
      const attendanceByDate: Record<string, string> = {};
      
      dates.forEach((date) => {
        const status = memberAttendanceMap.get(date);
        attendanceByDate[date] = status || 'not_marked';
      });

      return {
        staff_id: member.id,
        staff_code: member.staff_id || '',
        staff_name: member.full_name || '',
        department: member.department || '',
        attendance: attendanceByDate,
      };
    });

    return NextResponse.json({
      data: {
        month: month,
        dates: dates,
        staff_attendance: staffAttendance,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/attendance/staff-monthly:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
