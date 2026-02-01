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

    // Run attendance + count queries in parallel to reduce latency
    const [studentAttendanceRes, totalStudentsRes, staffAttendanceRes, totalStaffRes] = await Promise.all([
      supabase.from('student_attendance').select('status, student_id').eq('school_code', schoolCode).eq('attendance_date', today),
      supabase.from('students').select('id', { count: 'exact', head: true }).eq('school_code', schoolCode).eq('status', 'active'),
      supabase.from('staff_attendance').select('status, staff_id').eq('school_code', schoolCode).eq('attendance_date', today),
      supabase.from('staff').select('id', { count: 'exact', head: true }).eq('school_code', schoolCode),
    ]);

    const { data: studentAttendance } = studentAttendanceRes;
    const { count: totalStudents } = totalStudentsRes;
    const { data: staffAttendance } = staffAttendanceRes;
    const { count: totalStaff } = totalStaffRes;

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

    // Calculate staff attendance breakdown
    // Valid statuses: 'present', 'absent', 'half_day', 'leave', 'holiday' (late removed)
    const staffStats = {
      present: staffAttendance?.filter(a => a.status === 'present').length || 0,
      absent: staffAttendance?.filter(a => a.status === 'absent').length || 0,
      halfday: staffAttendance?.filter(a => a.status === 'half_day' || a.status === 'halfday').length || 0,
      leave: staffAttendance?.filter(a => a.status === 'leave').length || 0,
      customLeaves: staffAttendance?.filter(a => a.status === 'holiday').length || 0,
      notMarked: (totalStaff || 0) - (staffAttendance?.length || 0),
      total: totalStaff || 0,
    };

    // Fetch recent notices (active, published) - try new ones first
    const now = new Date();
    const { data: notices } = await supabase
      .from('notices')
      .select('id, title, content, category, priority, created_at, publish_at')
      .eq('school_code', schoolCode)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(5);

    // Filter published notices and map content to message
    let publishedNotices = (notices || []).filter(notice => {
      if (!notice.publish_at) return true;
      return new Date(notice.publish_at) <= now;
    }).map(notice => ({
      ...notice,
      message: notice.content, // Map content to message for frontend compatibility
    }));

    // If no published active notices, fetch previous notices (all recent notices regardless of status)
    if (publishedNotices.length === 0) {
      const { data: allNotices } = await supabase
        .from('notices')
        .select('id, title, content, category, priority, created_at, publish_at')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (allNotices && allNotices.length > 0) {
        publishedNotices = allNotices.filter(notice => {
          if (!notice.publish_at) return true;
          return new Date(notice.publish_at) <= now;
        }).map(notice => ({
          ...notice,
          message: notice.content, // Map content to message for frontend compatibility
        }));
      }
    }

    // Fetch pending visitors - try new ones first
    const { data: pendingVisitors } = await supabase
      .from('visitors')
      .select('id, visitor_name, purpose_of_visit, created_at, status')
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    // If no pending visitors, fetch previous visitors (any status)
    let visitorsToShow = pendingVisitors || [];
    if (visitorsToShow.length === 0) {
      const { data: previousVisitors } = await supabase
        .from('visitors')
        .select('id, visitor_name, purpose_of_visit, created_at, status')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (previousVisitors && previousVisitors.length > 0) {
        visitorsToShow = previousVisitors;
      }
    }

    interface LeaveRecord {
      id: string;
      created_at: string;
      [key: string]: unknown;
    }

    // Fetch pending leave approvals (staff and student leaves) - try new ones first
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

    // If no pending leaves, fetch previous leaves (any status)
    if (pendingStaffLeaves.length === 0 && pendingStudentLeaves.length === 0) {
      try {
        const { data: previousStaffLeaves } = await supabase
          .from('staff_leaves')
          .select('id, staff_id, leave_type, leave_start_date, leave_end_date, created_at')
          .eq('school_code', schoolCode)
          .order('created_at', { ascending: false })
          .limit(10);
        if (previousStaffLeaves && previousStaffLeaves.length > 0) {
          pendingStaffLeaves = previousStaffLeaves;
        }
      } catch {
        console.log('Staff leaves table not available');
      }

      try {
        const { data: previousStudentLeaves } = await supabase
          .from('student_leaves')
          .select('id, student_id, leave_title, leave_start_date, leave_end_date, created_at')
          .eq('school_code', schoolCode)
          .order('created_at', { ascending: false })
          .limit(10);
        if (previousStudentLeaves && previousStudentLeaves.length > 0) {
          pendingStudentLeaves = previousStudentLeaves;
        }
      } catch {
        console.log('Student leaves table not available');
      }
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
          visitors: visitorsToShow || [],
          leaves: pendingLeaves || [],
        },
      },
    }, {
      status: 200,
      headers: { 'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Error fetching administrative data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

