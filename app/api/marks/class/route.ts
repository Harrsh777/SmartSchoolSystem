import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Get marks for a specific class in an examination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get('exam_id');
    const classId = searchParams.get('class_id');
    const schoolCode = searchParams.get('school_code');

    if (!examId || !classId || !schoolCode) {
      return NextResponse.json(
        { error: 'exam_id, class_id, and school_code are required' },
        { status: 400 }
      );
    }

    // Get all students in the class
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section, roll_number')
      .eq('class_id', classId)
      .eq('school_code', schoolCode)
      .eq('status', 'active')
      .order('roll_number', { ascending: true, nullsFirst: false });

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get existing marks for these students in this exam
    const studentIds = students?.map(s => s.id) || [];
    const { data: existingMarks, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('exam_id', examId)
      .eq('class_id', classId)
      .in('student_id', studentIds);

    if (marksError) {
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: marksError.message },
        { status: 500 }
      );
    }

    // Combine students with their marks
    const marksMap = new Map(
      existingMarks?.map(m => [m.student_id, m]) || []
    );

    const studentsWithMarks = students?.map(student => ({
      ...student,
      mark: marksMap.get(student.id) || null,
    })) || [];

    return NextResponse.json({
      data: studentsWithMarks,
      exam_id: examId,
      class_id: classId,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching class marks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

