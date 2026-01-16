import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch leave requests
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const staffId = searchParams.get('staff_id');
    const status = searchParams.get('status');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Fetch leave requests
    let query = supabase
      .from('staff_leave_requests')
      .select('*')
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    if (!leaveRequests || leaveRequests.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique staff IDs and leave type IDs
    interface LeaveRequest {
      id: string;
      leave_applied_date: string | null;
      leave_start_date: string | null;
      leave_end_date: string | null;
      total_days: number | null;
      comment: string | null;
      reason: string | null;
      status: string | null;
      rejected_reason: string | null;
      staff_id: string;
      leave_type_id: string;
    }
    const staffIds = [...new Set(leaveRequests.map((lr: LeaveRequest) => lr.staff_id).filter(Boolean))];
    const leaveTypeIds = [...new Set(leaveRequests.map((lr: LeaveRequest) => lr.leave_type_id).filter(Boolean))];

    // Fetch staff information
    const { data: staffData } = await supabase
      .from('staff')
      .select('id, full_name, staff_id, role, department')
      .in('id', staffIds);

    // Fetch leave types
    const { data: leaveTypesData } = await supabase
      .from('leave_types')
      .select('id, abbreviation, name')
      .in('id', leaveTypeIds);

    // Create lookup maps
    interface Staff {
      id: string;
      full_name: string;
      staff_id: string;
      role: string;
      department: string;
    }
    interface LeaveType {
      id: string;
      abbreviation: string;
      name: string;
    }
    const staffMap = new Map((staffData || []).map((s: Staff) => [s.id, s]));
    const leaveTypesMap = new Map((leaveTypesData || []).map((lt: LeaveType) => [lt.id, lt]));

    // Transform the data to match the expected format
    const transformedData = leaveRequests.map((item: LeaveRequest) => {
      const staff = staffMap.get(item.staff_id);
      const leaveType = leaveTypesMap.get(item.leave_type_id);
      
      return {
        id: item.id,
        staff_id: item.staff_id,
        staff_name: staff?.full_name || '',
        leave_type: leaveType?.abbreviation || '',
        leave_type_name: leaveType?.name || '',
        leave_applied_date: item.leave_applied_date,
        leave_start_date: item.leave_start_date,
        leave_end_date: item.leave_end_date,
        total_days: item.total_days,
        comment: item.comment || '',
        reason: item.reason || '',
        status: item.status,
        rejected_reason: item.rejected_reason || null,
      };
    });

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Error in GET /api/leave/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new leave request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, staff_id, leave_type_id, leave_start_date, leave_end_date, comment, reason } = body;

    if (!school_code || !staff_id || !leave_type_id || !leave_start_date || !leave_end_date) {
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
      .from('staff_leave_requests')
      .insert({
        school_code,
        staff_id,
        leave_type_id,
        leave_start_date,
        leave_end_date,
        total_days: totalDays,
        comment: comment || '',
        reason: reason || '',
        status: 'pending',
        leave_applied_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating leave request:', error);
      return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/leave/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

