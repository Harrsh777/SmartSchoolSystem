import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/classes/[id]/subjects
 * Get all subjects assigned to a class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const schoolCode = searchParams.get('school_code');

    if (!schoolCode) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    // Verify class exists
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, school_code')
      .eq('id', id)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Fetch assigned subjects for this class
    const { data: assignments, error: assignmentsError } = await supabase
      .from('class_subjects')
      .select(`
        id,
        subject_id,
        subject:subject_id (
          id,
          name,
          color,
          school_code
        )
      `)
      .eq('class_id', id)
      .eq('school_code', schoolCode)
      .order('created_at', { ascending: true });

    if (assignmentsError) {
      console.error('Error fetching class subjects:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch class subjects', details: assignmentsError.message },
        { status: 500 }
      );
    }

    // Transform data to return just subject IDs and details
    interface AssignmentWithSubject {
      subject_id: string;
      subject: { id: string; name: string; color: string; school_code: string } | { id: string; name: string; color: string; school_code: string }[];
    }

    const subjects = (assignments || []).map((assignment: AssignmentWithSubject) => {
      const subject = Array.isArray(assignment.subject) ? assignment.subject[0] : assignment.subject;
      if (!subject) {
        return {
          id: assignment.subject_id,
          name: '',
          color: '',
          school_code: '',
        };
      }
      return {
        id: assignment.subject_id,
        name: subject.name,
        color: subject.color,
        school_code: subject.school_code,
      };
    });

    return NextResponse.json({ data: subjects }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class subjects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/classes/[id]/subjects
 * Assign subjects to a class (replaces existing assignments)
 * Body: { school_code, subject_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { school_code, subject_ids } = body;

    if (!school_code) {
      return NextResponse.json(
        { error: 'School code is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(subject_ids)) {
      return NextResponse.json(
        { error: 'subject_ids must be an array' },
        { status: 400 }
      );
    }

    // Verify class exists and get school_id
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, school_id, school_code')
      .eq('id', id)
      .eq('school_code', school_code)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Get school_id
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

    // Verify all subjects exist and belong to the school
    if (subject_ids.length > 0) {
      const { data: subjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_code', school_code)
        .in('id', subject_ids);

      if (subjectsError) {
        console.error('Error verifying subjects:', subjectsError);
        return NextResponse.json(
          { error: 'Failed to verify subjects', details: subjectsError.message },
          { status: 500 }
        );
      }

      const validSubjectIds = new Set((subjects || []).map((s) => s.id));
      const invalidSubjectIds = subject_ids.filter((id: string) => !validSubjectIds.has(id));

      if (invalidSubjectIds.length > 0) {
        return NextResponse.json(
          { error: 'Some subjects not found', invalid_subject_ids: invalidSubjectIds },
          { status: 400 }
        );
      }
    }

    // Delete existing assignments for this class
    const { error: deleteError } = await supabase
      .from('class_subjects')
      .delete()
      .eq('class_id', id)
      .eq('school_code', school_code);

    if (deleteError) {
      console.error('Error deleting existing assignments:', deleteError);
      return NextResponse.json(
        { error: 'Failed to update assignments', details: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new assignments
    if (subject_ids.length > 0) {
      const assignmentsToInsert = subject_ids.map((subjectId: string) => ({
        class_id: id,
        subject_id: subjectId,
        school_id: schoolData.id,
        school_code: school_code,
      }));

      const { error: insertError } = await supabase
        .from('class_subjects')
        .insert(assignmentsToInsert);

      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        return NextResponse.json(
          { error: 'Failed to save assignments', details: insertError.message },
          { status: 500 }
        );
      }
    }

    // Fetch updated assignments to return
    const { data: updatedAssignments, error: fetchError } = await supabase
      .from('class_subjects')
      .select(`
        id,
        subject_id,
        subject:subject_id (
          id,
          name,
          color,
          school_code
        )
      `)
      .eq('class_id', id)
      .eq('school_code', school_code)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching updated assignments:', fetchError);
      // Still return success since assignments were saved
    }

    interface AssignmentWithSubject {
      subject_id: string;
      subject: { id: string; name: string; color: string; school_code: string } | { id: string; name: string; color: string; school_code: string }[];
    }

    const subjects = (updatedAssignments || []).map((assignment: AssignmentWithSubject) => {
      const subject = Array.isArray(assignment.subject) ? assignment.subject[0] : assignment.subject;
      if (!subject) {
        return {
          id: assignment.subject_id,
          name: '',
          color: '',
          school_code: '',
        };
      }
      return {
        id: assignment.subject_id,
        name: subject.name,
        color: subject.color,
        school_code: subject.school_code,
      };
    });

    return NextResponse.json({ data: subjects }, { status: 200 });
  } catch (error) {
    console.error('Error assigning subjects to class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
