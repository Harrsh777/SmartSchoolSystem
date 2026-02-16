import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch all leave types for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const staffType = searchParams.get('staff_type');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    // Normalize to uppercase so Leave Basics (path) and teacher apply-leave (session) both match DB
    const normalizedCode = String(schoolCode).trim().toUpperCase();

    const supabase = getServiceRoleClient();
    let query = supabase
      .from('leave_types')
      .select('*')
      .eq('school_code', normalizedCode);

    if (staffType && staffType !== 'All') {
      query = query.or(`staff_type.eq.${staffType},staff_type.eq.All`);
    }

    const { data: rawData, error } = await query.order('created_at', { ascending: false });
    const data = (rawData || []).map((row: { max_days?: number; max_days_per_month?: number }) => ({
      ...row,
      max_days_per_month: row.max_days_per_month ?? row.max_days,
    }));

    if (error) {
      console.error('Error fetching leave types:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Leave types table does not exist',
          details: 'Please run the leave_types_schema.sql file in your database to create the required table.',
          code: error.code,
          hint: 'The leave_types table needs to be created. Check leave_types_schema.sql in the project root.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch leave types',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/leave/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new leave type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, abbreviation, name, max_days_per_month, max_days, carry_forward, is_active, staff_type, academic_year: bodyAcademicYear } = body;

    if (!school_code || !abbreviation || !name) {
      return NextResponse.json({ error: 'Missing required fields: school_code, abbreviation, name' }, { status: 400 });
    }

    // Get school ID and optional current_academic_year
    const supabase = getServiceRoleClient();
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id, current_academic_year')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // max_days_per_month (or max_days) stored as max_days in DB for backward compatibility
    const limitSource = max_days_per_month ?? max_days;
    let maxDaysValue: number | null = null;
    if (limitSource != null && limitSource !== '') {
      const parsed = parseInt(String(limitSource));
      if (!isNaN(parsed) && parsed > 0) {
        maxDaysValue = parsed;
      }
    }

    // academic_year is NOT NULL in leave_types; use body, school's current year, or default
    const academicYear =
      (typeof bodyAcademicYear === 'string' && bodyAcademicYear.trim()) ||
      (schoolData as { current_academic_year?: string } | null)?.current_academic_year ||
      `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

    const insertPayload: Record<string, unknown> = {
      school_id: schoolData.id,
      school_code: school_code.toUpperCase(),
      abbreviation: abbreviation.toUpperCase().trim(),
      name: name.trim(),
      max_days: maxDaysValue,
      carry_forward: carry_forward === true || carry_forward === 'true',
      is_active: is_active !== false && is_active !== 'false',
      staff_type: (staff_type || 'All').trim(),
      academic_year: academicYear,
    };

    const { data, error } = await supabase
      .from('leave_types')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error creating leave type:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Leave types table does not exist',
          details: 'Please run the leave_types_schema.sql file in your database to create the required table.',
          code: error.code,
          hint: 'The leave_types table needs to be created. Check leave_types_schema.sql in the project root.'
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create leave type', 
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/leave/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

