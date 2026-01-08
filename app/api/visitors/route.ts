import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('visitors')
      .select(`
        *,
        student:students!visitors_student_id_fkey(
          id,
          student_name,
          admission_no
        ),
        host:staff!visitors_host_id_fkey(
          id,
          full_name,
          staff_id
        )
      `, { count: 'exact' })
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`visitor_name.ilike.%${search}%,purpose_of_visit.ilike.%${search}%,host_name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: visitors, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching visitors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch visitors', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: visitors || [],
      total: count || 0,
      page,
      limit,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      visitor_name,
      visitor_photo_url,
      purpose_of_visit,
      student_id,
      student_name,
      host_id,
      host_name,
      status = 'pending',
      requested_by = 'manual_entry',
      requested_by_staff_id,
      check_in_date,
      check_in_time,
      phone_number,
      email,
      id_proof_type,
      id_proof_number,
      id_proof_document_url,
      vehicle_number,
      remarks,
    } = body;

    if (!school_code || !visitor_name || !purpose_of_visit || !host_name) {
      return NextResponse.json(
        { error: 'School code, visitor name, purpose of visit, and host name are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();

    // Get school_id from school_code
    const { data: school } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const { data: visitor, error } = await supabase
      .from('visitors')
      .insert({
        school_id: school.id,
        school_code,
        visitor_name,
        visitor_photo_url,
        purpose_of_visit,
        student_id: student_id || null,
        student_name: student_name || null,
        host_id: host_id || null,
        host_name,
        status,
        requested_by,
        requested_by_staff_id: requested_by_staff_id || null,
        check_in_date: check_in_date || new Date().toISOString().split('T')[0],
        check_in_time: check_in_time || new Date().toTimeString().split(' ')[0].substring(0, 5),
        phone_number: phone_number || null,
        email: email || null,
        id_proof_type: id_proof_type || null,
        id_proof_number: id_proof_number || null,
        id_proof_document_url: id_proof_document_url || null,
        vehicle_number: vehicle_number || null,
        remarks: remarks || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating visitor:', error);
      return NextResponse.json(
        { error: 'Failed to create visitor', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: visitor }, { status: 201 });
  } catch (error) {
    console.error('Error creating visitor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

