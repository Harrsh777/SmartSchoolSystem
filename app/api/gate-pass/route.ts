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
      .order('date', { ascending: false })
      .order('time_out', { ascending: false });

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
      class: studentClass,
      section: studentSection,
      academic_year,
      pass_type,
      reason,
      date,
      time_out,
      expected_return_time,
      approved_by_name,
      created_by,
    } = body;

    // Validate required fields
    if (!school_code || !person_type || !person_name || !pass_type || !reason || !date || !time_out || !approved_by_name || !created_by) {
      return NextResponse.json(
        { error: 'School code, person type, person name, pass type, reason, date, time out, approved by name, and created by are required' },
        { status: 400 }
      );
    }

    // Validate person_type
    if (!['student', 'staff'].includes(person_type.toLowerCase())) {
      return NextResponse.json(
        { error: 'person_type must be either "student" or "staff"' },
        { status: 400 }
      );
    }

    // Validate pass_type
    if (!['early_leave', 'late_entry', 'half_day'].includes(pass_type)) {
      return NextResponse.json(
        { error: 'pass_type must be one of: early_leave, late_entry, half_day' },
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

    // Prepare insert data
    interface GatePassData {
      school_id: string;
      school_code: string;
      person_type: string;
      person_id: string | null;
      person_name: string;
      class?: string | null;
      section?: string | null;
      academic_year?: string | null;
      pass_type: string;
      reason: string;
      date: string;
      time_out: string;
      approved_by_name: string | null;
      status: string;
      created_by: string | null;
      expected_return_time: string | null;
    }

    const insertData: GatePassData = {
      school_id: schoolData.id,
      school_code,
      person_type: person_type.toLowerCase(),
      person_id: person_id || null,
      person_name,
      pass_type,
      reason,
      date,
      time_out,
      approved_by_name,
      status: 'pending',
      created_by,
      expected_return_time: expected_return_time || null,
    };

    // Add class/section/academic_year for students
    if (person_type.toLowerCase() === 'student') {
      insertData.class = studentClass || null;
      insertData.section = studentSection || null;
      insertData.academic_year = academic_year || null;
    }

    const { data: gatePass, error } = await supabase
      .from('gate_passes')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating gate pass:', error);
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



