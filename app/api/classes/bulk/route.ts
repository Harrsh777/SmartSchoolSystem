import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, academic_year, classes } = body;

    if (!school_code || !academic_year || !Array.isArray(classes) || classes.length === 0) {
      return NextResponse.json(
        { error: 'School code, academic year, and classes array are required' },
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

    // Validate all classes have required fields
    interface ClassInput {
      class?: string;
      section?: string;
    }
    const invalidClasses = classes.filter((c: ClassInput) => !c.class || !c.section);
    if (invalidClasses.length > 0) {
      return NextResponse.json(
        { error: 'All classes must have class and section fields' },
        { status: 400 }
      );
    }

    // Check for existing classes to avoid duplicates
    const classKeys = classes.map((c: ClassInput) => ({
      class: String(c.class || '').toUpperCase(),
      section: String(c.section || '').toUpperCase(),
    }));

    const existingClassesQuery = supabase
      .from('classes')
      .select('class, section')
      .eq('school_code', school_code)
      .eq('academic_year', academic_year);

    const { data: existingClasses, error: existingError } = await existingClassesQuery;

    if (existingError) {
      return NextResponse.json(
        { error: 'Failed to check existing classes', details: existingError.message },
        { status: 500 }
      );
    }

    // Filter out duplicates
    interface ExistingClass {
      class: string;
      section: string;
    }
    const existingSet = new Set(
      (existingClasses || []).map((c: ExistingClass) => `${c.class}-${c.section}`)
    );

    const classesToInsert = classKeys.filter(
      (c: ClassInput) => !existingSet.has(`${c.class}-${c.section}`)
    );

    const duplicateClasses = classKeys.filter(
      (c: ClassInput) => existingSet.has(`${c.class}-${c.section}`)
    );

    if (classesToInsert.length === 0) {
      return NextResponse.json(
        { 
          error: 'All classes already exist',
          duplicates: duplicateClasses,
        },
        { status: 400 }
      );
    }

    // Prepare records for insertion
    const recordsToInsert = classesToInsert.map((c: ClassInput) => ({
      school_id: schoolData.id,
      school_code: school_code,
      class: c.class,
      section: c.section,
      academic_year: academic_year,
    }));

    // Insert classes in batch
    const { data: insertedClasses, error: insertError } = await supabase
      .from('classes')
      .insert(recordsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create classes', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: insertedClasses,
      message: `Successfully created ${insertedClasses?.length || 0} class${insertedClasses?.length !== 1 ? 'es' : ''}`,
      created: insertedClasses?.length || 0,
      skipped: duplicateClasses.length,
      duplicates: duplicateClasses.length > 0 ? duplicateClasses : undefined,
    }, { status: 201 });
  } catch (error) {
    console.error('Error bulk creating classes:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

