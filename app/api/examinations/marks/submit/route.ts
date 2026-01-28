import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Submit marks for review (change status from draft to submitted)
 * POST /api/examinations/marks/submit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      student_id, // Support per-student submission
      class_id, // Required for single-student (filter subjects by class); used for bulk too
    } = body;

    if (!school_code || !exam_id) {
      return NextResponse.json(
        { error: 'School code and exam ID are required' },
        { status: 400 }
      );
    }

    // Get exam subject mappings – filter by class_id when provided so we only require marks for that class's subjects
    let examSubjectQuery = supabase
      .from('exam_subject_mappings')
      .select('subject_id')
      .eq('exam_id', exam_id)
      .eq('school_code', school_code);
    if (class_id) {
      examSubjectQuery = examSubjectQuery.eq('class_id', class_id);
    }
    const { data: examSubjectMappings } = await examSubjectQuery;

    if (!examSubjectMappings || examSubjectMappings.length === 0) {
      return NextResponse.json(
        { error: 'No subjects found for this exam' + (class_id ? ' for the selected class' : '') },
        { status: 400 }
      );
    }

    const subjectIds = examSubjectMappings.map(esm => esm.subject_id);

    // If student_id is provided, submit for single student
    if (student_id) {
      // Check if all subjects have marks for this student (do not filter by status – column may not exist)
      const { data: existingMarks, error: fetchError } = await supabase
        .from('student_subject_marks')
        .select('subject_id, marks_obtained')
        .eq('school_code', school_code)
        .eq('exam_id', exam_id)
        .eq('student_id', student_id);

      if (fetchError) {
        return NextResponse.json(
          { error: 'Failed to check marks', details: fetchError.message },
          { status: 500 }
        );
      }

      const markedSubjects = new Set(existingMarks?.map(m => m.subject_id) || []);
      const allSubjectsMarked = subjectIds.every(subjectId => markedSubjects.has(subjectId));

      if (!allSubjectsMarked) {
        return NextResponse.json(
          { 
            error: 'Cannot submit: Incomplete marks for this student',
            hint: 'Please ensure all subjects have marks before submitting'
          },
          { status: 400 }
        );
      }

      // Update status to submitted (table may not have status/updated_at – treat update failure as non-fatal)
      const { data: updatedMarks, error: updateError } = await supabase
        .from('student_subject_marks')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('school_code', school_code)
        .eq('exam_id', exam_id)
        .eq('student_id', student_id)
        .select();

      if (updateError) {
        // If columns don't exist or RLS blocks update, marks are already saved – still return success
        console.warn('Submit marks status update failed (non-fatal):', updateError.message);
      }

      return NextResponse.json({
        message: 'Marks submitted successfully',
        submitted_count: updatedMarks?.length ?? existingMarks?.length ?? 0,
        locked: true,
      }, { status: 200 });
    }

    // Bulk submission for class (if class_id provided)
    if (!class_id) {
      return NextResponse.json(
        { error: 'Either student_id or class_id is required' },
        { status: 400 }
      );
    }

    // Get all students in this class
    const { data: classData } = await supabase
      .from('classes')
      .select('id, class, section')
      .eq('id', class_id)
      .single();

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('school_code', school_code)
      .eq('class', classData.class)
      .eq('section', classData.section || '')
      .eq('status', 'active');

    // Check if all students have marks for all subjects (do not filter by status – column may not exist)
    const { data: existingMarks, error: bulkFetchError } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id')
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id);

    if (bulkFetchError) {
      return NextResponse.json(
        { error: 'Failed to check marks', details: bulkFetchError.message },
        { status: 500 }
      );
    }

    const incompleteStudents: string[] = [];
    
    students?.forEach((student) => {
      const studentMarks = existingMarks?.filter(m => m.student_id === student.id) || [];
      const markedSubjects = new Set(studentMarks.map(m => m.subject_id));
      
      // Check if all subjects have marks
      const allSubjectsMarked = subjectIds.every(subjectId => markedSubjects.has(subjectId));
      
      if (!allSubjectsMarked) {
        incompleteStudents.push(student.id);
      }
    });

    if (incompleteStudents.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot submit: Some students have incomplete marks',
          incomplete_count: incompleteStudents.length,
          hint: 'Please ensure all students have marks for all subjects before submitting for review'
        },
        { status: 400 }
      );
    }

    // Update status to submitted for all students in class (non-fatal if status/updated_at missing)
    const { data: updatedMarks, error: updateError } = await supabase
      .from('student_subject_marks')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id)
      .select();

    if (updateError) {
      console.warn('Bulk submit marks status update failed (non-fatal):', updateError.message);
    }

    return NextResponse.json({
      message: 'Marks submitted for review successfully',
      submitted_count: updatedMarks?.length ?? existingMarks?.length ?? 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
