import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Get marks for a specific class in an examination.
 * Uses student_subject_marks (subject-wise) and students filtered by class/section/academic_year.
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

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('class, section, academic_year')
      .eq('id', classId)
      .eq('school_code', schoolCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found', details: classError?.message },
        { status: 404 }
      );
    }

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, admission_no, student_name, class, section, roll_number')
      .eq('school_code', schoolCode)
      .eq('class', classData.class)
      .eq('section', classData.section ?? '')
      .eq('academic_year', classData.academic_year)
      .eq('status', 'active')
      .order('roll_number', { ascending: true, nullsFirst: false });

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    const studentIds = students?.map((s) => s.id) ?? [];
    if (studentIds.length === 0) {
      return NextResponse.json({
        data: [],
        exam_id: examId,
        class_id: classId,
        subject_marks: [],
      }, { status: 200 });
    }

    const { data: existingMarks, error: marksError } = await supabase
      .from('student_subject_marks')
      .select('student_id, subject_id, marks_obtained, max_marks, grade, status, remarks')
      .eq('exam_id', examId)
      .eq('class_id', classId)
      .eq('school_code', schoolCode)
      .in('student_id', studentIds);

    if (marksError) {
      return NextResponse.json(
        { error: 'Failed to fetch marks', details: marksError.message },
        { status: 500 }
      );
    }

    const marksByStudent = new Map<string, Array<{ subject_id: string; marks_obtained: number; max_marks: number; grade?: string; status?: string; remarks?: string }>>();
    for (const m of existingMarks ?? []) {
      const list = marksByStudent.get(m.student_id) ?? [];
      list.push({
        subject_id: m.subject_id,
        marks_obtained: m.marks_obtained ?? 0,
        max_marks: m.max_marks ?? 0,
        grade: m.grade ?? undefined,
        status: m.status ?? undefined,
        remarks: m.remarks ?? undefined,
      });
      marksByStudent.set(m.student_id, list);
    }

    const studentsWithMarks = (students ?? []).map((student) => {
      const subjectMarks = marksByStudent.get(student.id) ?? [];
      const totalObtained = subjectMarks.reduce((s, m) => s + m.marks_obtained, 0);
      const totalMax = subjectMarks.reduce((s, m) => s + m.max_marks, 0);
      return {
        ...student,
        subject_marks: subjectMarks,
        mark: subjectMarks.length > 0
          ? { marks_obtained: totalObtained, max_marks: totalMax, remarks: subjectMarks.map((m) => m.remarks).filter(Boolean).join('; ') || null }
          : null,
      };
    });

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
