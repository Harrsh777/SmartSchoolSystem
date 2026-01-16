import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  calculatePercentage,
  getGradeFromPercentage,
  checkPassStatus,
  calculateOverallPercentage,
} from '@/lib/grade-calculator';

// Get marks for a student in an exam
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get('exam_id');
    const studentId = searchParams.get('student_id');

    if (!examId || !studentId) {
      return NextResponse.json(
        { error: 'Exam ID and Student ID are required' },
        { status: 400 }
      );
    }

    const { data: marks, error } = await supabase
      .from('student_subject_marks')
      .select(`
        *,
        subject:subjects (
          id,
          name,
          color
        ),
        entered_by_staff:entered_by (
          id,
          full_name,
          staff_id
        )
      `)
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: marks || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Save/Update marks for a student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      school_code,
      exam_id,
      student_id,
      class_id,
      marks, // Array of { subject_id, max_marks, marks_obtained, remarks }
      entered_by,
    } = body;

    if (!school_code || !exam_id || !student_id || !class_id || !marks || !Array.isArray(marks) || !entered_by) {
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

    // Validate marks
    for (const mark of marks) {
      if (mark.marks_obtained < 0) {
        return NextResponse.json(
          { error: `Marks obtained cannot be negative for subject ${mark.subject_id}` },
          { status: 400 }
        );
      }
      if (mark.marks_obtained > mark.max_marks) {
        return NextResponse.json(
          { error: `Marks obtained (${mark.marks_obtained}) cannot exceed max marks (${mark.max_marks})` },
          { status: 400 }
        );
      }
    }

    // Get exam subjects to check passing marks
    const { data: examSubjects } = await supabase
      .from('exam_subjects')
      .select('subject_id, max_marks, passing_marks')
      .eq('exam_id', exam_id);

    // Prepare marks records for upsert with calculations
    interface MarkInput {
      subject_id: string;
      max_marks: number;
      marks_obtained: number;
      remarks?: string;
    }
    const marksRecords = marks.map((m: MarkInput) => {
      const maxMarks = parseInt(String(m.max_marks || '0')) || 0;
      const marksObtained = parseFloat(String(m.marks_obtained || '0')) || 0;
      
      // Calculate percentage
      const percentage = calculatePercentage(marksObtained, maxMarks);
      
      // Get grade from percentage
      const grade = getGradeFromPercentage(percentage);
      
      // Check pass status (use passing marks from exam_subjects if available, else default to 40% of max)
      const examSubject = examSubjects?.find((es) => es.subject_id === m.subject_id);
      const passingMarks = examSubject?.passing_marks || Math.round(maxMarks * 0.4);
      const passingStatus = checkPassStatus(marksObtained, passingMarks);

      return {
        exam_id: exam_id,
        student_id: student_id,
        subject_id: m.subject_id,
        class_id: class_id,
        school_id: schoolData.id,
        school_code: school_code,
        max_marks: maxMarks,
        marks_obtained: marksObtained,
        percentage: percentage,
        grade: grade,
        passing_status: passingStatus,
        remarks: m.remarks || null,
        entered_by: entered_by,
        status: 'draft', // Default status - will be changed to 'submitted' when ready
      };
    });

    // Upsert marks (insert or update)
    const { data: insertedMarks, error: marksError } = await supabase
      .from('student_subject_marks')
      .upsert(marksRecords, {
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

    // Calculate and update exam summary
    // Get all marks for this student in this exam
    const { data: allStudentMarks } = await supabase
      .from('student_subject_marks')
      .select('marks_obtained, max_marks, percentage, grade, passing_status')
      .eq('exam_id', exam_id)
      .eq('student_id', student_id);

    if (allStudentMarks && allStudentMarks.length > 0) {
      const totalMarks = allStudentMarks.reduce((sum, m) => sum + m.marks_obtained, 0);
      const totalMaxMarks = allStudentMarks.reduce((sum, m) => sum + m.max_marks, 0);
      const overallPercentage = calculateOverallPercentage(
        allStudentMarks.map((m) => ({ marks_obtained: m.marks_obtained, max_marks: m.max_marks }))
      );
      const overallGrade = getGradeFromPercentage(overallPercentage);
      const subjectsPassed = allStudentMarks.filter((m) => m.passing_status === 'pass').length;
      const subjectsFailed = allStudentMarks.filter((m) => m.passing_status === 'fail').length;
      const resultStatus = subjectsFailed === 0 ? 'pass' : 'fail';

      // Upsert exam summary
      await supabase
        .from('student_exam_summary')
        .upsert({
          exam_id,
          student_id,
          class_id,
          school_id: schoolData.id,
          school_code,
          total_marks: totalMarks,
          total_max_marks: totalMaxMarks,
          overall_percentage: overallPercentage,
          overall_grade: overallGrade,
          result_status: resultStatus,
          subjects_passed: subjectsPassed,
          subjects_failed: subjectsFailed,
        }, {
          onConflict: 'exam_id,student_id',
        });
    }

    // Fetch the updated summary
    const { data: summary } = await supabase
      .from('student_exam_summary')
      .select('*')
      .eq('exam_id', exam_id)
      .eq('student_id', student_id)
      .single();

    return NextResponse.json({
      data: insertedMarks,
      summary: summary,
      message: 'Marks saved successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Error saving marks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

