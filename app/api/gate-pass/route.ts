import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/gate-pass
 * Get all gate passes for a school
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const search = searchParams.get('search') || '';

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('gate_passes')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('out_date_time', { ascending: false });

    if (search) {
      query = query.ilike('person_name', `%${search}%`);
    }

    const { data: gatePasses, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch gate passes', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: gatePasses || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching gate passes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gate-pass
 * Create a new gate pass
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      person_type,
      person_id,
      person_name,
      purpose,
      leaving_with,
      permitted_by_1,
      permitted_by_1_name,
      permitted_by_2,
      permitted_by_2_name,
      out_date_time,
      in_date_time_tentative,
      mobile_number,
      remarks,
    } = body;

    if (!school_code || !person_type || !person_name || !purpose || !out_date_time) {
      return NextResponse.json(
        { error: 'School code, person type, person name, purpose, and out date time are required' },
        { status: 400 }
      );
    }

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const { data: gatePass, error } = await supabase
      .from('gate_passes')
      .insert([{
        school_id: schoolData.id,
        school_code,
        person_type,
        person_id: person_id || null,
        person_name,
        purpose,
        leaving_with: leaving_with || null,
        permitted_by_1: permitted_by_1 || null,
        permitted_by_1_name: permitted_by_1_name || null,
        permitted_by_2: permitted_by_2 || null,
        permitted_by_2_name: permitted_by_2_name || null,
        out_date_time,
        in_date_time_tentative: in_date_time_tentative || null,
        mobile_number: mobile_number || null,
        remarks: remarks || null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create gate pass', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: gatePass }, { status: 201 });
  } catch (error) {
    console.error('Error creating gate pass:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}



