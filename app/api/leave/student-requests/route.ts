import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch student leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Fetch student leave requests
    let query = supabase
      .from('student_leave_requests')
      .select('*')
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error } = await query;

    if (error) {
      console.error('Error fetching student leave requests:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch student leave requests', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique student IDs and leave type IDs
    interface StudentLeaveRequest {
      absent_form_submitted: boolean;
      attachment: null;
      rejected_reason: null;
      id: string;
      student_id: string;
      leave_type_id: string;
      leave_start_date?: string | null;
      leave_end_date?: string | null;
      total_days?: number | null;
      leave_applied_date?: string | null;
      leave_title?: string | null;
      reason?: string | null;
      status?: string | null;
      comment?: string | null;
    }
    const studentIds = [...new Set(leaveRequests.map((lr: StudentLeaveRequest) => lr.student_id).filter(Boolean))];
    const leaveTypeIds = [...new Set(leaveRequests.map((lr: StudentLeaveRequest) => lr.leave_type_id).filter(Boolean))];

    // Fetch student information (only if there are student IDs)
    let studentsData = null;
    if (studentIds.length > 0) {
      const { data, error: studentsError } = await supabase
        .from('students')
        .select('id, student_name, admission_no, class, section')
        .in('id', studentIds);
      
      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        // Continue without student data rather than failing completely
      } else {
        studentsData = data;
      }
    }

    // Fetch leave types (only if there are leave type IDs)
    let leaveTypesData = null;
    if (leaveTypeIds.length > 0) {
      const { data, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, abbreviation, name')
        .in('id', leaveTypeIds);
      
      if (leaveTypesError) {
        console.error('Error fetching leave types:', leaveTypesError);
        // Continue without leave type data rather than failing completely
      } else {
        leaveTypesData = data;
      }
    }

    // Create lookup maps
    interface Student {
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
    }
    interface LeaveType {
      id: string;
      abbreviation: string;
      name: string;
    }
    const studentsMap = new Map((studentsData || []).map((s: Student) => [s.id, s]));
    const leaveTypesMap = new Map((leaveTypesData || []).map((lt: LeaveType) => [lt.id, lt]));

    // Transform the data to match the expected format
    const transformedData = leaveRequests.map((item: StudentLeaveRequest) => {
      const student = studentsMap.get(item.student_id);
      const leaveType = leaveTypesMap.get(item.leave_type_id);
      
      // Calculate total_days if not present in database
      let totalDays = item.total_days;
      if (!totalDays && item.leave_start_date && item.leave_end_date) {
        const startDate = new Date(item.leave_start_date);
        const endDate = new Date(item.leave_end_date);
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      return {
        id: item.id,
        student_id: item.student_id,
        student_name: student?.student_name || '',
        admission_no: student?.admission_no || '',
        class: student?.class || '',
        section: student?.section || '',
        leave_type_id: item.leave_type_id,
        leave_type: leaveType?.abbreviation || '',
        leave_type_name: leaveType?.name || '',
        leave_title: item.leave_title || '',
        leave_applied_date: item.leave_applied_date,
        leave_start_date: item.leave_start_date,
        leave_end_date: item.leave_end_date,
        total_days: totalDays,
        reason: item.reason || '',
        absent_form_submitted: item.absent_form_submitted || false,
        attachment: item.attachment || null,
        status: item.status,
        rejected_reason: item.rejected_reason || null,
      };
    });

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in GET /api/leave/student-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new student leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, student_id, leave_type_id, leave_title, leave_start_date, leave_end_date, reason, absent_form_submitted } = body;

    if (!school_code || !student_id || !leave_type_id || !leave_start_date || !leave_end_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate date range
    const startDate = new Date(leave_start_date);
    const endDate = new Date(leave_end_date);
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Calculate total days (inclusive)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const supabase = getServiceRoleClient();
    // Validate max_days if leave type has a limit
    const { data: leaveType, error: leaveTypeError } = await supabase
      .from('leave_types')
      .select('max_days')
      .eq('id', leave_type_id)
      .single();

    if (!leaveTypeError && leaveType?.max_days && totalDays > leaveType.max_days) {
      return NextResponse.json({ 
        error: `Leave duration (${totalDays} days) exceeds maximum allowed (${leaveType.max_days} days) for this leave type` 
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('student_leave_requests')
      .insert({
        school_code,
        student_id,
        leave_type_id,
        leave_title: leave_title || '',
        leave_start_date,
        leave_end_date,
        total_days: totalDays,
        reason: reason || '',
        absent_form_submitted: absent_form_submitted || false,
        status: 'pending',
        leave_applied_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student leave request:', error);
      return NextResponse.json({ error: 'Failed to create student leave request' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/leave/student-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

