import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch today's student attendance with status breakdown
    const { data: studentAttendance } = await supabase
      .from('student_attendance')
      .select('status, student_id')
      .eq('school_code', schoolCode)
      .eq('attendance_date', today);

    // Get total students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'active');

    // Calculate student attendance breakdown
    const studentStats = {
      present: studentAttendance?.filter(a => a.status === 'present').length || 0,
      absent: studentAttendance?.filter(a => a.status === 'absent').length || 0,
      halfday: studentAttendance?.filter(a => a.status === 'halfday' || a.status === 'half_day').length || 0,
      leave: studentAttendance?.filter(a => a.status === 'leave').length || 0,
      dutyLeave: studentAttendance?.filter(a => a.status === 'duty_leave' || a.status === 'duty leave').length || 0,
      notMarked: (totalStudents || 0) - (studentAttendance?.length || 0),
      total: totalStudents || 0,
    };

    // Fetch today's staff attendance with status breakdown
    const { data: staffAttendance } = await supabase
      .from('staff_attendance')
      .select('status, staff_id')
      .eq('school_code', schoolCode)
      .eq('attendance_date', today);

    // Get total staff
    const { count: totalStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    // Calculate staff attendance breakdown
    // Valid statuses from staff_attendance: 'present', 'absent', 'late', 'half_day', 'leave', 'holiday'
    const staffStats = {
      present: staffAttendance?.filter(a => a.status === 'present').length || 0,
      absent: staffAttendance?.filter(a => a.status === 'absent').length || 0,
      halfday: staffAttendance?.filter(a => a.status === 'half_day' || a.status === 'halfday').length || 0,
      leave: staffAttendance?.filter(a => a.status === 'leave').length || 0,
      customLeaves: staffAttendance?.filter(a => a.status === 'late' || a.status === 'holiday').length || 0, // Group late and holiday as custom leaves
      notMarked: (totalStaff || 0) - (staffAttendance?.length || 0),
      total: totalStaff || 0,
    };

    // Fetch recent notices (active, published)
    const now = new Date();
    const { data: notices } = await supabase
      .from('notices')
      .select('id, title, message, category, priority, created_at, publish_at')
      .eq('school_code', schoolCode)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(5);

    // Filter published notices
    const publishedNotices = (notices || []).filter(notice => {
      if (!notice.publish_at) return true;
      return new Date(notice.publish_at) <= now;
    });

    // Fetch pending visitors
    const { data: pendingVisitors } = await supabase
      .from('visitors')
      .select('id, visitor_name, purpose_of_visit, created_at, status')
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    interface LeaveRecord {
      id: string;
      created_at: string;
      [key: string]: unknown;
    }

    // Fetch pending leave approvals (staff and student leaves)
    let pendingStaffLeaves: LeaveRecord[] = [];
    let pendingStudentLeaves: LeaveRecord[] = [];
    
    try {
      const { data: staffLeaves } = await supabase
        .from('staff_leaves')
        .select('id, staff_id, leave_type, leave_start_date, leave_end_date, created_at')
        .eq('school_code', schoolCode)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      pendingStaffLeaves = staffLeaves || [];
    } catch {
      // Table might not exist, that's okay
      console.log('Staff leaves table not available');
    }

    try {
      const { data: studentLeaves } = await supabase
        .from('student_leaves')
        .select('id, student_id, leave_title, leave_start_date, leave_end_date, created_at')
        .eq('school_code', schoolCode)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);
      pendingStudentLeaves = studentLeaves || [];
    } catch {
      // Table might not exist, that's okay
      console.log('Student leaves table not available');
    }

    // Combine leave approvals
    const pendingLeaves = [
      ...(pendingStaffLeaves || []).map((leave: LeaveRecord) => ({
        ...leave,
        type: 'staff',
      })),
      ...(pendingStudentLeaves || []).map((leave: LeaveRecord) => ({
        ...leave,
        type: 'student',
      })),
    ].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 10);

    return NextResponse.json({
      data: {
        attendance: {
          students: studentStats,
          staff: staffStats,
        },
        recentUpdates: {
          notices: publishedNotices || [],
          visitors: pendingVisitors || [],
          leaves: pendingLeaves || [],
        },
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching administrative data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

