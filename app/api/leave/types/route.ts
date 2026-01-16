import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch all leave types for a school
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolCode = searchParams.get('school_code');
    const academicYear = searchParams.get('academic_year');
    const staffType = searchParams.get('staff_type');

    if (!schoolCode) {
      return NextResponse.json({ error: 'School code is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient();
    let query = supabase
      .from('leave_types')
      .select('*')
      .eq('school_code', schoolCode);

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    if (staffType && staffType !== 'All') {
      query = query.or(`staff_type.eq.${staffType},staff_type.eq.All`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave types:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Failed to fetch leave types',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error in GET /api/leave/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new leave type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, abbreviation, name, max_days, carry_forward, is_active, academic_year, staff_type } = body;

    if (!school_code || !abbreviation || !name || !academic_year) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get school ID
    const supabase = getServiceRoleClient();
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', school_code)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // Validate max_days if provided
    let maxDaysValue: number | null = null;
    if (max_days) {
      const parsed = parseInt(String(max_days));
      if (!isNaN(parsed) && parsed > 0) {
        maxDaysValue = parsed;
      }
    }

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        school_id: schoolData.id,
        school_code: school_code.toUpperCase(),
        abbreviation: abbreviation.toUpperCase().trim(),
        name: name.trim(),
        max_days: maxDaysValue,
        carry_forward: carry_forward === true || carry_forward === 'true',
        is_active: is_active !== false && is_active !== 'false',
        academic_year: academic_year.trim(),
        staff_type: (staff_type || 'All').trim(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating leave type:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
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

