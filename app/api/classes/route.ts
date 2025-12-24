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

    // Fetch classes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('*')
      .eq('school_code', schoolCode)
      .order('class', { ascending: true })
      .order('section', { ascending: true })
      .order('academic_year', { ascending: false });

    if (classesError) {
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classesError.message },
        { status: 500 }
      );
    }

    // Get student counts and teacher info for each class
    const classesWithCounts = await Promise.all(
      (classes || []).map(async (cls) => {
        // Get student count
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('school_code', schoolCode)
          .eq('class', cls.class)
          .eq('section', cls.section)
          .eq('academic_year', cls.academic_year);

        // Get teacher info if assigned
        let classTeacher = null;
        if (cls.class_teacher_id) {
          const { data: teacher } = await supabase
            .from('staff')
            .select('id, full_name')
            .eq('id', cls.class_teacher_id)
            .single();
          
          if (teacher) {
            classTeacher = teacher;
          }
        }

        return {
          ...cls,
          student_count: count || 0,
          class_teacher: classTeacher,
        };
      })
    );

    return NextResponse.json({ data: classesWithCounts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, class: className, section, academic_year } = body;

    if (!school_code || !className || !section || !academic_year) {
      return NextResponse.json(
        { error: 'School code, class, section, and academic year are required' },
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

    // Check for duplicate
    const { data: existing } = await supabase
      .from('classes')
      .select('id')
      .eq('school_code', school_code)
      .eq('class', className)
      .eq('section', section)
      .eq('academic_year', academic_year)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Class already exists' },
        { status: 400 }
      );
    }

    // Insert class
    const { data: newClass, error: insertError } = await supabase
      .from('classes')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        class: className.toUpperCase(),
        section: section.toUpperCase(),
        academic_year: academic_year,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create class', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newClass }, { status: 201 });
  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

