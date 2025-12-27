import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Prepare marks records for upsert
    interface MarkInput {
      subject_id: string;
      max_marks: number;
      marks_obtained: number;
      remarks?: string;
    }
    const marksRecords = marks.map((m: MarkInput) => ({
      exam_id: exam_id,
      student_id: student_id,
      subject_id: m.subject_id,
      class_id: class_id,
      school_id: schoolData.id,
      school_code: school_code,
      max_marks: parseInt(String(m.max_marks || '0')) || 0,
      marks_obtained: parseInt(String(m.marks_obtained || '0')) || 0,
      remarks: m.remarks || null,
      entered_by: entered_by,
    }));

    // Upsert marks (insert or update)
    const { data: insertedMarks, error: marksError } = await supabase
      .from('student_subject_marks')
      .upsert(marksRecords, {
        onConflict: 'exam_id,student_id,subject_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        subject:subject_id (
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

    // The trigger will automatically calculate and update student_exam_summary
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

