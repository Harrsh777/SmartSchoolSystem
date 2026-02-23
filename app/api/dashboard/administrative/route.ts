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

    const noticesArePending = publishedNotices.length > 0;
    // If no published active notices, fetch history (all recent notices regardless of status)
    if (publishedNotices.length === 0) {
      const { data: allNotices } = await supabase
        .from('notices')
        .select('id, title, content, category, priority, created_at, publish_at')
        .eq('school_code', schoolCode)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allNotices && allNotices.length > 0) {
        publishedNotices = allNotices.filter(notice => {
          if (!notice.publish_at) return true;
          return new Date(notice.publish_at) <= now;
        }).map(notice => ({
          ...notice,
          message: notice.content,
        }));
      }
    }

    // Visitors: pending = status 'pending' OR 'IN' (currently on campus); else show history
    let pendingVisitors: Array<{ id: string; visitor_name: string; purpose_of_visit: string; created_at?: string; status?: string }> = [];
    const { data: visitorsPending } = await supabase
      .from('visitors')
      .select('id, visitor_name, purpose_of_visit, created_at, status')
      .eq('school_code', schoolCode)
      .in('status', ['pending', 'IN'])
      .order('created_at', { ascending: false })
      .limit(10);
    pendingVisitors = visitorsPending || [];

    let visitorsToShow = pendingVisitors;
    const visitorsArePending = visitorsToShow.length > 0;
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

    // Leaves: use staff_leave_requests and student_leave_requests (pending first, then history)
    interface LeaveRecord {
      id: string;
      leave_type_id?: string;
      leave_start_date?: string | null;
      leave_end_date?: string | null;
      leave_type?: string;
      leave_title?: string | null;
      created_at?: string;
      leave_applied_date?: string | null;
      [key: string]: unknown;
    }

    let pendingStaffLeaves: LeaveRecord[] = [];
    let pendingStudentLeaves: LeaveRecord[] = [];
    let staffLeavesArePending = false;
    let studentLeavesArePending = false;

    const { data: staffLeavesPending } = await supabase
      .from('staff_leave_requests')
      .select('id, staff_id, leave_type_id, leave_start_date, leave_end_date, leave_applied_date, created_at')
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .order('leave_applied_date', { ascending: false })
      .limit(10);
    if (staffLeavesPending && staffLeavesPending.length > 0) {
      pendingStaffLeaves = staffLeavesPending;
      staffLeavesArePending = true;
    }

    const { data: studentLeavesPending } = await supabase
      .from('student_leave_requests')
      .select('id, student_id, leave_type_id, leave_title, leave_start_date, leave_end_date, leave_applied_date, created_at')
      .eq('school_code', schoolCode)
      .eq('status', 'pending')
      .order('leave_applied_date', { ascending: false })
      .limit(10);
    if (studentLeavesPending && studentLeavesPending.length > 0) {
      pendingStudentLeaves = studentLeavesPending;
      studentLeavesArePending = true;
    }

    const leavesArePending = staffLeavesArePending || studentLeavesArePending;

    if (pendingStaffLeaves.length === 0 && pendingStudentLeaves.length === 0) {
      const { data: prevStaff } = await supabase
        .from('staff_leave_requests')
        .select('id, staff_id, leave_type_id, leave_start_date, leave_end_date, leave_applied_date, created_at')
        .eq('school_code', schoolCode)
        .order('leave_applied_date', { ascending: false })
        .limit(10);
      if (prevStaff && prevStaff.length > 0) pendingStaffLeaves = prevStaff;

      const { data: prevStudent } = await supabase
        .from('student_leave_requests')
        .select('id, student_id, leave_type_id, leave_title, leave_start_date, leave_end_date, leave_applied_date, created_at')
        .eq('school_code', schoolCode)
        .order('leave_applied_date', { ascending: false })
        .limit(10);
      if (prevStudent && prevStudent.length > 0) pendingStudentLeaves = prevStudent;
    }

    const leaveTypeIds = [
      ...(pendingStaffLeaves?.map((l: LeaveRecord) => l.leave_type_id).filter(Boolean) || []),
      ...(pendingStudentLeaves?.map((l: LeaveRecord) => l.leave_type_id).filter(Boolean) || []),
    ];
    const uniqueLeaveTypeIds = [...new Set(leaveTypeIds)] as string[];
    let leaveTypesMap: Record<string, string> = {};
    if (uniqueLeaveTypeIds.length > 0) {
      const { data: leaveTypes } = await supabase
        .from('leave_types')
        .select('id, name, abbreviation')
        .in('id', uniqueLeaveTypeIds);
      if (leaveTypes) {
        leaveTypesMap = Object.fromEntries(
          leaveTypes.map((lt: { id: string; name?: string; abbreviation?: string }) => [lt.id, lt.name || lt.abbreviation || ''])
        );
      }
    }

    const mapStaffLeave = (leave: LeaveRecord) => ({
      id: leave.id,
      type: 'staff',
      leave_type: leave.leave_type_id ? leaveTypesMap[leave.leave_type_id] : undefined,
      leave_start_date: leave.leave_start_date,
      leave_end_date: leave.leave_end_date,
      created_at: leave.leave_applied_date || leave.created_at,
    });
    const mapStudentLeave = (leave: LeaveRecord) => ({
      id: leave.id,
      type: 'student',
      leave_title: leave.leave_title || (leave.leave_type_id ? leaveTypesMap[leave.leave_type_id] : undefined),
      leave_start_date: leave.leave_start_date,
      leave_end_date: leave.leave_end_date,
      created_at: leave.leave_applied_date || leave.created_at,
    });

    const pendingLeaves = [
      ...(pendingStaffLeaves || []).map(mapStaffLeave),
      ...(pendingStudentLeaves || []).map(mapStudentLeave),
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
          noticesArePending: noticesArePending,
          visitorsArePending: visitorsArePending,
          leavesArePending: leavesArePending,
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

