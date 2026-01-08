import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
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

    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        school_code,
        abbreviation: abbreviation.toUpperCase(),
        name,
        max_days: max_days ? parseInt(max_days) : null,
        carry_forward: carry_forward || false,
        is_active: is_active !== false,
        academic_year,
        staff_type: staff_type || 'All',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating leave type:', error);
      return NextResponse.json({ error: 'Failed to create leave type' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in POST /api/leave/types:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

