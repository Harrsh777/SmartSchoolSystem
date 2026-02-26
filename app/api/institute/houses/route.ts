import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

// GET - Fetch houses for a school
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const schoolId = searchParams.get('school_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // First, get school_id if not provided
    const supabase = getServiceRoleClient();
    let finalSchoolId = schoolId;
    if (!finalSchoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', schoolCode)
        .single();

      if (schoolError || !school) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }
      finalSchoolId = school.id;
    }

    // Fetch houses (includes staff_incharge_id, student_incharge_1_id, student_incharge_2_id after migration)
    const { data: houses, error } = await supabase
      .from('institute_houses')
      .select('*')
      .eq('school_id', finalSchoolId)
      .eq('is_active', true)
      .order('house_name', { ascending: true });

    if (error) {
      console.error('Error fetching houses:', error);
      return NextResponse.json(
        { error: 'Failed to fetch houses' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: houses || [] });
  } catch (error) {
    console.error('Error in GET /api/institute/houses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new house
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, school_id, house_name, house_color, description } = body;

    if (!school_code || !house_name) {
      return NextResponse.json(
        { error: 'School code and house name are required' },
        { status: 400 }
      );
    }

    // Get school_id if not provided
    const supabase = getServiceRoleClient();
    let finalSchoolId = school_id;
    if (!finalSchoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('accepted_schools')
        .select('id')
        .eq('school_code', school_code)
        .single();

      if (schoolError || !school) {
        return NextResponse.json(
          { error: 'School not found' },
          { status: 404 }
        );
      }
      finalSchoolId = school.id;
    }

    // Check if house with same name already exists
    const { data: existing } = await supabase
      .from('institute_houses')
      .select('id')
      .eq('school_id', finalSchoolId)
      .eq('house_name', house_name)
      .eq('is_active', true)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'House with this name already exists' },
        { status: 400 }
      );
    }

    // Create new house
    const { data, error } = await supabase
      .from('institute_houses')
      .insert({
        school_id: finalSchoolId,
        school_code: school_code,
        house_name: house_name.trim(),
        house_color: house_color || '#6366f1',
        description: description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating house:', error);
      return NextResponse.json(
        { error: 'Failed to create house' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, message: 'House created successfully' });
  } catch (error) {
    console.error('Error in POST /api/institute/houses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

