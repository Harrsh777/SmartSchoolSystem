import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/fees/academic-years
 * Get all academic years for a school
 */
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

    const { data: years, error } = await supabase
      .from('academic_years')
      .select('*')
      .eq('school_code', schoolCode)
      .order('start_date', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch academic years', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: years || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fees/academic-years
 * Create a new academic year
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, year_name, start_date, end_date, is_current } = body;

    if (!school_code || !year_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'School code, year name, start date, and end date are required' },
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

    // If setting as current, unset other current years
    if (is_current) {
      await supabase
        .from('academic_years')
        .update({ is_current: false })
        .eq('school_code', school_code);
    }

    const { data: year, error } = await supabase
      .from('academic_years')
      .insert([{
        school_id: schoolData.id,
        school_code,
        year_name,
        start_date,
        end_date,
        is_current: is_current || false,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create academic year', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: year }, { status: 201 });
  } catch (error) {
    console.error('Error creating academic year:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

