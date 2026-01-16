import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  calculatePercentage,
  getGradeFromPercentage,
  checkPassStatus,
} from '@/lib/grade-calculator';

/**
 * Bulk save marks for multiple students
 * POST /api/examinations/marks/bulk
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      class_id,
      marks, // Array of { student_id, subjects: [{ subject_id, max_marks, marks_obtained, remarks }] }
      entered_by,
    } = body;

    if (!school_code || !exam_id || !class_id || !marks || !Array.isArray(marks) || !entered_by) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
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

    // Get exam subjects to check passing marks
    const { data: examSubjects } = await supabase
      .from('exam_subjects')
      .select('subject_id, max_marks, passing_marks')
      .eq('exam_id', exam_id);

    // Prepare all marks records
    const allMarksRecords: Array<{
      exam_id: string;
      student_id: string;
      subject_id: string;
      class_id: string;
      school_id: string;
      school_code: string;
      max_marks: number;
      marks_obtained: number;
      percentage: number;
      grade: string;
      passing_status: 'pass' | 'fail';
      remarks: string | null;
      entered_by: string;
      status: string;
    }> = [];

    const errors: Array<{ student_id: string; subject_id?: string; error: string }> = [];

    // Process each student's marks
    for (const studentMark of marks) {
      const { student_id, subjects } = studentMark;

      if (!student_id || !subjects || !Array.isArray(subjects)) {
        errors.push({
          student_id: student_id || 'unknown',
          error: 'Missing student_id or subjects array',
        });
        continue;
      }

      // Process each subject for this student
      for (const subjectMark of subjects) {
        const { subject_id, max_marks, marks_obtained, remarks } = subjectMark;

        // Validation
        if (!subject_id || max_marks === undefined || marks_obtained === undefined) {
          errors.push({
            student_id,
            subject_id,
            error: 'Missing required fields',
          });
          continue;
        }

        const maxMarks = parseFloat(String(max_marks || '0')) || 0;
        const marksObtained = parseFloat(String(marks_obtained || '0')) || 0;

        if (maxMarks <= 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Max marks must be greater than 0',
          });
          continue;
        }

        if (marksObtained < 0) {
          errors.push({
            student_id,
            subject_id,
            error: 'Marks obtained cannot be negative',
          });
          continue;
        }

        if (marksObtained > maxMarks) {
          errors.push({
            student_id,
            subject_id,
            error: `Marks obtained (${marksObtained}) cannot exceed max marks (${maxMarks})`,
          });
          continue;
        }

        // Calculate percentage
        const percentage = calculatePercentage(marksObtained, maxMarks);

        // Get grade from percentage
        const grade = getGradeFromPercentage(percentage);

        // Check pass status
        const examSubject = examSubjects?.find((es) => es.subject_id === subject_id);
        const passingMarks = examSubject?.passing_marks || Math.round(maxMarks * 0.4);
        const passingStatus = checkPassStatus(marksObtained, passingMarks);

        allMarksRecords.push({
          exam_id,
          student_id,
          subject_id,
          class_id,
          school_id: schoolData.id,
          school_code,
          max_marks: maxMarks,
          marks_obtained: marksObtained,
          percentage,
          grade,
          passing_status: passingStatus,
          remarks: remarks || null,
          entered_by,
          status: 'draft', // Default status - can be changed to 'submitted' when ready
        });
      }
    }

    if (allMarksRecords.length === 0) {
      return NextResponse.json(
        { error: 'No valid marks to save', errors },
        { status: 400 }
      );
    }

    // Bulk upsert all marks
    const { data: savedMarks, error: marksError } = await supabase
      .from('student_subject_marks')
      .upsert(allMarksRecords, {
        onConflict: 'exam_id,student_id,subject_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color
        )
      `);

    if (marksError) {
      return NextResponse.json(
        { error: 'Failed to save marks', details: marksError.message },
        { status: 500 }
      );
    }

    // Calculate and update exam summaries for all affected students
    const uniqueStudentIds = [...new Set(allMarksRecords.map((m) => m.student_id))];
    
    // Fetch updated summaries (triggers should have calculated them)
    const { data: summaries } = await supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', exam_id)
      .in('student_id', uniqueStudentIds);

    return NextResponse.json({
      data: savedMarks,
      summaries: summaries || [],
      summary: {
        total_students: uniqueStudentIds.length,
        total_marks_saved: savedMarks?.length || 0,
        errors_count: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully saved marks for ${uniqueStudentIds.length} student(s)`,
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving bulk marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
