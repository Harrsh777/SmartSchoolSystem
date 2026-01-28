import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch student leave requests for a class teacher's students
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const teacherId = searchParams.get('teacher_id');
    const staffId = searchParams.get('staff_id');
    const status = searchParams.get('status'); // Optional: filter by status

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    if (!teacherId && !staffId) {
      return NextResponse.json({ error: 'Either teacher_id or staff_id is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();

    // First, find all classes where this teacher is the class teacher
    let classesQuery = supabase
      .from('classes')
      .select('id, class, section, academic_year')
      .eq('school_code', schoolCode);

    // Check both class_teacher_id and class_teacher_staff_id
    const conditions: string[] = [];
    if (teacherId) {
      conditions.push(`class_teacher_id.eq.${teacherId}`);
    }
    if (staffId) {
      conditions.push(`class_teacher_staff_id.eq.${staffId}`);
    }

    if (conditions.length > 0) {
      classesQuery = classesQuery.or(conditions.join(','));
    }

    const { data: classes, error: classesError } = await classesQuery;

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json({ 
        error: 'Failed to fetch classes', 
        details: classesError.message 
      }, { status: 500 });
    }

    if (!classes || classes.length === 0) {
      // Teacher is not a class teacher, return empty array
      return NextResponse.json({ data: [] });
    }

    // Get all students from these classes
    const studentQueries = classes.map((cls) => 
      supabase
        .from('students')
        .select('id')
        .eq('school_code', schoolCode)
        .eq('class', cls.class)
        .eq('section', cls.section)
        .eq('academic_year', cls.academic_year)
    );

    const studentResults = await Promise.all(studentQueries);
    const allStudentIds: string[] = [];
    
    studentResults.forEach((result) => {
      if (result.data) {
        result.data.forEach((student: { id: string }) => {
          allStudentIds.push(student.id);
        });
      }
    });

    if (allStudentIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Fetch leave requests for these students
    let leaveQuery = supabase
      .from('student_leave_requests')
      .select('*')
      .eq('school_code', schoolCode)
      .in('student_id', allStudentIds)
      .order('leave_applied_date', { ascending: false });

    if (status) {
      leaveQuery = leaveQuery.eq('status', status);
    }

    const { data: leaveRequests, error: leaveError } = await leaveQuery;

    if (leaveError) {
      console.error('Error fetching student leave requests:', leaveError);
      
      if (leaveError.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found',
          details: 'The student_leave_requests table does not exist.',
          code: 'TABLE_NOT_FOUND'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch student leave requests', 
        details: leaveError.message 
      }, { status: 500 });
    }

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique student IDs and leave type IDs
    interface StudentLeaveRequest {
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
      rejected_reason?: string | null;
      class_teacher_approved?: boolean | null;
      class_teacher_approval_date?: string | null;
      class_teacher_rejection_reason?: string | null;
    }

    const studentIds = [...new Set(leaveRequests.map((lr: StudentLeaveRequest) => lr.student_id).filter(Boolean))];
    const leaveTypeIds = [...new Set(leaveRequests.map((lr: StudentLeaveRequest) => lr.leave_type_id).filter(Boolean))];

    // Fetch student information
    let studentsData = null;
    if (studentIds.length > 0) {
      const { data, error: studentsError } = await supabase
        .from('students')
        .select('id, student_name, admission_no, class, section')
        .in('id', studentIds);
      
      if (studentsError) {
        console.error('Error fetching students:', studentsError);
      } else {
        studentsData = data;
      }
    }

    // Fetch leave types
    let leaveTypesData = null;
    if (leaveTypeIds.length > 0) {
      const { data, error: leaveTypesError } = await supabase
        .from('leave_types')
        .select('id, abbreviation, name')
        .in('id', leaveTypeIds);
      
      if (leaveTypesError) {
        console.error('Error fetching leave types:', leaveTypesError);
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

    // Transform the data
    const transformedData = leaveRequests.map((item: StudentLeaveRequest) => {
      const student = studentsMap.get(item.student_id);
      const leaveType = leaveTypesMap.get(item.leave_type_id);
      
      // Calculate total_days if not present
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
        status: item.status,
        rejected_reason: item.rejected_reason || null,
        class_teacher_approved: item.class_teacher_approved || null,
        class_teacher_approval_date: item.class_teacher_approval_date || null,
        class_teacher_rejection_reason: item.class_teacher_rejection_reason || null,
      };
    });

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in GET /api/leave/student-requests/class-teacher:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
