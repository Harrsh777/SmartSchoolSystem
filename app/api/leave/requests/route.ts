import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    let query = supabase
      .from('staff_leave_requests')
      .select(`
        *,
        staff:staff_id (
          id,
          full_name,
          staff_id,
          role,
          department
        ),
        leave_type:leave_type_id (
          id,
          abbreviation,
          name
        )
      `)
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (staffId) {
      query = query.eq('staff_id', staffId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      staff_id: item.staff_id,
      staff_name: item.staff?.full_name || '',
      leave_type: item.leave_type?.abbreviation || '',
      leave_type_name: item.leave_type?.name || '',
      leave_applied_date: item.leave_applied_date,
      leave_start_date: item.leave_start_date,
      leave_end_date: item.leave_end_date,
      total_days: item.total_days,
      comment: item.comment || '',
      reason: item.reason || '',
      status: item.status,
      rejected_reason: item.rejected_reason || null,
    }));

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

    // Calculate total days
    const startDate = new Date(leave_start_date);
    const endDate = new Date(leave_end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const { data, error } = await supabase
      .from('staff_leave_requests')
      .insert({
        school_code,
        staff_id,
        leave_type_id,
        leave_start_date,
        leave_end_date,
        total_days,
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

