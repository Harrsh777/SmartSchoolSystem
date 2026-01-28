import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseFetchOptions } from '@/lib/supabase-fetch';

const getServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    getSupabaseFetchOptions()
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
      .select('*', { count: 'exact' })
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`visitor_name.ilike.%${search}%,purpose_of_visit.ilike.%${search}%,person_to_meet.ilike.%${search}%`);
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
      phone_number,
      email,
      purpose_of_visit,
      person_to_meet,
      person_to_meet_id,
      person_to_meet_type,
      visit_date,
      time_in,
      id_proof_type,
      id_proof_number,
      vehicle_number,
      remarks,
      created_by,
    } = body;

    if (!school_code || !visitor_name || !purpose_of_visit || !person_to_meet || !created_by) {
      return NextResponse.json(
        { error: 'School code, visitor name, purpose of visit, person to meet, and created by are required' },
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

    // Validate person_to_meet_type if provided
    if (person_to_meet_type && !['staff', 'student', 'other'].includes(person_to_meet_type)) {
      return NextResponse.json(
        { error: 'person_to_meet_type must be one of: staff, student, other' },
        { status: 400 }
      );
    }

    const { data: visitor, error } = await supabase
      .from('visitors')
      .insert({
        school_id: school.id,
        school_code,
        visitor_name,
        phone_number: phone_number || null,
        email: email || null,
        purpose_of_visit,
        person_to_meet,
        person_to_meet_id: person_to_meet_id || null,
        person_to_meet_type: person_to_meet_type || null,
        visit_date: visit_date || new Date().toISOString().split('T')[0],
        time_in: time_in || new Date().toTimeString().split(' ')[0].substring(0, 5),
        id_proof_type: id_proof_type || null,
        id_proof_number: id_proof_number || null,
        vehicle_number: vehicle_number || null,
        remarks: remarks || null,
        created_by,
        status: 'IN',
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

