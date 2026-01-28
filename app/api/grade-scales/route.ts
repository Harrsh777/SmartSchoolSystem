import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch grade scales for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Build query
    let query = supabase
      .from('grade_scales')
      .select('*')
      .eq('school_code', schoolCode)
      .eq('is_active', true)
      .order('display_order', { ascending: false }); // Higher grade points first

    // Filter by academic year if provided
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    } else {
      // If no academic year specified, get the most recent or null academic_year
      query = query.or('academic_year.is.null,academic_year.eq.' + academicYear);
    }

    const { data: gradeScales, error } = await query;

    if (error) {
      console.error('Error fetching grade scales:', error);
      
      // Handle table not found error
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found',
          details: 'The grade_scales table does not exist. Please run the grade_scales_schema.sql migration script to create it.',
          code: 'TABLE_NOT_FOUND',
          hint: 'Run the SQL migration: grade_scales_schema.sql'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch grade scales', 
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    // If no grade scales found, return empty array
    if (!gradeScales || gradeScales.length === 0) {
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: gradeScales });
  } catch (error) {
    console.error('Error in GET /api/grade-scales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new grade scale
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, grade, min_marks, max_marks, grade_point, description, academic_year, display_order } = body;

    if (!school_code || !grade || min_marks === undefined || max_marks === undefined || grade_point === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate marks range
    if (min_marks < 0 || max_marks < 0 || min_marks > max_marks) {
      return NextResponse.json({ error: 'Invalid marks range' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    
    // Get school_id
    const { data: school, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('grade_scales')
      .insert({
        school_id: school.id,
        school_code,
        grade,
        min_marks,
        max_marks,
        grade_point,
        description: description || null,
        academic_year: academic_year || null,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating grade scale:', error);
      
      // Handle specific database errors
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Database table not found',
          details: 'The grade_scales table does not exist. Please run the grade_scales_schema.sql migration script to create it.',
          code: 'TABLE_NOT_FOUND',
          hint: 'Run the SQL migration: grade_scales_schema.sql'
        }, { status: 500 });
      }
      
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Duplicate grade scale',
          details: 'A grade scale with this grade already exists for this school and academic year.',
          code: 'DUPLICATE_GRADE'
        }, { status: 409 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create grade scale',
        details: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/grade-scales:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
