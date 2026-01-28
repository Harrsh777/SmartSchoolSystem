import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

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

    const supabase = getServiceRoleClient();
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
    const supabase = getServiceRoleClient();
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

    // Validate marks (allow null for absent)
    for (const mark of marks) {
      const obtained = mark.marks_obtained;
      if (obtained != null && obtained !== '' && Number(obtained) < 0) {
        return NextResponse.json(
          { error: `Marks obtained cannot be negative for subject ${mark.subject_id}` },
          { status: 400 }
        );
      }
      const maxM = Number(mark.max_marks) || 0;
      if (obtained != null && obtained !== '' && Number(obtained) > maxM) {
        return NextResponse.json(
          { error: `Marks obtained (${obtained}) cannot exceed max marks (${maxM})` },
          { status: 400 }
        );
      }
    }

    // Prepare marks records – core columns only for maximum compatibility
    interface MarkInput {
      subject_id: string;
      max_marks: number;
      marks_obtained: number;
      remarks?: string;
    }
    const maxMarksValues = (m: MarkInput) => ({
      maxMarks: parseInt(String(m.max_marks || '0')) || 0,
      marksObtained: parseFloat(String(m.marks_obtained || '0')) || 0,
    });
    // entered_by is required (NOT NULL) – always include it in full and fallback
    const coreRecord = (m: MarkInput) => {
      const { maxMarks, marksObtained } = maxMarksValues(m);
      return {
        exam_id,
        student_id,
        subject_id: m.subject_id,
        class_id,
        school_id: schoolData.id,
        school_code,
        max_marks: maxMarks,
        marks_obtained: marksObtained,
        remarks: m.remarks || null,
        entered_by,
      };
    };
    const fullRecord = (m: MarkInput) => ({ ...coreRecord(m), status: 'draft' });

    const marksRecordsFull = marks.map((m: MarkInput) => fullRecord(m));
    const marksRecordsCore = marks.map((m: MarkInput) => coreRecord(m));

    // Upsert: try with optional columns first; on column error, retry with core only
    let insertedMarks: unknown[] | null = null;
    let marksError: { message?: string; code?: string } | null = null;

    const { data: data1, error: err1 } = await supabase
      .from('student_subject_marks')
      .upsert(marksRecordsFull, {
        onConflict: 'exam_id,student_id,subject_id',
        ignoreDuplicates: false,
      })
      .select('*');

    if (!err1) {
      insertedMarks = data1;
    } else {
      const isColumnError = err1.code === 'PGRST204' || /column.*does not exist|Could not find the/.test(err1.message || '');
      if (isColumnError) {
        const { data: data2, error: err2 } = await supabase
          .from('student_subject_marks')
          .upsert(marksRecordsCore, {
            onConflict: 'exam_id,student_id,subject_id',
            ignoreDuplicates: false,
          })
          .select('*');
        if (!err2) insertedMarks = data2;
        else marksError = err2;
      } else {
        marksError = err1;
      }
    }

    if (marksError || insertedMarks == null) {
      const err = marksError || { message: 'Upsert returned no data' };
      console.error('Error saving marks:', err);
      return NextResponse.json(
        { error: 'Failed to save marks', details: err.message, code: err.code },
        { status: 500 }
      );
    }

    // Optionally update exam summary if student_exam_summary table exists
    let summary = null;
    try {
      const { data: allStudentMarks } = await supabase
        .from('student_subject_marks')
        .select('marks_obtained, max_marks')
        .eq('exam_id', exam_id)
        .eq('student_id', student_id);

      if (allStudentMarks && allStudentMarks.length > 0) {
        const totalMarks = allStudentMarks.reduce((sum, m) => sum + (m.marks_obtained ?? 0), 0);
        const totalMaxMarks = allStudentMarks.reduce((sum, m) => sum + (m.max_marks ?? 0), 0);
        const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 10000) / 100 : 0;

        const { data: summaryData } = await supabase
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
          }, { onConflict: 'exam_id,student_id' })
          .select('*')
          .eq('exam_id', exam_id)
          .eq('student_id', student_id)
          .single();
        summary = summaryData;
      }
    } catch {
      // Summary table may not exist or have different columns; marks are still saved
    }

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

