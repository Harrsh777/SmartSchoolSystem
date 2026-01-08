import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    let query = supabase
      .from('student_leave_requests')
      .select(`
        *,
        student:student_id (
          id,
          student_name,
          admission_no,
          class,
          section
        ),
        leave_type:leave_type_id (
          id,
          abbreviation,
          name
        )
      `)
      .eq('school_code', schoolCode)
      .order('leave_applied_date', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching student leave requests:', error);
      return NextResponse.json({ error: 'Failed to fetch student leave requests' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedData = (data || []).map((item: any) => ({
      id: item.id,
      student_id: item.student_id,
      student_name: item.student?.student_name || '',
      admission_no: item.student?.admission_no || '',
      class: item.student?.class || '',
      section: item.student?.section || '',
      leave_type_id: item.leave_type_id,
      leave_type: item.leave_type?.abbreviation || '',
      leave_type_name: item.leave_type?.name || '',
      leave_title: item.leave_title || '',
      leave_applied_date: item.leave_applied_date,
      leave_start_date: item.leave_start_date,
      leave_end_date: item.leave_end_date,
      reason: item.reason || '',
      absent_form_submitted: item.absent_form_submitted || false,
      attachment: item.attachment || null,
      status: item.status,
      rejected_reason: item.rejected_reason || null,
    }));

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

    const { data, error } = await supabase
      .from('student_leave_requests')
      .insert({
        school_code,
        student_id,
        leave_type_id,
        leave_title: leave_title || '',
        leave_start_date,
        leave_end_date,
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

