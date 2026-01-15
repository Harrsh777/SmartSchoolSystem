import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get all subjects
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');
    const classId = searchParams.get('class_id');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Fetch all subjects for the school
    const { data: allSubjects, error: allSubjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_code', schoolCode)
      .order('name', { ascending: true });

    if (allSubjectsError) {
      console.error('Error fetching subjects:', allSubjectsError);
      return NextResponse.json(
        { error: 'Failed to fetch subjects', details: allSubjectsError.message, code: allSubjectsError.code, hint: allSubjectsError.hint },
        { status: 500 }
      );
    }

    // If class_id is provided, check if the class has assigned subjects
    if (classId) {
      // Fetch assigned subjects for this class
      const { data: assignments, error: assignmentsError } = await supabase
        .from('class_subjects')
        .select('subject_id')
        .eq('class_id', classId)
        .eq('school_code', schoolCode);

      if (assignmentsError) {
        console.error('Error fetching class subjects:', assignmentsError);
        // If error fetching assignments, return all subjects (backward compatibility)
        return NextResponse.json({ data: allSubjects || [] }, { status: 200 });
      }

      // If class has assigned subjects, filter to only show assigned subjects
      if (assignments && assignments.length > 0) {
        const assignedSubjectIds = new Set(assignments.map((a: { subject_id: string }) => a.subject_id));
        const filteredSubjects = (allSubjects || []).filter((subject: { id: string }) => assignedSubjectIds.has(subject.id));
        return NextResponse.json({ data: filteredSubjects }, { status: 200 });
      }
      // If no assignments found, return all subjects (backward compatibility)
      // This allows classes without assigned subjects to see all subjects
    }

    // Return all subjects if no class_id or no assignments
    return NextResponse.json({ data: allSubjects || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

// Create a new subject
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { school_code, name, color } = body;

    if (!school_code || !name) {
      return NextResponse.json(
        { error: 'School code and name are required' },
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

    const { data: subject, error: insertError } = await supabase
      .from('subjects')
      .insert([{
        school_id: schoolData.id,
        school_code: school_code,
        name: name.trim(),
        color: color || '#6366f1',
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating subject:', insertError);
      return NextResponse.json(
        { error: 'Failed to create subject', details: insertError.message, code: insertError.code, hint: insertError.hint },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: subject }, { status: 201 });
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

