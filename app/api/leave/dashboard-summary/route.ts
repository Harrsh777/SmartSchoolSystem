import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

/**
 * GET /api/leave/dashboard-summary?school_code=SCH001
 * Returns staff/student leave taken and left for the leave dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // Staff count
    const { count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    const numStaff = staffCount ?? 0;

    // Student count (for student leave left if types have max_days)
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode);

    const numStudents = studentCount ?? 0;

    // Leave types (id, abbreviation, name, max_days)
    const { data: leaveTypes, error: typesError } = await supabase
      .from('leave_types')
      .select('id, abbreviation, name, max_days')
      .eq('school_code', schoolCode);

    if (typesError) {
      console.error('Error fetching leave types:', typesError);
      return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
    }

    const types = leaveTypes ?? [];

    // All approved staff leave requests (raw: leave_type_id, total_days)
    const { data: staffApproved, error: staffErr } = await supabase
      .from('staff_leave_requests')
      .select('leave_type_id, total_days')
      .eq('school_code', schoolCode)
      .eq('status', 'approved');

    if (staffErr) {
      console.error('Error fetching staff leave requests:', staffErr);
      return NextResponse.json({ error: 'Failed to fetch staff leave' }, { status: 500 });
    }

    const staffLeaves = staffApproved ?? [];

    // Staff leave taken = sum of approved total_days
    const staffLeaveTaken = staffLeaves.reduce((sum: number, r: { total_days?: number | null }) => sum + (r.total_days ?? 0), 0);

    // Staff leave left: per type (max_days * staff_count - used), then sum
    const usedByTypeStaff = new Map<string, number>();
    for (const r of staffLeaves) {
      const tid = r.leave_type_id;
      if (!tid) continue;
      usedByTypeStaff.set(tid, (usedByTypeStaff.get(tid) ?? 0) + (r.total_days ?? 0));
    }
    let staffLeaveLeft = 0;
    for (const lt of types) {
      const maxDays = lt.max_days;
      if (maxDays == null) continue;
      const used = usedByTypeStaff.get(lt.id) ?? 0;
      const budget = maxDays * numStaff;
      staffLeaveLeft += Math.max(0, budget - used);
    }

    // All approved student leave requests
    const { data: studentApproved, error: studentErr } = await supabase
      .from('student_leave_requests')
      .select('leave_type_id, total_days')
      .eq('school_code', schoolCode)
      .eq('status', 'approved');

    if (studentErr) {
      console.error('Error fetching student leave requests:', studentErr);
      return NextResponse.json({ error: 'Failed to fetch student leave' }, { status: 500 });
    }

    const studentLeaves = studentApproved ?? [];

    const studentLeaveTaken = studentLeaves.reduce((sum: number, r: { total_days?: number | null }) => sum + (r.total_days ?? 0), 0);

    const usedByTypeStudent = new Map<string, number>();
    for (const r of studentLeaves) {
      const tid = r.leave_type_id;
      if (!tid) continue;
      usedByTypeStudent.set(tid, (usedByTypeStudent.get(tid) ?? 0) + (r.total_days ?? 0));
    }
    let studentLeaveLeft = 0;
    for (const lt of types) {
      const maxDays = lt.max_days;
      if (maxDays == null) continue;
      const used = usedByTypeStudent.get(lt.id) ?? 0;
      const budget = maxDays * numStudents;
      studentLeaveLeft += Math.max(0, budget - used);
    }

    // Pending request counts
    const { count: staffPendingCount } = await supabase
      .from('staff_leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'pending');

    const { count: studentPendingCount } = await supabase
      .from('student_leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('school_code', schoolCode)
      .eq('status', 'pending');

    return NextResponse.json({
      data: {
        staff_leave_taken: staffLeaveTaken,
        staff_leave_left: staffLeaveLeft,
        staff_pending_requests: staffPendingCount ?? 0,
        student_leave_taken: studentLeaveTaken,
        student_leave_left: studentLeaveLeft,
        student_pending_requests: studentPendingCount ?? 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/leave/dashboard-summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
