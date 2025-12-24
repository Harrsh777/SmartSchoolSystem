import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Fetch staff filtered by school_code
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: false });

    if (staffError) {
      return NextResponse.json(
        { error: 'Failed to fetch staff', details: staffError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: staff || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, ...staffData } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
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

    // Check for duplicate staff_id
    const { data: existing } = await supabase
      .from('staff')
      .select('staff_id')
      .eq('school_code', school_code)
      .eq('staff_id', staffData.staff_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Staff ID already exists' },
        { status: 400 }
      );
    }

    // Insert staff with school_code
    const { data: newStaff, error: insertError } = await supabase
      .from('staff')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        staff_id: staffData.staff_id,
        full_name: staffData.full_name,
        role: staffData.role,
        department: staffData.department || null,
        designation: staffData.designation || null,
        email: staffData.email || null,
        phone: staffData.phone,
        date_of_joining: staffData.date_of_joining,
        employment_type: staffData.employment_type || null,
        qualification: staffData.qualification || null,
        experience_years: staffData.experience_years || null,
        gender: staffData.gender || null,
        address: staffData.address || null,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create staff', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newStaff }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

