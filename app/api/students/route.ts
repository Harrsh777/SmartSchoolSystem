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

    // Get school ID
    const { data: schoolData, error: schoolError } = await supabase
      .from('accepted_schools')
      .select('id')
      .eq('school_code', schoolCode)
      .single();

    if (schoolError || !schoolData) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get optional filters
    const classFilter = searchParams.get('class');
    const sectionFilter = searchParams.get('section');

    // Build query
    let query = supabase
      .from('students')
      .select('*')
      .eq('school_code', schoolCode);

    // Apply filters
    if (classFilter) {
      query = query.eq('class', classFilter);
    }
    if (sectionFilter) {
      query = query.eq('section', sectionFilter);
    }

    // Execute query
    const { data: students, error: studentsError } = await query.order('created_at', { ascending: false });

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: students || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, ...studentData } = body;

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

    // Check for duplicate admission number
    const { data: existing } = await supabase
      .from('students')
      .select('admission_no')
      .eq('school_code', school_code)
      .eq('admission_no', studentData.admission_no)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Admission number already exists' },
        { status: 400 }
      );
    }

    // Insert student with school_code
    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        admission_no: studentData.admission_no,
        student_name: studentData.student_name,
        class: studentData.class,
        section: studentData.section,
        date_of_birth: studentData.date_of_birth || null,
        gender: studentData.gender || null,
        parent_name: studentData.parent_name || null,
        parent_phone: studentData.parent_phone || null,
        parent_email: studentData.parent_email || null,
        address: studentData.address || null,
        academic_year: new Date().getFullYear().toString(),
        status: 'active',
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create student', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

