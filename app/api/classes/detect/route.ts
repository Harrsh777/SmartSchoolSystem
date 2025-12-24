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

    // Detect classes from students table
    // Group by class, section, academic_year and count students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('class, section, academic_year')
      .eq('school_code', schoolCode);

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Group and count
    const classMap = new Map<string, { class: string; section: string; academic_year: string; student_count: number }>();
    
    students?.forEach(student => {
      const key = `${student.class}-${student.section}-${student.academic_year}`;
      if (classMap.has(key)) {
        classMap.get(key)!.student_count++;
      } else {
        classMap.set(key, {
          class: student.class,
          section: student.section,
          academic_year: student.academic_year,
          student_count: 1,
        });
      }
    });

    const detectedClasses = Array.from(classMap.values()).sort((a, b) => {
      if (a.class !== b.class) return a.class.localeCompare(b.class);
      if (a.section !== b.section) return a.section.localeCompare(b.section);
      return b.academic_year.localeCompare(a.academic_year);
    });

    // Check which ones already exist
    const { data: existingClasses } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('school_code', schoolCode);

    const existingKeys = new Set(
      existingClasses?.map(c => `${c.class}-${c.section}-${c.academic_year}`) || []
    );

    const classesWithStatus = detectedClasses.map(cls => ({
      ...cls,
      exists: existingKeys.has(`${cls.class}-${cls.section}-${cls.academic_year}`),
    }));

    return NextResponse.json({ data: classesWithStatus }, { status: 200 });
  } catch (error) {
    console.error('Error detecting classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, classes } = body;

    if (!school_code || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'School code and classes array are required' },
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

    // Filter out classes that already exist
    const classesToInsert = classes
      .filter((cls: any) => !cls.exists)
      .map((cls: any) => ({
        school_id: schoolData.id,
        school_code: school_code,
        class: cls.class.toUpperCase(),
        section: cls.section.toUpperCase(),
        academic_year: cls.academic_year,
      }));

    if (classesToInsert.length === 0) {
      return NextResponse.json(
        { error: 'All selected classes already exist' },
        { status: 400 }
      );
    }

    // Insert classes one by one to handle duplicates gracefully
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const classToInsert of classesToInsert) {
      const { error: insertError } = await supabase
        .from('classes')
        .insert([classToInsert]);
      
      if (insertError) {
        // If it's a duplicate error, skip it (might have been created by another request)
        if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          // Count as success since it already exists
          successCount++;
          continue;
        }
        errorCount++;
        errors.push(insertError.message);
      } else {
        successCount++;
      }
    }
    
    if (successCount === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to create classes', 
          details: errors.length > 0 ? errors[0] : 'All classes may already exist or there was an error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${successCount} class(es)`,
      created: successCount,
      errors: errorCount > 0 ? errors : undefined,
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

