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
      class_id,
    } = body;

    if (!school_code || !exam_id || !class_id) {
      return NextResponse.json(
        { error: 'School code, exam ID, and class ID are required' },
        { status: 400 }
      );
    }

    // Verify all marks are entered before submission
    const { data: examSubjects } = await supabase
      .from('exam_subjects')
      .select('id, subject_id')
      .eq('exam_id', exam_id);

    if (!examSubjects || examSubjects.length === 0) {
      return NextResponse.json(
        { error: 'No subjects found for this exam' },
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

    // Check if all students have marks for all subjects
    const { data: existingMarks } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id')
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id)
      .eq('status', 'draft');

    const incompleteStudents: string[] = [];
    
    students?.forEach((student) => {
      const studentMarks = existingMarks?.filter(m => m.student_id === student.id) || [];
      const markedSubjects = new Set(studentMarks.map(m => m.subject_id));
      
      // Check if all subjects have marks
      const allSubjectsMarked = examSubjects.every(es => markedSubjects.has(es.subject_id));
      
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

    // Update status from draft to submitted
    const { data: updatedMarks, error: updateError } = await supabase
      .from('student_subject_marks')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('school_code', school_code)
      .eq('exam_id', exam_id)
      .eq('class_id', class_id)
      .eq('status', 'draft')
      .select();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to submit marks', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Marks submitted for review successfully',
      submitted_count: updatedMarks?.length || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Error submitting marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
