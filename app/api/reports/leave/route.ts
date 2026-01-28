import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();

    // Fetch all staff leave requests
    const { data: staffLeaveRequests, error: staffLeaveError } = await supabase
      .from('staff_leave_requests')
      .select(`
        *,
        staff:staff!staff_leave_requests_staff_id_fkey(
          full_name,
          staff_id,
          role,
          department
        ),
        leave_type:leave_types!staff_leave_requests_leave_type_id_fkey(
          abbreviation,
          name,
          max_days,
          staff_type
        )
      `)
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (staffLeaveError) {
      return NextResponse.json(
        { error: 'Failed to fetch staff leave data', details: staffLeaveError.message },
        { status: 500 }
      );
    }

    // Fetch all student leave requests
    const { data: studentLeaveRequests, error: studentLeaveError } = await supabase
      .from('student_leave_requests')
      .select(`
        *,
        student:students!student_leave_requests_student_id_fkey(
          student_name,
          admission_no,
          class,
          section
        )
      `)
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (studentLeaveError) {
      console.error('Error fetching student leave requests:', studentLeaveError);
    }

    // Fetch all leave types
    const { data: leaveTypes, error: leaveTypesError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('school_code', schoolCode)
      .order('name', { ascending: true });

    if (leaveTypesError) {
      console.error('Error fetching leave types:', leaveTypesError);
    }

    // Convert to CSV
    if ((!staffLeaveRequests || staffLeaveRequests.length === 0) && 
        (!studentLeaveRequests || studentLeaveRequests.length === 0) &&
        (!leaveTypes || leaveTypes.length === 0)) {
      return new NextResponse('No leave data available', {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="leave_report_${schoolCode}.csv"`,
        },
      });
    }

    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };

    // Create CSV with leave information
    const csvHeader = [
      'Leave Type',
      'Leave Type Name',
      'Requester Type',
      'Requester Name',
      'Requester ID',
      'Class',
      'Section',
      'Role',
      'Department',
      'Applied Date',
      'Start Date',
      'End Date',
      'Total Days',
      'Status',
      'Comment',
      'Reason',
      'Rejected Reason',
      'Withdrawn At',
      'Approved By',
      'Approved At',
      'Created At',
    ].join(',') + '\n';

    const csvRows: string[] = [];

    // Process staff leave requests
    staffLeaveRequests?.forEach((request: {
      leave_type_id?: string;
      staff_id?: string;
      leave_applied_date?: string;
      leave_start_date?: string;
      leave_end_date?: string;
      total_days?: number;
      status?: string;
      comment?: string;
      reason?: string;
      rejected_reason?: string;
      withdrawn_at?: string;
      approved_by?: string;
      approved_at?: string;
      created_at?: string;
      staff?: { full_name?: string; staff_id?: string; role?: string; department?: string } | Array<{ full_name?: string; staff_id?: string; role?: string; department?: string }>;
      leave_type?: { abbreviation?: string; name?: string; max_days?: number; staff_type?: string } | Array<{ abbreviation?: string; name?: string; max_days?: number; staff_type?: string }>;
      [key: string]: unknown;
    }) => {
      const staff = Array.isArray(request.staff) ? request.staff[0] : request.staff as { full_name?: string; staff_id?: string; role?: string; department?: string } | undefined;
      const leaveType = Array.isArray(request.leave_type) ? request.leave_type[0] : request.leave_type as { abbreviation?: string; name?: string; max_days?: number; staff_type?: string } | undefined;

      csvRows.push([
        leaveType?.abbreviation || '',
        leaveType?.name || '',
        'Staff',
        staff?.full_name || '',
        staff?.staff_id || '',
        '',
        '',
        staff?.role || '',
        staff?.department || '',
        request.leave_applied_date || '',
        request.leave_start_date || '',
        request.leave_end_date || '',
        request.total_days || 0,
        request.status || '',
        request.comment || '',
        request.reason || '',
        request.rejected_reason || '',
        request.withdrawn_at || '',
        request.approved_by || '',
        request.approved_at || '',
        request.created_at || '',
      ].map(escapeCsvValue).join(','));
    });

    // Process student leave requests
    studentLeaveRequests?.forEach((request: {
      leave_type_id?: string;
      student_id?: string;
      leave_applied_date?: string;
      leave_start_date?: string;
      leave_end_date?: string;
      total_days?: number;
      status?: string;
      comment?: string;
      reason?: string;
      rejected_reason?: string;
      withdrawn_at?: string;
      approved_by?: string;
      approved_at?: string;
      created_at?: string;
      student?: { student_name?: string; admission_no?: string; class?: string; section?: string } | Array<{ student_name?: string; admission_no?: string; class?: string; section?: string }>;
      [key: string]: unknown;
    }) => {
      const student = Array.isArray(request.student) ? request.student[0] : request.student as { student_name?: string; admission_no?: string; class?: string; section?: string } | undefined;

      // Find leave type
      const leaveType = leaveTypes?.find((lt: { id?: string }) => lt.id === request.leave_type_id);

      csvRows.push([
        leaveType?.abbreviation || '',
        leaveType?.name || '',
        'Student',
        student?.student_name || '',
        student?.admission_no || '',
        student?.class || '',
        student?.section || '',
        '',
        '',
        request.leave_applied_date || '',
        request.leave_start_date || '',
        request.leave_end_date || '',
        request.total_days || 0,
        request.status || '',
        request.comment || '',
        request.reason || '',
        request.rejected_reason || '',
        request.withdrawn_at || '',
        request.approved_by || '',
        request.approved_at || '',
        request.created_at || '',
      ].map(escapeCsvValue).join(','));
    });

    // Add leave types information
    leaveTypes?.forEach((leaveType: {
      abbreviation?: string;
      name?: string;
      max_days?: number;
      staff_type?: string;
      description?: string;
      is_active?: boolean;
      created_at?: string;
      [key: string]: unknown;
    }) => {
      csvRows.push([
        leaveType.abbreviation || '',
        leaveType.name || '',
        'Leave Type',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        leaveType.max_days || 0,
        leaveType.is_active ? 'Active' : 'Inactive',
        leaveType.description || '',
        '',
        '',
        '',
        '',
        '',
        leaveType.created_at || '',
      ].map(escapeCsvValue).join(','));
    });

    const csvContent = csvHeader + csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leave_report_${schoolCode}_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating leave report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
